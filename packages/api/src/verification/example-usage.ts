/**
 * Example Usage of Expanded Verification System
 * Demonstrates how business logic, state machines, and distributed operations
 * work together with formal verification guarantees
 */

import { z } from 'zod';
import { prisma } from '../lib/prisma-client';
import { logger } from '../lib/logger';

// Import verified components
import {
  OrderProcessor,
  OrderSchema,
  PricingRule,
  PricingRuleType,
  InventoryManager,
} from './business-logic-runtime';

import {
  VerifiedOrderStateMachine,
  OrderState,
  OrderEvent,
} from './state-machine-runtime';

import {
  OrderProcessingSaga,
  OrderSagaState,
  SagaContext,
} from './distributed-operations-runtime';

/**
 * Complete Order Processing Example
 * Combines all verification layers
 */
export class VerifiedOrderService {
  private orderProcessor = OrderProcessor;
  private stateMachine = VerifiedOrderStateMachine;
  private saga = new OrderProcessingSaga();

  /**
   * Process a complete order with full verification
   */
  async processOrder(
    customerId: string,
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>,
    discountCode?: string
  ): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const orderId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();

    try {
      logger.info('Starting verified order processing', {
        orderId,
        customerId,
        itemCount: items.length,
      });

      // Step 1: Calculate order with business logic verification
      const order = await this.calculateOrderWithVerification(
        orderId,
        customerId,
        items,
        discountCode
      );

      // Step 2: Create order in database with state machine
      await this.createOrderWithStateMachine(order);

      // Step 3: Process order through distributed saga
      const sagaResult = await this.processOrderSaga(order);

      if (!sagaResult.success) {
        throw new Error(`Order processing failed: ${sagaResult.error}`);
      }

      // Step 4: Transition to paid state
      await this.transitionOrderState(
        orderId,
        OrderEvent.PaymentCaptured,
        { paymentId: sagaResult.state.paymentId }
      );

      logger.info('Order processed successfully', {
        orderId,
        customerId,
        total: order.total,
      });

      return {
        success: true,
        orderId,
      };
    } catch (error) {
      logger.error('Order processing failed', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Attempt to cancel the order
      try {
        await this.cancelOrder(orderId, 'Processing failed');
      } catch (cancelError) {
        logger.error('Failed to cancel order after error', {
          orderId,
          cancelError,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Order processing failed',
      };
    }
  }

  /**
   * Calculate order with business logic verification
   */
  private async calculateOrderWithVerification(
    orderId: string,
    customerId: string,
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>,
    discountCode?: string
  ): Promise<z.infer<typeof OrderSchema>> {
    // Get applicable pricing rules
    const pricingRules = await this.getPricingRules(discountCode);

    // Calculate order totals with verification
    const calculatedOrder = await this.orderProcessor.calculateOrderTotal(
      items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: 0,
      })),
      pricingRules,
      8.5, // Tax rate
      10.0 // Shipping cost
    );

    // Override generated values
    return {
      ...calculatedOrder,
      id: orderId,
      customerId,
    };
  }

  /**
   * Get applicable pricing rules
   */
  private async getPricingRules(discountCode?: string): Promise<PricingRule[]> {
    const rules: PricingRule[] = [];

    if (discountCode) {
      // Look up discount code
      const discount = await prisma.discountCode.findUnique({
        where: { code: discountCode },
      });

      if (discount && discount.active) {
        if (discount.type === 'PERCENTAGE') {
          rules.push({
            type: PricingRuleType.PercentageDiscount,
            parameters: { percentage: discount.value },
          });
        } else if (discount.type === 'FIXED') {
          rules.push({
            type: PricingRuleType.FixedDiscount,
            parameters: { amount: discount.value },
          });
        }
      }
    }

    // Add free shipping rule for orders over $100
    rules.push({
      type: PricingRuleType.FreeShipping,
      parameters: { minOrderValue: 100 },
    });

    return rules;
  }

  /**
   * Create order with state machine
   */
  private async createOrderWithStateMachine(
    order: z.infer<typeof OrderSchema>
  ): Promise<void> {
    // Create order in database
    await prisma.order.create({
      data: {
        id: order.id,
        customerId: order.customerId,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        state: OrderState.Created,
        items: {
          create: order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
          })),
        },
      },
    });

    // Transition to payment pending
    await this.stateMachine.transition(
      order.id,
      OrderEvent.InitiatePayment,
      {},
      { prisma }
    );
  }

  /**
   * Process order through saga
   */
  private async processOrderSaga(
    order: z.infer<typeof OrderSchema>
  ): Promise<any> {
    const sagaState: OrderSagaState = {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      inventoryReserved: false,
      paymentAuthorized: false,
      shippingArranged: false,
      notificationSent: false,
    };

    const context: SagaContext = {
      transactionId: crypto.randomUUID(),
      timestamp: new Date(),
      metadata: {
        source: 'order-service',
        version: '1.0.0',
      },
      prisma,
    };

    return this.saga.processOrder(sagaState, context);
  }

  /**
   * Transition order state
   */
  private async transitionOrderState(
    orderId: string,
    event: OrderEvent,
    eventData: Record<string, any> = {}
  ): Promise<void> {
    await this.stateMachine.transition(
      orderId,
      event,
      eventData,
      { prisma }
    );
  }

  /**
   * Cancel order with proper state transitions
   */
  private async cancelOrder(
    orderId: string,
    reason: string
  ): Promise<void> {
    try {
      // Get current order state
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { state: true },
      });

      if (!order) {
        return;
      }

      // Check if cancellation is allowed
      if (this.stateMachine.canCancelOrder(order.state as OrderState)) {
        await this.stateMachine.transition(
          orderId,
          OrderEvent.CancelOrder,
          { reason },
          { prisma }
        );
      }
    } catch (error) {
      logger.error('Failed to cancel order', {
        orderId,
        reason,
        error,
      });
    }
  }

  /**
   * Monitor order processing with verification
   */
  async monitorOrderHealth(): Promise<{
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    averageProcessingTime: number;
    verificationViolations: number;
  }> {
    const stats = await prisma.order.groupBy({
      by: ['state'],
      _count: true,
    });

    const successStates = [OrderState.Delivered, OrderState.Shipped, OrderState.InTransit];
    const failedStates = [OrderState.Cancelled, OrderState.Refunded];

    const successful = stats
      .filter((s: any) => successStates.includes(s.state as OrderState))
      .reduce((sum: number, s: any) => sum + s._count, 0);

    const failed = stats
      .filter((s: any) => failedStates.includes(s.state as OrderState))
      .reduce((sum: number, s: any) => sum + s._count, 0);

    // Check for verification violations
    const violations = await this.checkVerificationViolations();

    return {
      totalOrders: stats.reduce((sum: number, s: any) => sum + s._count, 0),
      successfulOrders: successful,
      failedOrders: failed,
      averageProcessingTime: await this.calculateAverageProcessingTime(),
      verificationViolations: violations,
    };
  }

  /**
   * Check for verification violations
   */
  private async checkVerificationViolations(): Promise<number> {
    let violations = 0;

    // Check for orders with inconsistent totals
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        subtotal: true,
        discount: true,
        tax: true,
        shipping: true,
        total: true,
      },
    });

    for (const order of orders) {
      const calculatedTotal = order.subtotal - order.discount + order.tax + order.shipping;
      if (Math.abs(order.total - calculatedTotal) > 0.01) {
        violations++;
        logger.warn('Order total inconsistency detected', {
          orderId: order.id,
          expected: calculatedTotal,
          actual: order.total,
        });
      }
    }

    // Check for invalid state transitions
    const invalidTransitions = await this.checkInvalidStateTransitions();
    violations += invalidTransitions;

    return violations;
  }

  /**
   * Check for invalid state transitions
   */
  private async checkInvalidStateTransitions(): Promise<number> {
    const orders = await prisma.order.findMany({
      select: { id: true },
    });

    let violations = 0;

    for (const order of orders) {
      const validation = await this.stateMachine.validateStateHistory(
        order.id,
        { prisma }
      );

      if (!validation.valid) {
        violations++;
        logger.warn('Invalid state history detected', {
          orderId: order.id,
          errors: validation.errors,
        });
      }
    }

    return violations;
  }

  /**
   * Calculate average order processing time
   */
  private async calculateAverageProcessingTime(): Promise<number> {
    const result = await prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg
      FROM orders
      WHERE state IN ('DELIVERED', 'SHIPPED')
    `;

    return result[0]?.avg || 0;
  }
}

/**
 * Example usage
 */
export async function exampleUsage() {
  const orderService = new VerifiedOrderService();

  // Process an order
  const result = await orderService.processOrder(
    'customer-123',
    [
      {
        productId: 'product-1',
        quantity: 2,
        unitPrice: 29.99,
      },
      {
        productId: 'product-2',
        quantity: 1,
        unitPrice: 49.99,
      },
    ],
    'SUMMER20' // 20% discount code
  );

  if (result.success) {
    console.log(`Order processed successfully: ${result.orderId}`);
  } else {
    console.error(`Order processing failed: ${result.error}`);
  }

  // Monitor system health
  const health = await orderService.monitorOrderHealth();
  console.log('System health:', health);
}

// Export verification summary
export const ExpandedVerificationSummary = {
  components: [
    'Business Logic Verification',
    'State Machine Verification',
    'Distributed Operations Verification',
  ],
  guarantees: [
    'Pricing calculations never produce negative values',
    'Order totals are always mathematically consistent',
    'State transitions follow verified rules',
    'Distributed transactions maintain eventual consistency',
    'Automatic compensation on failures',
    'Idempotent operations prevent duplicates',
  ],
  benefits: [
    'Eliminates entire classes of bugs',
    'Provides mathematical certainty',
    'Enables safe refactoring',
    'Improves system reliability',
    'Reduces debugging time',
  ],
};
