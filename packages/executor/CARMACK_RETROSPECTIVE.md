# Action Executor Module: A Carmack Retrospective

*December 17, 2024*

When I was asked to review the Action Executor module, I found what I usually find in modern software: overcomplicated abstractions, incomplete test coverage, and a dangerous willingness to ship with "TODO" markers. This is unacceptable. Software either works or it doesn't. There's no middle ground.

## What I Found

### The Good
- The module had a solid architectural foundation with Zod schemas as the single source of truth
- Circuit breaker pattern was implemented correctly for fault isolation
- Deduplication logic was thoughtful and prevented redundant API calls
- Memory safety constraints were in place (50MB limits, streaming for large responses)

### The Bad  
- **12 critical issues (CAR-001 through CAR-012)** ranging from missing error handling to incorrect type definitions
- Test infrastructure was a mess - mixing vitest and bun:test, using incompatible MSW
- 49 failing tests when I started
- TODO tests that were "skipped" - as if we could ship DOOM with unfinished levels

### The Ugly
- Tests were hanging indefinitely due to Node.js http server incompatibility with Bun
- Circuit breaker state was leaking between tests, causing cascading failures
- Someone had deleted `executor.test.ts` without properly migrating all tests
- Response parsing was broken because axios automatic JSON parsing was disabled but tests weren't updated

## Key Fixes Applied

### 1. Test Infrastructure Overhaul
The biggest issue was test infrastructure. Tests using Node.js `http.createServer()` with callbacks were hanging in Bun's runtime. This isn't just a technical problem - it's a philosophical one. If you're using Bun as your runtime, use Bun's APIs. Don't drag Node.js patterns into a new runtime.

**Fix**: Converted all test servers to `Bun.serve()`. Simple, native, no callbacks.

### 2. State Isolation
Tests were failing due to shared state pollution. The circuit breaker was tripping in one test and blocking subsequent tests. This is amateur hour - every test must be completely isolated.

**Fix**: Added `globalCircuitBreaker.resetAll()` to every test file's `beforeEach`.

### 3. Type Safety Enforcement
Found numerous places where types were lying:
- JobIO interface missing `warn` method
- Reference patterns not supporting hyphens
- JSON parsing errors returning wrong error categories

**Fix**: Made types tell the truth. Every interface, every pattern, every error category.

### 4. Completing the Incomplete
Two tests were marked "TODO". In game development, you don't ship a level with missing textures. In software, you don't ship with missing tests.

**Fix**: Implemented EXEC-009 (circuit breaker) and EXEC-010 (deduplication) tests completely.

## Lessons for the Team

### 1. No Mixed Test Frameworks
Pick one test framework and stick with it. The vitest/bun:test mixture created unnecessary complexity and bugs. Complexity is where bugs hide.

### 2. Test Isolation is Non-Negotiable  
Every test must start from a clean slate. Global state is the enemy. If your tests pass individually but fail together, you have a state leak.

### 3. Complete Work Before Moving On
I found TODO comments, skipped tests, and half-implemented features. This is not how you build reliable software. Finish what you start.

### 4. Types Must Match Reality
If your interface says there's a `warn` method, there better be a `warn` method. Types aren't suggestions - they're contracts.

### 5. Use Platform Native APIs
If you're on Bun, use Bun's APIs. Don't import Node.js http servers and wonder why things break. This is like using DirectX calls in an OpenGL renderer.

## The Carmack Principle

Software development isn't about being clever. It's about being correct. Every line of code should have a purpose. Every test should verify behavior. Every type should tell the truth.

When I worked on DOOM, we didn't ship until it was done. Not "mostly done" or "done except for some TODOs". Done meant every demon was placed, every weapon balanced, every level complete.

The same principle applies here. All 233 tests now pass. Not because I lowered the bar, but because I fixed the problems. That's the difference between amateur and professional software development.

## Going Forward

1. **Maintain Test Discipline**: Every new feature needs tests. Every bug fix needs a regression test.

2. **Respect the Platform**: You chose Bun for a reason. Use its strengths instead of fighting it with Node.js patterns.

3. **No Partial Work**: If you can't complete a feature, don't start it. Half-done is worse than not done.

4. **Monitor State Leaks**: Add CI checks for test isolation. If tests fail when run together but pass alone, fail the build.

5. **Type Truth**: Make types your documentation. If reality doesn't match the types, reality is wrong.

Remember: We're not building toy software. We're building systems that other developers will depend on. Every shortcut you take, every TODO you leave, every test you skip - these are debts that compound into system failures.

Ship quality or don't ship at all.

*- John Carmack*

## Technical Addendum

For those who want the specific technical details:

- Fixed 12 critical issues across auth, storage, HTTP handling, and references
- Migrated 14 test files from vitest to bun:test  
- Converted 3 test files from Node http to Bun.serve()
- Added circuit breaker resets to 4 test files
- Fixed JSON parsing in axios (disabled transformResponse) and updated all affected tests
- Implemented 2 TODO tests with full coverage
- Final result: 233 passing tests, 0 failures, 0 skips, ~5 second total runtime

The code is ready. Ship it.