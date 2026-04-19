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
            grunt:   { hp: 30, damage: 8, speed: 80, color: '#885588' },
            charger: { hp: 50, damage: 15, speed: 150, color: '#aa5533' },
            phase:   { hp: 60, damage: 12, speed: 60, color: '#6644aa', shieldPhase: true },
            swarm:   { hp: 10, damage: 5, speed: 120, color: '#aaaa33', width: 16, height: 16 },
            elite:   { hp: 120, damage: 20, speed: 50, color: '#cc2255' },
        };
        const s = stats[type] || stats.grunt;
        this.maxHP = s.hp;
        this.hp = s.hp;
        this.damage = s.damage;
        this.speed = s.speed;
        this.color = s.color;
        if (s.width) { this.width = s.width; this.height = s.height; }
        this.shieldPhase = s.shieldPhase || false;

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

        // Floor
        const floorY = engine.level ? engine.level.getFloorY(this.x, this.width) : engine.height - 80;
        if (this.y + this.height > floorY) {
            this.y = floorY - this.height;
            this.vy = 0;
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

        // Frozen effect
        if (this.frozenTimer > 0) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#88ccff';
            ctx.fillRect(-this.width / 2 - 3, -this.height / 2 - 3, this.width + 6, this.height + 6);
            ctx.globalAlpha = 1;
        }

        // Burn effect
        if (this.burnTimer > 0) {
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 10;
        }

        // Hurt flash
        if (this.hurtTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }

        // Body
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Eyes
        ctx.fillStyle = '#ff0000';
        const eyeX = this.facing > 0 ? 2 : -8;
        ctx.fillRect(eyeX, -this.height / 2 + 6, 3, 3);
        ctx.fillRect(eyeX + 5, -this.height / 2 + 6, 3, 3);

        // Phase shield indicator
        if (this.shieldPhase) {
            ctx.strokeStyle = this.shieldColor === 'red' ? '#ff3333' : '#3388ff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(this.animTimer * 8) * 0.3;
            ctx.strokeRect(-this.width / 2 - 4, -this.height / 2 - 4, this.width + 8, this.height + 8);
            ctx.globalAlpha = 1;

            // Label
            ctx.fillStyle = this.shieldColor === 'red' ? '#ff3333' : '#3388ff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.shieldColor === 'red' ? '🔥' : '🧊', 0, -this.height / 2 - 8);
        }

        // Type indicator for elite
        if (this.type === 'elite') {
            ctx.fillStyle = '#ffcc00';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('★', 0, -this.height / 2 - 5);
        }

        // HP bar
        if (this.hp < this.maxHP) {
            const barW = this.width + 4;
            const barH = 3;
            const barY = -this.height / 2 - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, barY, barW, barH);
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(-barW / 2, barY, barW * (this.hp / this.maxHP), barH);
        }

        ctx.restore();
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
