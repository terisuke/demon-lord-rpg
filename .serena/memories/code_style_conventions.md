# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022 with modern JavaScript features
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: Full TypeScript strict checking enabled
- **Path Mapping**: `@/*` for src imports

## Naming Conventions
- **Classes/Interfaces**: PascalCase (GameLoop, AIVISConfig)
- **Functions/Methods**: camelCase (processPlayerAction, synthesizeNarration)  
- **Variables**: camelCase, UPPER_CASE for constants, PascalCase for components
- **Files**: camelCase for utilities, PascalCase for classes/agents

## Code Organization
```
src/
├── agents/         # Agent implementations (GameMaster, NPC, etc.)
├── types/          # TypeScript type definitions
├── schemas/        # Zod validation schemas
├── utils/          # Utility functions
├── services/       # External API integrations
├── game/           # Game logic and loops
├── features/       # Feature implementations
├── workflows/      # Multi-agent workflows
└── config/         # Configuration files
```

## ESLint Rules
- TypeScript strict checking with recommended rules
- Prettier integration for formatting
- No unused variables (prefix with _ to ignore)
- Prefer nullish coalescing and optional chaining
- No floating promises - all async operations must be handled
- Console.log allowed for game output
- Naming convention enforcement

## Import Organization
- Sort imports alphabetically
- Path aliases preferred: `@/types`, `@/agents`, etc.
- External dependencies first, then internal modules

## Error Handling
- Use custom GameError class
- Comprehensive try-catch blocks
- Zod schemas for all data validation
- Proper async/await error handling

## Comments Policy
- Minimal comments - code should be self-documenting
- JSDoc for public APIs and complex functions
- Inline comments only for complex business logic
- No comments for obvious code