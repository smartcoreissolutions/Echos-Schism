/**
 * Level System - Multi-layer parallax cyberpunk environment
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

        // Rich background layers
        this.farBuildings = [];
        this.midBuildings = [];
        this.nearBuildings = [];
        this.neonSigns = [];
        this.streetProps = [];
        this.stars = [];
        this.clouds = [];
    }

    generate(difficulty = 1) {
        this.platforms = [];
        this.scanDoors = [];

        // ── Stars ──
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * this.width * 2,
                y: Math.random() * this.baseFloorY * 0.4,
                size: 0.5 + Math.random() * 1.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 2,
            });
        }

        // ── Clouds ──
        this.clouds = [];
        for (let i = 0; i < 6; i++) {
            this.clouds.push({
                x: Math.random() * this.width * 2,
                y: 20 + Math.random() * 80,
                width: 100 + Math.random() * 200,
                height: 15 + Math.random() * 25,
                speed: 5 + Math.random() * 15,
            });
        }

        // ── Far skyline (deepest parallax 0.05x) ──
        this.farBuildings = [];
        for (let x = -200; x < this.width + 400; x += 30 + Math.random() * 50) {
            const h = 60 + Math.random() * 180;
            this.farBuildings.push({
                x, height: h,
                width: 20 + Math.random() * 40,
                hasAntenna: Math.random() > 0.6,
                antennaH: 10 + Math.random() * 30,
                windowRows: Math.floor(h / 12),
                windowCols: Math.floor(Math.random() * 3) + 1,
            });
        }

        // ── Mid buildings (0.2x parallax) ──
        this.midBuildings = [];
        for (let x = -100; x < this.width + 200; x += 50 + Math.random() * 80) {
            const h = 100 + Math.random() * 250;
            const w = 35 + Math.random() * 55;
            this.midBuildings.push({
                x, height: h, width: w,
                hasSign: Math.random() > 0.4,
                signColor: ['#ff3366', '#00ffcc', '#ff6600', '#aa44ff', '#00aaff', '#ffcc00'][Math.floor(Math.random() * 6)],
                signY: h * (0.3 + Math.random() * 0.4),
                signText: ['NEON', 'CYBER', '暗黒', 'ECHO', '裂変', 'GRID', 'PULSE', '渋谷', 'HACK', 'DATA'][Math.floor(Math.random() * 10)],
                windowRows: Math.floor(h / 15),
                windowCols: Math.floor(w / 12),
                acUnits: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0,
                balconies: Math.random() > 0.6,
            });
        }

        // ── Near buildings (0.4x parallax) ──
        this.nearBuildings = [];
        for (let x = -50; x < this.width + 100; x += 70 + Math.random() * 100) {
            const h = 150 + Math.random() * 300;
            const w = 50 + Math.random() * 70;
            this.nearBuildings.push({
                x, height: h, width: w,
                doorX: Math.random() * (w - 16),
                hasFire: Math.random() > 0.7,
                hasLadder: Math.random() > 0.6,
                windowRows: Math.floor(h / 18),
                windowCols: Math.floor(w / 14),
                wallColor: Math.random() > 0.5 ? 0 : 1,
            });
        }

        // ── Neon signs (independent floating signs, 0.3x parallax) ──
        this.neonSigns = [];
        for (let i = 0; i < 12; i++) {
            this.neonSigns.push({
                x: Math.random() * this.width * 1.5,
                y: 80 + Math.random() * 200,
                text: ['BAR', 'CLUB', 'HOTEL', '酒場', 'OPEN', '24H', 'DINER', 'LABS', 'EXIT', '危険'][Math.floor(Math.random() * 10)],
                color: ['#ff0066', '#00ffaa', '#ff6600', '#cc44ff', '#00ccff', '#ffff00'][Math.floor(Math.random() * 6)],
                size: 10 + Math.random() * 8,
                flicker: Math.random() * Math.PI * 2,
                broken: Math.random() > 0.8,
            });
        }

        // ── Street props ──
        this.streetProps = [];
        for (let x = 50; x < this.width; x += 80 + Math.random() * 150) {
            const type = ['lamppost', 'trashcan', 'vent', 'hydrant', 'crate', 'barrel'][Math.floor(Math.random() * 6)];
            this.streetProps.push({ x, type });
        }

        // ── Ground platforms with gaps ──
        for (let x = 0; x < this.width; x += 200) {
            if (Math.random() > 0.15) {
                this.platforms.push({
                    x, y: this.baseFloorY,
                    width: 180 + Math.random() * 40,
                    height: 30,
                    type: 'ground'
                });
            }
        }

        // ── Elevated platforms ──
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

        // ── Scan doors ──
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

        // ── Enemy waves ──
        this.spawnPoints = [];
        const numWaves = 3 + Math.floor(difficulty * 2);
        for (let w = 0; w < numWaves; w++) {
            const wave = [];
            const numEnemies = 2 + Math.floor(Math.random() * 3 * difficulty);
            for (let i = 0; i < numEnemies; i++) {
                let types;
                if (w === 0) types = ['grunt', 'grunt', 'swarm', 'swarm', 'charger'];
                else if (w === 1) types = ['grunt', 'charger', 'charger', 'swarm', 'phase'];
                else if (w === 2) types = ['charger', 'phase', 'phase', 'swarm', 'grunt'];
                else types = ['charger', 'phase', 'elite', 'swarm', 'grunt', 'phase'];
                wave.push({
                    type: types[Math.floor(Math.random() * types.length)],
                    x: 200 + Math.random() * (this.width - 400),
                });
            }
            this.spawnPoints.push(wave);
        }
    }

    getFloorY(x, width) {
        let floorY = this.baseFloorY;
        for (const p of this.platforms) {
            if (x + width > p.x && x < p.x + p.width) {
                if (p.type === 'ground') floorY = Math.min(floorY, p.y);
            }
        }
        return floorY;
    }

    getPlatformUnder(x, y, width) {
        for (const p of this.platforms) {
            if (x + width > p.x && x < p.x + p.width) {
                if (y >= p.y - 5 && y <= p.y + p.height) return p;
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
            if (!door.open) {
                const doorLeft = door.x;
                const doorRight = door.x + door.width;
                const doorTop = door.y;
                const doorBottom = door.y + door.height;
                const pLeft = player.x;
                const pRight = player.x + player.width;
                const pTop = player.y;
                const pBottom = player.y + player.height;
                if (pBottom > doorTop && pTop < doorBottom) {
                    if (pRight > doorLeft && pLeft < doorLeft && player.vx > 0) {
                        player.x = doorLeft - player.width;
                        player.vx = 0;
                    }
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
        this.enemiesAlive = engine.entities.filter(e => e instanceof Enemy && !e.dead).length;
        this.waveTimer += dt;
        if (this.enemiesAlive === 0 && this.waveTimer > this.waveCooldown) {
            if (this.spawnWave(engine)) {
                this.waveTimer = 0;
                this._justSpawnedWave = this.waveIndex;
            }
        }
        if (engine.player) this.checkScanDoors(engine.player);

        // Animate clouds
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed * dt;
            if (cloud.x > this.width * 2) cloud.x = -cloud.width;
        }
    }

    render(ctx, engine) {
        const cam = engine.camera;
        const persona = engine.player ? engine.player.persona : 'frenzy';
        const isFrenzy = persona === 'frenzy';
        const t = performance.now() / 1000;

        // ═══════════════════════════════════════
        // LAYER 0: Sky gradient
        // ═══════════════════════════════════════
        const skyGrad = ctx.createLinearGradient(cam.x, 0, cam.x, engine.height);
        if (isFrenzy) {
            skyGrad.addColorStop(0, '#0a0004');
            skyGrad.addColorStop(0.3, '#1a0008');
            skyGrad.addColorStop(0.7, '#2a0a0a');
            skyGrad.addColorStop(1, '#1a0505');
        } else {
            skyGrad.addColorStop(0, '#020810');
            skyGrad.addColorStop(0.3, '#050e1a');
            skyGrad.addColorStop(0.7, '#0a1530');
            skyGrad.addColorStop(1, '#081020');
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(cam.x, 0, engine.width, engine.height);

        // ═══════════════════════════════════════
        // LAYER 0.5: Stars
        // ═══════════════════════════════════════
        for (const star of this.stars) {
            const sx = star.x - cam.x * 0.02;
            const wrapped = ((sx % (engine.width * 2)) + engine.width * 2) % (engine.width * 2);
            const alpha = 0.3 + Math.sin(t * star.speed + star.twinkle) * 0.3;
            ctx.fillStyle = isFrenzy
                ? `rgba(255, 200, 180, ${alpha})`
                : `rgba(180, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(cam.x + wrapped, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // ═══════════════════════════════════════
        // LAYER 0.7: Clouds / smog
        // ═══════════════════════════════════════
        for (const cloud of this.clouds) {
            const cx = cloud.x - cam.x * 0.03;
            ctx.fillStyle = isFrenzy ? 'rgba(60, 10, 10, 0.3)' : 'rgba(10, 20, 50, 0.3)';
            ctx.beginPath();
            ctx.ellipse(cam.x + cx, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // ═══════════════════════════════════════
        // LAYER 1: Far skyline (parallax 0.05x)
        // ═══════════════════════════════════════
        for (const bld of this.farBuildings) {
            const px = bld.x - cam.x * 0.05;
            const by = this.baseFloorY - bld.height;
            if (px + bld.width < -50 || px > engine.width + 50) continue;

            // Building body
            ctx.fillStyle = isFrenzy ? '#120404' : '#040812';
            ctx.fillRect(cam.x + px, by, bld.width, bld.height + 30);

            // Faint windows
            for (let r = 0; r < bld.windowRows; r++) {
                for (let c = 0; c < bld.windowCols; c++) {
                    const wx = cam.x + px + 4 + c * (bld.width / (bld.windowCols + 1));
                    const wy = by + 4 + r * 12;
                    const lit = Math.sin(bld.x * 7 + r * 3 + c * 11) > 0;
                    if (lit) {
                        ctx.fillStyle = isFrenzy ? 'rgba(255, 120, 50, 0.15)' : 'rgba(80, 150, 255, 0.15)';
                        ctx.fillRect(wx, wy, 3, 4);
                    }
                }
            }

            // Antenna with blinking light
            if (bld.hasAntenna) {
                const ax = cam.x + px + bld.width / 2;
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(ax, by);
                ctx.lineTo(ax, by - bld.antennaH);
                ctx.stroke();

                const blink = Math.sin(t * 2 + bld.x) > 0.7;
                if (blink) {
                    ctx.fillStyle = '#ff0000';
                    ctx.shadowColor = '#ff0000';
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(ax, by - bld.antennaH, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        // ═══════════════════════════════════════
        // LAYER 2: Mid buildings (parallax 0.2x)
        // ═══════════════════════════════════════
        for (const bld of this.midBuildings) {
            const px = bld.x - cam.x * 0.2;
            const by = this.baseFloorY - bld.height;
            if (px + bld.width < -80 || px > engine.width + 80) continue;

            const bx = cam.x + px;

            // Building body with gradient
            const bGrad = ctx.createLinearGradient(bx, by, bx, this.baseFloorY);
            if (isFrenzy) {
                bGrad.addColorStop(0, '#1a0808');
                bGrad.addColorStop(1, '#120505');
            } else {
                bGrad.addColorStop(0, '#080e1a');
                bGrad.addColorStop(1, '#060a14');
            }
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx, by, bld.width, bld.height + 30);

            // Roof edge
            ctx.fillStyle = isFrenzy ? '#2a1010' : '#101828';
            ctx.fillRect(bx - 2, by, bld.width + 4, 3);

            // Windows with variety
            for (let r = 0; r < bld.windowRows; r++) {
                for (let c = 0; c < bld.windowCols; c++) {
                    const wx = bx + 5 + c * 12;
                    const wy = by + 8 + r * 15;
                    const litVal = Math.sin(bld.x * 3 + r * 7 + c * 13 + t * 0.1);
                    if (litVal > -0.2) {
                        const warmth = (litVal + 0.2) / 1.2;
                        if (isFrenzy) {
                            ctx.fillStyle = `rgba(${200 + warmth * 55}, ${80 + warmth * 80}, ${20}, ${0.2 + warmth * 0.4})`;
                        } else {
                            ctx.fillStyle = `rgba(${40 + warmth * 30}, ${100 + warmth * 80}, ${200 + warmth * 55}, ${0.2 + warmth * 0.4})`;
                        }
                        ctx.fillRect(wx, wy, 6, 8);
                        // Window frame
                        ctx.strokeStyle = isFrenzy ? '#1a0808' : '#080e1a';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(wx, wy, 6, 8);
                    } else {
                        ctx.fillStyle = '#0a0a0a';
                        ctx.fillRect(wx, wy, 6, 8);
                    }
                }
            }

            // AC units on side
            for (let a = 0; a < bld.acUnits; a++) {
                const ay = by + 30 + a * 40;
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(bx + bld.width, ay, 8, 6);
                ctx.fillStyle = '#222';
                ctx.fillRect(bx + bld.width + 1, ay + 1, 6, 4);
            }

            // Balconies
            if (bld.balconies) {
                for (let b = 0; b < 3; b++) {
                    const bby = by + 50 + b * 60;
                    if (bby < this.baseFloorY - 10) {
                        ctx.fillStyle = '#1a1a1a';
                        ctx.fillRect(bx - 3, bby, 3, 2);
                        ctx.fillRect(bx - 5, bby + 2, 7, 1);
                    }
                }
            }

            // Neon sign on building
            if (bld.hasSign) {
                const sy = by + bld.signY;
                const flicker = Math.sin(t * 5 + bld.x * 2) > -0.8 ? 1 : 0.1;
                ctx.save();
                ctx.globalAlpha = flicker;
                ctx.font = 'bold 10px monospace';
                ctx.fillStyle = bld.signColor;
                ctx.shadowColor = bld.signColor;
                ctx.shadowBlur = 12;
                ctx.textAlign = 'center';
                ctx.fillText(bld.signText, bx + bld.width / 2, sy);
                // Sign glow on building wall
                const glowGrad = ctx.createRadialGradient(
                    bx + bld.width / 2, sy - 3, 0,
                    bx + bld.width / 2, sy - 3, 30
                );
                glowGrad.addColorStop(0, bld.signColor.replace(')', ', 0.1)').replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`));
                glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = glowGrad;
                ctx.fillRect(bx, sy - 33, bld.width, 60);
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        // ═══════════════════════════════════════
        // LAYER 2.5: Floating neon signs (0.3x)
        // ═══════════════════════════════════════
        for (const sign of this.neonSigns) {
            const sx = sign.x - cam.x * 0.3;
            if (sx < -50 || sx > engine.width + 50) continue;

            const flicker = sign.broken
                ? (Math.sin(t * 20 + sign.flicker) > 0.3 ? 1 : 0)
                : (Math.sin(t * 4 + sign.flicker) > -0.9 ? 0.8 + Math.sin(t * 4) * 0.2 : 0.1);

            ctx.save();
            ctx.globalAlpha = flicker;
            ctx.font = `bold ${sign.size}px monospace`;
            ctx.fillStyle = sign.color;
            ctx.shadowColor = sign.color;
            ctx.shadowBlur = 15;
            ctx.textAlign = 'center';
            ctx.fillText(sign.text, cam.x + sx, sign.y);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ═══════════════════════════════════════
        // LAYER 3: Near buildings (parallax 0.4x)
        // ═══════════════════════════════════════
        for (const bld of this.nearBuildings) {
            const px = bld.x - cam.x * 0.4;
            const by = this.baseFloorY - bld.height;
            if (px + bld.width < -100 || px > engine.width + 100) continue;

            const bx = cam.x + px;
            const colors = bld.wallColor === 0
                ? (isFrenzy ? ['#1e0a0a', '#160707'] : ['#0a0e1e', '#070a16'])
                : (isFrenzy ? ['#1a0606', '#140505'] : ['#060a1a', '#050814']);

            // Building body
            const bGrad = ctx.createLinearGradient(bx, by, bx + bld.width, by);
            bGrad.addColorStop(0, colors[0]);
            bGrad.addColorStop(1, colors[1]);
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx, by, bld.width, bld.height + 30);

            // Roof
            ctx.fillStyle = isFrenzy ? '#2a1212' : '#12182a';
            ctx.fillRect(bx - 3, by, bld.width + 6, 4);

            // Windows — detailed
            for (let r = 0; r < bld.windowRows; r++) {
                for (let c = 0; c < bld.windowCols; c++) {
                    const wx = bx + 6 + c * 14;
                    const wy = by + 10 + r * 18;
                    const litVal = Math.sin(bld.x * 5 + r * 3 + c * 7);

                    if (litVal > 0) {
                        // Lit window with warm/cool interior
                        const colors = isFrenzy
                            ? [`rgba(255, ${150 + litVal * 100}, ${50 + litVal * 50}, 0.5)`, `rgba(255, 120, 30, 0.2)`]
                            : [`rgba(${50 + litVal * 50}, ${150 + litVal * 100}, 255, 0.5)`, `rgba(30, 120, 255, 0.2)`];
                        ctx.fillStyle = colors[0];
                        ctx.fillRect(wx, wy, 8, 10);
                        // Curtain/blind effect
                        if (litVal > 0.5) {
                            ctx.fillStyle = colors[1];
                            ctx.fillRect(wx, wy, 8, 3); // blinds
                        }
                    } else {
                        // Dark window
                        ctx.fillStyle = '#050505';
                        ctx.fillRect(wx, wy, 8, 10);
                    }
                    // Frame
                    ctx.strokeStyle = '#1a1a1a';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(wx, wy, 8, 10);
                }
            }

            // Door at ground level
            ctx.fillStyle = '#111';
            ctx.fillRect(bx + bld.doorX, this.baseFloorY - 20, 14, 20);
            ctx.fillStyle = isFrenzy ? '#331111' : '#111133';
            ctx.fillRect(bx + bld.doorX + 1, this.baseFloorY - 19, 12, 18);
            // Door light
            ctx.fillStyle = isFrenzy ? 'rgba(255, 100, 50, 0.1)' : 'rgba(50, 100, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(bx + bld.doorX, this.baseFloorY);
            ctx.lineTo(bx + bld.doorX - 10, this.baseFloorY + 5);
            ctx.lineTo(bx + bld.doorX + 24, this.baseFloorY + 5);
            ctx.lineTo(bx + bld.doorX + 14, this.baseFloorY);
            ctx.fill();

            // Fire escape ladder
            if (bld.hasLadder) {
                const lx = bx + bld.width - 5;
                ctx.strokeStyle = '#2a2a2a';
                ctx.lineWidth = 1;
                for (let ly = by + 20; ly < this.baseFloorY; ly += 12) {
                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx + 8, ly);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.moveTo(lx, by + 20);
                ctx.lineTo(lx, this.baseFloorY);
                ctx.moveTo(lx + 8, by + 20);
                ctx.lineTo(lx + 8, this.baseFloorY);
                ctx.stroke();
            }

            // Smoke/steam from vents
            if (bld.hasFire) {
                ctx.fillStyle = isFrenzy ? 'rgba(100, 30, 10, 0.15)' : 'rgba(30, 50, 100, 0.15)';
                const smokeT = t * 0.5 + bld.x;
                for (let s = 0; s < 4; s++) {
                    const sx = bx + bld.width * 0.3 + Math.sin(smokeT + s) * 10;
                    const sy = by - 5 - s * 15 - (smokeT % 3) * 10;
                    const sr = 5 + s * 3;
                    ctx.beginPath();
                    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ═══════════════════════════════════════
        // LAYER 4: Street props (at ground level, 1x parallax)
        // ═══════════════════════════════════════
        for (const prop of this.streetProps) {
            if (prop.x < cam.x - 50 || prop.x > cam.x + engine.width + 50) continue;
            this.renderStreetProp(ctx, prop, isFrenzy, t);
        }

        // ═══════════════════════════════════════
        // LAYER 5: Platforms
        // ═══════════════════════════════════════
        for (const p of this.platforms) {
            if (p.x + p.width < cam.x - 10 || p.x > cam.x + engine.width + 10) continue;

            if (p.type === 'ground') {
                // Detailed ground with texture
                const gGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
                gGrad.addColorStop(0, isFrenzy ? '#2a1515' : '#151525');
                gGrad.addColorStop(1, isFrenzy ? '#1a0a0a' : '#0a0a18');
                ctx.fillStyle = gGrad;
                ctx.fillRect(p.x, p.y, p.width, p.height);

                // Surface line with glow
                ctx.strokeStyle = isFrenzy ? '#3a2020' : '#202035';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + 1);
                ctx.lineTo(p.x + p.width, p.y + 1);
                ctx.stroke();

                // Edge neon strip
                ctx.strokeStyle = isFrenzy ? 'rgba(255, 50, 30, 0.3)' : 'rgba(30, 80, 255, 0.3)';
                ctx.shadowColor = isFrenzy ? '#ff3322' : '#2255ff';
                ctx.shadowBlur = 4;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.width, p.y);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Ground texture dots
                ctx.fillStyle = isFrenzy ? '#1a0808' : '#080a1a';
                for (let gx = p.x + 5; gx < p.x + p.width - 5; gx += 8 + Math.sin(gx) * 3) {
                    ctx.fillRect(gx, p.y + 4, 2, 1);
                }
            } else {
                // Floating platform — metallic look
                const pGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
                pGrad.addColorStop(0, isFrenzy ? '#3a2222' : '#222238');
                pGrad.addColorStop(1, isFrenzy ? '#2a1818' : '#181828');
                ctx.fillStyle = pGrad;
                ctx.fillRect(p.x, p.y, p.width, p.height);

                // Top edge glow
                ctx.strokeStyle = isFrenzy ? 'rgba(255, 80, 50, 0.5)' : 'rgba(50, 120, 255, 0.5)';
                ctx.shadowColor = ctx.strokeStyle;
                ctx.shadowBlur = 5;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.width, p.y);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Support brackets
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(p.x + 3, p.y + p.height, 3, 6);
                ctx.fillRect(p.x + p.width - 6, p.y + p.height, 3, 6);
            }
        }

        // ═══════════════════════════════════════
        // LAYER 6: Scan doors
        // ═══════════════════════════════════════
        for (const door of this.scanDoors) {
            if (door.open) {
                ctx.strokeStyle = door.persona === 'frenzy' ? '#ff333344' : '#3388ff44';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(door.x, door.y, door.width, door.height);
                ctx.setLineDash([]);
                continue;
            }
            const doorColor = door.persona === 'frenzy' ? '#ff3333' : '#3388ff';
            const doorBg = door.persona === 'frenzy' ? 'rgba(200, 30, 30, 0.7)' : 'rgba(30, 80, 200, 0.7)';
            ctx.fillStyle = doorBg;
            ctx.fillRect(door.x, door.y, door.width, door.height);
            ctx.strokeStyle = doorColor;
            ctx.lineWidth = 3;
            ctx.shadowColor = doorColor;
            ctx.shadowBlur = 12 + Math.sin(t * 4) * 5;
            ctx.strokeRect(door.x, door.y, door.width, door.height);
            ctx.shadowBlur = 0;
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
            ctx.font = '14px monospace';
            ctx.fillStyle = doorColor;
            ctx.textAlign = 'center';
            ctx.fillText(door.persona === 'frenzy' ? '🔥' : '🧊', door.x + door.width / 2, door.y - 8);
            ctx.font = '9px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText('SHIFT', door.x + door.width / 2, door.y - 20);
            ctx.shadowBlur = 0;
        }
    }

    renderStreetProp(ctx, prop, isFrenzy, t) {
        const x = prop.x;
        const gy = this.baseFloorY;

        switch (prop.type) {
            case 'lamppost': {
                // Pole
                ctx.fillStyle = '#222';
                ctx.fillRect(x, gy - 65, 3, 65);
                // Arm
                ctx.fillRect(x - 8, gy - 65, 19, 3);
                // Light cone
                const lightColor = isFrenzy ? 'rgba(255, 150, 80, 0.12)' : 'rgba(100, 180, 255, 0.12)';
                ctx.fillStyle = lightColor;
                ctx.beginPath();
                ctx.moveTo(x - 5, gy - 62);
                ctx.lineTo(x - 25, gy);
                ctx.lineTo(x + 28, gy);
                ctx.lineTo(x + 8, gy - 62);
                ctx.fill();
                // Bulb glow
                ctx.fillStyle = isFrenzy ? 'rgba(255, 200, 100, 0.6)' : 'rgba(150, 200, 255, 0.6)';
                ctx.shadowColor = isFrenzy ? '#ffcc66' : '#88bbff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(x + 1.5, gy - 62, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;
            }
            case 'trashcan': {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(x, gy - 18, 12, 18);
                ctx.fillStyle = '#222';
                ctx.fillRect(x - 1, gy - 20, 14, 3);
                // Lid
                ctx.fillStyle = '#282828';
                ctx.fillRect(x - 2, gy - 22, 16, 3);
                break;
            }
            case 'vent': {
                ctx.fillStyle = '#181818';
                ctx.fillRect(x, gy - 10, 20, 10);
                // Steam
                ctx.fillStyle = isFrenzy ? 'rgba(80, 20, 10, 0.2)' : 'rgba(20, 40, 80, 0.2)';
                for (let s = 0; s < 3; s++) {
                    const sy = gy - 12 - s * 10 - ((t * 20 + prop.x) % 30);
                    const sx = x + 10 + Math.sin(t + s + prop.x) * 5;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 4 + s * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Grate lines
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                for (let gx = x + 3; gx < x + 18; gx += 4) {
                    ctx.beginPath();
                    ctx.moveTo(gx, gy - 9);
                    ctx.lineTo(gx, gy - 1);
                    ctx.stroke();
                }
                break;
            }
            case 'hydrant': {
                ctx.fillStyle = isFrenzy ? '#881111' : '#112288';
                ctx.fillRect(x + 2, gy - 16, 8, 16);
                ctx.fillRect(x, gy - 12, 12, 4);
                ctx.fillStyle = isFrenzy ? '#aa2222' : '#2233aa';
                ctx.fillRect(x + 1, gy - 18, 10, 3);
                break;
            }
            case 'crate': {
                ctx.fillStyle = '#1a1408';
                ctx.fillRect(x, gy - 14, 16, 14);
                ctx.strokeStyle = '#2a2010';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, gy - 14, 16, 14);
                // Cross
                ctx.beginPath();
                ctx.moveTo(x, gy - 14);
                ctx.lineTo(x + 16, gy);
                ctx.moveTo(x + 16, gy - 14);
                ctx.lineTo(x, gy);
                ctx.stroke();
                break;
            }
            case 'barrel': {
                ctx.fillStyle = '#181616';
                ctx.fillRect(x, gy - 18, 14, 18);
                ctx.fillStyle = '#222';
                ctx.fillRect(x - 1, gy - 18, 16, 2);
                ctx.fillRect(x - 1, gy - 8, 16, 2);
                // Hazard stripe
                ctx.fillStyle = '#886600';
                ctx.fillRect(x + 3, gy - 15, 8, 2);
                break;
            }
        }
    }
}
