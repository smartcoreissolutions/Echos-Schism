/**
 * Input Manager - Handles keyboard and mouse input
 */
class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.mouse = { x: 0, y: 0, down: false, justClicked: false };
        this._prevKeys = {};

        window.addEventListener('keydown', e => {
            if (!this.keys[e.code]) this.justPressed[e.code] = true;
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
        window.addEventListener('mousedown', e => {
            this.mouse.down = true;
            this.mouse.justClicked = true;
        });
        window.addEventListener('mouseup', e => {
            this.mouse.down = false;
        });
        window.addEventListener('mousemove', e => {
            const rect = document.getElementById('gameCanvas').getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        return !!this.justPressed[code];
    }

    left() { return this.isDown('KeyA') || this.isDown('ArrowLeft'); }
    right() { return this.isDown('KeyD') || this.isDown('ArrowRight'); }
    up() { return this.isDown('KeyW') || this.isDown('ArrowUp'); }
    jump() { return this.wasPressed('KeyW') || this.wasPressed('ArrowUp'); }
    shift() { return this.wasPressed('ShiftLeft') || this.wasPressed('ShiftRight'); }
    attack() { return this.wasPressed('KeyJ') || this.mouse.justClicked; }
    special() { return this.wasPressed('KeyK'); }
    ultimate() { return this.wasPressed('KeyL'); }
    dash() { return this.wasPressed('Space'); }
    interact() { return this.wasPressed('KeyE'); }
    pause() { return this.wasPressed('Escape'); }
    enter() { return this.wasPressed('Enter'); }

    endFrame() {
        this.justPressed = {};
        this.mouse.justClicked = false;
    }
}
