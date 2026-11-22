const reducePageMotion = matchMedia('(prefers-reduced-motion: reduce)');

function projectAt(entry) {
  if (!entry?.url) return '';
  return new URL(entry.url).pathname.match(/^\/projects\/([a-z0-9-]+)\/?$/)?.[1] || '';
}

function matchProjectArt(transition, slug, done) {
  if (!slug) return;
  const art = document.querySelector(`[data-project-art="${slug}"]`);
  if (!art || art.closest('[hidden]')) return;
  const bounds = art.getBoundingClientRect();
  if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
  art.style.viewTransitionName = 'project-artwork';
  transition[done].then(
    () => art.style.removeProperty('view-transition-name'),
    () => art.style.removeProperty('view-transition-name')
  );
}

addEventListener('pageswap', ({ activation, viewTransition }) => {
  if (!viewTransition) return;
  if (reducePageMotion.matches) {
    viewTransition.skipTransition();
    return;
  }
  matchProjectArt(viewTransition, projectAt(activation?.entry) || projectAt(activation?.from), 'finished');
});

addEventListener('pagereveal', ({ viewTransition }) => {
  if (!viewTransition) return;
  if (reducePageMotion.matches) {
    viewTransition.skipTransition();
    return;
  }
  const activation = window.navigation?.activation;
  if (activation?.navigationType === 'traverse' || (projectAt(activation?.from) && !projectAt(activation?.entry))) {
    viewTransition.types?.add('returning');
  }
  matchProjectArt(viewTransition, projectAt(activation?.entry) || projectAt(activation?.from), 'ready');
});
