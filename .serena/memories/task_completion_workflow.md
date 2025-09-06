# Task Completion Workflow

## Standard Process When Task is Complete

### 1. Code Quality Checks (MANDATORY)
```bash
npm run typecheck         # Ensure no type errors
npm run lint             # Ensure no linting errors (max 0 warnings)
npm run format:check     # Verify code formatting
npm run build           # Ensure successful compilation
```

### 2. Testing (When Available)
```bash
npm test                # Run all tests (currently not implemented)
```

### 3. Git Workflow
```bash
git status              # Check current state
git add .               # Stage all changes  
git commit -m "type(scope): description"  # Follow conventional commits
git push origin dev     # Push to development branch
```

### 4. Commit Message Convention
Format: `<type>(<scope>): <subject>`

**Types:**
- `feat`: New features
- `fix`: Bug fixes  
- `refactor`: Code refactoring
- `docs`: Documentation updates
- `style`: Code formatting
- `test`: Test additions/updates
- `chore`: Build/tooling changes

**Example:**
```
feat(agent): Add merchant NPC with trading system

- Implement TradeAgent class
- Add inventory management for trades  
- Create trade UI components

Closes #123
```

### 5. Pull Request Process
1. Push to feature/fix branch
2. Create PR to `dev` branch (not `main`)
3. Ensure all checks pass
4. Request code review
5. Merge after approval

## Error Resolution Priority

### High Priority (Must Fix Before Commit)
- TypeScript compilation errors
- ESLint errors (max 0 warnings policy)
- Build failures
- Missing required environment variables

### Medium Priority (Should Fix)
- Code formatting issues
- Unused imports/variables
- Missing type definitions
- Inconsistent naming conventions

### Low Priority (Nice to Have)
- Performance optimizations
- Documentation improvements
- Refactoring opportunities

## Branch Strategy
- `main`: Production-ready code
- `dev`: Development integration branch (target for PRs)
- `feature/*`: New feature development  
- `fix/*`: Bug fixes
- `refactor/*`: Code refactoring