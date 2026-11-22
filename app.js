const themeButton = document.querySelector('[data-theme-toggle]');
const systemTheme = matchMedia('(prefers-color-scheme: light)');
const currentTheme = () => document.documentElement.dataset.theme || (systemTheme.matches ? 'light' : 'dark');
function labelTheme() {
  themeButton.setAttribute('aria-label', `Switch to ${currentTheme() === 'light' ? 'dark' : 'light'} theme`);
}
themeButton.addEventListener('click', () => {
  const next = currentTheme() === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('portfolio-theme', next); } catch {}
  labelTheme();
});
systemTheme.addEventListener('change', labelTheme);
labelTheme();

let anchorTimer;
function finishAnchorScroll() {
  document.documentElement.removeAttribute('data-anchor-scroll');
  clearTimeout(anchorTimer);
}
document.addEventListener('click',event => {
  const anchor = event.target.closest('a[href*="#"]');
  if (!anchor?.hash || anchor.origin !== location.origin || anchor.pathname !== location.pathname || anchor.search !== location.search) return;
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  document.documentElement.setAttribute('data-anchor-scroll','');
  clearTimeout(anchorTimer);
  anchorTimer = setTimeout(finishAnchorScroll,1300);
});
document.addEventListener('scrollend',finishAnchorScroll);
addEventListener('pagehide',finishAnchorScroll);

const menu = document.querySelector('#main-nav');
const menuButton = document.querySelector('[data-menu-toggle]');
function setMenu(open) {
  menu.toggleAttribute('data-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} menu`);
}
menuButton.addEventListener('click', () => {
  const open = !menu.hasAttribute('data-open');
  setMenu(open);
  if (open) menu.querySelector('a')?.focus();
});
menu.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) setMenu(false); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.hasAttribute('data-open')) {
    setMenu(false);
    menuButton.focus();
  }
});
matchMedia('(max-width: 760px)').addEventListener('change', () => setMenu(false));

const sectionLinks = new Map([...menu.querySelectorAll('[data-section-link]')].map((link) => [link.dataset.sectionLink, link]));
const sections = [...document.querySelectorAll('main > section[id]')].filter((section) => sectionLinks.has(section.id));
if (sections.length) {
  const header = menu.closest('.site-header');
  let pending = false;
  function updateSection() {
    pending = false;
    const root = document.documentElement;
    const headerBottom = header.getBoundingClientRect().bottom;
    const maxScroll = root.scrollHeight - innerHeight;
    const anchor = document.getElementById(location.hash.slice(1));
    const anchorSection = anchor?.closest('main > section[id]');
    const scrollPadding = parseFloat(getComputedStyle(root).scrollPaddingTop) || headerBottom;
    const anchorScroll = anchor && Math.max(0, Math.min(maxScroll, scrollY + anchor.getBoundingClientRect().top - scrollPadding));
    let active = sections[0];
    if (sections.includes(anchorSection) && Math.abs(scrollY - anchorScroll) < 2) {
      active = anchorSection;
    } else if (maxScroll > 0 && scrollY >= maxScroll - 2) {
      active = sections.at(-1);
    } else {
      for (const section of sections) {
        if (section.getBoundingClientRect().top > headerBottom + 32) break;
        active = section;
      }
    }
    for (const [id, link] of sectionLinks) {
      if (id === active.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function trackSection() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateSection);
  }
  addEventListener('scroll', trackSection, { passive: true });
  addEventListener('resize', trackSection);
  addEventListener('hashchange', trackSection);
  addEventListener('pageshow', trackSection);
  new ResizeObserver(trackSection).observe(document.querySelector('main'));
  updateSection();
}

const finePointer = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
for (const card of document.querySelectorAll('[data-tilt]')) {
  const art = card.querySelector('.project-art');
  const reset = () => {
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
    art.style.removeProperty('--shine-x');
    art.style.removeProperty('--shine-y');
  };
  card.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    const box = card.getBoundingClientRect();
    const across = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const down = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    card.style.setProperty('--tilt-x', `${(0.5 - down) * 7}deg`);
    card.style.setProperty('--tilt-y', `${(across - 0.5) * 9}deg`);
    art.style.setProperty('--shine-x', `${across * 100}%`);
    art.style.setProperty('--shine-y', `${down * 100}%`);
  }, { passive: true });
  card.addEventListener('pointerleave', reset);
  finePointer.addEventListener('change', reset);
}

if ('IntersectionObserver' in window) {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const reveals = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveals.unobserve(entry.target);
      if (motion.matches) entry.target.classList.add('section-arrival');
    }
  }, { rootMargin: '0px 0px -64px' });
  for (const section of document.querySelectorAll('.band > .shell')) reveals.observe(section);

  const skills = document.querySelector('#skills .skills-grid');
  if (skills) {
    const skillReveal = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      skillReveal.disconnect();
      if (motion.matches) skills.classList.add('skills-arrival');
    }, { threshold: 0.16 });
    skillReveal.observe(skills);
  }
}

for (const browser of document.querySelectorAll('[data-project-browser]')) {
  const buttons = [...browser.querySelectorAll('[data-filter]')];
  const cards = [...browser.querySelectorAll('[data-project]')];
  const search = browser.querySelector('[data-search-input]');
  const picker = browser.querySelector('[data-preview-select]');
  const slot = browser.querySelector('[data-preview-slot]');
  let category = 'all';
  function selectPreview() {
    const template = [...browser.querySelectorAll('[data-work-preview]')].find(item => item.dataset.workPreview === picker.value);
    slot.replaceChildren(...(template ? [template.content.cloneNode(true)] : []));
  }
  picker?.addEventListener('change',selectPreview);
  slot?.addEventListener('click',event => {
    if (!event.target.closest('[data-preview-close]')) return;
    picker.value = '';
    selectPreview();
    picker.focus();
  });
  function updateResults() {
    const terms = (search?.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const matches = (category === 'all' || card.dataset.category === category) && terms.every((term) => card.dataset.search.toLowerCase().includes(term));
      const entering = card.hidden && matches;
      card.hidden = !matches;
      if (entering && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        card.animate?.([{ opacity: .4, translate: '0 7px' }, { opacity: 1, translate: '0 0' }], { duration: 230, easing: 'ease-out' });
      }
      if (matches) count++;
    }
    browser.querySelector('[data-project-empty]').hidden = count > 0;
    browser.querySelector('[data-result-count]').textContent = `${count} ${count === 1 ? 'project' : 'projects'} shown`;
    if (picker) {
      const choices = [...picker.options].slice(1);
      for (const choice of choices) choice.disabled = choice.hidden = category !== 'all' && choice.dataset.category !== category;
      picker.closest('label').hidden = choices.every(choice => choice.disabled);
      if (picker.selectedOptions[0]?.disabled) {
        picker.value = '';
        selectPreview();
      }
    }
  }
  for (const button of buttons) button.addEventListener('click', () => {
    category = button.dataset.filter;
    for (const filter of buttons) filter.setAttribute('aria-pressed', String(filter === button));
    updateResults();
  });
  search?.addEventListener('input', updateResults);
  addEventListener('pageshow',() => {
    updateResults();
    if (picker && !slot.firstChild) selectPreview();
  });
}

document.addEventListener('click',event => {
  const next = event.target.closest('[data-next-screen]');
  if (!next) return;
  const studio = next.closest('[data-studio]');
  const images = [...studio.querySelectorAll('[data-screen]')];
  const labels = [...studio.querySelectorAll('[data-screen-label]')];
  const index = (images.findIndex(img => !img.hidden)+1) % images.length;
  if (images[index].dataset.src && !images[index].hasAttribute('src')) images[index].src = images[index].dataset.src;
  images.forEach((img,i) => { img.hidden = labels[i].hidden = index !== i; });
  if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    images[index].animate?.([{opacity:.5},{opacity:1}],{duration:190});
  }
});

for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const thumbs = [...gallery.querySelectorAll('.gallery-link')];
  const dialog = gallery.querySelector('dialog');
  const viewer = dialog.querySelector('[data-gallery-image]');
  const caption = dialog.querySelector('[data-gallery-caption]');
  const position = dialog.querySelector('[data-gallery-position]');
  const back = dialog.querySelector('[data-gallery-prev]');
  const next = dialog.querySelector('[data-gallery-next]');
  const close = dialog.querySelector('[data-gallery-close]');
  let current = 0;
  let trigger;
  function show(index) {
    current = (index + thumbs.length) % thumbs.length;
    const thumb = thumbs[current];
    viewer.alt = thumb.querySelector('img').alt;
    viewer.src = thumb.href;
    caption.textContent = viewer.alt;
    position.textContent = `${current + 1} / ${thumbs.length}`;
  }
  viewer.addEventListener('error', () => { caption.textContent = 'This screenshot could not load.'; });
  back.disabled = next.disabled = thumbs.length < 2;
  for (const [index, thumb] of thumbs.entries()) thumb.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    trigger = thumb;
    show(index);
    dialog.showModal();
    close.focus();
  });
  back.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger?.focus());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
}

for (const video of document.querySelectorAll('[data-video]')) {
  video.querySelector('[data-video-load]').addEventListener('click', () => {
    video.replaceChildren(video.querySelector('template').content.cloneNode(true));
    video.firstElementChild.focus();
  });
}

document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
