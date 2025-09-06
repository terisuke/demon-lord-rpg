# Project Overview

## Purpose
**30日後の魔王襲来** (The Demon Lord's Arrival in 30 Days) - An AI-driven text-based RPG where players choose roles (hero, merchant, coward, traitor, etc.) and prepare for a demon lord's arrival in 30 days through various strategies.

## Tech Stack
- **Framework**: Volt Agent (multi-agent orchestration)
- **AI/LLM**: Grok API (xAI) with model selection based on task complexity
- **Language**: TypeScript with strict mode
- **Audio**: AIVIS Cloud API for Japanese text-to-speech synthesis
- **Server**: Express.js with JSON API endpoints
- **Database**: LibSQL (SQLite) for save data (planned)
- **Communication**: Server-Sent Events for real-time updates (planned)

## Architecture Pattern
Multi-Agent Architecture using Supervisor Pattern:
- **GameMaster Agent** (grok-4): L1 supervisor, complex reasoning and world state
- **StoryTeller Agent** (grok-4): L2 narrative generation and descriptions  
- **EventManager Agent** (grok-code-fast-1): L2 logic processing and state management
- **NPC Agents** (grok-3-mini): L3 individual character interactions
- **ImageGenerator Agent** (grok-2-image-1212): L3 visual generation

## Key Features
- 30-day time system with morning/noon/evening/night phases
- Role-based gameplay with 7+ different roles
- Multiple endings (8+) based on player choices
- Dynamic difficulty adjustment
- AI-generated narrative content
- Audio narration with emotion-based voice synthesis
- Periodic image generation (every 3 days)