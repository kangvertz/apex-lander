const form = document.querySelector('#notify-form');
const note = document.querySelector('#form-note');
if (note) note.setAttribute('aria-live', 'polite');

// --- Typing logo (brand bar) ---
const brandText = document.querySelector('.brand-text');
const brandWords = ['apex studio', 'design websites', 'build brands', 'craft experiences', 'create.'];
const TYPE_SPEED = 90;
const DELETE_SPEED = 45;
const PAUSE = 1700;
let brandWordIndex = 0;
let brandCharIndex = 0;
let brandDeleting = false;

function typeBrand() {
  const current = brandWords[brandWordIndex];
  if (!brandDeleting) {
    brandText.textContent = current.substring(0, brandCharIndex++);
    if (brandCharIndex > current.length) {
      brandDeleting = true;
      setTimeout(typeBrand, PAUSE);
      return;
    }
  } else {
    brandText.textContent = current.substring(0, brandCharIndex--);
    if (brandCharIndex < 0) {
      brandDeleting = false;
      brandWordIndex = (brandWordIndex + 1) % brandWords.length;
    }
  }
  setTimeout(typeBrand, brandDeleting ? DELETE_SPEED : TYPE_SPEED);
}

if (brandText) typeBrand();

// --- Trusted-by logo marquee ---
// Add as many entries as you like here — on every page load, LOGO_DISPLAY_COUNT
// of them are picked at random and shuffled into a new order, so the strip
// doesn't look identical to every visitor. The track duplicates the chosen
// set once automatically so the loop stays seamless. Speed/spacing are
// controlled by --marquee-speed / --marquee-gap in styles.css.
const companyLogos = [
  { src: 'assets/logos/aether.svg', alt: 'Aether' },
  { src: 'assets/logos/perfect-days.svg', alt: 'Perfect Days' },
  { src: 'assets/logos/chromatic.svg', alt: 'Chromatic' },
  { src: 'assets/logos/rasala.svg', alt: 'rasala' }
  // Add more { src, alt } logo entries here as you onboard clients —
  // drop the matching SVG in assets/logos/ first.
];

const LOGO_DISPLAY_COUNT = companyLogos.length;

function shuffleLogos(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const logoTrack = document.querySelector('#logo-track');
if (logoTrack) {
  const chosenLogos = shuffleLogos(companyLogos).slice(0, Math.min(LOGO_DISPLAY_COUNT, companyLogos.length));
  const renderSet = () => chosenLogos
    .map(({ src, alt }) => `<img src="${src}" alt="${alt}" loading="lazy" />`)
    .join('');
  // Rendered twice back-to-back so translateX(-50%) loops without a visible seam.
  logoTrack.innerHTML = renderSet() + renderSet();
}

// --- Scene toggle (horizon ↔ night / way) ---
const sceneToggle = document.querySelector('#scene-toggle');
const headlineWords = document.querySelectorAll('.headline-word');
const SCENES = {
  horizon: {
    image: 'assets/hero.webp',
    toggleLabel: 'Night view',
    ariaLabel: 'Switch to night view',
  },
  way: {
    image: 'assets/hero2.webp',
    toggleLabel: 'Day view',
    ariaLabel: 'Switch to day view',
  },
};

const SCENE_TRANSITION_MS = 700;
let activeScene = 'horizon';
let sceneTransitionLock = false;

function applyScene(sceneKey) {
  activeScene = sceneKey;
  const scene = SCENES[sceneKey];
  const isWay = sceneKey === 'way';

  headlineWords.forEach((word) => {
    const isActive = word.dataset.scene === sceneKey;
    word.classList.toggle('is-visible', isActive);
    word.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  window.liquidDistortion?.setImage(scene.image);

  sceneToggle.setAttribute('aria-pressed', String(isWay));
  sceneToggle.setAttribute('aria-label', scene.ariaLabel);
  sceneToggle.querySelector('.scene-toggle-label').textContent = scene.toggleLabel;
}

if (sceneToggle && headlineWords.length) {
  sceneToggle.addEventListener('click', () => {
    if (sceneTransitionLock) return;
    sceneTransitionLock = true;
    applyScene(activeScene === 'horizon' ? 'way' : 'horizon');
    window.setTimeout(() => {
      sceneTransitionLock = false;
    }, SCENE_TRANSITION_MS);
  });
}

if (form) form.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#email').value.trim();
  if (!email) return;
  const button = form.querySelector('button');
  const input = form.querySelector('input');

  form.classList.add('is-submitted');
  note.textContent = activeScene === 'way'
    ? 'You’re on the list — see you on the way.'
    : 'You’re on the list — see you on the horizon.';
  note.style.color = activeScene === 'way' ? '#4a6aa8' : '#c98a39';
  button.innerHTML = 'You’re in <span aria-hidden="true">✓</span>';
  button.disabled = true;
  input.disabled = true;
});
