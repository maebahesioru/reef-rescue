'use strict';

/* Reef Rescue — main game: state machine, input, world, HUD, rendering.
   States: title -> play -> gameover -> result (and paused). */

(function () {
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = CONFIG.W * dpr;
  cvs.height = CONFIG.H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), score: $('hud-score'), level: $('hud-level'), items: $('hud-items'),
    oxyFill: $('oxy-fill'), time: $('hud-time'), combo: $('hud-combo'),
    toast: $('toast'), sr: $('sr-status'),
    overlayTitle: $('overlay-title'), overlayGameover: $('overlay-gameover'),
    overlayResult: $('overlay-result'), overlayPause: $('overlay-pause'),
    gameoverTitle: $('gameover-title'), gameoverSub: $('gameover-sub'),
    resultTitle: $('result-title'), resultSub: $('result-sub'), resultStats: $('result-stats'),
    resultImpact: $('result-impact'), resultFacts: $('result-facts'),
    bestTitle: $('best-title'),
    btnMute: $('btn-mute'), btnPause: $('btn-pause'), btnDive: $('btn-dive'),
    btnAgain: $('btn-again'), btnTitle: $('btn-title'), btnResume: $('btn-resume'),
  };

  const sfx = new Sfx();
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const keys = Object.create(null);
  const input = { left: false, right: false, up: false, down: false, pointer: null };

  /* ---------------- background helpers ---------------- */

  const waterGrad = ctx.createLinearGradient(0, CONFIG.SURFACE_Y, 0, CONFIG.H);
  waterGrad.addColorStop(0, '#2f8fc4');
  waterGrad.addColorStop(0.45, '#155e91');
  waterGrad.addColorStop(1, '#0a3556');

  const skyGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.SURFACE_Y);
  skyGrad.addColorStop(0, '#bfe6ff');
  skyGrad.addColorStop(1, '#e8f7ff');

  const CORALS = (() => {
    const list = [];
    const kinds = ['seaweed', 'fan', 'rock', 'seaweed', 'fan', 'rock'];
    for (let i = 0; i < 14; i++) {
      list.push({
        x: 40 + i * 66 + rand(-16, 16),
        kind: kinds[i % kinds.length],
        color: pick(['#CC79A7', '#E69F00', '#009E73', '#56B4E9']),
        s: rand(0.75, 1.35),
        phase: rand(0, Math.PI * 2),
      });
    }
    return list;
  })();

  function drawBackground(t) {
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.SURFACE_Y);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, CONFIG.SURFACE_Y, CONFIG.W, CONFIG.H - CONFIG.SURFACE_Y);

    // sun glint on the surface
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(CONFIG.W * 0.72, CONFIG.SURFACE_Y, 90, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // wavy surface line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= CONFIG.W; x += 16) {
      const y = CONFIG.SURFACE_Y + Math.sin(x * 0.02 + t * 1.2) * 3;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // light rays
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#eaffff';
    for (let i = 0; i < 4; i++) {
      const sway = reduceMotion ? 0 : Math.sin(t * 0.25 + i * 1.7) * 26;
      const x0 = 120 + i * 240 + sway;
      ctx.beginPath();
      ctx.moveTo(x0, CONFIG.SURFACE_Y);
      ctx.lineTo(x0 + 70, CONFIG.SURFACE_Y);
      ctx.lineTo(x0 + 160, CONFIG.H);
      ctx.lineTo(x0 - 40, CONFIG.H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSeabed(t) {
    // sand
    ctx.fillStyle = '#c2ad7d';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.SEABED_Y);
    for (let x = 0; x <= CONFIG.W; x += 24) {
      ctx.lineTo(x, CONFIG.SEABED_Y + Math.sin(x * 0.03) * 5);
    }
    ctx.lineTo(CONFIG.W, CONFIG.H);
    ctx.lineTo(0, CONFIG.H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(0, CONFIG.SEABED_Y + 20, CONFIG.W, CONFIG.H - CONFIG.SEABED_Y - 20);

    // corals / seaweed / rocks
    for (const c of CORALS) {
      const sway = reduceMotion ? 0 : Math.sin(t * 0.9 + c.phase) * 6;
      ctx.save();
      ctx.translate(c.x, CONFIG.SEABED_Y + 6);
      ctx.scale(c.s, c.s);
      if (c.kind === 'seaweed') {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(k * 6, 0);
          ctx.quadraticCurveTo(k * 6 + sway, -26, k * 8 + sway * 1.6, -52);
          ctx.stroke();
        }
      } else if (c.kind === 'fan') {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let a = -0.9; a <= 0.9; a += 0.3) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.sin(a) * 26, -Math.cos(a) * 30);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
      } else {
        ctx.fillStyle = '#5a6b7a';
        ctx.beginPath();
        ctx.ellipse(0, -4, 16, 10, 0, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---------------- factories ---------------- */

  function makeBubble(x, y, r) {
    return new Particle('bubble', x, y, rand(-8, 8), rand(-42, -22), rand(1.2, 2.8), r || rand(1.6, 4.4));
  }
  function makeSpark(x, y, color) {
    return new Particle('spark', x, y, rand(-130, 130), rand(-130, 130), rand(0.3, 0.75), rand(1.5, 3.6), color);
  }
  function makeCreature() {
    const type = pick(CREATURE_TYPES);
    if (type.id === 'jellyfish') {
      const fromTop = Math.random() < 0.5;
      return new Creature(type, rand(60, CONFIG.W - 60), fromTop ? CONFIG.PLAY_TOP + 10 : CONFIG.PLAY_BOTTOM - 10, fromTop ? 1 : -1);
    }
    const fromLeft = Math.random() < 0.5;
    return new Creature(type, fromLeft ? -50 : CONFIG.W + 50, rand(120, CONFIG.PLAY_BOTTOM - 30), fromLeft ? 1 : -1);
  }

  /* ---------------- game ---------------- */

  class Game {
    constructor() {
      this.state = 'title';
      this.t = 0;              // global clock (ambience)
      this.lastTs = 0;
      this.runT = 0;
      this.score = 0;
      this.level = 1;
      this.items = 0;
      this.totalItems = 0;
      this.oxygen = CONFIG.OXY_MAX;
      this.combo = 0;
      this.comboT = 0;
      this.warnT = 0;
      this.toastT = 0;
      this.gameoverT = 0;
      this.flashT = 0;
      this.ambT = 0;
      this.spawnT = 0;
      this.win = false;
      this.runs = 0;
      this.counts = {};
      this.weights = 0;
      this.co2 = 0;
      this.best = readBest();
      this.player = new Player();
      this.garbage = [];
      this.creatures = [];
      this.particles = [];

      els.bestTitle.textContent = this.best.toLocaleString();
      this.updateMuteBtn();
      this.showOverlay('overlay-title');
      this.spawnAmbience();
      requestAnimationFrame((ts) => this.loop(ts));
    }

    levelCfg() { return LEVELS[Math.min(this.level, CONFIG.MAX_LEVEL) - 1]; }

    /* ---------- UI plumbing ---------- */

    showOverlay(id) {
      ['overlayTitle', 'overlayGameover', 'overlayResult', 'overlayPause'].forEach((k) => {
        els[k].classList.toggle('hidden', k !== id);
      });
      els.hud.classList.toggle('hidden', id === 'overlayTitle' || id === 'overlayResult');
    }

    announce(msg) { els.sr.textContent = msg; }

    toast(msg, dur) {
      els.toast.textContent = msg;
      els.toast.classList.remove('hidden');
      this.toastT = dur || 2.2;
    }

    updateMuteBtn() {
      els.btnMute.textContent = sfx.muted ? 'Sound: Off' : 'Sound: On';
      els.btnMute.setAttribute('aria-pressed', String(sfx.muted));
    }

    toggleMute() {
      sfx.setMuted(!sfx.muted);
      this.updateMuteBtn();
      sfx.unlock();
      if (!sfx.muted) sfx.click();
      this.announce(sfx.muted ? 'Sound off' : 'Sound on');
    }

    /* ---------- state transitions ---------- */

    startRun() {
      this.state = 'play';
      this.runT = 0;
      this.score = 0;
      this.level = 1;
      this.items = 0;
      this.totalItems = 0;
      this.oxygen = CONFIG.OXY_MAX;
      this.combo = 0; this.comboT = 0; this.warnT = 0;
      this.counts = {};
      this.weights = 0;
      this.co2 = 0;
      this.garbage = [];
      this.creatures = [];
      this.particles = [];
      this.player = new Player();
      this.spawnT = 0;
      this.flashT = 0;
      this.gameoverT = 0;
      this.win = false;
      this.spawnCreaturesForLevel();
      this.fillGarbage();
      els.btnPause.textContent = 'Pause';
      this.showOverlay(null);
      this.toast('Level 1 — clean the reef!', 2.4);
      this.announce('Dive started. Level 1: collect ' + LEVELS[0].target + ' items.');
      this.updateHUD();
    }

    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused';
      this.showOverlay('overlayPause');
      els.btnPause.textContent = 'Resume';
    }

    resume() {
      if (this.state !== 'paused') return;
      this.state = 'play';
      this.showOverlay(null);
      els.btnPause.textContent = 'Pause';
    }

    endRun(win) {
      this.state = 'gameover';
      this.win = win;
      this.gameoverT = 2.4;
      if (win) {
        sfx.win();
        els.gameoverTitle.textContent = 'Reef restored!';
        els.gameoverSub.textContent = 'You cleared every zone — the reef can breathe again.';
      } else {
        sfx.gameOver();
        els.gameoverTitle.textContent = 'Out of oxygen…';
        els.gameoverSub.textContent = 'The reef still needs you. Every dive counts!';
      }
      this.showOverlay('overlayGameover');
      this.announce(win ? 'You restored the reef!' : 'Out of oxygen.');
    }

    toResult() {
      if (this.state !== 'gameover') return;
      this.state = 'result';
      this.runs += 1;
      if (this.score > this.best) {
        this.best = this.score;
        writeBest(this.best);
      }
      els.bestTitle.textContent = this.best.toLocaleString();
      els.resultTitle.textContent = this.win ? 'Reef restored!' : 'Dive report';
      els.resultSub.textContent = this.win
        ? 'You cleaned all ' + CONFIG.MAX_LEVEL + ' zones. Here is what your dive achieved.'
        : 'Your oxygen ran out — but your dive still made a difference.';

      // NOTE: innerHTML below is built only from hard-coded constants
      // (GARBAGE_TYPES names/colours, FACTS strings) and numbers computed
      // locally — no user input ever reaches it, so there is no XSS vector.
      let rows = '';
      let anyCount = 0;
      for (const tp of GARBAGE_TYPES) {
        const c = this.counts[tp.id] || 0;
        if (!c) continue;
        anyCount += c;
        rows += '<div class="stat-row"><span class="chip" style="background:' + tp.color + '"></span>' +
          '<span class="stat-name">' + tp.name + ' ×' + c + '</span>' +
          '<span class="stat-val">' + (c * tp.weight).toLocaleString() + ' g</span></div>';
      }
      rows += '<div class="stat-row total"><span class="chip" style="background:#e8f4fb"></span>' +
        '<span class="stat-name">Total collected</span>' +
        '<span class="stat-val">' + anyCount + ' items · ' + Math.round(this.weights).toLocaleString() + ' g</span></div>';
      rows += '<div class="stat-row"><span class="chip" style="background:#F0E442"></span>' +
        '<span class="stat-name">Score</span><span class="stat-val">' + this.score.toLocaleString() + '</span></div>';
      rows += '<div class="stat-row"><span class="chip" style="background:#009E73"></span>' +
        '<span class="stat-name">Depth reached</span><span class="stat-val">Level ' + this.level + ' of ' + CONFIG.MAX_LEVEL + '</span></div>';
      els.resultStats.innerHTML = rows;

      const co2 = Math.round(this.co2);
      const phones = Math.max(1, Math.round(co2 / 8));
      els.resultImpact.innerHTML = co2 > 0
        ? 'By recycling what you collected, an estimated <strong>' + co2.toLocaleString() + ' g of CO₂e</strong> is avoided — about <strong>' + phones.toLocaleString() + ' smartphone charges</strong>. (rough estimate)'
        : 'Collect some plastic next time to see your impact!';

      const top = GARBAGE_TYPES.filter((tp) => this.counts[tp.id])
        .sort((a, b) => this.counts[b.id] - this.counts[a.id])
        .slice(0, 2);
      const factList = top.map((tp) => ({ text: FACTS[tp.id], tag: tp.name }));
      factList.push({ text: FACTS.general[this.runs % FACTS.general.length], tag: 'Ocean fact' });
      els.resultFacts.innerHTML = factList.map((f) =>
        '<div class="fact"><p>' + f.text + '</p><span class="fact-tag">' + f.tag + ' · approx. figure from published research</span></div>'
      ).join('');

      this.showOverlay('overlayResult');
      this.announce('Dive report: ' + anyCount + ' items collected, score ' + this.score + '.');
    }

    toTitle() {
      this.state = 'title';
      this.garbage = [];
      this.particles = [];
      this.showOverlay('overlayTitle');
      els.btnPause.textContent = 'Pause';
      this.spawnAmbience();
    }

    /* ---------- world ---------- */

    spawnAmbience() {
      this.creatures = [];
      for (let i = 0; i < 5; i++) this.creatures.push(makeCreature());
    }

    spawnCreaturesForLevel() {
      const n = this.levelCfg().creatures;
      for (let i = 0; i < n; i++) this.creatures.push(makeCreature());
    }

    spawnGarbage() {
      const cfg = this.levelCfg();
      const fromLeft = Math.random() < 0.5;
      const type = pick(GARBAGE_TYPES);
      const y = rand(CONFIG.PLAY_TOP + 20, CONFIG.PLAY_BOTTOM - 20);
      const vx = (fromLeft ? 1 : -1) * cfg.current * rand(0.7, 1.3);
      this.garbage.push(new GarbageItem(type, fromLeft ? -30 : CONFIG.W + 30, y, vx));
    }

    fillGarbage() {
      const cfg = this.levelCfg();
      for (let i = 0; i < cfg.maxItems; i++) {
        const type = pick(GARBAGE_TYPES);
        const vx = (Math.random() < 0.5 ? 1 : -1) * cfg.current * rand(0.7, 1.3);
        this.garbage.push(new GarbageItem(type, rand(60, CONFIG.W - 60), rand(CONFIG.PLAY_TOP + 20, CONFIG.PLAY_BOTTOM - 20), vx));
      }
    }

    collect(g) {
      g.dead = true;
      this.combo += 1;
      this.comboT = CONFIG.COMBO_WINDOW;
      const mult = 1 + Math.min(this.combo - 1, 10) * 0.1;
      this.score += Math.round(g.type.points * mult);
      this.items += 1;
      this.totalItems += 1;
      this.counts[g.type.id] = (this.counts[g.type.id] || 0) + 1;
      this.weights += g.type.weight;
      this.co2 += g.type.weight * g.type.co2;
      sfx.collect(this.combo);
      const n = reduceMotion ? 4 : 10;
      for (let i = 0; i < n; i++) this.particles.push(makeSpark(g.x, g.y, g.type.color));
      if (this.items >= this.levelCfg().target) this.levelUp();
    }

    hurt(c) {
      this.player.invuln = CONFIG.INVULN_TIME;
      this.oxygen = Math.max(0, this.oxygen - CONFIG.HURT_OXY);
      this.score = Math.max(0, this.score - CONFIG.HURT_SCORE);
      this.combo = 0;
      this.comboT = 0;
      this.flashT = 0.35;
      c.flee = 1.3;
      sfx.hurt();
      this.toast('Careful! Don\'t touch marine life — it gets scared. (-' + CONFIG.HURT_OXY + ' O₂)', 2.4);
      this.announce('You bumped into a ' + c.type.name + '. Be careful!');
      for (let i = 0; i < 8; i++) this.particles.push(makeSpark(this.player.x, this.player.y, '#D55E00'));
      if (this.oxygen <= 0) this.endRun(false);
    }

    levelUp() {
      if (this.level >= CONFIG.MAX_LEVEL) { this.endRun(true); return; }
      this.level += 1;
      this.items = 0;
      this.oxygen = Math.min(CONFIG.OXY_MAX, this.oxygen + CONFIG.OXY_BONUS_PER_LEVEL);
      const cfg = this.levelCfg();
      while (this.creatures.length < cfg.creatures) this.creatures.push(makeCreature());
      sfx.levelUp();
      this.toast('Level ' + this.level + ' — stronger current, more plastic! +' + CONFIG.OXY_BONUS_PER_LEVEL + ' O₂', 2.6);
      this.announce('Level ' + this.level + ' started.');
      for (let i = 0; i < 16; i++) this.particles.push(makeSpark(this.player.x, this.player.y, '#56B4E9'));
    }

    /* ---------- update ---------- */

    update(dt) {
      this.t += dt;

      // ambient bubbles (all states)
      this.ambT -= dt;
      if (this.ambT <= 0 && this.particles.length < (reduceMotion ? 60 : 220)) {
        this.ambT = rand(0.18, 0.5);
        this.particles.push(makeBubble(rand(10, CONFIG.W - 10), CONFIG.H - rand(0, 30), rand(1.5, 4)));
      }
      for (const p of this.particles) p.update(dt);
      if (this.particles.length > 0) this.particles = this.particles.filter((p) => p.life > 0);

      if (this.toastT > 0) {
        this.toastT -= dt;
        if (this.toastT <= 0) els.toast.classList.add('hidden');
      }

      if (this.state === 'title') {
        for (const c of this.creatures) c.update(dt, null);
        this.creatures = this.creatures.filter((c) => !c.dead);
        while (this.creatures.length < 5) this.creatures.push(makeCreature());
        return;
      }
      if (this.state === 'gameover') {
        this.gameoverT -= dt;
        if (this.gameoverT <= 0) this.toResult();
        return;
      }
      if (this.state !== 'play') return;

      this.runT += dt;

      input.left = !!(keys.ArrowLeft || keys.KeyA);
      input.right = !!(keys.ArrowRight || keys.KeyD);
      input.up = !!(keys.ArrowUp || keys.KeyW);
      input.down = !!(keys.ArrowDown || keys.KeyS);
      this.player.update(dt, input);

      if (!reduceMotion && Math.random() < dt * 5) {
        this.particles.push(makeBubble(this.player.x - this.player.face * 6, this.player.y - 18, rand(1.4, 3)));
      }

      // oxygen
      if (this.player.atSurface) {
        this.oxygen = Math.min(CONFIG.OXY_MAX, this.oxygen + CONFIG.OXY_REFILL * dt);
      } else {
        this.oxygen -= CONFIG.OXY_DRAIN * this.levelCfg().drainMult * dt;
      }
      if (this.oxygen <= 30) {
        this.warnT -= dt;
        if (this.warnT <= 0 && this.oxygen > 0) { sfx.oxyWarn(); this.warnT = 1.1; }
      }
      if (this.oxygen <= 0) { this.oxygen = 0; this.endRun(false); return; }

      // combo window
      if (this.comboT > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) this.combo = 0;
      }

      // garbage
      const cfg = this.levelCfg();
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.garbage.length < cfg.maxItems) {
        this.spawnT = cfg.spawnEvery;
        this.spawnGarbage();
      }
      for (const g of this.garbage) {
        g.update(dt);
        if (!g.dead && dist2(g.x, g.y, this.player.x, this.player.y) < Math.pow(g.r + CONFIG.PLAYER_R, 2)) {
          this.collect(g);
        }
      }
      this.garbage = this.garbage.filter((g) => !g.dead);

      // creatures
      for (const c of this.creatures) {
        c.update(dt, this.player);
        if (this.player.invuln <= 0 && dist2(c.x, c.y, this.player.x, this.player.y) < Math.pow(c.r + CONFIG.PLAYER_R, 2)) {
          this.hurt(c);
        }
      }
      this.creatures = this.creatures.filter((c) => !c.dead);
      if (this.creatures.length < cfg.creatures) this.creatures.push(makeCreature());

      if (this.flashT > 0) this.flashT -= dt;

      this.updateHUD();
    }

    updateHUD() {
      els.score.textContent = this.score.toLocaleString();
      els.level.textContent = this.level;
      els.items.textContent = this.items + '/' + this.levelCfg().target;
      const pct = Math.max(0, Math.min(1, this.oxygen / CONFIG.OXY_MAX));
      els.oxyFill.style.width = (pct * 100).toFixed(1) + '%';
      els.oxyFill.className = pct > 0.5 ? '' : (pct > 0.25 ? 'low' : 'crit');
      const m = Math.floor(this.runT / 60);
      const s = Math.floor(this.runT % 60);
      els.time.textContent = m + ':' + String(s).padStart(2, '0');
      if (this.combo >= 2) {
        els.combo.textContent = 'x' + this.combo;
        els.combo.classList.remove('hidden');
      } else {
        els.combo.classList.add('hidden');
      }
    }

    /* ---------- render ---------- */

    render() {
      drawBackground(this.t);
      drawSeabed(this.t);

      for (const g of this.garbage) g.draw(ctx);
      for (const c of this.creatures) c.draw(ctx);

      if (this.state === 'play' || this.state === 'paused' || this.state === 'gameover') {
        const blink = this.player.invuln > 0 && Math.floor(this.t * 12) % 2 === 0;
        if (!blink) this.player.draw(ctx);
      }

      for (const p of this.particles) p.draw(ctx);

      // hurt flash — edges glow instead of screen shake (reduced-motion friendly)
      if (this.flashT > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.45, this.flashT);
        ctx.fillStyle = '#D55E00';
        ctx.fillRect(0, 0, CONFIG.W, 16);
        ctx.fillRect(0, CONFIG.H - 16, CONFIG.W, 16);
        ctx.fillRect(0, 0, 16, CONFIG.H);
        ctx.fillRect(CONFIG.W - 16, 0, 16, CONFIG.H);
        ctx.restore();
      }

      // low-oxygen tint pulse (no shake)
      if (this.state === 'play' && this.oxygen < 25) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.07 + 0.05 * Math.sin(this.t * 4));
        ctx.fillStyle = '#D55E00';
        ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
        ctx.restore();
      }
    }

    /* ---------- loop ---------- */

    loop(ts) {
      if (!this.lastTs) this.lastTs = ts;
      let dt = (ts - this.lastTs) / 1000;
      this.lastTs = ts;
      if (dt > 0.05) dt = 0.05;
      if (dt < 0) dt = 0;
      this.update(dt);
      this.render();
      requestAnimationFrame((t2) => this.loop(t2));
    }
  }

  /* ---------------- persistence ---------------- */

  function readBest() {
    try { return parseInt(localStorage.getItem('reefRescue.best') || '0', 10) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem('reefRescue.best', String(v)); } catch (e) { /* ignore */ }
  }

  /* ---------------- boot ---------------- */

  const game = new Game();
  window.__reef = game;   // exposed for debugging / automated tests

  window.addEventListener('keydown', (e) => {
    const isBtn = e.target && e.target.tagName === 'BUTTON';
    if (!isBtn && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) !== -1) {
      e.preventDefault();
    }
    keys[e.code] = true;
    sfx.unlock();
    if (e.code === 'KeyM') { game.toggleMute(); return; }
    if (isBtn && (e.code === 'Space' || e.code === 'Enter')) return;  // let the button handle it
    if (e.repeat) return;
    if (game.state === 'title') {
      if (e.code === 'Space' || e.code === 'Enter') game.startRun();
    } else if (game.state === 'play') {
      if (e.code === 'KeyP' || e.code === 'Escape') game.pause();
    } else if (game.state === 'paused') {
      if (e.code === 'KeyP' || e.code === 'Escape') game.resume();
    } else if (game.state === 'gameover') {
      if (e.code === 'Space' || e.code === 'Enter') game.toResult();
    } else if (game.state === 'result') {
      if (e.code === 'KeyR' || e.code === 'Space') game.startRun();
      else if (e.code === 'KeyT' || e.code === 'Escape') game.toTitle();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    input.pointer = null;
  });

  /* optional pointer / touch steering */
  function toCanvas(e) {
    const r = cvs.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (CONFIG.W / r.width), y: (e.clientY - r.top) * (CONFIG.H / r.height) };
  }
  cvs.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    if (game.state === 'play') input.pointer = toCanvas(e);
  });
  cvs.addEventListener('pointermove', (e) => {
    if (input.pointer) input.pointer = toCanvas(e);
  });
  window.addEventListener('pointerup', () => { input.pointer = null; });
  window.addEventListener('pointercancel', () => { input.pointer = null; });

  cvs.addEventListener('click', () => {
    if (game.state === 'title') game.startRun();
    else if (game.state === 'gameover') game.toResult();
  });

  els.btnDive.addEventListener('click', () => { sfx.unlock(); game.startRun(); });
  els.btnAgain.addEventListener('click', () => { sfx.unlock(); game.startRun(); });
  els.btnTitle.addEventListener('click', () => game.toTitle());
  els.btnPause.addEventListener('click', () => {
    if (game.state === 'paused') game.resume(); else game.pause();
  });
  els.btnResume.addEventListener('click', () => game.resume());
  els.btnMute.addEventListener('click', () => game.toggleMute());
})();
