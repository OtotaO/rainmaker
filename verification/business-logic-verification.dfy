// Business Logic Verification for Real-World Scenarios
// This extends beyond CRUD to verify complex business rules and calculations

module BusinessLogicVerification {
  // Import base verification types
  import opened BaseTypes

  // E-commerce Order Processing Example
  datatype OrderItem = OrderItem(
    productId: string,
    quantity: nat,
    unitPrice: real,
    discountPercent: real
  )

  datatype Order = Order(
    id: string,
    customerId: string,
    items: seq<OrderItem>,
    subtotal: real,
    discount: real,
    tax: real,
    shipping: real,
    total: real,
    status: OrderStatus
  )

  datatype OrderStatus = 
    | Draft 
    | Pending 
    | Processing 
    | Shipped 
    | Delivered 
    | Cancelled

  // Pricing Rules
  datatype PricingRule = 
    | PercentageDiscount(percentage: real)
    | FixedDiscount(amount: real)
    | BuyXGetY(buyQuantity: nat, getQuantity: nat)
    | TieredPricing(tiers: seq<(nat, real)>)
    | FreeShipping(minOrderValue: real)

  class OrderProcessor {
    // Core invariant: Order totals must always be consistent
    predicate OrderTotalConsistent(order: Order)
    {
      abs(order.total - (order.subtotal - order.discount + order.tax + order.shipping)) < 0.01
    }

    // Verify discount calculations never produce negative prices
    method ApplyDiscount(basePrice: real, rule: PricingRule) returns (finalPrice: real)
      requires basePrice >= 0.0
      ensures finalPrice >= 0.0
      ensures finalPrice <= basePrice
    {
      match rule {
        case PercentageDiscount(p) =>
          if 0.0 <= p <= 100.0 {
            finalPrice := basePrice * (1.0 - p / 100.0);
          } else {
            finalPrice := basePrice; // Invalid percentage, no discount
          }
        
        case FixedDiscount(amount) =>
          if amount >= 0.0 {
            finalPrice := if basePrice > amount then basePrice - amount else 0.0;
          } else {
            finalPrice := basePrice; // Invalid amount, no discount
          }
        
        case BuyXGetY(buyQty, getQty) =>
          // This requires quantity information, simplified here
          finalPrice := basePrice;
        
        case TieredPricing(tiers) =>
          // Apply tiered pricing based on quantity
          finalPrice := ApplyTieredPricing(basePrice, tiers);
        
        case FreeShipping(minValue) =>
          // This affects shipping, not item price
          finalPrice := basePrice;
      }
    }

    // Verify tax calculations are within legal bounds
    method CalculateTax(subtotal: real, taxRate: real, jurisdiction: string) returns (tax: real)
      requires subtotal >= 0.0
      requires 0.0 <= taxRate <= 50.0 // Max 50% tax rate
      ensures tax >= 0.0
      ensures tax <= subtotal * 0.5 // Tax never exceeds 50% of subtotal
    {
      // Different jurisdictions may have different rules
      if jurisdiction == "TAX_EXEMPT" {
        tax := 0.0;
      } else {
        tax := subtotal * (taxRate / 100.0);
      }
    }

    // Verify order total calculation with all components
    method CalculateOrderTotal(
      items: seq<OrderItem>,
      discountRules: seq<PricingRule>,
      taxRate: real,
      shippingCost: real
    ) returns (order: Order)
      requires forall i :: 0 <= i < |items| ==> items[i].unitPrice >= 0.0
      requires forall i :: 0 <= i < |items| ==> items[i].quantity > 0
      requires 0.0 <= taxRate <= 50.0
      requires shippingCost >= 0.0
      ensures order.subtotal >= 0.0
      ensures order.discount >= 0.0
      ensures order.discount <= order.subtotal
      ensures order.tax >= 0.0
      ensures order.shipping >= 0.0
      ensures order.total >= 0.0
      ensures OrderTotalConsistent(order)
    {
      // Calculate subtotal
      var subtotal := 0.0;
      var i := 0;
      while i < |items|
        invariant 0 <= i <= |items|
        invariant subtotal >= 0.0
      {
        var item := items[i];
        var itemTotal := item.unitPrice * item.quantity as real;
        subtotal := subtotal + itemTotal;
        i := i + 1;
      }

      // Apply discounts
      var discount := 0.0;
      var j := 0;
      while j < |discountRules|
        invariant 0 <= j <= |discountRules|
        invariant 0.0 <= discount <= subtotal
      {
        var discountAmount := CalculateDiscountAmount(subtotal, discountRules[j]);
        discount := discount + discountAmount;
        if discount > subtotal {
          discount := subtotal; // Cap discount at subtotal
        }
        j := j + 1;
      }

      // Calculate tax on discounted amount
      var taxableAmount := subtotal - discount;
      var tax := CalculateTax(taxableAmount, taxRate, "DEFAULT");

      // Apply shipping rules
      var shipping := shippingCost;
      var k := 0;
      while k < |discountRules|
        invariant 0 <= k <= |discountRules|
        invariant shipping >= 0.0
      {
        match discountRules[k] {
          case FreeShipping(minValue) =>
            if subtotal >= minValue {
              shipping := 0.0;
            }
          case _ => // Other rules don't affect shipping
        }
        k := k + 1;
      }

      // Create order with calculated values
      var total := subtotal - discount + tax + shipping;
      order := Order(
        "generated-id",
        "customer-id",
        items,
        subtotal,
        discount,
        tax,
        shipping,
        total,
        Draft
      );
    }

    // Helper method for discount calculation
    method CalculateDiscountAmount(baseAmount: real, rule: PricingRule) returns (discount: real)
      requires baseAmount >= 0.0
      ensures 0.0 <= discount <= baseAmount
    {
      match rule {
        case PercentageDiscount(p) =>
          if 0.0 <= p <= 100.0 {
            discount := baseAmount * (p / 100.0);
          } else {
            discount := 0.0;
          }
        
        case FixedDiscount(amount) =>
          if amount >= 0.0 {
            discount := if baseAmount > amount then amount else baseAmount;
          } else {
            discount := 0.0;
          }
        
        case _ =>
          discount := 0.0; // Other rules handled elsewhere
      }
    }

    // Helper for tiered pricing
    method ApplyTieredPricing(basePrice: real, tiers: seq<(nat, real)>) returns (price: real)
      requires basePrice >= 0.0
      requires forall i :: 0 <= i < |tiers| ==> tiers[i].1 >= 0.0
      ensures price >= 0.0
      ensures price <= basePrice
    {
      // Simplified implementation
      price := basePrice;
    }
  }

  // Inventory Management with Business Rules
  class InventoryManager {
    // Verify stock levels never go negative
    method ReserveStock(productId: string, quantity: nat, currentStock: nat) 
      returns (success: bool, newStock: nat)
      requires quantity >= 0
      requires currentStock >= 0
      ensures success ==> newStock == currentStock - quantity
      ensures !success ==> newStock == currentStock
      ensures newStock >= 0
    {
      if quantity <= currentStock {
        success := true;
        newStock := currentStock - quantity;
      } else {
        success := false;
        newStock := currentStock;
      }
    }

    // Verify reorder calculations
    method CalculateReorderQuantity(
      currentStock: nat,
      reorderPoint: nat,
      reorderQuantity: nat,
      maxStock: nat
    ) returns (orderQty: nat)
      requires reorderPoint <= maxStock
      requires reorderQuantity > 0
      ensures currentStock < reorderPoint ==> orderQty > 0
      ensures currentStock + orderQty <= maxStock
    {
      if currentStock < reorderPoint {
        var needed := maxStock - currentStock;
        orderQty := if needed < reorderQuantity then needed else reorderQuantity;
      } else {
        orderQty := 0;
      }
    }
  }

  // Financial Calculations with Precision
  class FinancialCalculator {
    // Verify interest calculations
    method CalculateCompoundInterest(
      principal: real,
      rate: real,
      periods: nat
    ) returns (amount: real)
      requires principal >= 0.0
      requires 0.0 <= rate <= 100.0
      ensures amount >= principal
    {
      var r := 1.0 + (rate / 100.0);
      amount := principal;
      var i := 0;
      
      while i < periods
        invariant 0 <= i <= periods
        invariant amount >= principal
      {
        amount := amount * r;
        i := i + 1;
      }
    }

    // Verify currency conversion maintains precision
    method ConvertCurrency(
      amount: real,
      fromCurrency: string,
      toCurrency: string,
      rate: real
    ) returns (converted: real)
      requires amount >= 0.0
      requires rate > 0.0
      ensures converted >= 0.0
    {
      // Apply conversion with rounding rules
      var raw := amount * rate;
      // Round to 2 decimal places
      converted := ((raw * 100.0 + 0.5) as int) as real / 100.0;
    }
  }

  // Subscription Billing Logic
  class SubscriptionBilling {
    datatype BillingCycle = Monthly | Quarterly | Annual
    
    datatype Subscription = Subscription(
      id: string,
      customerId: string,
      planId: string,
      startDate: nat, // Days since epoch
      cycle: BillingCycle,
      amount: real,
      status: SubscriptionStatus
    )

    datatype SubscriptionStatus = Active | Paused | Cancelled | Expired

    // Verify proration calculations
    method CalculateProration(
      fullAmount: real,
      daysInPeriod: nat,
      daysUsed: nat
    ) returns (prorated: real)
      requires fullAmount >= 0.0
      requires daysInPeriod > 0
      requires 0 <= daysUsed <= daysInPeriod
      ensures 0.0 <= prorated <= fullAmount
    {
      prorated := fullAmount * (daysUsed as real / daysInPeriod as real);
    }

    // Verify billing date calculations
    method CalculateNextBillingDate(
      currentDate: nat,
      lastBillingDate: nat,
      cycle: BillingCycle
    ) returns (nextDate: nat)
      requires currentDate >= lastBillingDate
      ensures nextDate > currentDate
    {
      var daysToAdd: nat;
      match cycle {
        case Monthly => daysToAdd := 30;
        case Quarterly => daysToAdd := 90;
        case Annual => daysToAdd := 365;
      }
      
      nextDate := lastBillingDate + daysToAdd;
      
      // If we've already passed the next date, calculate the following one
      while nextDate <= currentDate
        invariant nextDate > lastBillingDate
      {
        nextDate := nextDate + daysToAdd;
      }
    }
  }
}
