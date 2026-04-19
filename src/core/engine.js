/**
 * Echo's Schism - Core Game Engine
 * Handles game loop, timing, and state management
 */
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.running = false;
        this.gameState = 'menu'; // menu, playing, paused, dialogue, gameover
        this.systems = [];
        this.entities = [];
        this.camera = { x: 0, y: 0, shake: 0, shakeDecay: 0.9 };
    }

    addSystem(system) {
        this.systems.push(system);
    }

    addEntity(entity) {
        this.entities.push(entity);
        return entity;
    }

    removeEntity(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx > -1) this.entities.splice(idx, 1);
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    loop(timestamp) {
        if (!this.running) return;
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.update(this.deltaTime);
        this.render();
        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        // Update camera shake
        if (this.camera.shake > 0.5) {
            this.camera.shake *= this.camera.shakeDecay;
        } else {
            this.camera.shake = 0;
        }

        for (const system of this.systems) {
            system.update(dt, this);
        }
        for (const entity of this.entities) {
            if (entity.update) entity.update(dt, this);
        }
        // Remove dead entities
        this.entities = this.entities.filter(e => !e.dead);
    }

    render() {
        const ctx = this.ctx;
        ctx.save();

        // Camera shake
        if (this.camera.shake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * this.camera.shake,
                (Math.random() - 0.5) * this.camera.shake
            );
        }

        // Camera follow
        ctx.translate(-this.camera.x, -this.camera.y);

        for (const system of this.systems) {
            if (system.render) system.render(ctx, this);
        }
        for (const entity of [...this.entities].sort((a, b) => (a.z || 0) - (b.z || 0))) {
            if (entity.render) entity.render(ctx, this);
        }

        ctx.restore();

        // UI renders without camera transform
        for (const system of this.systems) {
            if (system.renderUI) system.renderUI(ctx, this);
        }
    }

    shakeCamera(intensity) {
        this.camera.shake = Math.max(this.camera.shake, intensity);
    }
}
