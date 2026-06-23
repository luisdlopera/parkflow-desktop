#!/bin/bash
set -e

# Unstage everything just in case
git reset HEAD

# Commit 1: Add new integration and unit tests for coverage (>90%)
git add "src/test/java"
git add "src/main/java/com/parkflow/modules/parking/operation/infrastructure/persistence/ParkingSessionJpaAdapter.java" # Transactional fix
git commit -m "test(api): add integration and unit tests to achieve >90% coverage

- Add tests for controllers using MockMvc
- Add @DataJpaTest for repository adapters
- Refactor existing tests to remove ReturnsDeepStubs anti-pattern"

# Commit 2: Fix potential NullPointerException in JwtTokenService
git add src/main/java/com/parkflow/modules/auth/security/JwtTokenService.java
git commit -m "fix(api): prevent NullPointerException in JwtTokenService when secret is missing"

# Commit 3: Fix IDE warnings and unused imports/variables
# (Add the rest of modified files in src/main/java)
git add src/main/java
git commit -m "refactor(api): remove unused imports, variables and suppress type safety warnings"

echo "Granular commits created successfully."
