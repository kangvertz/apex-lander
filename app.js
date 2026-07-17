const form = document.querySelector('#notify-form');
const note = document.querySelector('#form-note');

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
// Add/remove entries here to change how many logos appear — the track
// duplicates this list once automatically so the loop stays seamless.
// Speed/spacing are controlled by --marquee-speed / --marquee-gap in styles.css.
const companyLogos = [
  { src: 'assets/logos/aether.svg', alt: 'Aether' },
  { src: 'assets/logos/perfect-days.svg', alt: 'Perfect Days' },
  { src: 'assets/logos/chromatic.svg', alt: 'Chromatic' },
  { src: 'assets/logos/rasala.svg', alt: 'rasala' }
];

const logoTrack = document.querySelector('#logo-track');
if (logoTrack) {
  const renderSet = () => companyLogos
    .map(({ src, alt }) => `<img src="${src}" alt="${alt}" loading="lazy" />`)
    .join('');
  // Rendered twice back-to-back so translateX(-50%) loops without a visible seam.
  logoTrack.innerHTML = renderSet() + renderSet();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#email').value.trim();
  if (!email) return;
  note.textContent = 'You’re on the list — see you on the horizon.';
  note.style.color = '#c98a39';
  form.querySelector('button').innerHTML = 'You’re in <span aria-hidden="true">✓</span>';
  form.querySelector('input').disabled = true;
});
