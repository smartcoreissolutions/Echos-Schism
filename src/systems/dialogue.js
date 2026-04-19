/**
 * Dialogue System - Persona commentary and narrative choices
 */
class DialogueSystem {
    constructor() {
        this.queue = [];
        this.current = null;
        this.timer = 0;
        this.displayTime = 3;
        this.cooldown = 0;
        this.lastTrigger = '';

        // Combat barks
        this.barks = {
            frenzy: {
                attack: ["BURN!", "Feel my rage!", "No mercy!", "SHATTER!"],
                kill: ["Pathetic.", "More... I need MORE!", "They all fall.", "Ashes to ashes."],
                hurt: ["Is that all?!", "You'll PAY for that!", "RRRAGH!"],
                shift_to: ["Let me handle this!", "Stand aside, cold one.", "Time to get REAL."],
                deep: ["I can't... stop... THE FIRE!", "Everything BURNS!", "No control..."],
                perfect: ["TOO SLOW!", "Time bends to fury!", "PERFECT!"],
            },
            calm: {
                attack: ["Calculated.", "Precision.", "Target acquired.", "Efficient."],
                kill: ["Threat neutralized.", "Objective complete.", "Data logged.", "Eliminated."],
                hurt: ["Damage noted.", "Recalculating...", "Structural integrity: declining."],
                shift_to: ["Engaging tactical mode.", "Emotions are noise.", "Logic prevails."],
                deep: ["Warning: processing loop... I cannot... feel...", "Empathy module: offline."],
                perfect: ["Predictable.", "Timing: optimal.", "Frame-perfect calculation."],
            }
        };

        // Story dialogues (triggered at specific points)
        this.storyDialogues = [
            { trigger: 'first_shift', persona: 'calm', text: "The Janus chip stabilizes. Two minds, one vessel. Adapt or perish." },
            { trigger: 'first_kill', persona: 'frenzy', text: "That felt... good. Too good. What am I becoming?" },
            { trigger: 'first_perfect', persona: 'calm', text: "Temporal fracture achieved. The chip's true potential emerges." },
            { trigger: 'first_deep_frenzy', persona: 'frenzy', text: "THE WALLS ARE BLEEDING! No... it's just me. It's always just me." },
            { trigger: 'first_deep_calm', persona: 'calm', text: "Emotions purged. I am efficient. I am... empty." },
            { trigger: 'ten_kills', persona: 'frenzy', text: "They made me a weapon. Maybe that's all I was ever meant to be." },
            { trigger: 'ten_kills', persona: 'calm', text: "Correction: they made US. The question is what we choose to become." },
        ];

        this.triggered = new Set();
    }

    bark(persona, category) {
        if (this.cooldown > 0) return;
        const lines = this.barks[persona]?.[category];
        if (!lines || lines.length === 0) return;
        const text = lines[Math.floor(Math.random() * lines.length)];
        this.show(persona, text, 2);
        this.cooldown = 3;
    }

    tryStoryTrigger(trigger) {
        if (this.triggered.has(trigger)) return;
        const dialogues = this.storyDialogues.filter(d => d.trigger === trigger);
        for (const d of dialogues) {
            this.triggered.add(trigger);
            this.queue.push({ persona: d.persona, text: d.text, duration: 4 });
        }
    }

    show(persona, text, duration = 3) {
        this.queue.push({ persona, text, duration });
    }

    update(dt) {
        this.cooldown = Math.max(0, this.cooldown - dt);

        if (this.current) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.current = null;
            }
        }

        if (!this.current && this.queue.length > 0) {
            this.current = this.queue.shift();
            this.timer = this.current.duration;
        }
    }

    renderUI(ctx, engine) {
        if (!this.current) return;

        const d = this.current;
        const isFrenzy = d.persona === 'frenzy';
        const fadeIn = Math.min(1, (d.duration - this.timer + 0.3) / 0.3);
        const fadeOut = Math.min(1, this.timer / 0.5);
        const alpha = Math.min(fadeIn, fadeOut);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Background bar
        const barY = engine.height - 80;
        const gradient = ctx.createLinearGradient(0, barY, engine.width, barY);
        if (isFrenzy) {
            gradient.addColorStop(0, 'rgba(150, 0, 0, 0.85)');
            gradient.addColorStop(1, 'rgba(80, 0, 0, 0.6)');
        } else {
            gradient.addColorStop(0, 'rgba(0, 40, 100, 0.6)');
            gradient.addColorStop(1, 'rgba(0, 60, 150, 0.85)');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, barY, engine.width, 60);

        // Border
        ctx.strokeStyle = isFrenzy ? '#ff4444' : '#4488ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, barY);
        ctx.lineTo(engine.width, barY);
        ctx.stroke();

        // Speaker label
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = isFrenzy ? '#ff6644' : '#66aaff';
        ctx.textAlign = 'left';
        const label = isFrenzy ? '🔥 ARES' : '🧊 ATHENA';
        ctx.fillText(label, 20, barY + 20);

        // Text
        ctx.font = '14px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(d.text, 20, barY + 42);

        ctx.restore();
    }
}
