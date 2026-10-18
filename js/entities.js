'use strict';

/* Reef Rescue — entities: player, garbage, creatures, particles.
   All graphics are drawn with canvas primitives. */

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

/* Inline SVG icons so every item keeps its identity without colour:
   the legend and the dive report show a distinct shape per item type. */
const ITEM_ICONS = {
  bottle: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="8.5" y="8" width="7" height="13" rx="2.6" fill="COLOR"/>' +
    '<rect x="10.2" y="3" width="3.6" height="5.4" rx="1.1" fill="COLOR"/>' +
    '<rect x="10.4" y="11" width="1.8" height="7" rx="0.9" fill="rgba(255,255,255,0.5)"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M6 9.5h12l-1.1 10.8H7.1L6 9.5z" fill="COLOR"/>' +
    '<path d="M9.2 9.5a2.8 2.8 0 0 1 5.6 0" fill="none" stroke="COLOR" stroke-width="1.8"/></svg>',
  straw: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M7.5 20.5 14.6 4.4" fill="none" stroke="COLOR" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M13 4h4.6" fill="none" stroke="COLOR" stroke-width="3.2" stroke-linecap="round"/></svg>',
  can: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="7" y="5" width="10" height="15" rx="2.4" fill="COLOR"/>' +
    '<ellipse cx="12" cy="5.7" rx="5" ry="1.8" fill="rgba(255,255,255,0.75)"/>' +
    '<rect x="9.4" y="10" width="2" height="7" rx="1" fill="rgba(255,255,255,0.55)"/></svg>',
  net: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="8.2" fill="none" stroke="COLOR" stroke-width="2.2"/>' +
    '<path d="M3.8 12h16.4M12 3.8v16.4M6.2 6.2l11.6 11.6M17.8 6.2 6.2 17.8" stroke="COLOR" stroke-width="1" fill="none"/></svg>',
};

const UI_ICONS = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#8fe3c0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8L3.5 9.7l5.9-.8z" fill="#F0E442"/></svg>',
  depth: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 4v13" stroke="#56b4e9" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M7 12.5l5 5 5-5" fill="none" stroke="#56b4e9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function itemIcon(id, color) {
  const tpl = ITEM_ICONS[id];
  return tpl ? tpl.split('COLOR').join(color || 'currentColor') : '';
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- particles ---------------- */

class Particle {
  constructor(kind, x, y, vx, vy, life, r, color) {
    this.kind = kind;               // 'bubble' | 'spark'
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.r = r; this.color = color || '#bfe8ff';
    this.phase = rand(0, Math.PI * 2);
  }
  update(dt) {
    this.life -= dt;
    this.phase += dt * 3;
    if (this.kind === 'bubble') {
      this.y += this.vy * dt;
      this.x += (this.vx + Math.sin(this.phase) * 8) * dt;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const drag = Math.exp(-3 * dt);
      this.vx *= drag; this.vy *= drag;
    }
  }
  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.save();
    if (this.kind === 'bubble') {
      ctx.globalAlpha = 0.55 * a;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------------- player ---------------- */

class Player {
  constructor() {
    this.x = CONFIG.W / 2;
    this.y = 260;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.invuln = 0;
  }
  get atSurface() { return this.y <= CONFIG.SURFACE_Y + CONFIG.REFILL_ZONE; }

  update(dt, input) {
    let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (input.pointer) {           // optional mouse / touch steering
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 14) { ax = dx / d; ay = dy / d; }
      else { ax = 0; ay = 0; }
    } else if (ax !== 0 && ay !== 0) {
      ax *= Math.SQRT1_2; ay *= Math.SQRT1_2;
    }

    this.vx += ax * CONFIG.PLAYER_ACCEL * dt;
    this.vy += ay * CONFIG.PLAYER_ACCEL * dt;

    const drag = Math.exp(-CONFIG.PLAYER_DRAG * dt);
    this.vx *= drag; this.vy *= drag;

    const sp = Math.hypot(this.vx, this.vy);
    if (sp > CONFIG.PLAYER_MAX) {
      this.vx *= CONFIG.PLAYER_MAX / sp;
      this.vy *= CONFIG.PLAYER_MAX / sp;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const r = CONFIG.PLAYER_R;
    if (this.x < r + 8) { this.x = r + 8; this.vx = Math.max(0, this.vx); }
    if (this.x > CONFIG.W - r - 8) { this.x = CONFIG.W - r - 8; this.vx = Math.min(0, this.vx); }
    if (this.y < CONFIG.PLAY_TOP) { this.y = CONFIG.PLAY_TOP; this.vy = Math.max(0, this.vy); }
    if (this.y > CONFIG.PLAY_BOTTOM) { this.y = CONFIG.PLAY_BOTTOM; this.vy = Math.min(0, this.vy); }

    if (Math.abs(this.vx) > 15) this.face = this.vx > 0 ? 1 : -1;
    if (this.invuln > 0) this.invuln -= dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.face, 1);

    // air tank (behind the body)
    ctx.fillStyle = '#F0E442';
    roundRect(ctx, -19, -20, 11, 26, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, -19, -20, 11, 6, 4);
    ctx.fill();

    // fins
    ctx.fillStyle = '#003f5c';
    ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-18, 32); ctx.lineTo(1, 25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, 18); ctx.lineTo(18, 30); ctx.lineTo(3, 25); ctx.closePath(); ctx.fill();

    // body (wetsuit)
    ctx.fillStyle = '#0072B2';
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00537f';
    ctx.fillRect(-13, 6, 26, 4);

    // arm
    ctx.strokeStyle = '#0072B2';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(18, 7); ctx.stroke();

    // head
    ctx.fillStyle = '#E9B98B';
    ctx.beginPath(); ctx.arc(2, -24, 9, 0, Math.PI * 2); ctx.fill();

    // mask + strap
    ctx.fillStyle = '#9fe0ff';
    roundRect(ctx, 2, -29, 14, 10, 4);
    ctx.fill();
    ctx.strokeStyle = '#e8f4fb';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, -24); ctx.lineTo(-9, -27); ctx.stroke();

    ctx.restore();
  }
}

/* ---------------- garbage ---------------- */

class GarbageItem {
  constructor(type, x, y, vx) {
    this.type = type;
    this.x = x; this.y = y;
    this.vx = vx;
    this.r = type.r;
    this.phase = rand(0, Math.PI * 2);
    this.bob = rand(5, 11);
    this.rot = rand(-0.35, 0.35);
    this.dead = false;
  }
  update(dt) {
    this.phase += dt * 1.5;
    this.x += this.vx * dt;
    this.y += Math.sin(this.phase) * this.bob * dt;
    if (this.y < CONFIG.PLAY_TOP - 10) this.y = CONFIG.PLAY_TOP - 10;
    if (this.y > CONFIG.PLAY_BOTTOM + 8) this.y = CONFIG.PLAY_BOTTOM + 8;
    if (this.x < -80 || this.x > CONFIG.W + 80) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot + Math.sin(this.phase) * 0.08);
    switch (this.type.id) {
      case 'bottle': {
        ctx.fillStyle = 'rgba(86,180,233,0.92)';
        roundRect(ctx, -7, -13, 14, 26, 5); ctx.fill();
        ctx.fillStyle = '#e8f4fb';
        ctx.fillRect(-4, -18, 8, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(-4, -8, 3, 16);
        break;
      }
      case 'bag': {
        ctx.fillStyle = 'rgba(240,228,66,0.88)';
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.quadraticCurveTo(0, -19, 10, -12);
        ctx.quadraticCurveTo(15, 2, 8, 13);
        ctx.quadraticCurveTo(0, 8, -8, 13);
        ctx.quadraticCurveTo(-15, 2, -10, -12);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(240,228,66,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-3, -13, 4, Math.PI, 0); ctx.stroke();
        break;
      }
      case 'straw': {
        ctx.rotate(0.5);
        ctx.fillStyle = '#E69F00';
        ctx.fillRect(-2, -12, 4, 24);
        ctx.fillStyle = '#e8f4fb';
        ctx.fillRect(-2, -6, 4, 3);
        ctx.fillRect(-2, 2, 4, 3);
        break;
      }
      case 'can': {
        ctx.fillStyle = '#CC79A7';
        roundRect(ctx, -6, -10, 12, 20, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(-4, -6, 3, 14);
        ctx.fillStyle = '#e8f4fb';
        ctx.beginPath(); ctx.ellipse(0, -10, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'net': {
        ctx.strokeStyle = 'rgba(0,158,115,0.95)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, this.r - 3, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.1;
        for (let i = -2; i <= 2; i++) {
          const o = i * 8;
          const h = Math.sqrt(Math.max(0, (this.r - 3) * (this.r - 3) - o * o));
          ctx.beginPath(); ctx.moveTo(o, -h); ctx.lineTo(o, h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-h, o); ctx.lineTo(h, o); ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }
}

/* ---------------- creatures ---------------- */

class Creature {
  constructor(type, x, y, dir) {
    this.type = type;
    this.x = x; this.y = y;
    this.dir = dir;                 // horizontal for fish/turtle, vertical for jellyfish
    this.phase = rand(0, Math.PI * 2);
    this.flee = 0;
    this.r = type.r;
    this.dead = false;
  }
  update(dt, player) {
    const speedBoost = this.flee > 0 ? 2.4 : 1;
    if (this.flee > 0) this.flee -= dt;
    const sp = this.type.speed * speedBoost;
    this.phase += dt * (this.type.id === 'jellyfish' ? 1.2 : 2.2);

    if (this.type.id === 'jellyfish') {
      this.x += Math.cos(this.phase * 0.6) * 14 * dt;
      this.y += this.dir * sp * dt;
      if (this.y < CONFIG.PLAY_TOP + 16) { this.y = CONFIG.PLAY_TOP + 16; this.dir = 1; }
      if (this.y > CONFIG.PLAY_BOTTOM - 6) { this.y = CONFIG.PLAY_BOTTOM - 6; this.dir = -1; }
    } else {
      this.x += this.dir * sp * dt;
      this.y += Math.sin(this.phase) * 16 * dt;
      if (this.y < CONFIG.PLAY_TOP) this.y = CONFIG.PLAY_TOP;
      if (this.y > CONFIG.PLAY_BOTTOM) this.y = CONFIG.PLAY_BOTTOM;
      if (this.x < -70 || this.x > CONFIG.W + 70) this.dead = true;
    }

    if (this.flee > 0 && player) {  // scared: swim away from the diver
      const dx = this.x - player.x, dy = this.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      this.x += (dx / d) * sp * 0.8 * dt;
      this.y += (dy / d) * sp * 0.8 * dt;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type.id === 'fish') {
      ctx.scale(this.dir < 0 ? -1 : 1, 1);
      ctx.fillStyle = '#E69F00';
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-23, -9); ctx.lineTo(-23, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 2, 10, 5, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#e8f4fb';
      ctx.beginPath(); ctx.arc(6, -2, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(6.8, -2, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (this.type.id === 'turtle') {
      ctx.scale(this.dir < 0 ? -1 : 1, 1);
      ctx.fillStyle = '#007a52';
      // flippers
      ctx.beginPath(); ctx.ellipse(-8, -16, 9, 5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -16, 9, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-10, 14, 7, 4, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(10, 14, 7, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      // shell
      ctx.fillStyle = '#009E73';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#00694d';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.stroke();
      }
      // head
      ctx.fillStyle = '#8fcbb2';
      ctx.beginPath(); ctx.arc(22, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(24, -2, 1.4, 0, Math.PI * 2); ctx.fill();
    } else { // jellyfish
      ctx.fillStyle = 'rgba(204,121,167,0.9)';
      ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-5, -4, 6, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(204,121,167,0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const sx = i * 6;
        const sway = Math.sin(this.phase * 2 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(sx, 2);
        ctx.quadraticCurveTo(sx + sway, 12, sx - sway, 22);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
