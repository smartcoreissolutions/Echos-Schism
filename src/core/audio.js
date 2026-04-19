/**
 * Audio Engine - Procedural audio + dynamic persona-reactive soundtrack
 */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.currentPersona = 'frenzy';
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.15;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.5;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    playHit(persona) {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);

        if (persona === 'frenzy') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }
    }

    playShift() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);

        // Whoosh
        const noise = this.ctx.createOscillator();
        const ng = this.ctx.createGain();
        noise.connect(ng);
        ng.connect(this.sfxGain);
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(100, this.ctx.currentTime);
        noise.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);
        ng.gain.setValueAtTime(0.3, this.ctx.currentTime);
        ng.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        noise.start();
        noise.stop(this.ctx.currentTime + 0.2);
    }

    playDash() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playPerfectShift() {
        if (!this.initialized) return;
        // Dramatic chord
        [400, 600, 800, 1200].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.05);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
            osc.start(this.ctx.currentTime + i * 0.05);
            osc.stop(this.ctx.currentTime + 0.5);
        });
    }

    playEnemyDeath() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playUltimate(persona) {
        if (!this.initialized) return;
        const duration = 0.8;
        for (let i = 0; i < 8; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.type = persona === 'frenzy' ? 'sawtooth' : 'sine';
            const baseFreq = persona === 'frenzy' ? 60 : 400;
            osc.frequency.setValueAtTime(baseFreq + i * 50, this.ctx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.1 + 0.15);
            osc.start(this.ctx.currentTime + i * 0.1);
            osc.stop(this.ctx.currentTime + i * 0.1 + 0.15);
        }
    }
}
