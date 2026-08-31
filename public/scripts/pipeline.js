(function () {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  function initStormCanvas() {
    const canvas = document.querySelector('[data-storm-canvas]');
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      return;
    }

    const hero = document.querySelector('.hero');
    const dragon = new Image();
    const panorama = new Image();
    let dragonLayer = null;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frameId = null;
    let lastFrame = 0;
    let scrollTarget = 0;
    let scrollPosition = 0;
    let pageScrollTarget = 0;
    let pageScrollPosition = 0;
    let imagesReady = false;

    dragon.decoding = 'async';
    panorama.decoding = 'async';

    function load(image, src) {
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', reject, { once: true });
        image.src = src;
      });
    }

    function keyBlack(image, blackPoint, clearPoint) {
      const layer = document.createElement('canvas');
      const layerContext = layer.getContext('2d', { willReadFrequently: true });
      if (!layerContext) {
        return image;
      }

      layer.width = image.naturalWidth;
      layer.height = image.naturalHeight;
      layerContext.drawImage(image, 0, 0);

      const imageData = layerContext.getImageData(0, 0, layer.width, layer.height);
      const pixels = imageData.data;
      const range = clearPoint - blackPoint;

      for (let index = 0; index < pixels.length; index += 4) {
        const luminance =
          pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
        const opacity = Math.min(Math.max((luminance - blackPoint) / range, 0), 1);
        pixels[index + 3] = Math.round(pixels[index + 3] * opacity);
      }

      layerContext.putImageData(imageData, 0, 0);
      return layer;
    }

    function updateScrollTarget() {
      const range = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      pageScrollTarget = window.scrollY;
      scrollTarget = Math.min(Math.max(pageScrollTarget / range, 0), 1);

      if (imagesReady) {
        if (reducedMotion) {
          draw(scrollTarget, pageScrollTarget);
        } else {
          start();
        }
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      updateScrollTarget();

    }

    function drawPanorama(progress) {
      const viewportAspect = width / height;
      const imageAspect = panorama.width / panorama.height;
      let sourceWidth;
      let sourceHeight;
      let sourceX;
      let sourceY;

      if (viewportAspect >= imageAspect) {
        sourceWidth = panorama.width;
        sourceHeight = sourceWidth / viewportAspect;
        sourceX = 0;
        sourceY = (panorama.height - sourceHeight) * progress;
      } else {
        sourceHeight = panorama.height * 0.74;
        sourceWidth = sourceHeight * viewportAspect;
        const horizontalTravel = panorama.width - sourceWidth;
        const horizontalPosition = 0.5 + Math.sin(progress * Math.PI * 2) * 0.12;
        sourceX = horizontalTravel * horizontalPosition;
        sourceY = (panorama.height - sourceHeight) * progress;
      }

      context.globalAlpha = 0.64;
      context.drawImage(
        panorama,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height,
      );
    }

    function drawDragon(pageScroll) {
      if (!(hero instanceof HTMLElement)) {
        return;
      }

      const heroTop = hero.offsetTop;
      const heroHeight = hero.offsetHeight;
      const mobile = width <= 820;
      const drawHeight = mobile ? Math.min(Math.max(height * 0.65, 460), 560) : height * 1.08;
      const drawWidth = drawHeight * (dragon.width / dragon.height);
      const drawTop = mobile
        ? heroTop + heroHeight - drawHeight * 0.86
        : heroTop - height * 0.02;
      const drawLeft = mobile ? width - drawWidth + 26 : width - drawWidth * 0.96;

      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = mobile ? 0.76 : 0.9;
      context.drawImage(dragonLayer, drawLeft, drawTop - pageScroll, drawWidth, drawHeight);
      context.restore();

      const scrimProgress = Math.min(
        Math.max(pageScroll / Math.max(heroHeight * 0.78, 1), 0),
        1,
      );

      context.save();
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'destination-out';
      const cutout = context.createLinearGradient(0, 0, width, 0);
      cutout.addColorStop(0, `rgb(0 0 0 / ${0.92 * (1 - scrimProgress)})`);
      cutout.addColorStop(0.42, `rgb(0 0 0 / ${0.68 * (1 - scrimProgress)})`);
      cutout.addColorStop(0.72, `rgb(0 0 0 / ${0.12 * (1 - scrimProgress)})`);
      cutout.addColorStop(1, 'transparent');
      context.fillStyle = cutout;
      context.fillRect(0, 0, width, height);
      context.restore();
    }

    function draw(progress, pageScroll) {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      drawPanorama(progress);
      drawDragon(pageScroll);
      context.globalAlpha = 1;
    }

    function render(time) {
      frameId = null;
      if (!imagesReady || document.hidden) {
        return;
      }

      if (time - lastFrame < 1000 / 30) {
        frameId = window.requestAnimationFrame(render);
        return;
      }

      lastFrame = time;
      scrollPosition += (scrollTarget - scrollPosition) * 0.075;
      pageScrollPosition += (pageScrollTarget - pageScrollPosition) * 0.075;
      draw(scrollPosition, pageScrollPosition);

      const panoramaMoving = Math.abs(scrollTarget - scrollPosition) > 0.0001;
      const pageMoving = Math.abs(pageScrollTarget - pageScrollPosition) > 0.1;
      if (panoramaMoving || pageMoving) {
        frameId = window.requestAnimationFrame(render);
      }
    }

    function start() {
      if (reducedMotion) {
        draw(scrollTarget, pageScrollTarget);
        return;
      }
      if (frameId === null && !document.hidden) {
        frameId = window.requestAnimationFrame(render);
      }
    }

    function handleVisibilityChange() {
      if (document.hidden && frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      } else {
        start();
      }
    }

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resize();

    Promise.all([
      load(dragon, '/assets/art/hero-druk-complete-v3.webp'),
      load(panorama, '/assets/art/storm-panorama-v2.webp'),
    ])
      .then(() => {
        dragonLayer = keyBlack(dragon, 20, 68);
        imagesReady = true;
        canvas.dataset.state = 'ready';
        canvas.dataset.motion = reducedMotion ? 'static' : 'scroll-linked';
        start();
      })
      .catch(() => {
        canvas.dataset.state = 'unavailable';
      });
  }

  function observeOnce(element, callback, threshold = 0.18) {
    if (!('IntersectionObserver' in window)) {
      callback();
      return null;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio < threshold) {
          return;
        }

        observer.disconnect();
        callback();
      },
      { threshold: [0, threshold, 0.5] },
    );

    observer.observe(element);
    return observer;
  }

  function initProductConsole() {
    const consoleElement = document.querySelector('[data-product-console]');
    if (!(consoleElement instanceof HTMLElement)) {
      return;
    }

    const trigger = consoleElement.querySelector('[data-product-trigger]');
    const nudge = consoleElement.querySelector('[data-product-nudge]');
    const menu = consoleElement.querySelector('[data-product-menu]');
    const label = consoleElement.querySelector('[data-product-label]');
    const iconUse = consoleElement.querySelector('[data-product-icon-use]');
    const panelView = consoleElement.querySelector('[data-panel-view]');
    const genericView = consoleElement.querySelector('[data-generic-view]');
    const kicker = consoleElement.querySelector('[data-preview-kicker]');
    const title = consoleElement.querySelector('[data-preview-title]');
    const summary = consoleElement.querySelector('[data-preview-summary]');
    const steps = consoleElement.querySelector('[data-preview-steps]');
    const options = Array.from(consoleElement.querySelectorAll('[data-product-option]'));

    if (
      !(trigger instanceof HTMLButtonElement) ||
      !(menu instanceof HTMLElement) ||
      !(label instanceof HTMLElement) ||
      !(iconUse instanceof SVGUseElement) ||
      !(panelView instanceof HTMLElement) ||
      !(genericView instanceof HTMLElement) ||
      !(kicker instanceof HTMLElement) ||
      !(title instanceof HTMLElement) ||
      !(summary instanceof HTMLElement) ||
      !(steps instanceof HTMLElement) ||
      options.some((option) => !(option instanceof HTMLButtonElement))
    ) {
      return;
    }

    function setOpen(open) {
      trigger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    }

    function dismissNudge() {
      if (nudge instanceof HTMLElement) {
        nudge.hidden = true;
      }
    }

    function focusOption(offset) {
      const current = options.indexOf(document.activeElement);
      const fallback = options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
      const index = current === -1 ? fallback : current;
      options[(index + offset + options.length) % options.length].focus();
    }

    function selectApp(option) {
      const app = option.dataset.app;
      label.textContent = option.dataset.label ?? '';
      iconUse.setAttribute('href', `#product-icon-${option.dataset.icon ?? 'message-square'}`);

      for (const item of options) {
        const selected = item === option;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));
      }

      const panelSelected = app === 'panel';
      panelView.hidden = !panelSelected;
      genericView.hidden = panelSelected;

      if (!panelSelected) {
        kicker.textContent = option.dataset.kicker ?? '';
        title.textContent = option.dataset.title ?? '';
        summary.textContent = option.dataset.summary ?? '';
        steps.replaceChildren(
          ...(option.dataset.steps ?? '').split('|').map((value, index) => {
            const step = document.createElement('span');
            step.className = 'product-generic-step';
            step.dataset.index = String(index + 1).padStart(2, '0');
            step.textContent = value;
            return step;
          }),
        );
      }

      setOpen(false);
      trigger.focus();
    }

    trigger.addEventListener('click', () => {
      dismissNudge();
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      setOpen(open);
      if (open) {
        options.find((option) => option.getAttribute('aria-selected') === 'true')?.focus();
      }
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') {
        return;
      }
      event.preventDefault();
      dismissNudge();
      setOpen(true);
      options.find((option) => option.getAttribute('aria-selected') === 'true')?.focus();
    });

    for (const option of options) {
      option.addEventListener('click', () => selectApp(option));
      option.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          focusOption(event.key === 'ArrowDown' ? 1 : -1);
        }
      });
    }

    document.addEventListener('mousedown', (event) => {
      if (!consoleElement.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || menu.hidden) {
        return;
      }
      setOpen(false);
      trigger.focus();
    });
  }

  function initRotatingWork() {
    const rotator = document.querySelector('[data-rotator]');
    const word = document.querySelector('[data-work-word]');
    if (!rotator || !word || reducedMotion) {
      return;
    }

    const words = ['tickets', 'alerts', 'reviews', 'reports', 'inbox'];
    let index = 0;
    let timerId = null;
    let paused = false;

    function clearTimer() {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    }

    function schedule(delay = 2500) {
      clearTimer();
      if (paused || document.hidden) {
        return;
      }
      timerId = window.setTimeout(swap, delay);
    }

    function swap() {
      word.classList.add('is-swapping');
      window.setTimeout(() => {
        index = (index + 1) % words.length;
        word.textContent = words[index];
        word.classList.remove('is-swapping');
        schedule();
      }, 220);
    }

    rotator.addEventListener('pointerenter', () => {
      paused = true;
      clearTimer();
    });
    rotator.addEventListener('pointerleave', () => {
      paused = false;
      schedule(900);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimer();
      } else {
        schedule(900);
      }
    });

    schedule();
  }

  function initShipPipeline() {
    const stations = Array.from(document.querySelectorAll('#ship-stations .station'));
    const fill = document.getElementById('trackFill');
    const pulse = document.getElementById('trackPulse');
    const graph = document.querySelector('[data-ship-graph]');
    const sequence = document.getElementById('rseq');
    const stage = document.getElementById('rstage');
    const message = document.getElementById('rmsg');
    const meta = document.getElementById('rmeta');
    const readout = graph?.querySelector('.graph-readout');
    const gates = Array.from(graph?.querySelectorAll('[data-gate-index]') ?? []);
    const triggers = stations.map((station) => station.querySelector('.station-trigger'));

    if (
      !stations.length ||
      !fill ||
      !pulse ||
      !graph ||
      !sequence ||
      !stage ||
      !message ||
      !meta ||
      !readout ||
      triggers.some((trigger) => !(trigger instanceof HTMLButtonElement))
    ) {
      return;
    }

    const steps = [
      { stage: 'ticket', message: 'Work item received', meta: 'run / started' },
      { stage: 'scope', message: 'Scope saved', meta: 'checkpoint / saved' },
      { stage: 'plan', message: 'Plan ready for approval', meta: 'run / parked' },
      { stage: 'implement', message: 'Coding agent working in an isolated sandbox', meta: 'sandbox / active' },
      { stage: 'review', message: 'Independent check ready', meta: 'gate / waiting' },
      { stage: 'pull request', message: 'Pull request opened', meta: 'GitHub / human merge' },
    ];

    const count = stations.length;
    let activeIndex = 0;
    let pulseFrame = null;
    let pulseHideTimer = null;

    function setPulsePosition(progress) {
      const length = fill.getTotalLength();
      const point = fill.getPointAtLength(length * progress);
      pulse.setAttribute('cx', point.x.toFixed(2));
      pulse.setAttribute('cy', point.y.toFixed(2));
    }

    function animatePulse(from, to) {
      if (pulseFrame !== null) {
        window.cancelAnimationFrame(pulseFrame);
        pulseFrame = null;
      }
      if (pulseHideTimer !== null) {
        window.clearTimeout(pulseHideTimer);
        pulseHideTimer = null;
      }

      if (reducedMotion || from === to) {
        setPulsePosition(to);
        pulse.classList.remove('is-moving');
        return;
      }

      const startedAt = performance.now();
      const duration = 620;
      pulse.classList.add('is-moving');

      function move(now) {
        const elapsed = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - (1 - elapsed) ** 3;
        setPulsePosition(from + (to - from) * eased);

        if (elapsed < 1) {
          pulseFrame = window.requestAnimationFrame(move);
          return;
        }

        pulseFrame = null;
        pulseHideTimer = window.setTimeout(() => {
          pulse.classList.remove('is-moving');
          pulseHideTimer = null;
        }, 140);
      }

      pulseFrame = window.requestAnimationFrame(move);
    }

    function render(nextIndex, animate = true) {
      const previousProgress = activeIndex / (count - 1);
      activeIndex = nextIndex;
      const progress = activeIndex / (count - 1);

      stations.forEach((station, index) => {
        station.classList.toggle('done', index < activeIndex);
        station.classList.toggle('active', index === activeIndex && index < count - 1);
        station.classList.toggle('merged', index === activeIndex && index === count - 1);
        station.classList.toggle('next', index === activeIndex + 1);
        const trigger = triggers[index];
        trigger.setAttribute('aria-pressed', String(index === activeIndex));
        if (index === activeIndex) {
          station.setAttribute('aria-current', 'step');
        } else {
          station.removeAttribute('aria-current');
        }
      });

      gates.forEach((gate) => {
        const gateIndex = Number(gate.getAttribute('data-gate-index'));
        gate.classList.toggle('is-reached', activeIndex > gateIndex);
        gate.classList.toggle('is-active', activeIndex === gateIndex);
      });

      fill.style.strokeDashoffset = String(100 - progress * 100);
      graph.style.setProperty('--graph-progress', String(progress));
      graph.dataset.activeLayer = activeIndex >= 2 && activeIndex <= 4 ? 'agent' : 'runtime';
      graph.dataset.activeStep = String(activeIndex);

      const step = steps[activeIndex];
      sequence.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      stage.textContent = step.stage;
      message.textContent = step.message;
      meta.textContent = step.meta;
      readout.classList.remove('is-updating');
      void readout.offsetWidth;
      readout.classList.add('is-updating');

      if (animate) {
        animatePulse(previousProgress, progress);
      } else {
        setPulsePosition(progress);
      }
    }

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => render(index));
      trigger.addEventListener('keydown', (event) => {
        let nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = Math.min(index + 1, count - 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = Math.max(index - 1, 0);
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = count - 1;
        }

        if (nextIndex === null) {
          return;
        }

        event.preventDefault();
        triggers[nextIndex].focus();
        render(nextIndex);
      });
    });

    render(0, false);
  }

  function initCopyButton() {
    const copyButton = document.getElementById('copy-install');
    const installCommand = document.getElementById('install-cmd');
    if (!copyButton || !installCommand) {
      return;
    }

    let resetTimer = null;

    function showCopied() {
      copyButton.textContent = 'copied';
      copyButton.classList.add('copied');
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }
      resetTimer = window.setTimeout(() => {
        copyButton.textContent = 'copy';
        copyButton.classList.remove('copied');
      }, 1800);
    }

    copyButton.addEventListener('click', async () => {
      const command = installCommand.textContent?.trim();
      if (!command) {
        return;
      }

      try {
        await navigator.clipboard.writeText(command);
        showCopied();
      } catch {
        const selection = window.getSelection();
        if (!selection) {
          return;
        }
        const range = document.createRange();
        range.selectNodeContents(installCommand);
        selection.removeAllRanges();
        selection.addRange(range);
        if (document.execCommand('copy')) {
          selection.removeAllRanges();
          showCopied();
        }
      }
    });
  }

  function initMobileNav() {
    const menu = document.querySelector('.mobile-nav');
    if (!(menu instanceof HTMLDetailsElement)) {
      return;
    }
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => menu.removeAttribute('open'));
    });
  }

  initProductConsole();
  initStormCanvas();
  initRotatingWork();
  initShipPipeline();
  initCopyButton();
  initMobileNav();
})();
