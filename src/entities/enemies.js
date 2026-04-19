/**
 * Enemy Entities - Various enemy types for Echo's Schism
 */
class Enemy {
    constructor(x, y, type = 'grunt') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 28;
        this.height = 40;
        this.type = type;
        this.facing = -1;
        this.z = 5;
        this.dead = false;

        // Stats by type
        const stats = {
            grunt:   { hp: 30, damage: 8, speed: 110, color: '#885588' },
            charger: { hp: 50, damage: 15, speed: 200, color: '#aa5533' },
            phase:   { hp: 60, damage: 12, speed: 85, color: '#6644aa', shieldPhase: true },
            swarm:   { hp: 10, damage: 5, speed: 160, color: '#aaaa33', width: 16, height: 16 },
            elite:   { hp: 120, damage: 20, speed: 70, color: '#cc2255' },
            flyer:   { hp: 25, damage: 10, speed: 100, color: '#44aacc', width: 24, height: 20, flying: true },
        };
        const s = stats[type] || stats.grunt;
        this.maxHP = s.hp;
        this.hp = s.hp;
        this.damage = s.damage;
        this.speed = s.speed;
        this.color = s.color;
        if (s.width) { this.width = s.width; this.height = s.height; }
        this.shieldPhase = s.shieldPhase || false;
        this.flying = s.flying || false;
        this.flyTargetY = 0; // for flying enemies

        // State
        this.state = 'patrol'; // patrol, chase, attack, hurt, frozen
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.slowTimer = 0;
        this.frozenTimer = 0;
        this.burnTimer = 0;
        this.hurtTimer = 0;
        this.patrolDir = 1;
        this.patrolTimer = 0;
        this.aggroRange = 250;
        this.attackRange = 40;

        // Phase shield (for phase type)
        this.shieldColor = 'red'; // 'red' or 'blue'
        this.shieldTimer = 0;
        this.shieldInterval = 2;

        // Animation
        this.animTimer = 0;
        this.animFrame = 0;
        this.deathTimer = 0;
    }

    update(dt, engine) {
        if (this.dead) return;

        const player = engine.player;
        if (!player) return;

        this.animTimer += dt;

        // Burn damage
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= 5 * dt;
            if (Math.random() < 0.3) {
                engine.particles.spawnAt(this.x + Math.random() * this.width,
                    this.y + Math.random() * this.height, '#ff4400');
            }
        }

        // Frozen
        if (this.frozenTimer > 0) {
            this.frozenTimer -= dt;
            this.state = 'frozen';
            if (this.frozenTimer <= 0) this.state = 'patrol';
            return;
        }

        // Slow
        const speedMult = this.slowTimer > 0 ? 0.3 : 1;
        if (this.slowTimer > 0) this.slowTimer -= dt;

        // Hurt stun
        if (this.hurtTimer > 0) {
            this.hurtTimer -= dt;
            this.vx *= 0.9;
            this.x += this.vx * dt;
            return;
        }

        // Phase shield cycling
        if (this.shieldPhase) {
            this.shieldTimer += dt;
            if (this.shieldTimer > this.shieldInterval) {
                this.shieldTimer = 0;
                this.shieldColor = this.shieldColor === 'red' ? 'blue' : 'red';
            }
        }

        // AI
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.facing = dx > 0 ? 1 : -1;

        this.attackCooldown = Math.max(0, this.attackCooldown - dt);

        if (this.flying) {
            // ── Flying enemy AI ──
            // Hover above player, strafe, and shoot
            const targetX = player.x + Math.sin(this.animTimer * 1.5) * 120;
            const targetY = player.y - 120 - Math.sin(this.animTimer * 2) * 30;
            const toX = targetX - this.x;
            const toY = targetY - this.y;
            this.vx = toX * 2 * speedMult;
            this.vy = toY * 2 * speedMult;

            if (dist < this.aggroRange) {
                this.state = 'chase';
            } else {
                this.state = 'patrol';
            }

            // Ranged attack — shoot projectiles
            if (dist < 300 && this.attackCooldown <= 0) {
                this.state = 'attack';
                this.attackCooldown = 1.2;
                this.attackTimer = 0.2;
                const angle = Math.atan2(player.y + player.height / 2 - (this.y + this.height / 2),
                                         player.x + player.width / 2 - (this.x + this.width / 2));
                const projSpeed = 280;
                const proj = new Projectile(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    Math.cos(angle) * projSpeed,
                    Math.sin(angle) * projSpeed,
                    this.damage, '#44aacc', 'enemy'
                );
                engine.addEntity(proj);
                engine.audio.playHit('calm');
            }

            // Apply physics (no gravity for flyers)
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        } else {
            // ── Ground enemy AI ──
            if (dist < this.attackRange && this.attackCooldown <= 0) {
                this.state = 'attack';
                this.performAttack(player, engine);
            } else if (dist < this.aggroRange) {
                this.state = 'chase';
                this.vx = this.facing * this.speed * speedMult;
            } else {
                this.state = 'patrol';
                this.patrolTimer += dt;
                if (this.patrolTimer > 2) {
                    this.patrolTimer = 0;
                    this.patrolDir *= -1;
                }
                this.vx = this.patrolDir * this.speed * 0.3 * speedMult;
            }

            // Gravity
            this.vy += 800 * dt;

            // Apply physics
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Floor — enemies only collide with ground platforms (not elevated ones)
            const floorY = engine.level ? engine.level.getGroundFloorY(this.x, this.width) : engine.height - 80;
            if (this.y + this.height > floorY) {
                this.y = floorY - this.height;
                this.vy = 0;
            }
        }

        // Level bounds
        const levelWidth = engine.level ? engine.level.width : engine.width;
        this.x = Math.max(0, Math.min(levelWidth - this.width, this.x));

        // Death check
        if (this.hp <= 0) {
            this.die(engine);
        }
    }

    performAttack(player, engine) {
        this.attackCooldown = this.type === 'charger' ? 1.5 : 1;
        this.attackTimer = 0.3;
        player.takeDamage(this.damage, engine);

        if (this.type === 'charger') {
            engine.shakeCamera(5);
        }
    }

    takeDamage(amount, engine) {
        // Phase shield check
        if (this.shieldPhase) {
            const player = engine.player;
            if (this.shieldColor === 'red' && player.persona !== 'frenzy') {
                // Blocked
                engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 5, '#ff000088');
                return;
            }
            if (this.shieldColor === 'blue' && player.persona !== 'calm') {
                engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 5, '#0066ff88');
                return;
            }
        }

        this.hp -= amount;
        this.hurtTimer = 0.15;
        this.state = 'hurt';
    }

    die(engine) {
        this.dead = true;
        engine.player.kills++;
        engine.player.ultimateCharge = Math.min(100, engine.player.ultimateCharge + 10);
        engine.audio.playEnemyDeath();
        engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 15, this.color);

        // Drop memory fragment (20% chance)
        if (Math.random() < 0.2) {
            engine.addEntity(new MemoryFragment(this.x + this.width / 2, this.y));
        }
    }

    render(ctx, engine) {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const t = this.animTimer;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2 + 2, this.width / 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Frozen effect
        if (this.frozenTimer > 0) {
            ctx.globalAlpha = 0.7;
            // Ice crystal overlay
            ctx.fillStyle = '#88ccff';
            ctx.fillRect(-this.width / 2 - 3, -this.height / 2 - 3, this.width + 6, this.height + 6);
            // Ice shards
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(-this.width / 2 - 5, -5, 3, 10);
            ctx.fillRect(this.width / 2 + 2, -8, 3, 12);
            ctx.fillRect(-3, -this.height / 2 - 5, 6, 4);
            ctx.globalAlpha = 1;
        }

        // Burn effect
        if (this.burnTimer > 0) {
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 10 + Math.sin(t * 12) * 5;
        }

        // Hurt flash
        const isHurt = this.hurtTimer > 0;

        // ── Type-specific rendering ──
        switch (this.type) {
            case 'grunt':
                this._renderGrunt(ctx, t, isHurt);
                break;
            case 'charger':
                this._renderCharger(ctx, t, isHurt);
                break;
            case 'phase':
                this._renderPhase(ctx, t, isHurt);
                break;
            case 'swarm':
                this._renderSwarm(ctx, t, isHurt);
                break;
            case 'elite':
                this._renderElite(ctx, t, isHurt);
                break;
            case 'flyer':
                this._renderFlyer(ctx, t, isHurt);
                break;
            default:
                this._renderGrunt(ctx, t, isHurt);
        }

        ctx.shadowBlur = 0;

        // HP bar
        if (this.hp < this.maxHP) {
            const barW = this.width + 8;
            const barH = 3;
            const barY = -this.height / 2 - 10;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, barY, barW, barH);
            const hpPct = this.hp / this.maxHP;
            const hpColor = hpPct > 0.5 ? '#44cc44' : (hpPct > 0.25 ? '#ccaa22' : '#cc2222');
            ctx.fillStyle = hpColor;
            ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);
        }

        ctx.restore();
    }

    _renderGrunt(ctx, t, isHurt) {
        const hw = this.width / 2;
        const hh = this.height / 2;

        // Body
        ctx.fillStyle = isHurt ? '#ffffff' : '#665566';
        ctx.fillRect(-hw, -hh, this.width, this.height);

        // Armor plate
        ctx.fillStyle = isHurt ? '#ffffff' : '#554455';
        ctx.fillRect(-hw + 2, -hh + 5, this.width - 4, 12);

        // Legs
        const legOff = this.state === 'chase' ? Math.sin(t * 10) * 4 : 0;
        ctx.fillStyle = '#333';
        ctx.fillRect(-hw + 2, hh - 4, 8, 4 + legOff);
        ctx.fillRect(hw - 10, hh - 4, 8, 4 - legOff);

        // Head
        ctx.fillStyle = isHurt ? '#fff' : '#776677';
        ctx.fillRect(-6, -hh - 6, 12, 8);

        // Visor
        ctx.fillStyle = '#ff2222';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 4;
        ctx.fillRect(-4, -hh - 3, 8, 3);
        ctx.shadowBlur = 0;

        // Weapon stub
        ctx.fillStyle = '#555';
        const wx = this.facing > 0 ? hw : -hw - 8;
        ctx.fillRect(wx, -2, 10, 4);
    }

    _renderCharger(ctx, t, isHurt) {
        const hw = this.width / 2;
        const hh = this.height / 2;

        // Bulky body
        ctx.fillStyle = isHurt ? '#ffffff' : '#8a5533';
        ctx.fillRect(-hw - 2, -hh, this.width + 4, this.height);

        // Heavy armor
        ctx.fillStyle = isHurt ? '#fff' : '#774422';
        ctx.fillRect(-hw, -hh + 3, this.width, 8);
        ctx.fillRect(-hw, hh - 12, this.width, 4);

        // Spikes on shoulders
        ctx.fillStyle = '#aa6633';
        ctx.beginPath();
        ctx.moveTo(-hw - 4, -hh + 6);
        ctx.lineTo(-hw - 8, -hh - 4);
        ctx.lineTo(-hw, -hh + 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hw + 4, -hh + 6);
        ctx.lineTo(hw + 8, -hh - 4);
        ctx.lineTo(hw, -hh + 2);
        ctx.fill();

        // Head
        ctx.fillStyle = isHurt ? '#fff' : '#995533';
        ctx.fillRect(-7, -hh - 8, 14, 10);

        // Angry eyes
        ctx.fillStyle = '#ff4400';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 5;
        ctx.fillRect(-5, -hh - 5, 4, 3);
        ctx.fillRect(1, -hh - 5, 4, 3);
        ctx.shadowBlur = 0;

        // Charge indicator when chasing
        if (this.state === 'chase') {
            ctx.fillStyle = `rgba(255, 80, 30, ${0.3 + Math.sin(t * 10) * 0.2})`;
            const dir = this.facing;
            ctx.fillRect(dir > 0 ? hw : -hw - 12, -4, 12, 8);
        }

        // Stompy legs
        const legOff = this.state === 'chase' ? Math.sin(t * 8) * 5 : 0;
        ctx.fillStyle = '#444';
        ctx.fillRect(-hw, hh - 2, 10, 6 + legOff);
        ctx.fillRect(hw - 10, hh - 2, 10, 6 - legOff);
    }

    _renderPhase(ctx, t, isHurt) {
        const hw = this.width / 2;
        const hh = this.height / 2;

        // Shield aura
        const shieldCol = this.shieldColor === 'red' ? '#ff3333' : '#3388ff';
        ctx.strokeStyle = shieldCol;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + Math.sin(t * 6) * 0.25;
        ctx.shadowColor = shieldCol;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, hw + 8, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, hw + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Body — sleek, techy
        ctx.fillStyle = isHurt ? '#fff' : '#5544aa';
        ctx.fillRect(-hw, -hh, this.width, this.height);

        // Circuit lines
        ctx.strokeStyle = this.shieldColor === 'red' ? '#ff555566' : '#5588ff66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-hw + 3, -hh + 5);
        ctx.lineTo(0, -hh + 10);
        ctx.lineTo(hw - 3, -hh + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -hh + 10);
        ctx.lineTo(0, hh - 5);
        ctx.stroke();

        // Head with visor
        ctx.fillStyle = isHurt ? '#fff' : '#6655bb';
        ctx.fillRect(-6, -hh - 7, 12, 9);
        // Phase visor (color matches shield)
        ctx.fillStyle = shieldCol;
        ctx.shadowColor = shieldCol;
        ctx.shadowBlur = 6;
        ctx.fillRect(-4, -hh - 4, 8, 3);
        ctx.shadowBlur = 0;

        // Shield label
        ctx.font = '10px monospace';
        ctx.fillStyle = shieldCol;
        ctx.textAlign = 'center';
        ctx.fillText(this.shieldColor === 'red' ? '🔥' : '🧊', 0, -hh - 12);

        // Floating legs
        ctx.fillStyle = '#3a3a5a';
        ctx.fillRect(-hw + 3, hh, 6, 4);
        ctx.fillRect(hw - 9, hh, 6, 4);
    }

    _renderSwarm(ctx, t, isHurt) {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const hover = Math.sin(t * 8 + this.x) * 3;

        ctx.translate(0, hover);

        // Tiny drone body
        ctx.fillStyle = isHurt ? '#fff' : '#aaaa33';
        ctx.fillRect(-hw, -hh, this.width, this.height);

        // Wings/rotors
        ctx.fillStyle = '#888';
        const wingOff = Math.sin(t * 30) * 2;
        ctx.fillRect(-hw - 4, -hh - 1 + wingOff, 4, 2);
        ctx.fillRect(hw, -hh - 1 - wingOff, 4, 2);

        // Eye
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 4;
        ctx.fillRect(-2, -2, 4, 3);
        ctx.shadowBlur = 0;

        // Blinking warning
        if (Math.sin(t * 5) > 0.5) {
            ctx.fillStyle = '#ff000044';
            ctx.beginPath();
            ctx.arc(0, 0, hw + 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderElite(ctx, t, isHurt) {
        const hw = this.width / 2;
        const hh = this.height / 2;

        // Dark aura
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#cc2255';
        ctx.beginPath();
        ctx.arc(0, 0, hw + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Large armored body
        ctx.fillStyle = isHurt ? '#fff' : '#8a2244';
        ctx.fillRect(-hw, -hh, this.width, this.height);

        // Heavy chest plate
        ctx.fillStyle = isHurt ? '#fff' : '#aa3355';
        ctx.fillRect(-hw + 2, -hh + 4, this.width - 4, 14);
        // Cross
        ctx.strokeStyle = '#cc4466';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -hh + 5);
        ctx.lineTo(0, -hh + 16);
        ctx.moveTo(-6, -hh + 10);
        ctx.lineTo(6, -hh + 10);
        ctx.stroke();

        // Shoulders
        ctx.fillStyle = '#993355';
        ctx.fillRect(-hw - 4, -hh + 2, 6, 10);
        ctx.fillRect(hw - 2, -hh + 2, 6, 10);

        // Head — horned helmet
        ctx.fillStyle = isHurt ? '#fff' : '#aa2255';
        ctx.fillRect(-8, -hh - 10, 16, 12);
        // Horns
        ctx.fillStyle = '#cc3366';
        ctx.beginPath();
        ctx.moveTo(-8, -hh - 8);
        ctx.lineTo(-12, -hh - 18);
        ctx.lineTo(-6, -hh - 6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, -hh - 8);
        ctx.lineTo(12, -hh - 18);
        ctx.lineTo(6, -hh - 6);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 6;
        ctx.fillRect(-5, -hh - 6, 4, 3);
        ctx.fillRect(1, -hh - 6, 4, 3);
        ctx.shadowBlur = 0;

        // Star crown
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.fillText('★', 0, -hh - 18);

        // Heavy legs
        ctx.fillStyle = '#4a2233';
        const legOff = this.state === 'chase' ? Math.sin(t * 7) * 4 : 0;
        ctx.fillRect(-hw + 1, hh, 10, 6 + legOff);
        ctx.fillRect(hw - 11, hh, 10, 6 - legOff);
    }

    _renderFlyer(ctx, t, isHurt) {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const hover = Math.sin(t * 5) * 4;

        ctx.translate(0, hover);

        // Thruster glow below
        ctx.fillStyle = `rgba(68, 170, 200, ${0.2 + Math.sin(t * 15) * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(-6, hh);
        ctx.lineTo(6, hh);
        ctx.lineTo(3, hh + 10 + Math.sin(t * 20) * 4);
        ctx.lineTo(-3, hh + 10 + Math.sin(t * 20 + 1) * 4);
        ctx.fill();

        // Body — angular drone
        ctx.fillStyle = isHurt ? '#fff' : '#336688';
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.lineTo(hw, 0);
        ctx.lineTo(hw - 3, hh);
        ctx.lineTo(-hw + 3, hh);
        ctx.lineTo(-hw, 0);
        ctx.closePath();
        ctx.fill();

        // Cockpit / sensor dome
        ctx.fillStyle = isHurt ? '#fff' : '#44aacc';
        ctx.shadowColor = '#44aacc';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wings
        ctx.fillStyle = '#2a5566';
        const wingFlap = Math.sin(t * 12) * 3;
        // Left wing
        ctx.fillRect(-hw - 8, -2 + wingFlap, 10, 3);
        ctx.fillRect(-hw - 6, -4 + wingFlap, 3, 7);
        // Right wing
        ctx.fillRect(hw - 2, -2 - wingFlap, 10, 3);
        ctx.fillRect(hw + 3, -4 - wingFlap, 3, 7);

        // Wing tip lights
        const blink = Math.sin(t * 8) > 0;
        if (blink) {
            ctx.fillStyle = '#ff3333';
            ctx.shadowColor = '#ff3333';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(-hw - 7, -1 + wingFlap, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(hw + 7, -1 - wingFlap, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Targeting laser when attacking
        if (this.attackTimer > 0) {
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, hh);
            ctx.lineTo(this.facing * 60, hh + 80);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}


/**
 * Projectile - Used by Athena's ranged attacks and enemies
 */
class Projectile {
    constructor(x, y, vx, vy, damage, color, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.color = color;
        this.owner = owner; // 'player' or 'enemy'
        this.width = 8;
        this.height = 4;
        this.dead = false;
        this.lifetime = 3;
        this.z = 8;
    }

    update(dt, engine) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifetime -= dt;

        if (this.lifetime <= 0) { this.dead = true; return; }

        // Check slow fields for bullet reflect
        for (const e of engine.entities) {
            if (e instanceof SlowField && this.owner === 'enemy') {
                if (this.x > e.x && this.x < e.x + e.width &&
                    this.y > e.y && this.y < e.y + e.height) {
                    this.vx *= -1;
                    this.owner = 'player';
                    this.color = '#55aaff';
                }
            }
        }

        // Collision
        if (this.owner === 'player') {
            for (const e of engine.entities) {
                if (e instanceof Enemy && !e.dead) {
                    if (this.x > e.x && this.x < e.x + e.width &&
                        this.y > e.y && this.y < e.y + e.height) {
                        e.takeDamage(this.damage, engine);
                        engine.particles.burstAt(this.x, this.y, 5, this.color);
                        this.dead = true;
                        return;
                    }
                }
            }
        } else if (this.owner === 'enemy') {
            const p = engine.player;
            if (p && this.x > p.x && this.x < p.x + p.width &&
                this.y > p.y && this.y < p.y + p.height) {
                p.takeDamage(this.damage, engine);
                this.dead = true;
            }
        }

        // Out of bounds
        if (this.x < engine.camera.x - 50 || this.x > engine.camera.x + engine.width + 50) {
            this.dead = true;
        }
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}


/**
 * SlowField - Athena's tactical slow zone
 */
class SlowField {
    constructor(x, y, width, height, duration) {
        this.x = x - width / 2;
        this.y = y - height / 2;
        this.width = width;
        this.height = height;
        this.duration = duration;
        this.timer = 0;
        this.dead = false;
        this.z = 2;
    }

    update(dt, engine) {
        this.timer += dt;
        if (this.timer >= this.duration) { this.dead = true; return; }

        // Slow enemies inside
        for (const e of engine.entities) {
            if (e instanceof Enemy) {
                if (e.x + e.width > this.x && e.x < this.x + this.width &&
                    e.y + e.height > this.y && e.y < this.y + this.height) {
                    e.slowTimer = Math.max(e.slowTimer, 0.5);
                }
            }
        }
    }

    render(ctx) {
        const alpha = 0.2 * (1 - this.timer / this.duration);
        ctx.fillStyle = `rgba(85, 170, 255, ${alpha})`;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = `rgba(85, 170, 255, ${alpha + 0.2})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Scanlines
        ctx.strokeStyle = `rgba(85, 170, 255, ${alpha})`;
        for (let i = 0; i < this.height; i += 6) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + i);
            ctx.lineTo(this.x + this.width, this.y + i);
            ctx.stroke();
        }
    }
}


/**
 * MemoryFragment - Collectible for skill tree progression
 */
class MemoryFragment {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.dead = false;
        this.z = 3;
        this.animTimer = 0;
        this.vy = -100;
    }

    update(dt, engine) {
        this.animTimer += dt;
        this.vy += 200 * dt;
        this.y += this.vy * dt;

        const floorY = engine.level ? engine.level.getFloorY(this.x, this.width) : engine.height - 80;
        if (this.y + this.height > floorY) {
            this.y = floorY - this.height;
            this.vy = 0;
        }

        // Pickup
        const p = engine.player;
        if (p && Math.hypot(p.x + p.width / 2 - this.x, p.y + p.height / 2 - this.y) < 30) {
            p.fragments++;
            this.dead = true;
            engine.particles.burstAt(this.x, this.y, 10, '#ffcc00');
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const glow = 0.5 + Math.sin(this.animTimer * 4) * 0.3;
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10 * glow;
        ctx.fillStyle = '#ffcc00';
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
