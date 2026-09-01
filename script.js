const canvas = document.getElementById('cv-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let entities = [];

const config = {
    density: 110000, // 1 entity per this many px^2
    minCount: 12,
    maxCount: 32,
    separation: 170, // px of personal space between entities
    scanSpeed: 2, 
    scanColor: '#00f0ff',
    baseColor: 'rgba(255, 255, 255, 0.2)',
    // 11 Distinct Types
    types: [
        { label: 'Car', icon: 'car' },
        { label: 'Person', icon: 'person' },
        { label: 'Robot', icon: 'bot' },
        { label: 'Drone', icon: 'drone' },
        { label: 'Chip', icon: 'chip' },
        { label: 'Camera', icon: 'cam' },
        { label: 'Phone', icon: 'phone' },
        { label: 'Satellite', icon: 'satellite' },
        { label: 'Traffic Light', icon: 'trafficlight' },
        { label: 'Bicycle', icon: 'bicycle' },
        { label: 'Server', icon: 'server' }
    ]
};

function resize() {
    const oldW = width, oldH = height;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    // Rescale instead of respawning, so entities don't teleport on resize
    if (oldW && oldH) entities.forEach(e => {
        e.x *= width / oldW;
        e.y *= height / oldH;
    });
}
window.addEventListener('resize', resize);
resize();

class Entity {
    constructor(x, y) {
        this.reset();
        this.x = x;
        this.y = y;
    }

    reset() {
        this.size = 30 + Math.random() * 30; // Icon size
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        
        const typeObj = config.types[Math.floor(Math.random() * config.types.length)];
        this.label = typeObj.label;
        this.iconType = typeObj.icon;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0) { this.x = 0; this.speedX = Math.abs(this.speedX); }
        if (this.x > width - this.size) { this.x = width - this.size; this.speedX = -Math.abs(this.speedX); }
        if (this.y < 0) { this.y = 0; this.speedY = Math.abs(this.speedY); }
        if (this.y > height - this.size) { this.y = height - this.size; this.speedY = -Math.abs(this.speedY); }
    }

    draw(scanY) {
        // Distance check for scanning effect
        const distance = Math.abs(this.y - scanY);
        const isDetected = distance < 100;

        // Visual State
        let color = config.baseColor;
        let lineWidth = 1;
        let showBox = false;

        if (isDetected) {
            color = config.scanColor;
            lineWidth = 2;
            showBox = true;
            ctx.shadowBlur = 10;
            ctx.shadowColor = config.scanColor;
        } else {
            ctx.shadowBlur = 0;
        }

        // Draw Icon inside the entity position
        this.drawIcon(this.x, this.y, this.size, color, isDetected);

        // Draw Bounding Box if detected
        if (showBox) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            this.drawCorners(this.x, this.y, this.size, this.size);
            
            // Draw Label
            ctx.fillStyle = color;
            ctx.font = '12px "Space Grotesk", monospace';
            ctx.fillText(this.label, this.x, this.y - 10);
        }
    }

    // Helper to draw vector icons
    drawIcon(x, y, s, color, isFilled) {
        ctx.strokeStyle = color;
        ctx.lineWidth = isFilled ? 2 : 1;
        ctx.fillStyle = color; 
        
        ctx.beginPath();

        // Center offsets
        const cx = x + s/2;
        const cy = y + s/2;
        const r = s/3;

        // 1. Person
        if (this.iconType === 'person') {
            ctx.moveTo(cx + r/2, cy - r/2);
            ctx.arc(cx, cy - r/2, r/2, 0, Math.PI * 2);
            ctx.moveTo(cx - r, cy + r);
            ctx.quadraticCurveTo(cx, cy - r/4, cx + r, cy + r);
        } 
        // 2. Car
        else if (this.iconType === 'truck' || this.iconType === 'car') {
            // Cargo Body (Rectangle)
            ctx.rect(cx - r * 1.1, cy - r * 0.9, r * 1.5, r * 1.3);

            // Cab (Polygon)
            ctx.moveTo(cx + r * 0.4, cy + r * 0.4); // Bottom Left of Cab
            ctx.lineTo(cx + r * 0.4, cy - r * 0.4); // Up to top of Cab
            ctx.lineTo(cx + r * 0.8, cy - r * 0.4); // Top flat roof
            ctx.lineTo(cx + r * 1.1, cy - r * 0.1); // Windshield slant
            ctx.lineTo(cx + r * 1.1, cy + r * 0.4); // Front nose down
            ctx.lineTo(cx + r * 0.4, cy + r * 0.4); // Bottom closure

            // Wheels
            const wheelY = cy + r * 0.65;
            const wheelR = r * 0.25;
            
            // Rear Wheel
            ctx.moveTo(cx - r * 0.65 + wheelR, wheelY);
            ctx.arc(cx - r * 0.65, wheelY, wheelR, 0, Math.PI * 2);
            
            // Front Wheel
            ctx.moveTo(cx + r * 0.65 + wheelR, wheelY);
            ctx.arc(cx + r * 0.65, wheelY, wheelR, 0, Math.PI * 2);
        }
        // 4. Robot
        else if (this.iconType === 'bot') {
            ctx.rect(cx - r/1.5, cy - r/2, r*1.5, r);
            ctx.moveTo(cx - r/3, cy); ctx.arc(cx - r/3, cy, 1, 0, Math.PI*2);
            ctx.moveTo(cx + r/3, cy); ctx.arc(cx + r/3, cy, 1, 0, Math.PI*2);
            ctx.moveTo(cx, cy - r/2); ctx.lineTo(cx, cy - r);
        }
        // 5. Drone
        else if (this.iconType === 'drone') {
            ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
            ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
            ctx.rect(cx - r/3, cy - r/3, r/1.5, r/1.5); // body
            // rotors
            ctx.moveTo(cx-r, cy-r); ctx.arc(cx-r, cy-r, 3, 0, Math.PI*2);
            ctx.moveTo(cx+r, cy-r); ctx.arc(cx+r, cy-r, 3, 0, Math.PI*2);
            ctx.moveTo(cx-r, cy+r); ctx.arc(cx-r, cy+r, 3, 0, Math.PI*2);
            ctx.moveTo(cx+r, cy+r); ctx.arc(cx+r, cy+r, 3, 0, Math.PI*2);
        }
        // 6. Chip
        else if (this.iconType === 'chip') {
            const bodySize = r * 1.6;
            const half = bodySize / 2;
            const innerSize = bodySize * 0.4;
            const pinLen = r * 0.5;
            const pinOffset = bodySize / 4; // Distance from center for the pins

            // Outer Square
            ctx.rect(cx - half, cy - half, bodySize, bodySize);

            // Inner Square
            ctx.rect(cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize);

            // Pins - Top
            ctx.moveTo(cx - pinOffset, cy - half); ctx.lineTo(cx - pinOffset, cy - half - pinLen);
            ctx.moveTo(cx + pinOffset, cy - half); ctx.lineTo(cx + pinOffset, cy - half - pinLen);

            // Pins - Bottom
            ctx.moveTo(cx - pinOffset, cy + half); ctx.lineTo(cx - pinOffset, cy + half + pinLen);
            ctx.moveTo(cx + pinOffset, cy + half); ctx.lineTo(cx + pinOffset, cy + half + pinLen);

            // Pins - Left
            ctx.moveTo(cx - half, cy - pinOffset); ctx.lineTo(cx - half - pinLen, cy - pinOffset);
            ctx.moveTo(cx - half, cy + pinOffset); ctx.lineTo(cx - half - pinLen, cy + pinOffset);

            // Pins - Right
            ctx.moveTo(cx + half, cy - pinOffset); ctx.lineTo(cx + half + pinLen, cy - pinOffset);
            ctx.moveTo(cx + half, cy + pinOffset); ctx.lineTo(cx + half + pinLen, cy + pinOffset);
        }
        // 7. Camera
        else if (this.iconType === 'cam') {
            ctx.rect(cx - r, cy - r/1.5, r*2, r*1.5);
            ctx.moveTo(cx, cy + r/3); ctx.arc(cx, cy, r/2, 0, Math.PI * 2);
            ctx.rect(cx + r/2, cy - r, r/2, r/3); // button
        }
        // 8. Phone
        else if (this.iconType === 'phone') {
            ctx.rect(cx - r/1.5, cy - r, r*1.3, r*2); // Body
            ctx.rect(cx - r/2, cy - r/1.2, r, r*1.5); // Screen
            ctx.moveTo(cx, cy + r/1.2); ctx.arc(cx, cy + r/1.2, 1, 0, Math.PI * 2); // Button
        }
        // Satellite
        else if (this.iconType === 'satellite') {
            ctx.rect(cx - r/3, cy - r/2, r/1.5, r); // Body
            // Solar panels
            ctx.rect(cx - r*1.3, cy - r/3, r*0.9, r/1.5);
            ctx.rect(cx + r*0.4, cy - r/3, r*0.9, r/1.5);
            ctx.moveTo(cx - r*0.85, cy - r/3); ctx.lineTo(cx - r*0.85, cy + r/3);
            ctx.moveTo(cx + r*0.85, cy - r/3); ctx.lineTo(cx + r*0.85, cy + r/3);
            // Dish
            ctx.moveTo(cx + r/3, cy - r/2); ctx.lineTo(cx + r/2, cy - r);
            ctx.moveTo(cx + r/2 + r/3, cy - r); ctx.arc(cx + r/2, cy - r, r/3, 0, Math.PI * 2);
        }
        // Traffic Light
        else if (this.iconType === 'trafficlight') {
            ctx.rect(cx - r/2, cy - r, r, r*1.6); // Housing
            ctx.moveTo(cx, cy + r*0.6); ctx.lineTo(cx, cy + r); // Pole
            ctx.moveTo(cx - r/3, cy + r); ctx.lineTo(cx + r/3, cy + r); // Base
            // Lamps
            ctx.moveTo(cx + r/5, cy - r*0.6); ctx.arc(cx, cy - r*0.6, r/5, 0, Math.PI*2);
            ctx.moveTo(cx + r/5, cy - r*0.1); ctx.arc(cx, cy - r*0.1, r/5, 0, Math.PI*2);
            ctx.moveTo(cx + r/5, cy + r*0.4); ctx.arc(cx, cy + r*0.4, r/5, 0, Math.PI*2);
        }
        // Bicycle
        else if (this.iconType === 'bicycle') {
            const wr = r/2.2;
            ctx.moveTo(cx - r*0.6 + wr, cy + r/3); ctx.arc(cx - r*0.6, cy + r/3, wr, 0, Math.PI*2);
            ctx.moveTo(cx + r*0.6 + wr, cy + r/3); ctx.arc(cx + r*0.6, cy + r/3, wr, 0, Math.PI*2);
            // Frame
            ctx.moveTo(cx - r*0.6, cy + r/3); ctx.lineTo(cx - r*0.1, cy - r/3);
            ctx.lineTo(cx + r*0.5, cy - r/3); ctx.lineTo(cx + r*0.6, cy + r/3);
            ctx.moveTo(cx - r*0.1, cy - r/3); ctx.lineTo(cx + r*0.2, cy + r/3);
            ctx.lineTo(cx + r*0.6, cy + r/3);
            // Handlebar
            ctx.moveTo(cx + r*0.5, cy - r/3); ctx.lineTo(cx + r*0.75, cy - r/2);
        }
        // Server
        else if (this.iconType === 'server') {
            const w = r*1.4, h = r*0.55;
            for (let i = -1; i <= 1; i++) {
                const ry = cy + i * (h + r*0.12) - h/2;
                ctx.rect(cx - w/2, ry, w, h);
                ctx.moveTo(cx + w/2 - r*0.2, ry + h/2);
                ctx.arc(cx + w/2 - r*0.25, ry + h/2, r*0.07, 0, Math.PI*2);
                ctx.moveTo(cx - w/2 + r*0.15, ry + h/2); ctx.lineTo(cx + w/2 - r*0.5, ry + h/2);
            }
        }

        ctx.stroke();
    }

    drawCorners(x, y, w, h) {
        const len = w / 3;
        ctx.beginPath();
        ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
        ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
        ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
        ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
        ctx.stroke();
    }
}

// Even coverage
function spawn() {
    const count = Math.max(config.minCount, Math.min(config.maxCount,
        Math.round((width * height) / config.density)));
    const cols = Math.ceil(Math.sqrt(count * width / height));
    const rows = Math.ceil(count / cols);
    const cells = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) cells.push([c, r]);
    cells.sort(() => Math.random() - 0.5);

    entities = cells.slice(0, count).map(([c, r]) => new Entity(
        (c + 0.15 + Math.random() * 0.7) * (width / cols),
        (r + 0.15 + Math.random() * 0.7) * (height / rows)
    ));
}
spawn();

function separate() {
    const min = config.separation;
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const a = entities[i], b = entities[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d === 0 || d >= min) continue;
            const push = ((min - d) / min) * 0.4;
            const nx = (dx / d) * push, ny = (dy / d) * push;
            a.x -= nx; a.y -= ny;
            b.x += nx; b.y += ny;
        }
    }
}

let scanY = 0;

function animate() {
    ctx.clearRect(0, 0, width, height);

    scanY += config.scanSpeed;
    if (scanY > height) scanY = -100;

    // Draw Scan Line
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(width, scanY);
    ctx.strokeStyle = `rgba(0, 240, 255, 0.15)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    separate();
    entities.forEach(entity => {
        entity.update();
        entity.draw(scanY);
    });

    requestAnimationFrame(animate);
}

animate();