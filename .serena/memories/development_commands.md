# Development Commands

## Essential Commands

### Development Server
```bash
npm run dev                 # Start development server with tsx watch
npm run dev:debug          # Start with debugging enabled  
```

### Building & Production
```bash
npm run build              # Clean, typecheck, and compile TypeScript
npm run clean              # Remove dist directory
npm start                  # Run compiled production build
npm start:prod            # Run with NODE_ENV=production
```

### Code Quality
```bash
npm run lint               # Run ESLint (max 0 warnings)
npm run lint:fix          # Auto-fix ESLint issues
npm run typecheck         # TypeScript type checking (no emit)
npm run typecheck:watch   # Type checking in watch mode
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting
```

### Testing
```bash
npm test                  # Run tests (currently not implemented)
npm run test:watch       # Run tests in watch mode (not implemented)
```

### Project Setup
```bash
npm install               # Install all dependencies
npm run prepare          # Build before installation (runs on npm install)
npm run prepack          # Build before publishing
```

## Git & Development Workflow
```bash
git status               # Check working tree status  
git add .                # Stage all changes
git commit -m "message"  # Commit with message
git push origin dev      # Push to dev branch
```

## Environment Setup
```bash
cp .env.example .env     # Create environment file
# Edit .env file to add:
# - XAI_API_KEY (required for Grok API)
# - AIVIS_API_KEY (optional for audio features)
```

## System Information
- **Platform**: Darwin (macOS)
- **Node.js**: >=18.0.0 required
- **Package Manager**: npm >=8.0.0
- **Main Entry Point**: dist/index.js (after build)
- **Development Entry**: src/index.ts