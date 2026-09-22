const root = document.documentElement;
const reveal = document.querySelector('.reveal');
const stage = document.querySelector('.stage');
const openButton = document.querySelector('.open-invitation');
const status = document.querySelector('#invitation-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = value => Math.min(1, Math.max(0, value));
const lerp = (a, b, t) => a + (b - a) * t;
const phase = (p, start, end) => { const t = clamp((p - start) / (end - start)); return t * t * (3 - 2 * t); };
const elements = Object.fromEntries(['envelope-back', 'flap-inner', 'flap-outer', 'liner', 'pockets', 'seal', 'cat', 'photo-top', 'photo-left', 'invitation-card', 'date-card', 'flowers-left', 'flowers-right', 'contents-window', 'header-initial', 'header-final'].map(name => [name, document.querySelector(`.${name}`)]));

// A pose is [center X, center Y, original width, original height, CSS rotation].
// Figma endpoints: 4231:288 → 4231:314; preserve the original middle opening pose.
// Preserve the user-approved white envelope artwork independently of the reference.
const poses = {
  'photo-left': [[175, 547, 115, 124.886, 0], [107.3901, 559.6645, 134.4658, 146.0245, -13.4694], [65.6478, 552.6578, 151.9619, 165.0245, -12.1521]],
  'photo-top': [[202, 548, 115, 124.886, 0], [193, 624, 134.4658, 146.0245, 0], [177.5043, 417.6705, 166.7356, 181.0681, 7.5237]],
  'invitation-card': [[224, 550, 183, 118.615, 0], [277.7095, 565.6085, 212.7508, 137.8992, -1.99], [265.6494, 558.2006, 247.7508, 160.5852, 5.2056]],
  'cat': [[248, 574, 84, 84, -21.26], [256, 720, 96, 96, -21.26], [257.1518, 651.1518, 106.8356, 106.8356, -21.26]],
  'date-card': [[201, 566, 150, 142.567, 0], [200, 703, 166, 157.767, 0], [142.154, 634.154, 230.308, 230.308, 0]],
  'flowers-left': [[156, 550, 124, 124, -60.2369], [90.6661, 497.1874, 143.9401, 143.9401, -60.2369], [43.0483, 442.0483, 217, 217, -60.2369]],
  'flowers-right': [[244, 550, 144, 180, 0], [302, 518, 168, 210, 0], [306.4639, 487.544, 234.2079, 292.6555, -19.0574]],
};
// Visible artwork bounds at the final rotation, excluding transparent PNG margins.
// Generated from the original alpha channels (threshold 32/255); normalized by width.
const visibleInsertBounds = {
  "flowers-left": [
    -0.38619034412231923,
    0.3952489198817048
  ],
  "flowers-right": [
    -0.4931349202577511,
    0.5812036378942874
  ],
  "photo-left": [
    -0.6016272329056824,
    0.601106497687358
  ],
  "cat": [
    -0.44023148365959985,
    0.43242684372864376
  ],
  "date-card": [
    -0.3849493487698987,
    0.426917510853835
  ],
  "photo-top": [
    -0.5667911406536627,
    0.5667911406536627
  ],
  "invitation-card": [
    -0.5273420758628619,
    0.5273420758628619
  ]
};
function getInsertCenter(poseEntries) {
  const bounds = poseEntries.map(([name, [cx, , width]]) => {
    const [left, right] = visibleInsertBounds[name];
    return [cx + left * width, cx + right * width];
  });
  return (Math.min(...bounds.map(b => b[0])) + Math.max(...bounds.map(b => b[1]))) / 2;
}
const portraitInsertOffset = 402 / 2 - getInsertCenter(Object.entries(poses).map(([name, frames]) => [name, frames[2]]));
// Figma 4231:298/318: shell shadow; 300/301/352: paper-fold shadows.
// CSS drop-shadow uses standard deviation, half the Figma blur radius.
function updateEnvelopeShadows(width, opened) {
  const closedScale = width / 329.9993;
  const openShellScale = width / 401.1143;
  const openFrontScale = width / 410.001;
  const sx = lerp(6.1875 * closedScale, 6 * openShellScale, opened);
  const sy = lerp(1.03125 * closedScale, openShellScale, opened);
  const blur = lerp(17.1187 * closedScale, 16.6 * openShellScale, opened) / 2;
  root.style.setProperty('--shell-shadow', `${sx}px ${sy}px ${blur}px rgba(0,0,0,.25)`);
  root.style.setProperty('--flap-shadow', `0 ${2.0625 * closedScale}px ${4.02187 * closedScale / 2}px rgba(67,61,27,.1)`);
  const fy = -lerp(1.03125 * closedScale, openFrontScale, opened);
  const fb = lerp(4.02187 * closedScale, 3.9 * openFrontScale, opened) / 2;
  root.style.setProperty('--front-shadow', `0 ${fy}px ${fb}px rgba(67,61,27,${lerp(.1,.2,opened)})`);
}
function box(name, x, y, w, h, opacity = 1) {
  const el = elements[name];
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.style.width = `${w}px`; el.style.height = `${h}px`; el.style.opacity = opacity;
}
function updateReveal() {
  const travel = Math.max(1, reveal.offsetHeight - stage.offsetHeight);
  const scrollProgress = clamp(-reveal.getBoundingClientRect().top / travel);
  const p = reducedMotion.matches ? 1 : scrollProgress;
  const composition = document.querySelector('.composition');
  composition.style.height = '874px';
  composition.style.transform = 'translate(-50%, -50%) scale(var(--scene-scale))';
  // Brief holds at each reference frame make the three steps readable in either direction.
  const first = phase(p, .10, .46), second = phase(p, .54, .94);
  const key = (a, b, c) => second > 0 ? lerp(b, c, second) : lerp(a, b, first);
  root.style.setProperty('--night', phase(p, .08, .44));
  // Share one outer contour: the rear and front must not expand independently.
  const x = key(36, 14, 0), y = key(378.219, 483.5435, 570.5088);
  // The final 410 px artwork exceeded the 402 px canvas and cut off each arc.
  const w = key(330, 372.3545, 402);
  updateEnvelopeShadows(w, second);
  // Keep the original 18 px circular corner at every scale. Clip the assembled
  // front too, so overlapping side pieces cannot flatten the top of the arc.
  root.style.setProperty('--envelope-radius', `${18 * w / 320}px`);
  const pocketY = key(379.25, 484.7065, 571);
  const pocketHeight = key(223.781, 252.5024, 278.0317);
  const h = pocketY + pocketHeight - y;
  box('envelope-back', x, y, w, h);
  // Signed flap height passes through zero at the hinge before revealing its reverse.
  const flip = phase(p, .13, .42);
  const signedFlap = second > 0 ? lerp(-95.825, -189.2756, second) : lerp(155.7184, -95.825, flip);
  box('flap-outer', x, y, w, Math.max(.01, signedFlap), signedFlap >= 0 ? 1 : 0);
  box('flap-inner', x, y + Math.min(0, signedFlap), w, Math.max(.01, -signedFlap), signedFlap < 0 ? 1 : 0);
  const inside = phase(p, .30, .43);
  box('liner', key(64, 40.763, 25.7162), key(376, 401.36, 408.8095), key(274, 318.828, 343.4538), key(116, 217.161, 307.1028), inside);
  // Interpolate the original mask's vertices after its Figma vertical flip.
  const shoulder = lerp(37.843, 52.653, second);
  elements.liner.style.clipPath = `polygon(50.312% 0,100% ${shoulder}%,100% ${lerp(97.589, 98.163, second)}%,0 100%,0 ${shoulder}%)`;
  document.querySelector('.pocket-front-open').style.opacity = first;
  document.querySelector('.pocket-left').style.opacity = first;
  document.querySelector('.pocket-right').style.opacity = first;
  elements.liner.firstElementChild.style.height = `${lerp(133.96, 102.04, second)}%`;
  elements.liner.firstElementChild.style.top = `${lerp(-35.563, -3.265, second)}%`;
  box('pockets', x, pocketY, w, pocketHeight);
  // The wax seal stays on the front and travels with the envelope.
  const sealSize = key(92.3322, 120, 147.756);
  box('seal', key(155.0001, 143, 122.4145), key(458.9999, 562.025, 633.4145), sealSize, sealSize);
  elements.seal.style.transform = `rotate(-2.71337deg)`;
  for (const [name, frames] of Object.entries(poses)) {
    const v = frames[0].map((_, i) => key(frames[0][i], frames[1][i], frames[2][i]));
    // Move the inserts as one group; preserve the envelope and seal positions.
    v[0] += portraitInsertOffset * second;
    const opacity = name === 'photo-top' || name === 'date-card' || name === 'cat' ? phase(p, .56, .66) : phase(p, .29, .40);
    box(name, v[0] - v[2] / 2, v[1] - v[3] / 2, v[2], v[3], opacity);
    elements[name].style.transform = `rotate(${v[4]}deg)${name === 'cat' ? ' scaleX(-1)' : ''}`;
  }
  elements['invitation-card'].style.boxShadow = `${-5 * (1 - second)}px 0 ${4 * (1 - second)}px rgba(0,0,0,.25)`;
  // Inserts emerge from inside the envelope; below the hinge its edges conceal them.
  const left = x, right = x + w;
  elements['contents-window'].style.clipPath = `polygon(0 0,100% 0,100% ${y}px,${right}px ${y}px,${right}px ${y + h}px,${left}px ${y + h}px,${left}px ${y}px,0 ${y}px)`;
  elements['header-initial'].style.opacity = key(1, .5, 0);
  elements['header-initial'].style.transform = `translateY(${-46 * second}px)`;
  elements['header-final'].style.opacity = second;
  elements['header-final'].style.transform = `translateY(${46 * (1 - second)}px)`;
  const isOpen = second > .8;
  elements['header-initial'].setAttribute('aria-hidden', String(isOpen));
  elements['header-final'].setAttribute('aria-hidden', String(!isOpen));
  openButton.style.opacity = 1 - phase(p, .04, .18);
  openButton.style.visibility = p >= .18 ? 'hidden' : 'visible';
  openButton.setAttribute('aria-expanded', String(isOpen));
  openButton.tabIndex = p >= .18 ? -1 : 0;
  const announcement = isOpen ? 'Save the Date. Natasha y Andres. 29 de enero de 2027. Próximamente compartiremos más detalles.' : '';
  if (status.textContent !== announcement) status.textContent = announcement;
}
function resizeScene() {
  root.style.setProperty('--scene-scale', Math.min(stage.clientWidth / 402, stage.clientHeight / 874));
  updateReveal();
}
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { updateReveal(); ticking = false; });
}, { passive: true });
openButton.addEventListener('click', () => window.scrollTo({
  top: scrollY + reveal.getBoundingClientRect().top + (reveal.offsetHeight - stage.offsetHeight) * (reducedMotion.matches ? 0 : 1),
  behavior: reducedMotion.matches ? 'instant' : 'smooth',
}));
addEventListener('resize', resizeScene);
addEventListener('pageshow', resizeScene);
reducedMotion.addEventListener('change', resizeScene);
resizeScene();
