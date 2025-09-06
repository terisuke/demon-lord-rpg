# Task Completion Checklist

## Before Committing Code
1. **Type Check**: `npm run typecheck`
2. **Lint**: `npm run lint` (fix any errors)
3. **Format**: `npm run format`
4. **Build**: `npm run build` (ensure no build errors)

## Code Quality Verification
- [ ] All TypeScript strict mode requirements met
- [ ] No ESLint errors or warnings
- [ ] Proper error handling implemented
- [ ] Zod schemas for data validation
- [ ] Path aliases used consistently
- [ ] No unused imports or variables

## Testing (when implemented)
- [ ] Unit tests pass: `npm test`
- [ ] Integration tests if applicable
- [ ] Manual testing of new features

## Documentation Updates
- [ ] Update relevant memory files if architecture changes
- [ ] Update CLAUDE.md if development process changes
- [ ] Add JSDoc comments for new public APIs

## Game-Specific Checklist
- [ ] Agent communication patterns followed
- [ ] Model selection appropriate for task complexity
- [ ] Game state management properly handled
- [ ] Audio/image generation integration tested
- [ ] Multi-language support maintained (Japanese/English)

## Environment Verification
- [ ] .env variables properly configured
- [ ] External API integrations working (Grok, AIVIS)
- [ ] Server startup without errors
- [ ] Port availability checked

## Git Workflow
- [ ] Meaningful commit messages
- [ ] Small, focused commits
- [ ] No sensitive data in commits
- [ ] Branch naming follows convention