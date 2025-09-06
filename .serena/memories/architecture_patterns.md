# Architecture Patterns & Design Guidelines

## Multi-Agent Architecture (Volt Agent Framework)

### Supervisor Pattern Implementation
- **GameMaster Agent**: L1 supervisor, orchestrates all other agents
- **Specialized Agents**: L2/L3 agents for specific tasks
- **Delegation Logic**: GameMaster delegates based on context and task type

### Agent Hierarchy
```
GameMaster (grok-4) - L1 Supervisor
├── StoryTeller (grok-4) - L2 Narrative
├── EventManager (grok-code-fast-1) - L2 Logic  
├── NPC Agents (grok-3-mini) - L3 Characters
│   ├── Elder_Morgan
│   ├── Merchant_Grom
│   └── Elara_Sage
└── ImageGenerator (grok-2-image-1212) - L3 Visual
```

## State Management (2-Layer Design)

### Persistent State (LibSQL/SQLite)
- Player character data
- Inventory and items  
- Quest progress
- Game flags and achievements
- NPC relationships

### Temporary State (userContext)
- Current location
- Weather conditions
- Combat state  
- Session-specific data

## Model Selection Strategy (Cost Optimization)
- **grok-4**: Complex narrative generation, strategic decisions
- **grok-3-mini**: Simple dialogue, cost-optimized interactions  
- **grok-code-fast-1**: Logic processing, rapid calculations
- **grok-2-image-1212**: Visual content generation

## Design Patterns Used

### Agent Communication
- Message passing between agents with structured context
- Task delegation based on complexity and cost optimization
- Unified response format (JSON with narrative, stateChanges, choices)

### Error Handling
- Custom GameError class with error codes
- Centralized error handling and logging
- Graceful degradation on API failures

### Validation & Safety
- Zod schemas for all data validation
- Input sanitization for user commands
- Rate limiting and cost monitoring

### Performance Optimizations
- Prompt caching (75% cost reduction potential)
- Batch processing for multiple NPC responses  
- Streaming responses with `streamText`
- Memory management and cleanup

## Core Game Mechanics Architecture

### 30-Day Time System
- 1 day = 1 turn structure
- Time phases: morning/noon/evening/night
- Event scheduling based on day progression

### Choice & Consequence System
- Dynamic choice generation based on context
- Immediate and delayed effect processing
- State change propagation across systems

### NPC Relationship System
- Affinity and trust metrics
- Knowledge sharing between NPCs
- Context-aware dialogue generation