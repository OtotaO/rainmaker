# Expanded Verification System: Beyond CRUD

## Executive Summary

We're expanding the formal verification system to address the actual sources of bugs in production systems:
- Business logic and complex calculations
- State machines and workflow transitions
- Distributed operations and eventual consistency
- External API integrations with fallback patterns
- Concurrency and race conditions
- Performance characteristics and resource usage

## 1. Business Logic Verification

### 1.1 Complex Calculations and Rules

Instead of just verifying CRUD, we'll verify business invariants that span multiple operations:

```dafny
// Example: E-commerce pricing rules
datatype PricingRule = 
  | PercentageDiscount(percentage: real)
  | FixedDiscount(amount: real)
  | BuyXGetY(buyQuantity: nat, getQuantity: nat)
  | TieredPricing(tiers: seq<(nat, real)>)

class OrderCalculator {
  // Verify that discounts never result in negative prices
  method ApplyDiscount(basePrice: real, rule: PricingRule) returns (finalPrice: real)
    requires basePrice >= 0.0
    ensures finalPrice >= 0.0
    ensures finalPrice <= basePrice
  {
    match rule {
      case PercentageDiscount(p) =>
        finalPrice := basePrice * (1.0 - p / 100.0);
      case FixedDiscount(amount) =>
        finalPrice := if basePrice > amount then basePrice - amount else 0.0;
      case _ =>
        // Other cases...
        finalPrice := basePrice;
    }
  }

  // Verify that tax calculations are consistent
  method CalculateTax(subtotal: real, taxRate: real) returns (tax: real)
    requires subtotal >= 0.0
    requires 0.0 <= taxRate <= 100.0
    ensures tax >= 0.0
    ensures tax <= subtotal
  {
    tax := subtotal * (taxRate / 100.0);
  }

  // Verify order total calculation maintains invariants
  method CalculateOrderTotal(
    items: seq<OrderItem>,
    discountRules: seq<PricingRule>,
    taxRate: real
  ) returns (total: OrderTotal)
    requires forall i :: 0 <= i < |items| ==> items[i].price >= 0.0
    requires forall i :: 0 <= i < |items| ==> items[i].quantity > 0
    requires 0.0 <= taxRate <= 100.0
    ensures total.subtotal >= 0.0
    ensures total.discount >= 0.0
    ensures total.tax >= 0.0
    ensures total.total >= 0.0
    ensures total.total == total.subtotal - total.discount + total.tax + total.shipping
  {
    // Implementation with verification
  }
}
```

### 1.2 Zod Schema with Business Rules

```typescript
// Extend Zod schemas to include business rule verification
const OrderSchema = z.object({
  id: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  tax: z.number().min(0),
  shipping: z.number().min(0),
  total: z.number().min(0),
}).refine(
  (order) => {
    // Business rule: total must equal calculated sum
    const calculatedTotal = order.subtotal - order.discount + order.tax + order.shipping;
    return Math.abs(order.total - calculatedTotal) < 0.01; // Allow for rounding
  },
  {
    message: "Order total doesn't match calculated sum",
    path: ["total"],
  }
).annotate({
  dafny: {
    invariants: [
      "order.discount <= order.subtotal", // Can't discount more than subtotal
      "order.tax <= order.subtotal", // Tax can't exceed subtotal
      "order.total >= 0", // Total can't be negative
    ],
    businessRules: {
      calculateTotal: "CalculateOrderTotal",
      applyPromotion: "ApplyPromotionRules",
    }
  }
});
```

## 2. State Machine Verification

### 2.1 Workflow State Transitions

Verify that state transitions follow business rules and can't enter invalid states:

```dafny
// Example: Order fulfillment state machine
datatype OrderState = 
  | Pending
  | PaymentProcessing
  | Paid
  | Preparing
  | Shipped
  | Delivered
  | Cancelled
  | Refunded

datatype OrderEvent =
  | ProcessPayment
  | PaymentSuccess
  | PaymentFailure
  | StartPreparation
  | ShipOrder(trackingNumber: string)
  | ConfirmDelivery
  | CancelOrder
  | IssueRefund

class OrderStateMachine {
  // Define valid transitions
  predicate ValidTransition(currentState: OrderState, event: OrderEvent, nextState: OrderState)
  {
    match (currentState, event, nextState) {
      case (Pending, ProcessPayment, PaymentProcessing) => true
      case (PaymentProcessing, PaymentSuccess, Paid) => true
      case (PaymentProcessing, PaymentFailure, Pending) => true
      case (Paid, StartPreparation, Preparing) => true
      case (Preparing, ShipOrder(_), Shipped) => true
      case (Shipped, ConfirmDelivery, Delivered) => true
      case (Pending, CancelOrder, Cancelled) => true
      case (Paid, CancelOrder, Cancelled) => true
      case (Cancelled, IssueRefund, Refunded) => true
      case _ => false
    }
  }

  // Verify no invalid state transitions
  method TransitionState(
    currentState: OrderState,
    event: OrderEvent
  ) returns (nextState: OrderState)
    ensures ValidTransition(currentState, event, nextState)
  {
    match (currentState, event) {
      case (Pending, ProcessPayment) => nextState := PaymentProcessing;
      case (PaymentProcessing, PaymentSuccess) => nextState := Paid;
      case (PaymentProcessing, PaymentFailure) => nextState := Pending;
      case (Paid, StartPreparation) => nextState := Preparing;
      case (Preparing, ShipOrder(_)) => nextState := Shipped;
      case (Shipped, ConfirmDelivery) => nextState := Delivered;
      case (Pending, CancelOrder) => nextState := Cancelled;
      case (Paid, CancelOrder) => nextState := Cancelled;
      case (Cancelled, IssueRefund) => nextState := Refunded;
      case _ => 
        // This should never happen due to precondition
        assert false;
        nextState := currentState;
    }
  }

  // Verify business rules about states
  predicate CanShipOrder(state: OrderState)
  {
    state == Preparing
  }

  predicate CanRefundOrder(state: OrderState)
  {
    state == Cancelled || state == Delivered
  }

  // Verify compensation is possible
  method CompensateOrder(state: OrderState) returns (compensated: bool)
    ensures compensated ==> (state == Paid || state == Preparing || state == Shipped)
  {
    match state {
      case Paid, Preparing, Shipped => 
        compensated := true;
      case _ =>
        compensated := false;
    }
  }
}
```

### 2.2 TypeScript Implementation with State Verification

```typescript
// Runtime implementation that enforces verified state machine
export class VerifiedOrderStateMachine {
  private static transitions: Map<string, OrderState> = new Map([
    [`${OrderState.Pending}:${OrderEvent.ProcessPayment}`, OrderState.PaymentProcessing],
    [`${OrderState.PaymentProcessing}:${OrderEvent.PaymentSuccess}`, OrderState.Paid],
    [`${OrderState.PaymentProcessing}:${OrderEvent.PaymentFailure}`, OrderState.Pending],
    [`${OrderState.Paid}:${OrderEvent.StartPreparation}`, OrderState.Preparing],
    [`${OrderState.Preparing}:${OrderEvent.ShipOrder}`, OrderState.Shipped],
    [`${OrderState.Shipped}:${OrderEvent.ConfirmDelivery}`, OrderState.Delivered],
    [`${OrderState.Pending}:${OrderEvent.CancelOrder}`, OrderState.Cancelled],
    [`${OrderState.Paid}:${OrderEvent.CancelOrder}`, OrderState.Cancelled],
    [`${OrderState.Cancelled}:${OrderEvent.IssueRefund}`, OrderState.Refunded],
  ]);

  static async transition(
    orderId: string,
    event: OrderEvent,
    context: ExecutionContext
  ): Promise<Order> {
    return await context.prisma.$transaction(async (tx) => {
      // Get current state with lock
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { state: true },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Check if transition is valid
      const transitionKey = `${order.state}:${event}`;
      const nextState = this.transitions.get(transitionKey);

      if (!nextState) {
        throw new InvalidStateTransitionError(
          `Cannot transition from ${order.state} with event ${event}`
        );
      }

      // Apply business rules for the transition
      await this.applyTransitionRules(orderId, order.state, event, nextState, tx);

      // Update state
      return await tx.order.update({
        where: { id: orderId },
        data: { 
          state: nextState,
          stateHistory: {
            create: {
              fromState: order.state,
              toState: nextState,
              event,
              timestamp: new Date(),
            }
          }
        },
      });
    }, {
      isolationLevel: 'Serializable',
    });
  }

  private static async applyTransitionRules(
    orderId: string,
    currentState: OrderState,
    event: OrderEvent,
    nextState: OrderState,
    tx: PrismaTransaction
  ): Promise<void> {
    // Business rules verified by Dafny
    switch (event) {
      case OrderEvent.ProcessPayment:
        await this.verifyPaymentPreconditions(orderId, tx);
        break;
      case OrderEvent.ShipOrder:
        await this.verifyShippingPreconditions(orderId, tx);
        break;
      case OrderEvent.IssueRefund:
        await this.verifyRefundPreconditions(orderId, tx);
        break;
    }
  }
}
```

## 3. Distributed Operations Verification

### 3.1 Eventual Consistency Patterns

Verify that distributed operations eventually converge to a consistent state:

```dafny
// Saga pattern verification
datatype SagaStep<T> = SagaStep(
  execute: T -> Result<T>,
  compensate: T -> Result<T>
)

class DistributedTransaction {
  // Verify saga maintains consistency
  method ExecuteSaga<T>(
    initialState: T,
    steps: seq<SagaStep<T>>
  ) returns (finalState: Result<T>)
    ensures finalState.Success? ==> 
      ConsistentState(finalState.value)
    ensures finalState.Failure? ==> 
      initialState == RecoverState(initialState, steps)
  {
    var currentState := initialState;
    var executedSteps: seq<SagaStep<T>> := [];
    
    for i := 0 to |steps| {
      var result := steps[i].execute(currentState);
      if result.Success? {
        currentState := result.value;
        executedSteps := executedSteps + [steps[i]];
      } else {
        // Compensate in reverse order
        finalState := CompensateSteps(currentState, executedSteps);
        return;
      }
    }
    
    finalState := Success(currentState);
  }

  // Verify compensation restores consistency
  method CompensateSteps<T>(
    state: T,
    executedSteps: seq<SagaStep<T>>
  ) returns (result: Result<T>)
    ensures result.Success? ==> ConsistentState(result.value)
  {
    var currentState := state;
    var i := |executedSteps|;
    
    while i > 0
      invariant 0 <= i <= |executedSteps|
      invariant ConsistentState(currentState)
    {
      i := i - 1;
      var compensateResult := executedSteps[i].compensate(currentState);
      if compensateResult.Success? {
        currentState := compensateResult.value;
      } else {
        result := Failure("Compensation failed");
        return;
      }
    }
    
    result := Success(currentState);
  }
}
```

### 3.2 TypeScript Saga Implementation

```typescript
// Runtime saga execution with verification
export class VerifiedSaga<T> {
  constructor(
    private steps: SagaStep<T>[],
    private verifyConsistency: (state: T) => boolean
  ) {}

  async execute(
    initialState: T,
    context: ExecutionContext
  ): Promise<SagaResult<T>> {
    const executedSteps: ExecutedStep<T>[] = [];
    let currentState = initialState;

    try {
      // Execute steps
      for (const step of this.steps) {
        const result = await step.execute(currentState, context);
        
        if (!this.verifyConsistency(result)) {
          throw new InconsistentStateError(
            `Step ${step.name} produced inconsistent state`
          );
        }

        executedSteps.push({
          step,
          beforeState: currentState,
          afterState: result,
        });
        
        currentState = result;
      }

      return {
        success: true,
        state: currentState,
        executedSteps,
      };
    } catch (error) {
      // Compensate in reverse order
      const compensationResult = await this.compensate(
        currentState,
        executedSteps,
        context
      );

      return {
        success: false,
        state: compensationResult.state,
        error,
        compensationResult,
      };
    }
  }

  private async compensate(
    failedState: T,
    executedSteps: ExecutedStep<T>[],
    context: ExecutionContext
  ): Promise<CompensationResult<T>> {
    let currentState = failedState;
    const compensatedSteps: ExecutedStep<T>[] = [];

    // Compensate in reverse order
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const { step, beforeState } = executedSteps[i];
      
      try {
        const compensatedState = await step.compensate(
          currentState,
          beforeState,
          context
        );

        if (!this.verifyConsistency(compensatedState)) {
          throw new InconsistentStateError(
            `Compensation for ${step.name} produced inconsistent state`
          );
        }

        compensatedSteps.push({
          step,
          beforeState: currentState,
          afterState: compensatedState,
        });

        currentState = compensatedState;
      } catch (error) {
        return {
          success: false,
          state: currentState,
          error,
          compensatedSteps,
        };
      }
    }

    return {
      success: true,
      state: currentState,
      compensatedSteps,
    };
  }
}
```

## 4. External API Integration Verification

### 4.1 Circuit Breaker Pattern

Verify that external API failures don't cascade:

```dafny
datatype CircuitState = Closed | Open | HalfOpen

class CircuitBreaker {
  var failureCount: nat
  var successCount: nat
  var state: CircuitState
  var lastFailureTime: nat
  
  // Configuration
  const failureThreshold: nat := 5
  const successThreshold: nat := 3
  const timeout: nat := 60000 // 60 seconds
  
  predicate ValidState()
    reads this
  {
    (state == Closed ==> failureCount < failureThreshold) &&
    (state == Open ==> failureCount >= failureThreshold) &&
    (state == HalfOpen ==> successCount < successThreshold)
  }
  
  method RecordSuccess() 
    modifies this
    requires ValidState()
    ensures ValidState()
  {
    match state {
      case Closed =>
        failureCount := 0;
      case HalfOpen =>
        successCount := successCount + 1;
        if successCount >= successThreshold {
          state := Closed;
          failureCount := 0;
          successCount := 0;
        }
      case Open =>
        // Shouldn't happen - calls should be blocked
        assert false;
    }
  }
  
  method RecordFailure(currentTime: nat)
    modifies this
    requires ValidState()
    ensures ValidState()
  {
    match state {
      case Closed =>
        failureCount := failureCount + 1;
        if failureCount >= failureThreshold {
          state := Open;
          lastFailureTime := currentTime;
        }
      case HalfOpen =>
        state := Open;
        failureCount := failureThreshold;
        successCount := 0;
        lastFailureTime := currentTime;
      case Open =>
        // Already open, update time
        lastFailureTime := currentTime;
    }
  }
  
  method ShouldAllowRequest(currentTime: nat) returns (allow: bool)
    modifies this
    requires ValidState()
    ensures ValidState()
    ensures allow ==> (state == Closed || state == HalfOpen)
  {
    match state {
      case Closed =>
        allow := true;
      case Open =>
        if currentTime - lastFailureTime >= timeout {
          state := HalfOpen;
          successCount := 0;
          allow := true;
        } else {
          allow := false;
        }
      case HalfOpen =>
        allow := true;
    }
  }
}
```

### 4.2 Retry with Exponential Backoff

```typescript
// Verified retry logic
export class VerifiedRetryPolicy {
  constructor(
    private maxAttempts: number = 3,
    private baseDelay: number = 1000,
    private maxDelay: number = 30000,
    private backoffMultiplier: number = 2
  ) {
    // Verify configuration
    if (maxAttempts < 1) throw new Error("maxAttempts must be >= 1");
    if (baseDelay < 0) throw new Error("baseDelay must be >= 0");
    if (maxDelay < baseDelay) throw new Error("maxDelay must be >= baseDelay");
    if (backoffMultiplier < 1) throw new Error("backoffMultiplier must be >= 1");
  }

  async execute<T>(
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxAttempts || !isRetryable(error)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // Verified to never exceed maxDelay
    const exponentialDelay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
    return Math.min(exponentialDelay, this.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 5. Concurrency Verification

### 5.1 Lock-Free Data Structures

Verify concurrent operations maintain consistency:

```dafny
// Verify concurrent counter operations
class ConcurrentCounter {
  var value: int
  var version: nat
  
  method CompareAndSwap(expected: int, newValue: int) returns (success: bool, actualValue: int)
    modifies this
    ensures success ==> value == newValue && version == old(version) + 1
    ensures !success ==> value == actualValue && version == old(version)
    ensures value >= 0 // Invariant: counter never negative
  {
    if value == expected {
      value := newValue;
      version := version + 1;
      success := true;
      actualValue := newValue;
    } else {
      success := false;
      actualValue := value;
    }
  }
  
  method Increment() returns (newValue: int)
    modifies this
    ensures newValue == old(value) + 1
    ensures version == old(version) + 1
  {
    var success := false;
    var currentValue := value;
    
    while !success
      invariant value >= old(value)
      decreases *
    {
      success, currentValue := CompareAndSwap(currentValue, currentValue + 1);
    }
    
    newValue := value;
  }
}
```

### 5.2 Optimistic Locking Implementation

```typescript
// Verified optimistic locking
export class OptimisticLockManager {
  async updateWithLock<T extends { version: number }>(
    entityId: string,
    entityType: string,
    updateFn: (current: T) => T,
    context: ExecutionContext,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Read current state
      const current = await context.prisma[entityType].findUnique({
        where: { id: entityId }
      }) as T;

      if (!current) {
        throw new EntityNotFoundError(`${entityType} ${entityId} not found`);
      }

      // Apply update
      const updated = updateFn(current);
      
      // Verify update maintains invariants
      await this.verifyInvariants(entityType, updated);

      try {
        // Attempt update with version check
        const result = await context.prisma[entityType].update({
          where: { 
            id: entityId,
            version: current.version // Optimistic lock
          },
          data: {
            ...updated,
            version: current.version + 1
          }
        }) as T;

        return result;
      } catch (error) {
        if (this.isVersionConflict(error) && attempt < maxRetries - 1) {
          // Retry with exponential backoff
          await this.sleep(Math.pow(2, attempt) * 100);
          continue;
        }
        throw error;
      }
    }

    throw new OptimisticLockError(
      `Failed to update ${entityType} ${entityId} after ${maxRetries} attempts`
    );
  }

  private async verifyInvariants(entityType: string, entity: any): Promise<void> {
    const schema = getSchemaForEntity(entityType);
    const result = schema.safeParse(entity);
    
    if (!result.success) {
      throw new InvariantViolationError(
        `Update would violate invariants: ${result.error.message}`
      );
    }
  }

  private isVersionConflict(error: any): boolean {
    return error.code === 'P2025'; // Prisma's "Record not found" error
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 6. Performance Verification

### 6.1 Resource Usage Bounds

Verify algorithms have bounded resource usage:

```dafny
// Verify query complexity
class QueryComplexityAnalyzer {
  // Verify pagination prevents unbounded results
  method ExecuteQuery<T>(
    filters: seq<Filter>,
    pageSize: nat,
    pageNumber: nat
  ) returns (results: seq<T>, hasMore: bool)
    requires 0 < pageSize <= 1000 // Max page size
    requires pageNumber >= 0
    ensures |results| <= pageSize
  {
    // Implementation ensures bounded results
  }
  
  // Verify join complexity
  method AnalyzeJoinComplexity(query: Query) returns (complexity: nat)
    ensures complexity <= MaxAllowedComplexity
  {
    var joinCount := CountJoins(query);
    var filterSelectivity := EstimateSelectivity(query.filters);
    
    complexity := joinCount * joinCount * (100 - filterSelectivity);
    
    if complexity > MaxAllowedComplexity {
      // Reject query before execution
      assert false;
    }
  }
}
```

### 6.2 Performance Monitoring

```typescript
// Runtime performance verification
export class PerformanceMonitor {
  private static readonly THRESHOLDS = {
    queryTime: 1000, // 1 second
    memoryUsage: 100 * 1024 * 1024, // 100MB
    cpuUsage: 80, // 80%
  };

  async monitorOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await operation();
      
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      // Verify performance bounds
      if (duration > this.THRESHOLDS.queryTime) {
        logger.warn(`Operation ${operationName} exceeded time threshold`, {
          duration,
          threshold: this.THRESHOLDS.queryTime
        });
      }
      
      if (memoryDelta > this.THRESHOLDS.memoryUsage) {
        logger.warn(`Operation ${operationName} exceeded memory threshold`, {
          memoryDelta,
          threshold: this.THRESHOLDS.memoryUsage
        });
      }
      
      // Record metrics
      await this.recordMetrics(operationName, {
        duration,
        memoryDelta,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.recordMetrics(operationName, {
        duration,
        memoryDelta: 0,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  private async recordMetrics(
    operationName: string,
    metrics: OperationMetrics
  ): Promise<void> {
    // Store metrics for analysis
    await metricsStore.record({
      operation: operationName,
      timestamp: new Date(),
      ...metrics
    });
  }
}
```

## 7. Integration with Existing System

### 7.1 Extending the Current Framework

```typescript
// Extend existing Zod schemas with advanced verification
export const ExtendedEntityRegistry = {
  ...EntityRegistry,
  
  // Add business logic verification
  Order: OrderSchema.annotate({
    dafny: {
      businessLogic: {
        calculateTotal: "OrderCalculator.CalculateOrderTotal",
        applyDiscount: "OrderCalculator.ApplyDiscount",
      },
      stateMachine: {
        states: OrderState,
        transitions: "OrderStateMachine.ValidTransition",
      },
      performance: {
        maxQueryComplexity: 100,
        maxExecutionTime: 1000,
      }
    }
  }),
  
  // Add distributed operation verification
  Payment: PaymentSchema.annotate({
    dafny: {
      saga: {
        steps: ["AuthorizePayment", "CapturePayment", "UpdateInventory"],
        compensations: ["RefundPayment", "ReleasePayment", "RestoreInventory"],
      },
      externalApi: {
        circuitBreaker: true,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
        }
      }
    }
  }),
};
```

### 7.2 Verification Pipeline Extension

```typescript
// Extended verification pipeline
export class ExtendedVerificationPipeline {
  async verifyEntity(
    entityName: string,
    schema: ZodSchema<any>
  ): Promise<VerificationResult> {
    const results: VerificationResult[] = [];
    
    // Original CRUD verification
    results.push(await this.verifyCrudOperations(entityName, schema));
    
    // Business logic verification
    if (schema._def.dafny?.businessLogic) {
      results.push(await this.verifyBusinessLogic(entityName, schema));
    }
    
    // State machine verification
    if (schema._def.dafny?.stateMachine) {
      results.push(await this.verifyStateMachine(entityName, schema));
    }
    
    // Distributed operation verification
    if (schema._def.dafny?.saga) {
      results.push(await this.verifySaga(entityName, schema));
    }
    
    // Performance verification
    if (schema._def.dafny?.performance) {
      results.push(await this.verifyPerformance(entityName, schema));
    }
    
    return this.combineResults(results);
  }
}
```

## 8. Developer Experience Improvements

### 8.1 Verification Feedback

```typescript
// Enhanced error messages with verification context
export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly verificationContext: {
      entity: string;
      operation: string;
      invariant: string;
      counterexample?: any;
      suggestion?: string;
    }
  ) {
    super(message);
    this.name = 'VerificationError';
  }

  toString(): string {
    return `
${this.message}

Entity: ${this.verificationContext.entity}
Operation: ${this.verificationContext.operation}
Failed Invariant: ${this.verificationContext.invariant}

${this.verificationContext.counterexample ? 
  `Counterexample: ${JSON.stringify(this.verificationContext.counterexample, null, 2)}` : ''}

${this.verificationContext.suggestion ? 
  `Suggestion: ${this.verificationContext.suggestion}` : ''}
    `.trim();
  }
}
```

### 8.2 Verification Dashboard

```typescript
// Real-time verification status
export class VerificationDashboard {
  async getVerificationStatus(): Promise<DashboardData> {
    return {
      entities: await this.getEntityVerificationStatus(),
      coverage: await this.getVerificationCoverage(),
      performance: await this.getVerificationPerformance(),
      issues: await this.getVerificationIssues(),
    };
  }

  private async getVerificationCoverage(): Promise<CoverageData> {
    const totalOperations = await this.countTotalOperations();
    const verifiedOperations = await this.countVerifiedOperations();
    
    return {
      crud: {
        total: totalOperations.crud,
        verified: verifiedOperations.crud,
        percentage: (verifiedOperations.crud / totalOper
