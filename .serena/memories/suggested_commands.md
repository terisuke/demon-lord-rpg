# Suggested Commands

## Development Commands
```bash
# Development server with hot reload
npm run dev

# Development with debugger
npm run dev:debug

# Build production
npm run build

# Start production server
npm start
npm run start:prod  # with NODE_ENV=production
```

## Code Quality Commands
```bash
# Type checking
npm run typecheck
npm run typecheck:watch  # continuous

# Linting
npm run lint
npm run lint:fix  # auto-fix issues

# Formatting
npm run format
npm run format:check
```

## Testing Commands
```bash
# Tests (currently not implemented)
npm test
npm run test:watch
```

## Utility Commands
```bash
# Clean build directory
npm run clean

# Package preparation
npm run prepare
npm run prepack
```

## System Commands (macOS Darwin)
```bash
# File operations
ls -la
find . -name "*.ts" -type f
grep -r "pattern" src/

# Git operations
git status
git log --oneline -10
git diff HEAD~1

# Process management
lsof -i :3000  # check port usage
kill -9 $(lsof -t -i:3000)  # kill process on port
```

## Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Install specific volt agent packages
npm install @voltagent/core @voltagent/vercel-ai @ai-sdk/xai zod
```