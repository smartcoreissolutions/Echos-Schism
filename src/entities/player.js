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

        // --- FLOOR COLLISION (one-way platforms: only land if falling & feet near surface) ---
        const floorY = engine.level ? engine.level.getFloorYPlayer(this.x, this.width, this.y + this.height, this.vy) : engine.height - 80;
        if (this.y + this.height > floorY && this.vy >= 0) {
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

        // --- DEEP STATE DAMAGE (tapers off as HP gets low) ---
        if (this.inDeepState && this.persona === 'frenzy') {
            const hpRatio = this.hp / this.maxHP;
            // Full drain at 8/s above 50% HP, tapers to 1.5/s below 20%
            const drainRate = hpRatio > 0.5 ? 8 : (hpRatio > 0.2 ? 4 : 1.5);
            this.hp = Math.max(1, this.hp - drainRate * dt);
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
        const t = this.animTimer;

        // Flicker when invincible
        if (this.invincible && Math.floor(this.invincibleTimer * 20) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.facing, 1);

        // ── Character shadow on ground ──
        const groundDist = (engine.level ? engine.level.getFloorY(this.x, this.width) : engine.height - 80) - (this.y + this.height);
        if (groundDist < 100 && groundDist > -5) {
            ctx.save();
            ctx.scale(this.facing, 1); // un-mirror for shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(0, this.height / 2 + groundDist, 14 - groundDist * 0.05, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Shift flash burst ──
        if (this.shiftFlash > 0) {
            const flashR = 60 * (1 - this.shiftFlash / 0.3);
            ctx.globalAlpha = this.shiftFlash / 0.3 * 0.5;
            ctx.strokeStyle = isFrenzy ? '#ff3333' : '#3388ff';
            ctx.lineWidth = 3;
            ctx.shadowColor = isFrenzy ? '#ff3333' : '#3388ff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, flashR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // ── Deep state outer aura ──
        if (this.inDeepState) {
            ctx.globalAlpha = 0.15 + Math.sin(t * 8) * 0.08;
            const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
            gradient.addColorStop(0, isFrenzy ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 80, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // ── Legs with boots ──
        const legPhase = this.state === 'run' ? Math.sin(t * 15) : 0;
        const legOffset = legPhase * 7;

        // Left leg
        ctx.fillStyle = '#222';
        ctx.fillRect(-8, 10, 6, 11 + legOffset);
        // Boot
        ctx.fillStyle = isFrenzy ? '#551111' : '#111144';
        ctx.fillRect(-9, 20 + legOffset, 8, 5);

        // Right leg
        ctx.fillStyle = '#222';
        ctx.fillRect(2, 10, 6, 11 - legOffset);
        ctx.fillStyle = isFrenzy ? '#551111' : '#111144';
        ctx.fillRect(1, 20 - legOffset, 8, 5);

        // ── Torso with armor details ──
        const bodyPrimary = isFrenzy
            ? (this.inDeepState ? '#aa0000' : '#cc2222')
            : (this.inDeepState ? '#1144aa' : '#2255bb');
        const bodySecondary = isFrenzy ? '#881818' : '#183388';

        // Main body
        ctx.fillStyle = bodyPrimary;
        ctx.fillRect(-12, -14, 24, 26);

        // Chest plate highlights
        ctx.fillStyle = isFrenzy ? '#ee3333' : '#3366dd';
        ctx.fillRect(-10, -12, 20, 3);
        ctx.fillStyle = bodySecondary;
        ctx.fillRect(-10, -6, 20, 2);

        // Belt
        ctx.fillStyle = '#333';
        ctx.fillRect(-12, 8, 24, 3);
        ctx.fillStyle = isFrenzy ? '#aa6600' : '#4466aa';
        ctx.fillRect(-3, 8, 6, 3); // buckle

        // Shoulder pads
        ctx.fillStyle = isFrenzy ? '#bb2020' : '#2040aa';
        ctx.fillRect(-14, -14, 5, 8);
        ctx.fillRect(9, -14, 5, 8);
        // Shoulder highlights
        ctx.fillStyle = isFrenzy ? '#dd4444' : '#4466cc';
        ctx.fillRect(-14, -14, 5, 2);
        ctx.fillRect(9, -14, 5, 2);

        // ── Arms ──
        const armSwing = this.state === 'run' ? Math.sin(t * 15 + Math.PI) * 4 : 0;
        // Back arm
        ctx.fillStyle = bodySecondary;
        ctx.fillRect(-14, -6 + armSwing, 4, 14);
        // Glove
        ctx.fillStyle = '#222';
        ctx.fillRect(-14, 6 + armSwing, 4, 4);

        // Front arm (weapon arm)
        if (!this.attacking) {
            ctx.fillStyle = bodySecondary;
            ctx.fillRect(10, -6 - armSwing, 4, 14);
            ctx.fillStyle = '#222';
            ctx.fillRect(10, 6 - armSwing, 4, 4);
        }

        // ── Head with cybernetic details ──
        // Neck
        ctx.fillStyle = '#bba';
        ctx.fillRect(-3, -16, 6, 3);

        // Head shape
        ctx.fillStyle = '#ccbbaa';
        ctx.fillRect(-8, -26, 16, 12);
        // Jawline
        ctx.fillStyle = '#bbaa99';
        ctx.fillRect(-7, -16, 14, 2);

        // Hair / helmet
        ctx.fillStyle = isFrenzy ? '#441111' : '#111144';
        ctx.fillRect(-9, -28, 18, 5);
        ctx.fillRect(-8, -27, 16, 3);

        // Eyes — glowing with emotion
        const eyeGlow = isFrenzy ? '#ff2200' : '#00aaff';
        ctx.fillStyle = eyeGlow;
        ctx.shadowColor = eyeGlow;
        ctx.shadowBlur = 6;
        // Left eye
        ctx.fillRect(-6, -22, 4, 3);
        // Right eye
        ctx.fillRect(2, -22, 4, 3);
        // Pupil
        ctx.fillStyle = '#fff';
        ctx.fillRect(-5, -21, 2, 1);
        ctx.fillRect(3, -21, 2, 1);
        ctx.shadowBlur = 0;

        // Cybernetic scar / Janus chip glow line
        ctx.strokeStyle = isFrenzy ? '#ff440066' : '#4488ff66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -27);
        ctx.lineTo(0, -15);
        ctx.stroke();
        // Chip glow at temple
        ctx.fillStyle = isFrenzy ? '#ff4400' : '#4488ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 4;
        ctx.fillRect(6, -24, 3, 2);
        ctx.shadowBlur = 0;

        // Mouth
        if (this.attacking || this.inDeepState) {
            ctx.fillStyle = '#222';
            ctx.fillRect(-3, -17, 6, 2); // open mouth
        }

        // ── Weapon rendering ──
        if (this.attacking) {
            if (isFrenzy) {
                // Chainsaw sweep with glow trail
                const swingAngle = (this.attackTimer / 0.15) * Math.PI * 0.7 - Math.PI * 0.35;
                ctx.save();
                ctx.rotate(swingAngle);

                // Blade glow trail
                ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
                ctx.fillRect(8, -5, 40, 10);

                // Blade body
                ctx.fillStyle = '#888';
                ctx.fillRect(12, -3, 32 + this.attackCombo * 5, 6);
                // Blade edge (bright)
                ctx.fillStyle = '#ff6600';
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 8;
                ctx.fillRect(12, -4, 32 + this.attackCombo * 5, 1);
                ctx.fillRect(12, 3, 32 + this.attackCombo * 5, 1);
                ctx.shadowBlur = 0;
                // Teeth
                ctx.fillStyle = '#ccc';
                for (let i = 0; i < 6; i++) {
                    ctx.fillRect(14 + i * 6, -6, 2, 2);
                    ctx.fillRect(14 + i * 6, 4, 2, 2);
                }
                // Handle
                ctx.fillStyle = '#444';
                ctx.fillRect(6, -2, 8, 4);

                ctx.restore();

                // Arm behind weapon
                ctx.fillStyle = bodySecondary;
                ctx.fillRect(10, -6, 4, 14);
            } else {
                // Rapier thrust with energy trail
                const thrust = (1 - this.attackTimer / 0.3) * 45;
                // Energy trail
                ctx.fillStyle = 'rgba(85, 170, 255, 0.2)';
                ctx.fillRect(12, -4, 20 + thrust, 8);
                // Blade
                ctx.fillStyle = '#aaccee';
                ctx.fillRect(14, -1.5, 22 + thrust, 3);
                // Tip glow
                ctx.fillStyle = '#55aaff';
                ctx.shadowColor = '#55aaff';
                ctx.shadowBlur = 10;
                ctx.fillRect(34 + thrust, -3, 5, 6);
                ctx.shadowBlur = 0;
                // Guard
                ctx.fillStyle = '#667';
                ctx.fillRect(12, -4, 3, 8);
                // Handle
                ctx.fillStyle = '#334';
                ctx.fillRect(6, -2, 7, 4);

                // Arm
                ctx.fillStyle = bodySecondary;
                ctx.fillRect(10, -6, 4, 14);
            }
        } else {
            // Idle weapon at side
            if (isFrenzy) {
                // Chainsaw resting
                ctx.fillStyle = '#666';
                ctx.fillRect(12, -1, 20, 4);
                ctx.fillStyle = '#ff440044';
                ctx.fillRect(12, -2, 20, 1);
                ctx.fillStyle = '#444';
                ctx.fillRect(8, 0, 5, 3);
            } else {
                // Rapier pointed down
                ctx.fillStyle = '#99aabb';
                ctx.fillRect(12, 2, 18, 2);
                ctx.fillStyle = '#55aaff33';
                ctx.fillRect(28, 0, 3, 5);
                ctx.fillStyle = '#556';
                ctx.fillRect(10, 0, 3, 6);
            }
            // Front arm
            ctx.fillStyle = bodySecondary;
            ctx.fillRect(10, -6, 4, 14);
            ctx.fillStyle = '#222';
            ctx.fillRect(10, 6, 4, 4);
        }

        // ── Perfect shift aura — BIG, obvious, pulsing ──
        if (this.perfectShiftActive) {
            const pulse = 0.5 + Math.sin(t * 12) * 0.3;
            // Outer glow ring
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = pulse;
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(0, 0, 40 + Math.sin(t * 8) * 5, 0, Math.PI * 2);
            ctx.stroke();
            // Inner ring
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.stroke();
            // Lightning bolts radiating out
            for (let i = 0; i < 4; i++) {
                const angle = t * 3 + i * Math.PI / 2;
                const r1 = 30;
                const r2 = 50 + Math.sin(t * 15 + i) * 10;
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

        ctx.restore();
    }
}
