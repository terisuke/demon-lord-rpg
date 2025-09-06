# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**30日後の魔王襲来** (The Demon Lord's Arrival in 30 Days) - An AI-driven text-based RPG where players choose roles (hero, merchant, coward, traitor, etc.) and prepare for a demon lord's arrival in 30 days through various strategies.

## Tech Stack & Architecture

- **Framework**: Volt Agent (multi-agent orchestration)
- **AI/LLM**: Grok API (xAI) with model selection based on task complexity
- **Language**: TypeScript
- **Database**: LibSQL (SQLite) for save data
- **Communication**: Server-Sent Events for real-time updates
- **Audio**: AIVIS Cloud API (optional, under development)

### Multi-Agent Architecture (Supervisor Pattern)
- **GameMaster Agent** (grok-4): L1 supervisor, handles complex reasoning and world state
- **StoryTeller Agent** (grok-4): L2 narrative generation and descriptions  
- **EventManager Agent** (grok-code-fast-1): L2 logic processing and state management
- **NPC Agents** (grok-3-mini): L3 individual character interactions
- **ImageGenerator Agent** (grok-2-image-1212): L3 visual generation

## Development Commands

```bash
# Project initialization (if needed)
npm create voltagent-app@latest .

# Install dependencies
npm install @voltagent/core @voltagent/vercel-ai @ai-sdk/xai zod

# Development server
npm run dev

# Environment setup
cp .env.example .env
# Edit .env and add your XAI_API_KEY

# Build and production
npm run build
npm start

# Testing (check for test scripts in package.json)
npm test
npm run test:unit
npm run test:integration

# Linting and type checking
npm run lint
npm run typecheck
```

## Key Architectural Patterns

### Agent Communication
- Supervisor/Sub-agent pattern with GameMaster as supervisor
- Message passing between agents with structured context
- Task delegation based on complexity and cost optimization

### State Management (2-layer)
- **Persistent State**: Player character, inventory, quests, game flags (LibSQL)  
- **Temporary State**: Current location, weather, combat state, session data (userContext)

### Model Selection Strategy
- `grok-4`: Complex narrative generation, strategic decisions
- `grok-3-mini`: Simple dialogue, cost-optimized interactions
- `grok-code-fast-1`: Logic processing, rapid calculations
- `grok-2-image-1212`: Visual content generation

## Core Game Mechanics

- **30-Day Time System**: Each day = 1 turn with morning/noon/evening/night phases
- **Role-Based Gameplay**: 7 roles (hero, merchant, coward, traitor, villager, sage, mercenary)
- **Multiple Endings**: 8+ endings based on player preparation and choices
- **Dynamic Difficulty**: Automatic adjustment based on player performance

## Project Structure

```
demon-lord-rpg/
├── src/
│   ├── agents/         # Agent implementations (GameMaster, NPC, etc.)
│   ├── types/          # TypeScript type definitions
│   ├── schemas/        # Zod validation schemas
│   ├── utils/          # Utility functions
│   ├── services/       # External API integrations
│   └── index.ts        # Entry point
├── public/             # Frontend assets
├── docs/               # Comprehensive documentation
├── specs/              # Game design specifications
└── tests/              # Test files
```

## Important Files to Reference

- `docs/ARCHITECTURE.md` - Detailed system architecture
- `docs/DEVELOPMENT.md` - Coding standards and workflows  
- `docs/GAME_DESIGN.md` - Game mechanics and balance
- `specs/game-flow.md` - Story progression logic
- `.env.example` - Configuration options

## Development Guidelines

### Code Style
- Use TypeScript strict mode with explicit typing
- PascalCase for classes/interfaces, camelCase for functions/variables
- Comprehensive error handling with custom GameError class
- Zod schemas for all data validation

### Agent Development
- Extend base Agent class from @voltagent/core
- Use appropriate model for task complexity (cost optimization)
- Implement proper cleanup to prevent memory leaks
- Follow supervisor pattern for agent communication

### Cost Management
- Cache frequently used prompts (75% cost reduction)
- Use batch processing for multiple NPC responses
- Select appropriate models based on task complexity
- Monitor API usage with VoltOps (optional)

## Environment Variables

Key variables in `.env`:
- `XAI_API_KEY` - Required for Grok API access
- `AIVIS_API_KEY` - Optional for audio features  
- `DATABASE_URL` - LibSQL connection string
- `DEBUG` - Enable detailed logging
- `FEATURE_*_ENABLED` - Feature flags for development

## Testing Strategy

- Unit tests: Individual agent behavior and utilities
- Integration tests: Agent communication and workflows  
- E2E tests: Complete game scenarios
- Mock Grok API responses for consistent testing

## Performance Considerations

- Stream responses using `streamText` for better UX
- Implement prompt caching for repeated interactions
- Use parallel processing for independent agent tasks
- Monitor memory usage in long gaming sessions

## Security Notes

- Never commit API keys or secrets
- Validate all user inputs with Zod schemas
- Sanitize command strings before processing
- Use environment variables for all configuration