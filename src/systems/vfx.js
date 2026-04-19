/**
 * Visual Effects Engine - Post-processing, weather, neon lighting, CRT effects
 */
class VFXEngine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.time = 0;

        // Rain system
        this.raindrops = [];
        for (let i = 0; i < 200; i++) {
            this.raindrops.push({
                x: Math.random() * width * 2,
                y: Math.random() * height,
                speed: 300 + Math.random() * 400,
                length: 8 + Math.random() * 16,
                opacity: 0.1 + Math.random() * 0.3,
            });
        }

        // Neon signs
        this.neonSigns = [];
        // Lightning
        this.lightningTimer = 0;
        this.lightningAlpha = 0;

        // CRT offscreen
        this.crtCanvas = document.createElement('canvas');
        this.crtCanvas.width = width;
        this.crtCanvas.height = height;
        this.crtCtx = this.crtCanvas.getContext('2d');
    }

    update(dt, persona) {
        this.time += dt;

        // Rain
        for (const drop of this.raindrops) {
            drop.y += drop.speed * dt;
            drop.x += 50 * dt; // Wind
            if (drop.y > this.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * this.width * 2;
            }
        }

        // Random lightning
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
            this.lightningTimer = 5 + Math.random() * 15;
            this.lightningAlpha = 0.3;
        }
        this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 2);
    }

    renderRain(ctx, camera, persona) {
        const isFrenzy = persona === 'frenzy';
        ctx.save();

        for (const drop of this.raindrops) {
            const screenX = drop.x - camera.x * 0.1;
            const wrappedX = ((screenX % this.width) + this.width) % this.width;
            ctx.strokeStyle = isFrenzy
                ? `rgba(255, 100, 80, ${drop.opacity * 0.5})`
                : `rgba(100, 180, 255, ${drop.opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wrappedX, drop.y);
            ctx.lineTo(wrappedX + 2, drop.y + drop.length);
            ctx.stroke();
        }

        // Rain puddle reflections on ground
        for (let i = 0; i < 8; i++) {
            const px = (this.time * 20 + i * 137) % this.width;
            const py = this.height - 78;
            const rippleSize = ((this.time * 2 + i) % 1) * 15;
            ctx.strokeStyle = isFrenzy
                ? `rgba(255, 80, 50, ${0.15 * (1 - rippleSize / 15)})`
                : `rgba(80, 150, 255, ${0.15 * (1 - rippleSize / 15)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(px, py, rippleSize, rippleSize * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderLightning(ctx) {
        if (this.lightningAlpha <= 0) return;
        ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningAlpha})`;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    renderCRT(ctx, intensity = 0.3) {
        // Scanlines
        ctx.fillStyle = `rgba(0, 0, 0, ${intensity * 0.15})`;
        for (let y = 0; y < this.height; y += 3) {
            ctx.fillRect(0, y, this.width, 1);
        }

        // Slight RGB shift — chromatic aberration
        // We'll do a simple vignette + color tint instead for perf
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.35,
            this.width / 2, this.height / 2, this.height * 0.75
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.5})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Subtle screen flicker
        if (Math.random() > 0.98) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Horizontal glitch line (rare)
        if (Math.random() > 0.995) {
            const glitchY = Math.random() * this.height;
            const glitchH = 2 + Math.random() * 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(0, glitchY, this.width, glitchH);
        }
    }

    renderNeonGlow(ctx, x, y, color, radius, intensity = 1) {
        ctx.save();
        ctx.globalAlpha = intensity * (0.5 + Math.sin(this.time * 3) * 0.2);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color.replace(')', `, ${0.4 * intensity})`).replace('rgb', 'rgba'));
        gradient.addColorStop(0.5, color.replace(')', ', 0.1)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();
    }

    renderGroundReflections(ctx, floorY, camera, persona) {
        const isFrenzy = persona === 'frenzy';
        ctx.save();

        // Wet floor reflection strip
        const reflGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 40);
        reflGrad.addColorStop(0, isFrenzy ? 'rgba(80, 10, 10, 0.25)' : 'rgba(10, 20, 60, 0.25)');
        reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = reflGrad;
        ctx.fillRect(camera.x, floorY, this.width, 40);

        // Neon light pools on ground
        const poolColors = isFrenzy
            ? ['rgba(255, 50, 30, 0.08)', 'rgba(255, 150, 0, 0.06)', 'rgba(200, 0, 50, 0.07)']
            : ['rgba(0, 100, 255, 0.08)', 'rgba(50, 200, 255, 0.06)', 'rgba(150, 0, 255, 0.07)'];

        for (let i = 0; i < 6; i++) {
            const px = (i * 500 + 100) - ((camera.x * 0.5) % 500);
            const poolGrad = ctx.createRadialGradient(
                camera.x + px, floorY + 2, 0,
                camera.x + px, floorY + 2, 80
            );
            poolGrad.addColorStop(0, poolColors[i % poolColors.length]);
            poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = poolGrad;
            ctx.fillRect(camera.x + px - 80, floorY, 160, 30);
        }

        ctx.restore();
    }
}
