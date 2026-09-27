/* ═══════════════════════════════════════════════════════
   SAHARITOURS – main.js
═══════════════════════════════════════════════════════ */

/* ─── STICKY HEADER ─── */
const header  = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ─── MOBILE NAV ─── */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

/* ─── SCROLL-REVEAL ─── */
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in-view');
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
);

document.querySelectorAll('.reveal').forEach((el, i) => {
  if (i % 3 === 1) el.classList.add('reveal-delay-1');
  if (i % 3 === 2) el.classList.add('reveal-delay-2');
  revealObserver.observe(el);
});

/* ─── TOUR FILTER (pill buttons) ─── */
const tourItems  = document.querySelectorAll('.tour-list-item');
const noResults  = document.getElementById('noResults');
const toursCount = document.getElementById('toursCount');
const filterClear = document.getElementById('clearFilters');
const pills = document.querySelectorAll('.filter-pill[data-pill]');
const cityPills = document.querySelectorAll('.filter-pill[data-city-pill]');

const PILL_RULES = {
  'all':     () => true,
  'excursion': item => item.dataset.duration === '1-2',
  '2-3days': item => item.dataset.duration === '3-4',
  '7days':   item => item.dataset.duration === '5-7' || item.dataset.duration === '8+',
};

let activeDurationKey = 'all';
let activeCityKey = 'all';

function applyFilters() {
  if (!tourItems.length) return;
  const durationRule = PILL_RULES[activeDurationKey] || (() => true);
  let visible = 0;
  tourItems.forEach(item => {
    const durationOk = durationRule(item);
    const cities = (item.dataset.city || '').split(' ');
    const cityOk = activeCityKey === 'all' || cities.includes(activeCityKey);
    const show = durationOk && cityOk;
    item.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
  if (toursCount) toursCount.textContent = visible;
}

function setActivePill(key) {
  pills.forEach(p => {
    const isActive = p.dataset.pill === key;
    p.classList.toggle('active', isActive);
    p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setActiveCityPill(key) {
  cityPills.forEach(p => {
    const isActive = p.dataset.cityPill === key;
    p.classList.toggle('active', isActive);
    p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

pills.forEach(pill => {
  pill.addEventListener('click', () => {
    const key = pill.dataset.pill;
    if (key === 'customize') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    activeDurationKey = key;
    setActivePill(key);
    applyFilters();
  });
});

cityPills.forEach(pill => {
  pill.addEventListener('click', () => {
    activeCityKey = pill.dataset.cityPill;
    setActiveCityPill(activeCityKey);
    applyFilters();
  });
});

if (filterClear) filterClear.addEventListener('click', () => {
  activeDurationKey = 'all';
  activeCityKey = 'all';
  setActivePill('all');
  setActiveCityPill('all');
  applyFilters();
});

/* ─── CONTACT FORM ───
   Submissions are sent to a Google Apps Script Web App, which appends each
   one as a row in a Google Sheet (and emails a notification). Replace this
   with your deployed Apps Script /exec URL — see google-apps-script.gs. */
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

const form    = document.getElementById('contactForm');
const success = document.getElementById('formSuccess');
const error   = document.getElementById('formError');
const btn     = document.getElementById('submitBtn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const btnText    = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    btn.disabled          = true;
    btnText.style.display  = 'none';
    btnLoading.style.display = 'inline';

    try {
      const encode = (data) => Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');
      /* mode:'no-cors' is required for Apps Script Web Apps — their redirect
         (script.google.com -> script.googleusercontent.com) doesn't reliably
         carry CORS headers, so the response can't be read either way. We
         submit and assume success; Apps Script still runs and writes the row
         even though we can't inspect the response here. */
      await fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(Object.fromEntries(new FormData(form)))
      });
      form.reset();
      success.style.display = 'block';
      error.style.display   = 'none';
    } catch {
      error.style.display   = 'block';
      success.style.display = 'none';
    } finally {
      btn.disabled             = false;
      btnText.style.display    = 'inline';
      btnLoading.style.display = 'none';
    }
  });
}

/* ─── ACTIVE NAV LINK ON SCROLL ─── */
const sections = document.querySelectorAll('section[id]');
const linkMap  = {};
document.querySelectorAll('.nav-link').forEach(l => {
  const id = l.getAttribute('href').replace(/.*#/, '');
  linkMap[id] = l;
});
const navObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      Object.values(linkMap).forEach(l => l.removeAttribute('aria-current'));
      const link = linkMap[e.target.id];
      if (link) link.setAttribute('aria-current', 'page');
    }
  }),
  { rootMargin: '-40% 0px -50% 0px' }
);
sections.forEach(s => navObserver.observe(s));

/* ─── FOOTER YEAR ─── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─── TOUR DETAIL PAGE HERO SLIDER ─── */
(function initTourHeroSlider() {
  const bg = document.querySelector('.tour-hero-bg[data-slides]');
  if (!bg) return;
  let paths;
  try { paths = JSON.parse(bg.dataset.slides); } catch { return; }
  if (!paths || paths.length < 2) return;

  paths.forEach((src, i) => {
    const s = document.createElement('div');
    s.className = 'tour-hero-slide' + (i === 0 ? ' active' : '');
    s.style.backgroundImage = `url('${src}')`;
    bg.appendChild(s);
  });

  const slides = [...bg.querySelectorAll('.tour-hero-slide')];
  let cur = 0;

  function goTo(n) {
    slides[cur].classList.remove('active');
    cur = ((n % slides.length) + slides.length) % slides.length;
    slides[cur].classList.add('active');
  }

  let timer = setInterval(() => goTo(cur + 1), 3000);
  bg.closest('.tour-hero').addEventListener('mouseenter', () => clearInterval(timer));
  bg.closest('.tour-hero').addEventListener('mouseleave', () => { timer = setInterval(() => goTo(cur + 1), 3000); });
})();

/* ─── HERO FULL-SCREEN SLIDER ─── */
(function initHeroSlider() {
  const slides    = [...document.querySelectorAll('.hero-slide')];
  if (slides.length < 2) return;

  const dotsWrap   = document.getElementById('heroDots');
  const progress   = document.getElementById('heroProgress');
  const prevBtn    = document.getElementById('heroPrev');
  const nextBtn    = document.getElementById('heroNext');
  const slideLabel = document.getElementById('heroSlideLabel');
  const hero       = document.getElementById('home');
  const DURATION   = 4000;

  const labels = [
    'Imperial Cities · 4 Days',
    'Blue City of Chefchaouen · Day Trip',
    'Volubilis & Meknes · Day Trip',
    'Atlas Mountains · Day Trip',
    'Sahara Desert · 3 Days to Merzouga',
  ];

  let current = 0, paused = false, timer = null, rafId = null, t0 = 0;

  /* Build dots */
  const dots = slides.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'hero-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', `Slide ${i + 1}`);
    d.setAttribute('role', 'tab');
    d.addEventListener('click', () => { goTo(i); resetTimer(); });
    dotsWrap.appendChild(d);
    return d;
  });

  function goTo(n) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = ((n % slides.length) + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    if (slideLabel) slideLabel.textContent = labels[current] || '';
  }

  function animateBar() {
    if (paused) return;
    const pct = Math.min(((performance.now() - t0) / DURATION) * 100, 100);
    progress.style.width = pct + '%';
    if (pct < 100) rafId = requestAnimationFrame(animateBar);
  }

  function resetTimer() {
    clearTimeout(timer);
    cancelAnimationFrame(rafId);
    progress.style.transition = 'none';
    progress.style.width = '0%';
    void progress.offsetWidth;
    progress.style.transition = '';
    if (paused) return;
    t0 = performance.now();
    rafId = requestAnimationFrame(animateBar);
    timer = setTimeout(() => { goTo(current + 1); resetTimer(); }, DURATION);
  }

  prevBtn.addEventListener('click', () => { goTo(current - 1); resetTimer(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); resetTimer(); });

  /* Keyboard navigation */
  hero.setAttribute('tabindex', '-1');
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { goTo(current - 1); resetTimer(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); resetTimer(); }
  });

  /* Touch swipe */
  let touchX = 0;
  hero.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { goTo(current + (dx < 0 ? 1 : -1)); resetTimer(); }
  });

  /* Pause on hover */
  hero.addEventListener('mouseenter', () => {
    paused = true;
    clearTimeout(timer);
    cancelAnimationFrame(rafId);
  });
  hero.addEventListener('mouseleave', () => {
    paused = false;
    resetTimer();
  });

  resetTimer();
})();

/* ─── TOUR CARD SLIDESHOWS ─── */
(function initSlideshows() {
  document.querySelectorAll('.tli-img[data-slides]').forEach(img => {
    let paths;
    try { paths = JSON.parse(img.dataset.slides); } catch { return; }
    if (!paths || paths.length < 2) return;

    /* Build slide divs (prepend so badges stay on top) */
    paths.forEach((src, i) => {
      const s = document.createElement('div');
      s.className = 'tli-slide' + (i === 0 ? ' active' : '');
      s.style.backgroundImage = `url('${src}')`;
      img.prepend(s);
    });
    img.classList.add('has-slides');

    const slides = [...img.querySelectorAll('.tli-slide')];
    let cur = 0;

    /* Navigation — photos only, no visible controls */
    function goTo(n) {
      slides[cur].classList.remove('active');
      cur = ((n % paths.length) + paths.length) % paths.length;
      slides[cur].classList.add('active');
    }

    let timer = setInterval(() => goTo(cur + 1), 3000);

    /* Pause on hover */
    img.addEventListener('mouseenter', () => clearInterval(timer));
    img.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(cur + 1), 3000); });
  });
})();
