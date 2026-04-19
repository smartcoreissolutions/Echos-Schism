# Echo's Schism (艾可的裂变)

**2D High-Speed Action / Narrative Puzzle Game**

> A cyberpunk psychological thriller about identity, duality, and the battle within.

## Core Concept

In the near-future city of Gridpoint, human consciousness can be digitized. You are **Echo** — the sole surviving experiment of the Gridpoint Laboratory, with the AI chip **Janus** splitting your mind into two warring personalities.

**Press SHIFT to switch between:**
- 🔥 **Ares (Frenzy)** — Chainsaw blade, melee combos, life-steal berserker
- 🧊 **Athena (Calm)** — Precision rapier, ranged energy shots, tactical control

## Gameplay

### Dual Persona Combat
| Feature | 🔥 Ares (Frenzy) | 🧊 Athena (Calm) |
|---------|------------------|-------------------|
| Weapon | Chain Blade / Claws | Rapier / Energy Cannon |
| Style | Close-range combos, life-steal | Mid-range precision, parry & control |
| Special | **Blood Rush**: Invincible dash (costs HP) | **Tactical Field**: Slow zone + bullet reflect |
| Ultimate | **Ember Immolation**: Full-screen DoT | **Absolute Zero**: AoE freeze |

### Perfect Shift
Switch at the exact moment an enemy attacks → triggers **Temporal Fracture**: enemies slow for 2s + current persona gets a power buff.

### Stability System
- A balance bar tracks your mental state
- Staying too long in one persona pushes you toward critical states:
  - **Deep Frenzy**: +50% damage, but bleeding HP, red distorted vision
  - **Deep Calm**: Extreme defense, but -70% speed, no dash
- Keep the needle in the **Golden Zone** (center 20%) for energy regen bonus

### Three Endings
- 🔥 **Ending A: World in Flames** — Frenzy dominates, Echo destroys the lab but loses self
- 🧊 **Ending B: Cold Machine** — Calm dominates, Echo becomes a perfect emotionless killer
- ⚖️ **Ending C: Soul Resonance** — Perfect balance, personas merge, Echo reclaims humanity

## Play

Open `index.html` in any modern browser.

### Controls
| Key | Action |
|-----|--------|
| A/D or ←/→ | Move |
| W or ↑ | Jump |
| SHIFT | Switch Persona |
| J / Click | Attack |
| K | Special Ability |
| L | Ultimate (when charged) |
| SPACE | Dash/Dodge |
| E | Interact |

## Tech Stack
- Pure HTML5 Canvas + JavaScript (no dependencies)
- Dynamic audio system with persona-reactive soundtrack
- Particle effects engine for visual feedback
- Responsive — works in any modern browser

## Project Structure
```
Echos-Schism/
├── index.html          # Game entry point
├── src/
│   ├── core/           # Engine: game loop, input, camera, audio
│   ├── entities/       # Player, enemies, projectiles
│   ├── systems/        # Combat, stability, particles, dialogue
│   ├── ui/             # HUD, menus, stability bar
│   └── levels/         # Level data and generation
├── assets/             # Sprites, audio (procedurally generated)
└── docs/               # Game design document
```

## License
MIT
