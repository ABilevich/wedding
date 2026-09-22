// Figma 4239:44 → 4239:86. This adapter leaves the portrait renderer intact.
(() => {
  const horizontal = matchMedia('(min-width: 900px) and (orientation: landscape)');
  const portraitUpdate = updateReveal;
  const composition = document.querySelector('.composition');
  // Final poses in the 1728 × 1117 Figma canvas; same original artwork as portrait.
  // Horizontal review: inset/lift the left photo and offset the invitation right.
  const finalPoses = {
    'photo-left': [1048.4169, 505.0541, 222.1059, 241.1979, -12.1521],
    'photo-top': [1175.9064, 335.7557, 243.6996, 264.6477, 7.5237],
    'invitation-card': [1328.7358, 541.1529, 362.11, 234.7098, 5.2056],
    'cat': [1318.3215, 677.0097, 156.15, 156.15, -21.26],
    'date-card': [1124.2379, 652.1652, 336.6158, 336.6158, 0],
    'flowers-left': [979.3858, 371.3858, 317.165, 317.165, -60.2369],
    'flowers-right': [1364.3909, 437.885, 342.316, 427.742, -19.0574],
  };
  const horizontalInsertOffset = 909.1587 + 598.8418 / 2 - getInsertCenter(Object.entries(finalPoses));
  const middleScale = 598 / 372.3545;
  function horizontalUpdate() {
    root.style.setProperty('--scene-scale', Math.min(stage.clientWidth / 1728, stage.clientHeight / 1117));
    const travel = Math.max(1, reveal.offsetHeight - stage.offsetHeight);
    const scrollProgress = clamp(-reveal.getBoundingClientRect().top / travel);
    const p = reducedMotion.matches ? 1 : scrollProgress;
    composition.style.height = '1117px';
    composition.style.transform = 'translate(-50%, -50%) scale(var(--scene-scale))';
    const first = phase(p, .10, .46), second = phase(p, .54, .94);
    const key = (a, b, c) => second > 0 ? lerp(b, c, second) : lerp(a, b, first);
    const x = key(908, 908, 909.1587), y = key(443.8065, 500, 559.1425);
    const w = key(597.9993, 598, 598.8418);
    updateEnvelopeShadows(w, second);
    const pocketY = key(445.6065, 501.8, 560);
    const pocketHeight = key(405.587, 405.587, 406.0888);
    const bottom = pocketY + pocketHeight;
    root.style.setProperty('--night', phase(p, .08, .44));
    root.style.setProperty('--envelope-radius', `${18 * w / 320}px`);
    box('envelope-back', x, y, w, bottom - y);
    box('pockets', x, pocketY, w, pocketHeight);
    const flap = second > 0 ? lerp(-154, -276.6432, second) : lerp(282.1809, -154, phase(p, .13, .42));
    box('flap-outer', x, y, w, Math.max(.01, flap), flap >= 0 ? 1 : 0);
    box('flap-inner', x, y + Math.min(0, flap), w, Math.max(.01, -flap), flap < 0 ? 1 : 0);
    box('liner', key(950, 951, 954.0534), key(444, 368, 322.8042), key(500, 511, 501.9884), key(210, 349, 448.8582), phase(p, .30, .43));
    const shoulder = lerp(37.843, 52.653, second);
    elements.liner.style.clipPath = `polygon(50.312% 0,100% ${shoulder}%,100% ${lerp(97.589, 98.163, second)}%,0 100%,0 ${shoulder}%)`;
    elements.liner.firstElementChild.style.height = `${lerp(133.96, 102.04, second)}%`;
    elements.liner.firstElementChild.style.top = `${lerp(-35.563, -3.265, second)}%`;
    for (const name of ['pocket-left', 'pocket-right', 'pocket-front-open']) document.querySelector(`.${name}`).style.opacity = first;
    const sealSize = key(167.317, 190, 215.81);
    box('seal', key(1123.6417, 1112, 1095.2582), key(590.1935, 629, 651.1654), sealSize, sealSize);
    elements.seal.style.transform = 'rotate(-2.71337deg)';
    for (const [name, finalPose] of Object.entries(finalPoses)) {
      const [cx, cy, width, height, angle] = poses[name][1];
      const middle = [908 + (cx - 14) * middleScale, 500 + (cy - 483.5435) * middleScale, width * middleScale, height * middleScale, angle];
      const start = [1207, 730, width * 1.4, height * 1.4, angle];
      const v = finalPose.map((value, i) => key(start[i], middle[i], value));
      // Use the same full-group centering rule as mobile, relative to this shell.
      v[0] += horizontalInsertOffset * second;
      const opacity = ['photo-top', 'date-card', 'cat'].includes(name) ? phase(p, .56, .66) : phase(p, .29, .40);
      box(name, v[0] - v[2] / 2, v[1] - v[3] / 2, v[2], v[3], opacity);
      elements[name].style.transform = `rotate(${v[4]}deg)${name === 'cat' ? ' scaleX(-1)' : ''}`;
    }
    elements['invitation-card'].style.boxShadow = `${-7 * (1 - second)}px 0 ${6 * (1 - second)}px rgba(0,0,0,.25)`;
    // The rotated inserts may extend beyond the envelope's sides. Let the front
    // pockets occlude them naturally; only conceal content below the bottom.
    elements['contents-window'].style.clipPath = `polygon(0 0,100% 0,100% ${bottom}px,0 ${bottom}px)`;
    // Match the portrait text transition while keeping the horizontal alignment.
    elements['header-initial'].style.opacity = key(1, .5, 0);
    elements['header-initial'].style.transform = `translateY(${-46 * second}px)`;
    elements['header-final'].style.opacity = second;
    elements['header-final'].style.transform = `translateY(${46 * (1 - second)}px)`;
    const isOpen = second > .8;
    elements['header-initial'].setAttribute('aria-hidden', String(isOpen));
    elements['header-final'].setAttribute('aria-hidden', String(!isOpen));
    openButton.style.opacity = 1 - phase(p, .04, .18);
    openButton.style.visibility = p >= .18 ? 'hidden' : 'visible';
    openButton.tabIndex = p >= .18 ? -1 : 0;
    openButton.setAttribute('aria-expanded', String(isOpen));
    const announcement = isOpen ? 'Save the Date. Natasha y Andres. 29 de enero de 2027. Próximamente compartiremos más detalles.' : '';
    if (status.textContent !== announcement) status.textContent = announcement;
  }
  updateReveal = () => {
    if (horizontal.matches) horizontalUpdate();
    else {
      root.style.setProperty('--scene-scale', Math.min(stage.clientWidth / 402, stage.clientHeight / 874));
      portraitUpdate();
    }
  };
  // Capture only horizontal clicks; the existing portrait handler is untouched.
  openButton.addEventListener('click', event => {
    if (!horizontal.matches) return;
    event.stopImmediatePropagation();
    window.scrollTo({top: scrollY + reveal.getBoundingClientRect().top + (reveal.offsetHeight - stage.offsetHeight) * (reducedMotion.matches ? 0 : 1), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  }, {capture: true});
  horizontal.addEventListener('change', updateReveal);
  updateReveal();
})();
