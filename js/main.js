/* =========================================================
   NEXUS MEDIA — Interacciones y animaciones
   ========================================================= */
(() => {
  'use strict';

  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- Preloader ---------- */
  const loader = $('.loader');
  const loaderCount = $('[data-loader-count]');

  function finishLoading() {
    body.classList.remove('is-loading');
    body.classList.add('loaded');
    setTimeout(() => loader && loader.remove(), 1400);
  }

  if (loader && !reduceMotion) {
    const duration = 1100;
    const hold = 180;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const p = easeOut(clamp(elapsed / duration));
      loaderCount.textContent = String(Math.round(p * 100)).padStart(3, '0');
      loader.style.setProperty('--p', p);
      if (elapsed < duration + hold) requestAnimationFrame(tick);
      else finishLoading();
    };
    requestAnimationFrame(tick);
  } else {
    finishLoading();
  }

  /* ---------- Separar texto en palabras / letras ---------- */
  // Recorre los nodos conservando los elementos internos (<span>, <em>…).
  function splitText(el, makeNode, byChar = false) {
    let index = 0;
    const walk = (node, inEm) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          const parts = byChar ? [...child.textContent] : child.textContent.split(/(\s+)/);
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            frag.appendChild(makeNode(part, index++, inEm));
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child, inEm || child.tagName === 'EM');
        }
      });
    };
    walk(el, false);
    return index;
  }

  // Títulos que aparecen palabra por palabra
  $$('[data-split]').forEach((el) => {
    splitText(el, (word, i) => {
      const outer = document.createElement('span');
      const inner = document.createElement('span');
      outer.className = 'sw';
      inner.className = 'sw__i';
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      return outer;
    });
  });

  // Texto de "Nosotros" que se ilumina con el scroll
  const wordsEl = $('[data-words]');
  let words = [];
  if (wordsEl) {
    splitText(wordsEl, (word, i, inEm) => {
      const span = document.createElement('span');
      span.className = inEm ? 'w hl' : 'w';
      span.textContent = word;
      return span;
    });
    words = $$('.w', wordsEl);
  }

  // Marca gigante del footer, letra por letra
  $$('[data-letters]').forEach((el) => {
    splitText(el, (ch, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.style.setProperty('--i', i);
      span.textContent = ch;
      return span;
    }, true);
  });

  /* ---------- Infinitos de fondo ---------- */
  // Mismo infinito en el hero y en cada sección; cada uno arranca desfasado
  // para que las estelas no corran al unísono. Las partículas (SMIL) se adelantan
  // lo justo para ir en la punta de su estela: la lima 22% y la pequeña 58%
  // (media vuelta + su estela de 8%), igual que los stroke-dasharray del CSS.
  const LOOP_SECONDS = 7;
  const INFINITY_PATH = 'M100 50C124 20 176 16 180 50C176 84 124 80 100 50C76 20 24 16 20 50C24 84 76 80 100 50Z';
  const infinityEls = $$('[data-infinity]');

  infinityEls.forEach((el, index) => {
    const id = `infinity-path-${index}`;
    const phase = (index * 1.9) % LOOP_SECONDS;
    const lead = (fraction) => `-${((phase + fraction * LOOP_SECONDS) % LOOP_SECONDS).toFixed(2)}s`;
    const scaled = (s) => `translate(100 50) scale(${s}) translate(-100 -50)`;

    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--phase', `${phase.toFixed(2)}s`);
    el.innerHTML = `
      <svg class="bg-infinity__svg" viewBox="0 0 200 100">
        <defs><path id="${id}" d="${INFINITY_PATH}"/></defs>
        <g class="bg-infinity__guides">
          <line x1="-20" y1="50" x2="220" y2="50"/>
          <use href="#${id}" class="bg-infinity__guide--dash" transform="${scaled(1.22)}"/>
          <use href="#${id}" transform="${scaled(0.8)}"/>
          <use href="#${id}" transform="${scaled(0.6)}"/>
        </g>
        <path class="bg-infinity__base" pathLength="100" d="${INFINITY_PATH}"/>
        <path class="bg-infinity__trail bg-infinity__trail--glow" pathLength="100" d="${INFINITY_PATH}"/>
        <path class="bg-infinity__trail bg-infinity__trail--accent" pathLength="100" d="${INFINITY_PATH}"/>
        <path class="bg-infinity__trail bg-infinity__trail--line" pathLength="100" d="${INFINITY_PATH}"/>
        <circle class="bg-infinity__particle" r="1.8">
          <animateMotion dur="${LOOP_SECONDS}s" begin="${lead(0.22)}" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion>
        </circle>
        <circle class="bg-infinity__particle bg-infinity__particle--small" r="1.1">
          <animateMotion dur="${LOOP_SECONDS}s" begin="${lead(0.58)}" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion>
        </circle>
        <circle class="bg-infinity__center" cx="100" cy="50" r="2"/>
      </svg>`;

    if (reduceMotion) el.querySelector('svg').pauseAnimations();
    if (!el.classList.contains('bg-infinity--hero')) el.parentElement.classList.add('has-infinity');
  });

  if ('IntersectionObserver' in window) {
    const infinityIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const svg = el.querySelector('svg');
        el.classList.toggle('is-paused', !entry.isIntersecting);
        if (!reduceMotion) {
          if (entry.isIntersecting) svg.unpauseAnimations();
          else svg.pauseAnimations();
        }
        // El del hero entra con el preloader (.loaded); el resto al aparecer en pantalla
        if (entry.isIntersecting && !el.classList.contains('bg-infinity--hero')) el.classList.add('is-in');
      });
    }, { rootMargin: '120px 0px' });
    infinityEls.forEach((el) => infinityIO.observe(el));
  } else {
    infinityEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Escalonado de hijos ---------- */
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (!child.style.getPropertyValue('--d')) child.style.setProperty('--d', `${i * 0.1}s`);
    });
  });

  /* ---------- Reveal al entrar en pantalla ---------- */
  const revealEls = $$('[data-reveal], [data-split], [data-letters]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Contadores ---------- */
  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const p = clamp((now - start) / duration);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      countIO.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Palabras rotativas del hero ---------- */
  const rotator = $('[data-rotator]');
  if (rotator && !reduceMotion) {
    const items = [...rotator.children];
    let current = 0;
    setInterval(() => {
      const prev = items[current];
      current = (current + 1) % items.length;
      const next = items[current];
      prev.classList.remove('is-active');
      prev.classList.add('is-out');
      next.classList.add('is-active');
      // Devuelve la palabra saliente abajo sin animación para el siguiente ciclo
      setTimeout(() => {
        prev.style.transition = 'none';
        prev.classList.remove('is-out');
        void prev.offsetWidth;
        prev.style.transition = '';
      }, 950);
    }, 2600);
  }

  /* ---------- Header, menú y navegación activa ---------- */
  const header = $('.header');
  const burger = $('.burger');
  const mobileMenu = $('#mobile-menu');
  let menuOpen = false;

  function toggleMenu(force) {
    menuOpen = typeof force === 'boolean' ? force : !menuOpen;
    body.classList.toggle('menu-open', menuOpen);
    burger.setAttribute('aria-expanded', String(menuOpen));
    burger.setAttribute('aria-label', menuOpen ? 'Cerrar menú' : 'Abrir menú');
    mobileMenu.inert = !menuOpen;
  }

  burger.addEventListener('click', () => toggleMenu());
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });
  window.addEventListener('resize', () => { if (menuOpen && window.innerWidth > 960) toggleMenu(false); });

  const navLinks = $$('.nav__links a');
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => navIO.observe(s));

  /* ---------- Bucle de scroll ---------- */
  const progressBar = $('.progress');
  const parallaxEls = $$('[data-parallax]');
  const expandEls = $$('[data-expand]');
  const scrollXEls = $$('[data-scroll-x]');
  const steps = $('.process__steps');
  const stepEls = $$('.step');
  const processLine = $('.process__line');

  let lastY = window.scrollY;
  let ticking = false;
  let litWords = -1;

  function updateWords(vh) {
    if (!words.length) return;
    const r = wordsEl.getBoundingClientRect();
    const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25));
    const count = Math.round(p * words.length);
    if (count === litWords) return;
    litWords = count;
    words.forEach((w, i) => w.classList.toggle('on', i < count));
  }

  function updateProcess(vh) {
    if (!steps) return;
    const r = steps.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    const vertical = window.innerWidth <= 960;
    const lr = processLine.getBoundingClientRect();
    const p = vertical
      ? clamp((vh * 0.6 - lr.top) / lr.height)
      : clamp((vh * 0.85 - r.top) / (vh * 0.5));
    steps.style.setProperty('--progress', p.toFixed(4));
    stepEls.forEach((step) => {
      const d = step.querySelector('.step__dot').getBoundingClientRect();
      const pos = vertical
        ? (d.top + d.height / 2 - lr.top) / lr.height
        : (d.left + d.width / 2 - lr.left) / lr.width;
      step.classList.toggle('is-active', p >= pos - 0.01);
    });
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    header.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) header.classList.toggle('is-hidden', y > lastY && y > 500);
    lastY = y;

    const max = doc.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    updateWords(vh);
    updateProcess(vh);

    if (reduceMotion) return;

    parallaxEls.forEach((el) => {
      if (y > vh * 1.2) return;
      el.style.translate = `0 ${(y * Number(el.dataset.parallax)).toFixed(1)}px`;
    });

    expandEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      const p = easeOut(clamp((vh - r.top) / (vh * 0.7)));
      el.style.setProperty('--inset', `${((1 - p) * (vw < 700 ? 3 : 6)).toFixed(2)}%`);
      el.style.setProperty('--round', `${((1 - p) * 56).toFixed(1)}px`);
    });

    scrollXEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      const p = clamp((vh - r.top) / (vh + r.height));
      const from = Number(el.dataset.from);
      const to = Number(el.dataset.to);
      el.style.transform = `translate3d(${(from + (to - from) * p).toFixed(2)}%, 0, 0)`;
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();

  /* ---------- Cursor personalizado ---------- */
  if (finePointer && !reduceMotion) {
    const cursor = $('.cursor');
    const dot = $('.cursor-dot');
    let mx = -100, my = -100, cx = -100, cy = -100;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      body.classList.add('has-cursor');
    });
    document.addEventListener('mouseleave', () => body.classList.remove('has-cursor'));
    window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));

    const follow = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(follow);
    };
    follow();

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('a, button, .chip, .card, input, textarea');
      cursor.classList.toggle('is-hover', Boolean(target));
    });
  }

  /* ---------- Botones magnéticos y tarjetas ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach((el) => {
      const strength = Number(el.dataset.magnetic) || 0.3;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    $$('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--x', `${e.clientX - r.left}px`);
        card.style.setProperty('--y', `${e.clientY - r.top}px`);
      });
    });

    // Cada infinito de fondo se desplaza levemente hacia el puntero dentro de su sección
    infinityEls.forEach((infinity) => {
      const area = infinity.closest('section, footer');
      if (!area) return;
      area.addEventListener('pointermove', (e) => {
        const r = area.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        infinity.style.setProperty('--mx', `${(x * 40).toFixed(1)}px`);
        infinity.style.setProperty('--my', `${(y * 40).toFixed(1)}px`);
      });
      area.addEventListener('pointerleave', () => {
        infinity.style.removeProperty('--mx');
        infinity.style.removeProperty('--my');
      });
    });

    // Parallax del visor del dron siguiendo el puntero
    const viewfinder = $('.viewfinder');
    if (viewfinder) {
      const layers = $$('[data-depth]', viewfinder);
      viewfinder.addEventListener('pointermove', (e) => {
        const r = viewfinder.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach((l) => {
          const d = Number(l.dataset.depth);
          l.style.transform = `translate3d(${x * d}px, ${y * d}px, 0)`;
        });
      });
      viewfinder.addEventListener('pointerleave', () => layers.forEach((l) => { l.style.transform = ''; }));
    }
  }

  /* ---------- HUD del dron ---------- */
  const timerEl = $('[data-timer]');
  const altEl = $('[data-alt]');
  if (timerEl && altEl) {
    const pad = (n) => String(n).padStart(2, '0');
    let secs = 0;
    setInterval(() => {
      secs += 1;
      timerEl.textContent = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`;
      altEl.textContent = 118 + Math.round(Math.random() * 6);
    }, 1000);
  }

  /* ---------- Formulario ---------- */
  const form = $('#contact-form');
  if (form) {
    const required = $$('[required]', form);
    const submitBtn = $('[type="submit"]', form);
    const submitLabel = $('.btn__label', submitBtn);

    const validate = (input) => {
      const ok = input.value.trim() !== '' && input.checkValidity();
      const field = input.closest('.field');
      field.classList.remove('is-invalid');
      if (!ok) {
        void field.offsetWidth; // reinicia la animación de "shake"
        field.classList.add('is-invalid');
      }
      return ok;
    };

    required.forEach((input) => {
      input.addEventListener('input', () => input.closest('.field').classList.remove('is-invalid'));
    });

    const alertBox = $('.form__alert', form);
    const mailtoLink = $('[data-form-mailto]', form);
    const DESTINO = 'nexusmediamxrb26@gmail.com';
    // FormSubmit entrega el correo; /ajax/ responde JSON para no salir de la página
    const endpoint = form.getAttribute('action').replace('formsubmit.co/', 'formsubmit.co/ajax/');

    const servicios = () => $$('[name="servicios"]:checked', form).map((el) => el.value);

    // Respaldo: si el envío falla, el enlace abre el correo ya redactado
    const buildMailto = () => {
      const val = (name) => (form.elements[name] ? form.elements[name].value.trim() : '');
      const elegidos = servicios();
      const cuerpo = [
        `Nombre: ${val('nombre')}`,
        `Email: ${val('email')}`,
        `Teléfono: ${val('telefono') || '—'}`,
        `Empresa: ${val('empresa') || '—'}`,
        `Servicios de interés: ${elegidos.length ? elegidos.join(', ') : '—'}`,
        '',
        val('mensaje')
      ].join('\n');
      mailtoLink.href = `mailto:${DESTINO}?subject=${encodeURIComponent('Contacto desde la web de Nexus Media')}&body=${encodeURIComponent(cuerpo)}`;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = required.filter((input) => !validate(input));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      alertBox.hidden = true;
      submitBtn.disabled = true;
      submitLabel.textContent = 'Enviando…';

      const data = new FormData(form);
      const elegidos = servicios();
      data.delete('servicios');
      data.set('Servicios de interés', elegidos.length ? elegidos.join(', ') : 'Sin especificar');

      fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
        .then((res) => res.json().catch(() => ({})).then((json) => ({ status: res.status, json })))
        .then(({ status, json }) => {
          // FormSubmit responde 200 con success:"false" cuando descarta el envío
          // (correo sin activar). Solo es éxito si lo confirma en el JSON.
          if (String(json.success) !== 'true') {
            throw new Error(json.message || `Respuesta inesperada (${status})`);
          }
          form.classList.add('is-sent');
          form.reset();
        })
        .catch((err) => {
          console.warn('[Nexus] No se pudo enviar el formulario:', err.message);
          buildMailto();
          alertBox.hidden = false;
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitLabel.textContent = 'Enviar mensaje';
        });
    });

    $('[data-form-reset]', form).addEventListener('click', () => {
      form.classList.remove('is-sent');
      alertBox.hidden = true;
      $('input', form).focus();
    });
  }

  /* ---------- Año del footer ---------- */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
