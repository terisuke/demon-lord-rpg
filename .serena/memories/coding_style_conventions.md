# Coding Style & Conventions

## TypeScript Style Guide

### Naming Conventions
- **Classes**: PascalCase (e.g., `GameMasterAgent`, `PlayerStats`)
- **Interfaces**: PascalCase (e.g., `GameState`, `PlayerRole`)  
- **Functions/Methods**: camelCase (e.g., `processPlayerAction`, `generateChoices`)
- **Variables**: camelCase (e.g., `currentDay`, `playerName`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_DAYS`, `DEFAULT_PLAYER_ROLE`)
- **Enums**: PascalCase with UPPER_SNAKE_CASE values

### Type Definitions
- Use explicit type definitions for all function parameters and return types
- Leverage Union types for enums and choices (e.g., `PlayerRole = "hero" | "merchant" | "coward"`)
- Use interface extension for related types
- Utilize Zod schemas for runtime validation

### File Organization
- 1 file = 1 primary export principle
- Use index files for re-exporting (`src/agents/index.ts`)
- Path mapping configured in tsconfig.json (`@/agents`, `@/types`, etc.)

### Error Handling
- Custom `GameError` class with error codes and details
- Comprehensive try-catch blocks with proper error wrapping
- Structured error logging with context

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- No unused variables/parameters allowed  
- Explicit return types required
- No implicit any types