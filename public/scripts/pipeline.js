(function () {
  const stns = Array.from(document.querySelectorAll('#stns .stn'));
  const fill = document.getElementById('trackFill');
  const graph = document.querySelector('[data-build-graph]');
  const rstage = document.getElementById('rstage');
  const rmsg = document.getElementById('rmsg');
  const rmeta = document.getElementById('rmeta');

  if (!stns.length || !fill || !graph || !rstage || !rmsg || !rmeta) {
    return;
  }

  const steps = [
    {
      stage: 'ticket',
      msg: 'Work item picked up from the tracker',
      meta: 'durable run / started',
    },
    {
      stage: 'scope',
      msg: 'Scope recorded as a structured brief',
      meta: 'checkpoint / saved',
    },
    {
      stage: 'plan',
      msg: 'Planning agent returned a typed plan',
      meta: 'gate / human approval',
    },
    {
      stage: 'implement',
      msg: 'Implementation agent running in an isolated sandbox',
      meta: 'Drukbox / active',
    },
    {
      stage: 'review',
      msg: 'Review agent returned findings for the implementation',
      meta: 'gate / review',
    },
    {
      stage: 'pull request',
      msg: 'Pull request opened, ready for merge',
      meta: 'GitHub / open',
    },
  ];

  const count = stns.length;
  let activeIndex = 0;
  let timerId = null;
  let isInView = false;

  function render() {
    stns.forEach((station, index) => {
      station.classList.toggle('done', index < activeIndex);
      station.classList.toggle('active', index === activeIndex && index < count - 1);
      station.classList.toggle('merged', index === activeIndex && index === count - 1);

      if (index === activeIndex) {
        station.setAttribute('aria-current', 'step');
      } else {
        station.removeAttribute('aria-current');
      }
    });

    const progress = activeIndex <= 0 ? 0 : activeIndex / (count - 1);
    fill.style.strokeDashoffset = String(100 - progress * 100);
    graph.style.setProperty('--graph-progress', String(progress));
    graph.dataset.activeLayer = activeIndex >= 2 && activeIndex <= 4 ? 'agent' : 'runtime';

    const step = steps[activeIndex];
    rstage.textContent = step.stage;
    rmsg.textContent = step.msg;
    rmeta.textContent = step.meta;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    activeIndex = count - 1;
    render();
    return;
  }

  const stepDuration = 1700;
  const resetPause = 2200;

  function clearTimer() {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function canRun() {
    return isInView && !document.hidden;
  }

  function schedule(delay = stepDuration) {
    clearTimer();

    if (!canRun()) {
      return;
    }

    timerId = window.setTimeout(advance, delay);
  }

  function advance() {
    if (activeIndex >= count - 1) {
      timerId = window.setTimeout(() => {
        if (!canRun()) {
          timerId = null;
          return;
        }

        activeIndex = 0;
        render();
        schedule();
      }, resetPause);
      return;
    }

    activeIndex += 1;
    render();
    schedule();
  }

  render();

  if (!('IntersectionObserver' in window)) {
    isInView = true;
    schedule(700);
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      const nextInView = entry.isIntersecting && entry.intersectionRatio >= 0.16;

      if (nextInView === isInView) {
        return;
      }

      isInView = nextInView;

      if (isInView) {
        schedule(650);
      } else {
        clearTimer();
      }
    },
    { threshold: [0, 0.16, 0.5] },
  );

  observer.observe(graph);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimer();
    } else if (isInView) {
      schedule(650);
    }
  });
})();
