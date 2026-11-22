const scene = document.querySelector('[data-scene]');
const canvas = scene.querySelector('canvas');
const toggle = scene.querySelector('[data-motion-toggle]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const touch = matchMedia('(pointer: coarse)');
const light = matchMedia('(prefers-color-scheme: light)');
let render, loading = false, failed = false, generation = 0;
let visible = false, paused = false, frame = 0, lastTime = 0, time = 0;
let targetX = 0, targetY = 0, x = 0, y = 0, width, height, scroll = 0;
let lightTheme, scaleCap = touch.matches ? 1.35 : 1.8, slowFrames = 0;
try { paused = sessionStorage.getItem('identity-paused') === 'yes'; } catch {}

function resize() {
  const scale = Math.min(devicePixelRatio || 1, scaleCap);
  width = Math.max(1,Math.round(scene.clientWidth * scale));
  height = Math.max(1,Math.round(scene.clientWidth * 382 / 518 * scale));
}
function position() {
  scroll = Math.min(1, Math.max(0,-scene.getBoundingClientRect().top / Math.max(1,innerHeight)));
}
function theme() {
  lightTheme = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'light' : light.matches;
  if (render && visible && paused && !reduced.matches) paint();
}
function paint() {
  render({ width,height,time,x,y,scroll,light:lightTheme });
}
function tick(stamp) {
  frame = 0;
  const elapsed = lastTime ? stamp-lastTime : 0;
  const interval = 1000 / (touch.matches ? 40 : 60);
  if (lastTime && elapsed < interval - 1.5) {
    frame = requestAnimationFrame(tick);
    return;
  }
  if (elapsed > 45 && ++slowFrames === 12 && scaleCap > 1) {
    scaleCap = 1;
    resize();
  } else if (elapsed < 35) slowFrames = 0;
  lastTime = stamp;
  const dt = Math.min(elapsed/1000,.05);
  const follow = 1-Math.exp(-dt*6);
  x += (targetX-x)*follow;
  y += (targetY-y)*follow;
  time += dt;
  paint();
  frame = requestAnimationFrame(tick);
}
function stop() {
  cancelAnimationFrame(frame);
  frame = lastTime = 0;
}
async function sync() {
  stop();
  const active = visible && !document.hidden && !reduced.matches && !failed;
  scene.toggleAttribute('data-scene-ready', Boolean(render && !reduced.matches));
  toggle.hidden = !render || reduced.matches;
  toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
  toggle.toggleAttribute('data-paused', paused);
  if (!active) return;
  if (!render && !loading) {
    loading = true;
    const token = generation;
    try {
      const { createRenderer } = await import('./identity/renderer.js');
      const result = await createRenderer(canvas);
      if (token !== generation) return;
      render = result;
      failed = !result;
    } catch { if (generation === token) failed = true; }
    if (generation !== token) return;
    loading = false;
    return sync();
  }
  if (!render) return;
  position();
  paint();
  if (!paused) frame = requestAnimationFrame(tick);
}

if (!navigator.connection?.saveData && !(navigator.deviceMemory <= 2) && 'IntersectionObserver' in window) {
  resize();
  theme();
  new ResizeObserver(() => { resize(); if (visible && paused && render && !reduced.matches) paint(); }).observe(scene);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(scene);
  light.addEventListener('change',theme);
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  addEventListener('scroll',() => { if (visible && !paused && !reduced.matches) position(); },{ passive:true });
  scene.addEventListener('pointermove',event => {
    if (event.pointerType === 'touch' || !render || paused || reduced.matches) return;
    const rect = scene.getBoundingClientRect();
    targetX = (event.clientX-rect.left)/rect.width*2-1;
    targetY = (event.clientY-rect.top)/rect.height*2-1;
  },{ passive:true });
  scene.addEventListener('pointerleave',() => { targetX = targetY = 0; });
  toggle.addEventListener('click',() => {
    paused = !paused;
    try { sessionStorage.setItem('identity-paused',paused ? 'yes' : 'no'); } catch {}
    sync();
  });
  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault();
    generation++;
    render = null;
    failed = true;
    loading = false;
    sync();
  });
  canvas.addEventListener('webglcontextrestored',() => { failed = false; sync(); });
}
