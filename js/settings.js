'use strict';

/* Reef Rescue — player settings: game speed, text size, reduced motion.
   Saved in localStorage and applied live. game.js reads Settings.speed() and
   Settings.motionReduced() every frame, so changes take effect immediately. */

const Settings = (function () {
  const KEY = 'reefRescue.settings';
  const SPEEDS = { relaxed: 0.7, normal: 1, brisk: 1.3 };
  const TEXT_OK = ['normal', 'large', 'xl'];
  const MOTION_OK = ['auto', 'reduce', 'full'];
  const state = { speed: 'normal', textSize: 'normal', motion: 'auto' };

  const media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      if (SPEEDS[raw.speed]) state.speed = raw.speed;
      if (TEXT_OK.indexOf(raw.textSize) !== -1) state.textSize = raw.textSize;
      if (MOTION_OK.indexOf(raw.motion) !== -1) state.motion = raw.motion;
    } catch (e) { /* first visit or storage blocked: keep defaults */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function motionReduced() {
    if (state.motion === 'reduce') return true;
    if (state.motion === 'full') return false;
    return !!(media && media.matches);
  }

  function apply() {
    const b = document.body.classList;
    b.toggle('ui-large', state.textSize === 'large');
    b.toggle('ui-xl', state.textSize === 'xl');
    b.toggle('motion-reduced', motionReduced());
  }

  function syncUI() {
    const pick = (name, value) => {
      const el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) el.checked = true;
    };
    pick('set-speed', state.speed);
    pick('set-text', state.textSize);
    pick('set-motion', state.motion);
  }

  function set(patch) {
    Object.assign(state, patch);
    save();
    apply();
    syncUI();
    try { window.dispatchEvent(new Event('settingschange')); } catch (e) { /* ignore */ }
  }

  /* Wire the Options overlay controls (all native radio buttons — keyboard
     friendly out of the box). */
  function initUI() {
    const panel = document.getElementById('options-panel');
    if (!panel) return;
    panel.addEventListener('change', (e) => {
      const t = e.target;
      if (!t || !t.name) return;
      if (t.name === 'set-speed') set({ speed: t.value });
      else if (t.name === 'set-text') set({ textSize: t.value });
      else if (t.name === 'set-motion') set({ motion: t.value });
    });
    syncUI();
  }

  if (media && media.addEventListener) {
    media.addEventListener('change', () => apply());
  }

  load();
  apply();
  initUI();

  return {
    speed: () => SPEEDS[state.speed] || 1,
    motionReduced: motionReduced,
    snapshot: () => ({ speed: state.speed, speedMult: SPEEDS[state.speed], textSize: state.textSize, motion: state.motion, motionReduced: motionReduced() }),
    set: set,
  };
})();
