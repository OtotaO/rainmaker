# Rainmaker Verification System

This directory contains formal verification proofs using Dafny to ensure the correctness of the Rainmaker system.

## Core Verification Modules

### Original System
- `component-compatibility.dfy` - Proves components work together
- `schema-consistency.dfy` - Ensures type alignment across layers
- `build-pipeline-invariants.dfy` - Verifies build process correctness
- `registry-expansion-specs.dfy` - Component registry quality checks

### Expanded Real-World Verification
- `business-logic-verification.dfy` - Order processing, inventory, financial calculations
- `state-machine-verification.dfy` - Order lifecycle, user states, payment flows
- `distributed-operations-verification.dfy` - Saga patterns, compensation logic

## Running Verification

```bash
# Verify all modules
./verify-all.sh

# Verify specific module
dafny verify business-logic-verification.dfy
```

## Key Guarantees

1. **Business Logic**: Pricing calculations never produce negative values
2. **State Machines**: Invalid transitions are mathematically impossible
3. **Distributed Ops**: Automatic compensation maintains consistency
4. **Type Safety**: Schemas align perfectly across all layers

## Integration

The verification integrates with runtime code in:
- `packages/api/src/verification/business-logic-runtime.ts`
- `packages/api/src/verification/state-machine-runtime.ts`
- `packages/api/src/verification/distributed-operations-runtime.ts`

See [RAINMAKER_VERIFICATION_SYSTEM.md](RAINMAKER_VERIFICATION_SYSTEM.md) for the complete system documentation.
