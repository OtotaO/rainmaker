// State Machine Verification
// Ensures state transitions follow business rules and maintain consistency

module StateMachineVerification {
  // Order State Machine Example
  datatype OrderState = 
    | Created
    | PaymentPending
    | PaymentProcessing
    | PaymentFailed
    | Paid
    | Preparing
    | ReadyForShipment
    | Shipped
    | InTransit
    | Delivered
    | Cancelled
    | Refunded
    | Disputed

  datatype OrderEvent =
    | InitiatePayment
    | PaymentAuthorized
    | PaymentDeclined
    | PaymentCaptured
    | StartPreparation
    | PreparationComplete
    | ShipOrder(carrier: string, trackingNumber: string)
    | UpdateTracking(location: string)
    | ConfirmDelivery(signature: string)
    | CancelOrder(reason: string)
    | InitiateRefund
    | RefundComplete
    | OpenDispute(reason: string)
    | ResolveDispute

  class OrderStateMachine {
    // Define valid state transitions
    predicate ValidTransition(currentState: OrderState, event: OrderEvent, nextState: OrderState)
    {
      match (currentState, event, nextState) {
        // Payment flow
        case (Created, InitiatePayment, PaymentPending) => true
        case (PaymentPending, PaymentAuthorized, PaymentProcessing) => true
        case (PaymentProcessing, PaymentCaptured, Paid) => true
        case (PaymentProcessing, PaymentDeclined, PaymentFailed) => true
        case (PaymentFailed, InitiatePayment, PaymentPending) => true
        
        // Fulfillment flow
        case (Paid, StartPreparation, Preparing) => true
        case (Preparing, PreparationComplete, ReadyForShipment) => true
        case (ReadyForShipment, ShipOrder(_, _), Shipped) => true
        case (Shipped, UpdateTracking(_), InTransit) => true
        case (InTransit, UpdateTracking(_), InTransit) => true // Can update multiple times
        case (InTransit, ConfirmDelivery(_), Delivered) => true
        
        // Cancellation flow
        case (Created, CancelOrder(_), Cancelled) => true
        case (PaymentPending, CancelOrder(_), Cancelled) => true
        case (PaymentFailed, CancelOrder(_), Cancelled) => true
        case (Paid, CancelOrder(_), Cancelled) => true
        case (Preparing, CancelOrder(_), Cancelled) => true
        
        // Refund flow
        case (Cancelled, InitiateRefund, Refunded) => true
        case (Delivered, InitiateRefund, Refunded) => true
        case (Disputed, InitiateRefund, Refunded) => true
        
        // Dispute flow
        case (Delivered, OpenDispute(_), Disputed) => true
        case (Disputed, ResolveDispute, Delivered) => true
        
        case _ => false
      }
    }

    // Verify state transition maintains invariants
    method TransitionState(
      currentState: OrderState,
      event: OrderEvent
    ) returns (nextState: OrderState, success: bool)
      ensures success ==> ValidTransition(currentState, event, nextState)
      ensures !success ==> nextState == currentState
    {
      match (currentState, event) {
        // Payment transitions
        case (Created, InitiatePayment) => 
          nextState := PaymentPending;
          success := true;
        
        case (PaymentPending, PaymentAuthorized) =>
          nextState := PaymentProcessing;
          success := true;
        
        case (PaymentProcessing, PaymentCaptured) =>
          nextState := Paid;
          success := true;
        
        case (PaymentProcessing, PaymentDeclined) =>
          nextState := PaymentFailed;
          success := true;
        
        case (PaymentFailed, InitiatePayment) =>
          nextState := PaymentPending;
          success := true;
        
        // Fulfillment transitions
        case (Paid, StartPreparation) =>
          nextState := Preparing;
          success := true;
        
        case (Preparing, PreparationComplete) =>
          nextState := ReadyForShipment;
          success := true;
        
        case (ReadyForShipment, ShipOrder(_, _)) =>
          nextState := Shipped;
          success := true;
        
        case (Shipped, UpdateTracking(_)) =>
          nextState := InTransit;
          success := true;
        
        case (InTransit, UpdateTracking(_)) =>
          nextState := InTransit; // Stay in transit
          success := true;
        
        case (InTransit, ConfirmDelivery(_)) =>
          nextState := Delivered;
          success := true;
        
        // Cancellation transitions
        case (Created, CancelOrder(_)) =>
          nextState := Cancelled;
          success := true;
        
        case (PaymentPending, CancelOrder(_)) =>
          nextState := Cancelled;
          success := true;
        
        case (PaymentFailed, CancelOrder(_)) =>
          nextState := Cancelled;
          success := true;
        
        case (Paid, CancelOrder(_)) =>
          nextState := Cancelled;
          success := true;
        
        case (Preparing, CancelOrder(_)) =>
          nextState := Cancelled;
          success := true;
        
        // Refund transitions
        case (Cancelled, InitiateRefund) =>
          nextState := Refunded;
          success := true;
        
        case (Delivered, InitiateRefund) =>
          nextState := Refunded;
          success := true;
        
        case (Disputed, InitiateRefund) =>
          nextState := Refunded;
          success := true;
        
        // Dispute transitions
        case (Delivered, OpenDispute(_)) =>
          nextState := Disputed;
          success := true;
        
        case (Disputed, ResolveDispute) =>
          nextState := Delivered;
          success := true;
        
        // Invalid transition
        case _ =>
          nextState := currentState;
          success := false;
      }
    }

    // Business rules for state transitions
    predicate CanShipOrder(state: OrderState)
    {
      state == ReadyForShipment
    }

    predicate CanRefundOrder(state: OrderState)
    {
      state == Cancelled || state == Delivered || state == Disputed
    }

    predicate CanCancelOrder(state: OrderState)
    {
      state == Created || state == PaymentPending || state == PaymentFailed || 
      state == Paid || state == Preparing
    }

    predicate IsTerminalState(state: OrderState)
    {
      state == Delivered || state == Refunded || state == Cancelled
    }

    // Verify compensation is possible for rollback
    method CanCompensate(state: OrderState) returns (canCompensate: bool)
      ensures canCompensate ==> (state == Paid || state == Preparing || state == ReadyForShipment)
    {
      match state {
        case Paid, Preparing, ReadyForShipment => 
          canCompensate := true;
        case _ =>
          canCompensate := false;
      }
    }

    // Verify state history is valid
    method ValidateStateHistory(history: seq<OrderState>) returns (valid: bool)
      requires |history| > 0
      ensures valid ==> history[0] == Created
      ensures valid ==> forall i :: 0 < i < |history| ==> 
        exists event :: ValidTransition(history[i-1], event, history[i])
    {
      if history[0] != Created {
        valid := false;
        return;
      }

      valid := true;
      var i := 1;
      
      while i < |history| && valid
        invariant 1 <= i <= |history|
        invariant valid ==> forall j :: 1 <= j < i ==> 
          exists event :: ValidTransition(history[j-1], event, history[j])
      {
        // Check if there's a valid transition from previous to current
        valid := ExistsValidTransition(history[i-1], history[i]);
        i := i + 1;
      }
    }

    // Helper to check if a valid transition exists
    method ExistsValidTransition(fromState: OrderState, toState: OrderState) returns (exists: bool)
      ensures exists ==> exists event :: ValidTransition(fromState, event, toState)
    {
      // This is a simplified check - in practice, we'd enumerate all events
      exists := false;
      
      // Check all possible events
      if ValidTransition(fromState, InitiatePayment, toState) ||
         ValidTransition(fromState, PaymentAuthorized, toState) ||
         ValidTransition(fromState, PaymentDeclined, toState) ||
         ValidTransition(fromState, PaymentCaptured, toState) ||
         ValidTransition(fromState, StartPreparation, toState) ||
         ValidTransition(fromState, PreparationComplete, toState) ||
         ValidTransition(fromState, ShipOrder("", ""), toState) ||
         ValidTransition(fromState, UpdateTracking(""), toState) ||
         ValidTransition(fromState, ConfirmDelivery(""), toState) ||
         ValidTransition(fromState, CancelOrder(""), toState) ||
         ValidTransition(fromState, InitiateRefund, toState) ||
         ValidTransition(fromState, RefundComplete, toState) ||
         ValidTransition(fromState, OpenDispute(""), toState) ||
         ValidTransition(fromState, ResolveDispute, toState) {
        exists := true;
      }
    }
  }

  // User Account State Machine
  datatype UserState = 
    | Registered
    | EmailVerified
    | ProfileComplete
    | Active
    | Suspended
    | Deactivated
    | Deleted

  datatype UserEvent =
    | VerifyEmail(token: string)
    | CompleteProfile
    | ActivateAccount
    | SuspendAccount(reason: string)
    | ReactivateAccount
    | DeactivateAccount
    | DeleteAccount
    | RestoreAccount

  class UserStateMachine {
    predicate ValidUserTransition(currentState: UserState, event: UserEvent, nextState: UserState)
    {
      match (currentState, event, nextState) {
        case (Registered, VerifyEmail(_), EmailVerified) => true
        case (EmailVerified, CompleteProfile, ProfileComplete) => true
        case (ProfileComplete, ActivateAccount, Active) => true
        case (Active, SuspendAccount(_), Suspended) => true
        case (Suspended, ReactivateAccount, Active) => true
        case (Active, DeactivateAccount, Deactivated) => true
        case (Deactivated, RestoreAccount, Active) => true
        case (Active, DeleteAccount, Deleted) => true
        case (Suspended, DeleteAccount, Deleted) => true
        case (Deactivated, DeleteAccount, Deleted) => true
        case _ => false
      }
    }

    // Verify user lifecycle constraints
    predicate CanPerformActions(state: UserState)
    {
      state == Active
    }

    predicate CanRecover(state: UserState)
    {
      state == Suspended || state == Deactivated
    }

    predicate IsPermanentlyRemoved(state: UserState)
    {
      state == Deleted
    }
  }

  // Payment Processing State Machine
  datatype PaymentState =
    | Initiated
    | Authorizing
    | Authorized
    | Capturing
    | Captured
    | Settling
    | Settled
    | Declining
    | Declined
    | Reversing
    | Reversed
    | Failed

  datatype PaymentEvent =
    | StartAuthorization
    | AuthorizationSuccess(authCode: string)
    | AuthorizationFailure(reason: string)
    | StartCapture
    | CaptureSuccess(transactionId: string)
    | CaptureFailure(reason: string)
    | StartSettlement
    | SettlementComplete
    | InitiateReversal(reason: string)
    | ReversalComplete

  class PaymentStateMachine {
    predicate ValidPaymentTransition(currentState: PaymentState, event: PaymentEvent, nextState: PaymentState)
    {
      match (currentState, event, nextState) {
        // Authorization flow
        case (Initiated, StartAuthorization, Authorizing) => true
        case (Authorizing, AuthorizationSuccess(_), Authorized) => true
        case (Authorizing, AuthorizationFailure(_), Declining) => true
        case (Declining, _, Declined) => true
        
        // Capture flow
        case (Authorized, StartCapture, Capturing) => true
        case (Capturing, CaptureSuccess(_), Captured) => true
        case (Capturing, CaptureFailure(_), Failed) => true
        
        // Settlement flow
        case (Captured, StartSettlement, Settling) => true
        case (Settling, SettlementComplete, Settled) => true
        
        // Reversal flow
        case (Authorized, InitiateReversal(_), Reversing) => true
        case (Captured, InitiateReversal(_), Reversing) => true
        case (Reversing, ReversalComplete, Reversed) => true
        
        case _ => false
      }
    }

    // Business rules for payment states
    predicate CanCapture(state: PaymentState)
    {
      state == Authorized
    }

    predicate CanReverse(state: PaymentState)
    {
      state == Authorized || state == Captured
    }

    predicate IsSuccessfulPayment(state: PaymentState)
    {
      state == Settled
    }

    predicate IsFailedPayment(state: PaymentState)
    {
      state == Declined || state == Failed || state == Reversed
    }

    // Verify payment amount consistency through state transitions
    method VerifyAmountConsistency(
      originalAmount: real,
      authorizedAmount: real,
      capturedAmount: real,
      settledAmount: real,
      state: PaymentState
    ) returns (consistent: bool)
      requires originalAmount >= 0.0
      requires authorizedAmount >= 0.0
      requires capturedAmount >= 0.0
      requires settledAmount >= 0.0
      ensures consistent ==> (
        (state == Authorized ==> authorizedAmount <= originalAmount) &&
        (state == Captured ==> capturedAmount <= authorizedAmount) &&
        (state == Settled ==> settledAmount == capturedAmount)
      )
    {
      consistent := true;
      
      match state {
        case Authorized =>
          consistent := authorizedAmount <= originalAmount;
        
        case Captured =>
          consistent := capturedAmount <= authorizedAmount && 
                       authorizedAmount <= originalAmount;
        
        case Settled =>
          consistent := settledAmount == capturedAmount &&
                       capturedAmount <= authorizedAmount &&
                       authorizedAmount <= originalAmount;
        
        case _ =>
          // Other states don't have amount constraints
          consistent := true;
      }
    }
  }
}
