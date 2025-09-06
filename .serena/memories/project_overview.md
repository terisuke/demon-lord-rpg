# Project Overview

## Purpose
**30日後の魔王襲来** (The Demon Lord's Arrival in 30 Days) - AI-driven text-based RPG where players choose roles (hero, merchant, coward, traitor, etc.) and prepare for a demon lord's arrival in 30 days through various strategies.

## Tech Stack & Architecture
- **Framework**: Volt Agent (multi-agent orchestration)  
- **AI/LLM**: Grok API (xAI) with model selection based on task complexity
- **Language**: TypeScript (ES2022, strict mode)
- **Database**: LibSQL (SQLite) for save data
- **Communication**: Server-Sent Events for real-time updates
- **Audio**: AIVIS Cloud API (optional, under development)

## Multi-Agent Architecture (Supervisor Pattern)
- **GameMaster Agent** (grok-4): L1 supervisor, handles complex reasoning and world state
- **StoryTeller Agent** (grok-4): L2 narrative generation and descriptions  
- **EventManager Agent** (grok-code-fast-1): L2 logic processing and state management
- **NPC Agents** (grok-3-mini): L3 individual character interactions
- **ImageGenerator Agent** (grok-2-image-1212): L3 visual generation

## Key Features
- **30-Day Time System**: Each day = 1 turn with morning/noon/evening/night phases
- **Role-Based Gameplay**: 7 roles (hero, merchant, coward, traitor, villager, sage, mercenary)
- **Multiple Endings**: 8+ endings based on player preparation and choices
- **Dynamic Difficulty**: Automatic adjustment based on player performance

## Project Structure
```
src/
├── agents/         # Agent implementations (GameMaster, NPC, etc.)
├── types/          # TypeScript type definitions
├── schemas/        # Zod validation schemas
├── utils/          # Utility functions
├── services/       # External API integrations
├── game/           # Game logic and loops
├── features/       # Feature implementations (audio, images)
├── workflows/      # Game workflows
└── config/         # Configuration files
```