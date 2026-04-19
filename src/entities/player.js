/**
 * Player Entity - Echo with dual persona system
 */
class Player {
    constructor(x, y) {
        // Position & physics
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 32;
        this.height = 48;
        this.facing = 1; // 1 = right, -1 = left
        this.grounded = false;
        this.z = 10;

        // Persona
        this.persona = 'frenzy'; // 'frenzy' | 'calm'
        this.stability = 50; // 0-100, 50 = perfect balance
        this.stabilityDrift = 0;

        // Stats
        this.maxHP = 100;
        this.hp = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.ultimateCharge = 0;

        // Combat
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCombo = 0;
        this.attackCooldown = 0;
        this.specialCooldown = 0;
        this.invincible = false;
        this.invincibleTimer = 0;

        // Dash
        this.dashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashDir = 1;

        // Shift
        this.shiftCooldown = 0;
        this.perfectShiftWindow = 0;
        this.perfectShiftActive = false;
        this.perfectShiftTimer = 0;
        this.perfectShiftFlash = 0;
        this.shiftFlash = 0;

        // Deep state
        this.deepStateTimer = 0;
        this.inDeepState = false;

        // Animation
        this.animTimer = 0;
        this.animFrame = 0;
        this.state = 'idle'; // idle, run, jump, attack, dash, special, hurt

        // Narrative
        this.frenzyDominance = 50; // 0-100, affects ending
        this.kills = 0;
        this.perfectShifts = 0;

        // Memory fragments collected
        this.fragments = 0;

        // Skill tree
        this.skills = {
            frenzy: { lifesteal: 0, comboExtend: 0, execute: false },
            calm: { shieldBoost: 0, parryWindow: 0, multishot: false }
        };
    }

    update(dt, engine) {
        const input = engine.input;
        const GRAVITY = 1200;
        const SPEED = 250;
        const JUMP_FORCE = -500;
        const DASH_SPEED = 600;
        const FRENZY_SPEED_MULT = 1.4;
        const CALM_SPEED_MULT = this.inDeepState ? 0.25 : 0.65;

        const speedMult = this.persona === 'frenzy' ? FRENZY_SPEED_MULT : CALM_SPEED_MULT;

        // Cooldown timers
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        this.specialCooldown = Math.max(0, this.specialCooldown - dt);
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);
        this.shiftCooldown = Math.max(0, this.shiftCooldown - dt);
        this.shiftFlash = Math.max(0, this.shiftFlash - dt);
        if (this.perfectShiftFlash > 0) this.perfectShiftFlash = Math.max(0, this.perfectShiftFlash - dt);

        // Invincibility
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) this.invincible = false;
        }

        // Perfect shift timer
        if (this.perfectShiftTimer > 0) {
            this.perfectShiftTimer -= dt;
            if (this.perfectShiftTimer <= 0) this.perfectShiftActive = false;
        }

        // --- SHIFT ---
        if (input.shift() && this.shiftCooldown <= 0) {
            this.switchPersona(engine);
        }

        // --- MOVEMENT ---
        if (!this.dashing && !this.attacking) {
            this.vx = 0;
            if (input.left()) { this.vx = -SPEED * speedMult; this.facing = -1; }
            if (input.right()) { this.vx = SPEED * speedMult; this.facing = 1; }
        }

        // --- JUMP ---
        if (input.jump() && this.grounded && !this.dashing) {
            this.vy = JUMP_FORCE;
            this.grounded = false;
            this.state = 'jump';
        }

        // --- DASH ---
        if (input.dash() && this.dashCooldown <= 0 && !this.dashing) {
            if (!(this.persona === 'calm' && this.inDeepState)) {
                this.dashing = true;
                this.dashTimer = 0.15;
                this.dashDir = this.facing;
                this.dashCooldown = 0.5;
                this.invincible = true;
                this.invincibleTimer = 0.15;
                if (this.persona === 'frenzy') {
                    // Blood Rush: costs HP but longer invincibility
                    this.hp = Math.max(1, this.hp - 5);
                    this.invincibleTimer = 0.25;
                    this.dashTimer = 0.2;
                }
                engine.audio.playDash();
            }
        }

        if (this.dashing) {
            this.vx = DASH_SPEED * this.dashDir;
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) this.dashing = false;
        }

        // --- ATTACK ---
        if (input.attack() && this.attackCooldown <= 0 && !this.dashing) {
            this.performAttack(engine);
        }

        if (this.attacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attacking = false;
                this.state = 'idle';
            }
        }

        // --- SPECIAL ---
        if (input.special() && this.specialCooldown <= 0 && this.energy >= 30) {
            this.performSpecial(engine);
        }

        // --- ULTIMATE ---
        if (input.ultimate() && this.ultimateCharge >= 100) {
            this.performUltimate(engine);
        }

        // --- GRAVITY ---
        if (!this.grounded) {
            this.vy += GRAVITY * dt;
        }

        // --- APPLY PHYSICS ---
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // --- FLOOR COLLISION ---
        const floorY = engine.level ? engine.level.getFloorY(this.x, this.width) : engine.height - 80;
        if (this.y + this.height > floorY) {
            this.y = floorY - this.height;
            this.vy = 0;
            this.grounded = true;
        }

        // --- WALL BOUNDS ---
        const levelWidth = engine.level ? engine.level.width : engine.width;
        this.x = Math.max(0, Math.min(levelWidth - this.width, this.x));

        // --- STABILITY DRIFT ---
        this.updateStability(dt);

        // --- ENERGY REGEN ---
        const inGoldenZone = Math.abs(this.stability - 50) < 10;
        const regenRate = inGoldenZone ? 15 : 5;
        this.energy = Math.min(this.maxEnergy, this.energy + regenRate * dt);

        // --- ULTIMATE CHARGE ---
        this.ultimateCharge = Math.min(100, this.ultimateCharge + 2 * dt);

        // --- DEEP STATE DAMAGE ---
        if (this.inDeepState && this.persona === 'frenzy') {
            this.hp = Math.max(1, this.hp - 8 * dt);
        }

        // --- ANIMATION STATE ---
        if (!this.attacking && !this.dashing) {
            if (!this.grounded) this.state = 'jump';
            else if (Math.abs(this.vx) > 10) this.state = 'run';
            else this.state = 'idle';
        }

        this.animTimer += dt;
        if (this.animTimer > 0.1) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // --- CAMERA FOLLOW ---
        const targetCamX = this.x - engine.width / 2 + this.width / 2;
        engine.camera.x += (targetCamX - engine.camera.x) * 5 * dt;
        engine.camera.x = Math.max(0, Math.min(
            (engine.level ? engine.level.width : engine.width) - engine.width,
            engine.camera.x
        ));

        // HP regen from lifesteal (passive if skilled)
        if (this.persona === 'frenzy' && this.skills.frenzy.lifesteal > 0) {
            // Passive handled in combat hit
        }
    }

    switchPersona(engine) {
        const prev = this.persona;
        this.persona = this.persona === 'frenzy' ? 'calm' : 'frenzy';
        this.shiftCooldown = 0.3;
        this.shiftFlash = 0.3;
        this.attackCombo = 0;

        // Check for perfect shift
        if (this.perfectShiftWindow > 0) {
            this.perfectShiftActive = true;
            this.perfectShiftTimer = 3;
            this.perfectShifts++;
            engine.audio.playPerfectShift();
            engine.shakeCamera(12);
            this.perfectShiftFlash = 0.4; // full-screen flash

            // Slow all enemies
            for (const e of engine.entities) {
                if (e instanceof Enemy) {
                    e.slowTimer = 3;
                }
            }

            // Huge burst of white + gold particles
            engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 50, '#fff');
            engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 30, '#ffcc00');
        } else {
            engine.audio.playShift();
            engine.shakeCamera(3);
        }

        // Particles
        const color = this.persona === 'frenzy' ? '#ff3333' : '#3388ff';
        engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 15, color);
    }

    updateStability(dt) {
        // Drift toward current persona — fast enough to matter
        const driftRate = 14;
        if (this.persona === 'frenzy') {
            this.stability = Math.max(0, this.stability - driftRate * dt);
        } else {
            this.stability = Math.min(100, this.stability + driftRate * dt);
        }

        // Weak return to center (only gentle)
        const centerPull = (50 - this.stability) * 0.15 * dt;
        this.stability += centerPull;

        // Deep state check
        const wasDeep = this.inDeepState;
        this.inDeepState = this.stability < 10 || this.stability > 90;

        if (this.inDeepState && !wasDeep) {
            this.deepStateTimer = 0;
        }
        if (this.inDeepState) {
            this.deepStateTimer += dt;
        }
    }

    performAttack(engine) {
        this.attacking = true;
        this.state = 'attack';

        if (this.persona === 'frenzy') {
            this.attackTimer = 0.15;
            this.attackCooldown = 0.1;
            this.attackCombo = (this.attackCombo + 1) % (3 + this.skills.frenzy.comboExtend);

            const range = 70;
            const damage = 22 + (this.inDeepState ? 12 : 0) + (this.perfectShiftActive ? 8 : 0);

            this.hitEnemiesInRange(engine, range, damage);
            engine.shakeCamera(6 + this.attackCombo * 3);
            engine.audio.playHit('frenzy');
        } else {
            this.attackTimer = 0.3;
            this.attackCooldown = 0.25;

            // Rapier thrust or energy shot
            if (this.attackCombo % 2 === 1 || this.skills.calm.multishot) {
                // Energy projectile
                const proj = new Projectile(
                    this.x + (this.facing > 0 ? this.width : 0),
                    this.y + this.height / 2 - 4,
                    this.facing * 500, 0,
                    15, '#55aaff', 'player'
                );
                engine.addEntity(proj);
            }

            const range = 45;
            const damage = 7 + (this.perfectShiftActive ? 5 : 0);
            this.hitEnemiesInRange(engine, range, damage);
            this.attackCombo++;
            engine.audio.playHit('calm');
        }

        this.stability += (this.persona === 'frenzy' ? -2 : 2);
    }

    performSpecial(engine) {
        this.energy -= 30;
        this.specialCooldown = 2;

        if (this.persona === 'frenzy') {
            // Blood Rush — invincible dash forward
            this.hp = Math.max(1, this.hp - 10);
            this.invincible = true;
            this.invincibleTimer = 0.4;
            this.dashing = true;
            this.dashTimer = 0.3;
            this.dashDir = this.facing;
            this.hitEnemiesInRange(engine, 80, 25);
            engine.shakeCamera(10);
            engine.audio.playHit('frenzy');
            engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 20, '#ff0000');
        } else {
            // Tactical Field — slow zone + bullet reflect
            const field = new SlowField(
                this.x + this.facing * 60,
                this.y - 20,
                120, 100, 3
            );
            engine.addEntity(field);
            engine.audio.playHit('calm');
            engine.particles.burstAt(this.x + this.width / 2, this.y + this.height / 2, 15, '#55aaff');
        }

        this.stability += (this.persona === 'frenzy' ? -5 : 5);
    }

    performUltimate(engine) {
        this.ultimateCharge = 0;
        engine.shakeCamera(20);
        engine.audio.playUltimate(this.persona);

        if (this.persona === 'frenzy') {
            // Ember Immolation — full screen damage
            for (const e of engine.entities) {
                if (e instanceof Enemy) {
                    e.takeDamage(40, engine);
                    e.burnTimer = 3; // DoT
                }
            }
            engine.particles.burstAt(engine.width / 2 + engine.camera.x, engine.height / 2, 50, '#ff4400');
            engine.particles.burstAt(engine.width / 2 + engine.camera.x, engine.height / 2, 50, '#ffaa00');
        } else {
            // Absolute Zero — AoE freeze
            for (const e of engine.entities) {
                if (e instanceof Enemy) {
                    e.takeDamage(20, engine);
                    e.frozenTimer = 4;
                    e.slowTimer = 4;
                }
            }
            engine.particles.burstAt(engine.width / 2 + engine.camera.x, engine.height / 2, 50, '#88ccff');
            engine.particles.burstAt(engine.width / 2 + engine.camera.x, engine.height / 2, 50, '#ffffff');
        }

        this.stability += (this.persona === 'frenzy' ? -10 : 10);
    }

    hitEnemiesInRange(engine, range, damage) {
        const cx = this.x + (this.facing > 0 ? this.width + range / 2 : -range / 2);
        const cy = this.y + this.height / 2;

        for (const e of engine.entities) {
            if (e instanceof Enemy) {
                const ex = e.x + e.width / 2;
                const ey = e.y + e.height / 2;
                const dist = Math.hypot(ex - cx, ey - cy);
                if (dist < range) {
                    e.takeDamage(damage, engine);

                    // Lifesteal
                    if (this.persona === 'frenzy' && this.skills.frenzy.lifesteal > 0) {
                        this.hp = Math.min(this.maxHP, this.hp + damage * 0.1 * this.skills.frenzy.lifesteal);
                    }

                    // Knockback
                    e.vx += this.facing * 200;
                    e.vy -= 100;

                    // Hit particles
                    const color = this.persona === 'frenzy' ? '#ff4400' : '#88ccff';
                    engine.particles.burstAt(ex, ey, 8, color);
                }
            }
        }
    }

    takeDamage(amount, engine) {
        if (this.invincible) return;

        // Calm deep state: high defense
        if (this.inDeepState && this.persona === 'calm') {
            amount *= 0.3;
        }

        // Calm parry window
        if (this.persona === 'calm' && this.attacking) {
            amount *= 0.5;
            // Set perfect shift window
            this.perfectShiftWindow = 0.3 + this.skills.calm.parryWindow * 0.1;
        } else {
            this.perfectShiftWindow = 0.15;
        }

        this.hp -= amount;
        this.invincible = true;
        this.invincibleTimer = 0.3;
        engine.shakeCamera(6);

        setTimeout(() => { this.perfectShiftWindow = 0; }, this.perfectShiftWindow * 1000);

        if (this.hp <= 0) {
            this.hp = 0;
            // Don't set gameState here — let checkStoryTriggers handle it
            // so the game over screen actually shows
            this.dead = true;
        }
    }

    render(ctx, engine) {
        const p = this.persona;
        const isFrenzy = p === 'frenzy';

        // Flicker when invincible
        if (this.invincible && Math.floor(this.invincibleTimer * 20) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.facing, 1);

        // Shift flash effect
        if (this.shiftFlash > 0) {
            ctx.shadowColor = isFrenzy ? '#ff3333' : '#3388ff';
            ctx.shadowBlur = 20 * (this.shiftFlash / 0.3);
        }

        // Body
        const bodyColor = isFrenzy
            ? (this.inDeepState ? '#cc0000' : '#dd2222')
            : (this.inDeepState ? '#1155aa' : '#2266cc');

        // Legs
        const legOffset = this.state === 'run' ? Math.sin(this.animTimer * 15) * 6 : 0;
        ctx.fillStyle = '#333';
        ctx.fillRect(-8, 10, 6, 14 + legOffset);
        ctx.fillRect(2, 10, 6, 14 - legOffset);

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-12, -14, 24, 28);

        // Head
        ctx.fillStyle = '#ddd';
        ctx.fillRect(-8, -24, 16, 12);

        // Eyes
        ctx.fillStyle = isFrenzy ? '#ff0000' : '#00aaff';
        ctx.fillRect(-5, -20, 4, 3);
        ctx.fillRect(1, -20, 4, 3);

        // Weapon
        if (this.attacking) {
            ctx.fillStyle = isFrenzy ? '#ff6600' : '#55aaff';
            if (isFrenzy) {
                // Chainsaw blade sweep
                const swingAngle = (this.attackTimer / 0.2) * Math.PI * 0.6 - Math.PI * 0.3;
                ctx.save();
                ctx.rotate(swingAngle);
                ctx.fillRect(10, -3, 35 + this.attackCombo * 5, 6);
                // Teeth
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(12 + i * 7, -6, 3, 3);
                    ctx.fillRect(12 + i * 7, 3, 3, 3);
                }
                ctx.restore();
            } else {
                // Rapier thrust
                const thrust = (1 - this.attackTimer / 0.25) * 40;
                ctx.fillRect(12, -2, 25 + thrust, 3);
                ctx.fillStyle = '#fff';
                ctx.fillRect(35 + thrust, -3, 4, 5);
            }
        } else {
            // Idle weapon
            ctx.fillStyle = isFrenzy ? '#aa4400' : '#4488cc';
            if (isFrenzy) {
                ctx.fillRect(10, -2, 20, 4);
            } else {
                ctx.fillRect(10, 2, 18, 2);
            }
        }

        // Perfect shift aura — BIG, obvious, pulsing
        if (this.perfectShiftActive) {
            const pulse = 0.5 + Math.sin(this.animTimer * 12) * 0.3;
            // Outer glow ring
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = pulse;
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(0, 0, 40 + Math.sin(this.animTimer * 8) * 5, 0, Math.PI * 2);
            ctx.stroke();
            // Inner ring
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.stroke();
            // Lightning bolts radiating out
            for (let i = 0; i < 4; i++) {
                const angle = this.animTimer * 3 + i * Math.PI / 2;
                const r1 = 30;
                const r2 = 50 + Math.sin(this.animTimer * 15 + i) * 10;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
                ctx.lineTo(Math.cos(angle + 0.2) * (r1 + r2) / 2, Math.sin(angle + 0.2) * (r1 + r2) / 2);
                ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // Deep state visual
        if (this.inDeepState) {
            ctx.globalAlpha = 0.2 + Math.sin(this.animTimer * 8) * 0.1;
            ctx.fillStyle = isFrenzy ? '#ff0000' : '#0066ff';
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
