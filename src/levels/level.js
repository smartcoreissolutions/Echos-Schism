/**
 * Level System - Procedural level generation with platforms and enemy spawning
 */
class Level {
    constructor(width, floorY) {
        this.width = width;
        this.baseFloorY = floorY;
        this.platforms = [];
        this.scanDoors = [];
        this.spawnPoints = [];
        this.bgElements = [];
        this.waveIndex = 0;
        this.waveTimer = 0;
        this.waveCooldown = 8;
        this.enemiesAlive = 0;
    }

    generate(difficulty = 1) {
        this.platforms = [];
        this.scanDoors = [];
        this.bgElements = [];

        // Ground platforms with gaps
        for (let x = 0; x < this.width; x += 200) {
            if (Math.random() > 0.15) { // 85% chance of ground
                this.platforms.push({
                    x, y: this.baseFloorY,
                    width: 180 + Math.random() * 40,
                    height: 30,
                    type: 'ground'
                });
            }
        }

        // Elevated platforms
        const numPlatforms = 5 + Math.floor(difficulty * 3);
        for (let i = 0; i < numPlatforms; i++) {
            const px = 100 + Math.random() * (this.width - 200);
            const py = this.baseFloorY - 80 - Math.random() * 200;
            this.platforms.push({
                x: px, y: py,
                width: 80 + Math.random() * 100,
                height: 12,
                type: 'platform'
            });
        }

        // Scan doors — thick enough to actually see and block passage
        for (let i = 0; i < 2; i++) {
            this.scanDoors.push({
                x: 300 + Math.random() * (this.width - 600),
                y: this.baseFloorY - 80,
                width: 16,
                height: 80,
                persona: Math.random() > 0.5 ? 'frenzy' : 'calm',
                open: false
            });
        }

        // Background buildings
        for (let x = 0; x < this.width; x += 60 + Math.random() * 80) {
            this.bgElements.push({
                x,
                height: 100 + Math.random() * 250,
                width: 40 + Math.random() * 60,
                windows: Math.floor(Math.random() * 8) + 2,
            });
        }

        // Enemy spawn waves — all 5 types from the start, harder waves later
        this.spawnPoints = [];
        const numWaves = 3 + Math.floor(difficulty * 2);
        for (let w = 0; w < numWaves; w++) {
            const wave = [];
            const numEnemies = 2 + Math.floor(Math.random() * 3 * difficulty);
            for (let i = 0; i < numEnemies; i++) {
                // Wave 0: mostly grunts + swarms
                // Wave 1+: mix in chargers and phase
                // Wave 3+: elites appear
                let types;
                if (w === 0) {
                    types = ['grunt', 'grunt', 'swarm', 'swarm', 'charger'];
                } else if (w === 1) {
                    types = ['grunt', 'charger', 'charger', 'swarm', 'phase'];
                } else if (w === 2) {
                    types = ['charger', 'phase', 'phase', 'swarm', 'grunt'];
                } else {
                    types = ['charger', 'phase', 'elite', 'swarm', 'grunt', 'phase'];
                }
                wave.push({
                    type: types[Math.floor(Math.random() * types.length)],
                    x: 200 + Math.random() * (this.width - 400),
                });
            }
            this.spawnPoints.push(wave);
        }
    }

    getFloorY(x, width) {
        // Check platforms from top to bottom for collision
        let floorY = this.baseFloorY;

        for (const p of this.platforms) {
            if (x + width > p.x && x < p.x + p.width) {
                if (p.type === 'ground') {
                    floorY = Math.min(floorY, p.y);
                }
            }
        }

        return floorY;
    }

    getPlatformUnder(x, y, width) {
        for (const p of this.platforms) {
            if (x + width > p.x && x < p.x + p.width) {
                if (y >= p.y - 5 && y <= p.y + p.height) {
                    return p;
                }
            }
        }
        return null;
    }

    checkScanDoors(player) {
        for (const door of this.scanDoors) {
            const dist = Math.abs(player.x + player.width / 2 - door.x);
            if (dist < 40) {
                door.open = player.persona === door.persona;
            } else {
                door.open = false;
            }

            // COLLISION: block player if door is closed
            if (!door.open) {
                const doorLeft = door.x;
                const doorRight = door.x + door.width;
                const doorTop = door.y;
                const doorBottom = door.y + door.height;
                const pLeft = player.x;
                const pRight = player.x + player.width;
                const pTop = player.y;
                const pBottom = player.y + player.height;

                // Only block if vertically overlapping
                if (pBottom > doorTop && pTop < doorBottom) {
                    // Moving right into door
                    if (pRight > doorLeft && pLeft < doorLeft && player.vx > 0) {
                        player.x = doorLeft - player.width;
                        player.vx = 0;
                    }
                    // Moving left into door
                    if (pLeft < doorRight && pRight > doorRight && player.vx < 0) {
                        player.x = doorRight;
                        player.vx = 0;
                    }
                }
            }
        }
    }

    spawnWave(engine) {
        if (this.waveIndex >= this.spawnPoints.length) return false;

        const wave = this.spawnPoints[this.waveIndex];
        for (const spawn of wave) {
            const enemy = new Enemy(spawn.x, this.baseFloorY - 60, spawn.type);
            engine.addEntity(enemy);
            this.enemiesAlive++;
        }
        this.waveIndex++;
        return true;
    }

    update(dt, engine) {
        // Count alive enemies
        this.enemiesAlive = engine.entities.filter(e => e instanceof Enemy && !e.dead).length;

        // Spawn next wave if current is cleared
        this.waveTimer += dt;
        if (this.enemiesAlive === 0 && this.waveTimer > this.waveCooldown) {
            if (this.spawnWave(engine)) {
                this.waveTimer = 0;
                // Announce wave (game controller will pick up waveIndex)
                this._justSpawnedWave = this.waveIndex;
            }
        }

        // Check scan doors
        if (engine.player) {
            this.checkScanDoors(engine.player);
        }
    }

    render(ctx, engine) {
        const cam = engine.camera;
        const persona = engine.player ? engine.player.persona : 'frenzy';
        const isFrenzy = persona === 'frenzy';

        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, engine.height);
        if (isFrenzy) {
            skyGrad.addColorStop(0, '#1a0008');
            skyGrad.addColorStop(1, '#2a0a0a');
        } else {
            skyGrad.addColorStop(0, '#050a1a');
            skyGrad.addColorStop(1, '#0a1530');
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(cam.x, 0, engine.width, engine.height);

        // Background buildings (parallax)
        for (const bld of this.bgElements) {
            const parallaxX = bld.x - cam.x * 0.3;
            if (parallaxX > -bld.width && parallaxX < engine.width + bld.width) {
                ctx.fillStyle = isFrenzy ? '#1a0505' : '#050a1a';
                const by = this.baseFloorY - bld.height;
                ctx.fillRect(cam.x + parallaxX, by, bld.width, bld.height);

                // Windows
                ctx.fillStyle = isFrenzy ? '#442200' : '#112244';
                for (let w = 0; w < bld.windows; w++) {
                    const wx = cam.x + parallaxX + 5 + (w % 3) * (bld.width / 3);
                    const wy = by + 10 + Math.floor(w / 3) * 25;
                    if (wy < this.baseFloorY - 10) {
                        ctx.fillRect(wx, wy, 8, 10);
                        // Random lit windows
                        if (Math.sin(bld.x + w * 137) > 0.3) {
                            ctx.fillStyle = isFrenzy ? '#ff440033' : '#4488ff33';
                            ctx.fillRect(wx, wy, 8, 10);
                            ctx.fillStyle = isFrenzy ? '#442200' : '#112244';
                        }
                    }
                }
            }
        }

        // Platforms
        for (const p of this.platforms) {
            if (p.x + p.width < cam.x - 10 || p.x > cam.x + engine.width + 10) continue;

            if (p.type === 'ground') {
                ctx.fillStyle = isFrenzy ? '#2a1515' : '#151525';
                ctx.fillRect(p.x, p.y, p.width, p.height);
                ctx.fillStyle = isFrenzy ? '#3a2020' : '#202035';
                ctx.fillRect(p.x, p.y, p.width, 3);
            } else {
                ctx.fillStyle = isFrenzy ? '#332222' : '#222233';
                ctx.fillRect(p.x, p.y, p.width, p.height);
                // Glow edge
                ctx.strokeStyle = isFrenzy ? '#552222' : '#223355';
                ctx.lineWidth = 1;
                ctx.strokeRect(p.x, p.y, p.width, p.height);
            }
        }

        // Scan doors — render as solid barriers when closed
        for (const door of this.scanDoors) {
            if (door.open) {
                // Open: translucent outline only
                ctx.strokeStyle = door.persona === 'frenzy' ? '#ff333344' : '#3388ff44';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(door.x, door.y, door.width, door.height);
                ctx.setLineDash([]);
                continue;
            }
            // Closed: solid, glowing barrier
            const doorColor = door.persona === 'frenzy' ? '#ff3333' : '#3388ff';
            const doorBg = door.persona === 'frenzy' ? 'rgba(200, 30, 30, 0.7)' : 'rgba(30, 80, 200, 0.7)';

            // Solid fill
            ctx.fillStyle = doorBg;
            ctx.fillRect(door.x, door.y, door.width, door.height);

            // Glowing border
            ctx.strokeStyle = doorColor;
            ctx.lineWidth = 3;
            ctx.shadowColor = doorColor;
            ctx.shadowBlur = 12 + Math.sin(performance.now() / 200) * 5;
            ctx.strokeRect(door.x, door.y, door.width, door.height);
            ctx.shadowBlur = 0;

            // Horizontal scan lines across the door
            ctx.strokeStyle = doorColor;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            for (let sy = door.y; sy < door.y + door.height; sy += 6) {
                ctx.beginPath();
                ctx.moveTo(door.x, sy);
                ctx.lineTo(door.x + door.width, sy);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Icon on top
            ctx.font = '14px monospace';
            ctx.fillStyle = doorColor;
            ctx.textAlign = 'center';
            ctx.fillText(door.persona === 'frenzy' ? '🔥' : '🧊', door.x + door.width / 2, door.y - 8);

            // Hint text
            ctx.font = '9px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText('SHIFT', door.x + door.width / 2, door.y - 20);
            ctx.shadowBlur = 0;
        }

        // Floor line
        ctx.strokeStyle = isFrenzy ? '#ff333344' : '#3388ff44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cam.x, this.baseFloorY + 30);
        ctx.lineTo(cam.x + engine.width, this.baseFloorY + 30);
        ctx.stroke();
    }
}
