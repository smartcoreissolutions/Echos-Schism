/**
 * Particle System - Visual effects for combat, shifts, and environment
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 200) * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            p.size *= 0.99;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    render(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1;
    }

    spawnAt(x, y, color, opts = {}) {
        this.particles.push({
            x, y,
            vx: (opts.vx || 0) + (Math.random() - 0.5) * (opts.spread || 100),
            vy: (opts.vy || -50) + (Math.random() - 0.5) * (opts.spread || 100),
            size: opts.size || 3 + Math.random() * 3,
            color,
            life: opts.life || 0.5 + Math.random() * 0.5,
            maxLife: opts.life || 1,
            alpha: 1,
            gravity: opts.gravity || 200,
            shape: opts.shape || 'square',
        });
    }

    burstAt(x, y, count, color, opts = {}) {
        for (let i = 0; i < count; i++) {
            this.spawnAt(x, y, color, {
                spread: opts.spread || 200,
                size: opts.size || 2 + Math.random() * 4,
                life: opts.life || 0.3 + Math.random() * 0.7,
                gravity: opts.gravity || 150,
                shape: opts.shape || (Math.random() > 0.5 ? 'circle' : 'square'),
                ...opts,
            });
        }
    }

    // Environment particles (rain, sparks, etc.)
    ambient(x, y, width, height, persona, dt) {
        if (Math.random() > 0.3) return;
        if (persona === 'frenzy') {
            // Embers floating up
            this.spawnAt(
                x + Math.random() * width,
                y + height,
                Math.random() > 0.5 ? '#ff4400' : '#ffaa00',
                { vy: -80, gravity: -50, size: 2, life: 1.5, spread: 30 }
            );
        } else {
            // Digital scan particles
            this.spawnAt(
                x + Math.random() * width,
                y + Math.random() * height,
                '#4488cc44',
                { vy: 20, vx: 0, gravity: 0, size: 1, life: 0.8, spread: 5 }
            );
        }
    }
}
