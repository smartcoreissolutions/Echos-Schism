/**
 * HUD - Heads-Up Display for Echo's Schism
 * Stability bar, HP, energy, ultimate charge, and persona indicator
 */
class HUD {
    constructor() {
        this.flashTimer = 0;
    }

    renderUI(ctx, engine) {
        const player = engine.player;
        if (!player) return;
        if (engine.gameState !== 'playing') return;

        const W = engine.width;
        const isFrenzy = player.persona === 'frenzy';

        // ── Stability Bar (top center) ──
        this.renderStabilityBar(ctx, player, W);

        // ── HP Bar (top left) ──
        this.renderBar(ctx, 20, 15, 180, 14,
            player.hp, player.maxHP,
            isFrenzy ? '#dd2222' : '#22aa44', '#333', 'HP');

        // ── Energy Bar (below HP) ──
        this.renderBar(ctx, 20, 35, 140, 10,
            player.energy, player.maxEnergy,
            '#ffaa00', '#333', 'EN');

        // ── Ultimate Charge (below energy) ──
        this.renderBar(ctx, 20, 50, 140, 8,
            player.ultimateCharge, 100,
            player.ultimateCharge >= 100 ? '#ff44ff' : '#8844cc', '#333',
            player.ultimateCharge >= 100 ? 'ULT ★ READY' : 'ULT');

        // ── Persona Indicator (top right) ──
        this.renderPersonaIndicator(ctx, player, W);

        // ── Stats (top right below persona) ──
        ctx.font = '10px monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'right';
        ctx.fillText(`Kills: ${player.kills}  Fragments: ${player.fragments}`, W - 20, 65);
        ctx.fillText(`Perfect Shifts: ${player.perfectShifts}`, W - 20, 78);

        // ── Cooldown indicators ──
        if (player.specialCooldown > 0) {
            ctx.fillStyle = '#666';
            ctx.textAlign = 'left';
            ctx.fillText(`[K] Special: ${player.specialCooldown.toFixed(1)}s`, 20, 75);
        }

        // ── Deep state warning ──
        if (player.inDeepState) {
            const flash = Math.sin(performance.now() / 100) > 0;
            if (flash) {
                ctx.font = 'bold 14px monospace';
                ctx.fillStyle = isFrenzy ? '#ff0000' : '#0066ff';
                ctx.textAlign = 'center';
                ctx.fillText(
                    isFrenzy ? '⚠ DEEP FRENZY — LOSING CONTROL ⚠' : '⚠ DEEP CALM — SYSTEMS LOCKED ⚠',
                    W / 2, 85
                );
            }
        }

        // ── Perfect Shift notification ── BIG AND OBVIOUS
        if (player.perfectShiftActive) {
            const t = player.perfectShiftTimer;
            const fadeAlpha = Math.min(1, t / 0.5);
            const scale = 1 + Math.sin(performance.now() / 80) * 0.05;

            ctx.save();
            ctx.globalAlpha = fadeAlpha;

            // Background flash banner
            const bannerGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
            bannerGrad.addColorStop(0, 'rgba(255, 204, 0, 0)');
            bannerGrad.addColorStop(0.3, 'rgba(255, 204, 0, 0.15)');
            bannerGrad.addColorStop(0.5, 'rgba(255, 204, 0, 0.25)');
            bannerGrad.addColorStop(0.7, 'rgba(255, 204, 0, 0.15)');
            bannerGrad.addColorStop(1, 'rgba(255, 204, 0, 0)');
            ctx.fillStyle = bannerGrad;
            ctx.fillRect(W / 2 - 200, 92, 400, 50);

            // Title
            ctx.font = `bold ${Math.round(20 * scale)}px monospace`;
            ctx.fillStyle = '#ffcc00';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 15;
            ctx.fillText('⚡ PERFECT SHIFT ⚡', W / 2, 112);

            // Bonus description
            ctx.font = '11px monospace';
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 5;
            ctx.fillText(`+DMG  ·  ENEMIES SLOWED  ·  TIME FRACTURE (${t.toFixed(1)}s)`, W / 2, 130);

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ── Fullscreen persona overlay ──
        this.renderPersonaOverlay(ctx, player, engine);
    }

    renderStabilityBar(ctx, player, W) {
        const barW = 300;
        const barH = 12;
        const barX = (W - barW) / 2;
        const barY = 8;

        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barW, barH);

        // Golden zone (center 20%)
        const goldenX = barX + barW * 0.4;
        const goldenW = barW * 0.2;
        ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
        ctx.fillRect(goldenX, barY, goldenW, barH);

        // Gradient fill
        const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        gradient.addColorStop(0, '#ff2222');
        gradient.addColorStop(0.3, '#ff6644');
        gradient.addColorStop(0.5, '#ffcc00');
        gradient.addColorStop(0.7, '#4488ff');
        gradient.addColorStop(1, '#2244cc');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barW, barH);

        // Darken unfilled areas (show as progress)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barW, barH);

        // Bright current zone
        const needleX = barX + (player.stability / 100) * barW;
        ctx.fillStyle = player.persona === 'frenzy' ? '#ff4444' : '#4488ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
        ctx.fillRect(needleX - 3, barY - 2, 6, barH + 4);
        ctx.shadowBlur = 0;

        // Labels
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('🔥', barX - 15, barY + 10);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4488ff';
        ctx.fillText('🧊', barX + barW + 15, barY + 10);

        // Center label
        ctx.textAlign = 'center';
        ctx.fillStyle = '#999';
        ctx.font = '8px monospace';
        ctx.fillText('STABILITY', W / 2, barY + barH + 10);

        // Zone labels
        if (player.stability < 10) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('CRITICAL', W / 2, barY + barH + 20);
        } else if (player.stability > 90) {
            ctx.fillStyle = '#0066ff';
            ctx.fillText('CRITICAL', W / 2, barY + barH + 20);
        } else if (Math.abs(player.stability - 50) < 10) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('BALANCED', W / 2, barY + barH + 20);
        }
    }

    renderBar(ctx, x, y, w, h, value, max, color, bg, label) {
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w * Math.max(0, value / max), h);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.font = `${Math.max(8, h - 2)}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`${label} ${Math.ceil(value)}/${max}`, x + 3, y + h - 2);
    }

    renderPersonaIndicator(ctx, player, W) {
        const isFrenzy = player.persona === 'frenzy';
        const x = W - 130;
        const y = 12;

        // Background
        ctx.fillStyle = isFrenzy ? 'rgba(150, 0, 0, 0.7)' : 'rgba(0, 40, 120, 0.7)';
        ctx.fillRect(x, y, 120, 35);
        ctx.strokeStyle = isFrenzy ? '#ff4444' : '#4488ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 120, 35);

        // Icon and name
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = isFrenzy ? '#ff4444' : '#4488ff';
        ctx.textAlign = 'center';
        ctx.fillText(isFrenzy ? '🔥 ARES' : '🧊 ATHENA', x + 60, y + 15);

        ctx.font = '9px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(isFrenzy ? 'FRENZY MODE' : 'CALM MODE', x + 60, y + 28);
    }

    renderPersonaOverlay(ctx, player, engine) {
        const isFrenzy = player.persona === 'frenzy';

        // Perfect Shift full-screen flash
        if (player.perfectShiftFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${player.perfectShiftFlash * 0.6})`;
            ctx.fillRect(0, 0, engine.width, engine.height);
        }

        if (isFrenzy) {
            // Red vignette + fire distortion at edges
            const gradient = ctx.createRadialGradient(
                engine.width / 2, engine.height / 2, engine.height * 0.3,
                engine.width / 2, engine.height / 2, engine.height * 0.8
            );
            const intensity = player.inDeepState ? 0.25 : 0.08;
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(200, 0, 0, ${intensity})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, engine.width, engine.height);
        } else {
            // Blue scanlines
            ctx.fillStyle = player.inDeepState ? 'rgba(0, 50, 150, 0.08)' : 'rgba(0, 30, 80, 0.04)';
            for (let y = 0; y < engine.height; y += 3) {
                ctx.fillRect(0, y, engine.width, 1);
            }
        }
    }
}
