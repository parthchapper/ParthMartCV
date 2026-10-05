// Parth Mart store page: the rolling highlights, the shelves, the walking shopper and the pre-orders.
import { sound, bounce, esc, escTitle } from './cart.js';
import { pixelSVG, iconSVG, SHOPPER, ICONS, UI } from './sprites.js';
import {
  $, $$, safe, reducedMotion, site, isDraft, aisleOf, link,
  loadData, showLoadError, prepare, paintToolIcons, bindTopbar, syncCart, watchBaskets,
  priceTagHTML, addButtonHTML, openLabel, bindLabel, openLinkedLabel, bindClicks, preflight,
} from './site.js';

const narrowScreen = matchMedia('(max-width: 699px)');
const VIEW_KEY = 'parthmart.view';
const TICKER_KEY = 'parthmart.ticker';

// Walking rules from the build plan: click to label stays under 0.6 s, a second click skips the walk.
const WALK_MAX_MS = 480; // plus frame scheduling
const WALK_MIN_MS = 180;
const WALK_SPEED = 1.5; // pixels per millisecond
const SCROLL_MAX_MS = 500;
const TICKER_SPEED = 40; // pixels per second

const els = {
  floor: $('#floor'),
  walkway: $('.walkway'),
  aisles: $('#aisles'),
  shopper: $('#shopper'),
  doors: $('#doors'),
  endcap: $('#endcapSlot'),
  highlights: $('#highlights'),
  track: $('#tickerTrack'),
  tickerToggle: $('#tickerToggle'),
  preorderGrid: $('#preorderGrid'),
  tillsText: $('#tillsText'),
  view: $('#viewToggle'),
};

const state = {
  shopper: { x: 0, y: 0, face: 'down', at: { kind: 'door' } },
  poseKey: null,
  frames: new Map(),
  walk: null,
};

const listView = () => document.body.classList.contains('list-view');
const walkingAllowed = () => !reducedMotion.matches && !narrowScreen.matches && !listView();

init();

async function init() {
  paintToolIcons();
  paintShopper();
  setView(safe(() => localStorage.getItem(VIEW_KEY)) === 'list', { save: false });
  setTicker(safe(() => localStorage.getItem(TICKER_KEY)) === 'paused');
  bindTopbar();
  bindLabel();
  bindClicks({ open: openProduct, express: expressCheckout });
  $('#startShopping').addEventListener('click', () => site.data && startShopping());
  els.view.addEventListener('click', () => setView(!listView()));
  els.tickerToggle.addEventListener('click', () => setTicker(!els.highlights.classList.contains('is-paused'), { save: true }));
  narrowScreen.addEventListener('change', () => placeShopper(state.shopper.at));

  try {
    prepare(await loadData());
  } catch (error) {
    showLoadError(els.aisles, error);
    return;
  }
  site.hooks.onNext = (id) => placeShopper({ kind: 'product', id });
  site.hooks.onSync = updateTills;

  renderHighlights();
  renderVideoLink();
  renderEndcap();
  renderAisles();
  renderPreorders();
  watchBaskets();
  syncCart();

  placeShopper({ kind: 'door' });
  document.fonts?.ready.then(() => placeShopper(state.shopper.at));
  new ResizeObserver(() => placeShopper(state.shopper.at)).observe(els.floor);
  preflight();
  openLinkedLabel();
}

// Rolling highlights -----------------------------------------------------------

function highlightItems(copy) {
  return (site.data.achievements || [])
    .map((a) => {
      const url = 'proof' in a ? link(a.proof) : '';
      return `
        <li class="hl">
          <span class="hl-icon" aria-hidden="true">${pixelSVG(ICONS[a.icon] ?? ICONS.star, { scale: 3 })}</span>
          <div class="hl-body">
            <p class="hl-value">${esc(a.value)}</p>
            <p class="hl-text">${esc(a.text)}</p>
            ${url ? `<a class="hl-proof" href="${esc(url)}" target="_blank" rel="noopener"${copy ? ' tabindex="-1"' : ''}>See proof<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
          </div>
        </li>`;
    })
    .join('');
}

function renderHighlights() {
  const list = site.data.achievements || [];
  els.highlights.hidden = !list.length;
  if (!list.length) return;
  // Two identical lists side by side, so the strip can loop without a gap.
  els.track.innerHTML =
    `<ul class="ticker-list" role="list">${highlightItems(false)}</ul>` +
    `<ul class="ticker-list ticker-copy" aria-hidden="true">${highlightItems(true)}</ul>`;
  requestAnimationFrame(() => {
    const width = $('.ticker-list', els.track).getBoundingClientRect().width;
    els.track.style.setProperty('--ticker-time', `${Math.max(16, Math.round(width / TICKER_SPEED))}s`);
  });
}

function setTicker(paused, { save = false } = {}) {
  els.highlights.classList.toggle('is-paused', paused);
  els.tickerToggle.setAttribute('aria-pressed', String(paused));
  els.tickerToggle.innerHTML = `${iconSVG(paused ? UI.play : UI.pause, { scale: 2 })}<span class="sr-only">Pause the rolling highlights</span>`;
  if (save) safe(() => localStorage.setItem(TICKER_KEY, paused ? 'paused' : 'playing'));
}

// The short video HAA asks for: shown under the hero buttons once "video" is filled in the links block.
function renderVideoLink() {
  const url = link('video');
  const el = $('#videoLink');
  if (!url || !el) return;
  el.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener">Watch my short video intro<span class="sr-only"> (opens in a new tab)</span></a>`;
  el.hidden = false;
}

// Shelves ----------------------------------------------------------------------

function productHTML(p, aisle, where = 'shelf') {
  const uid = `${where}-${p.id}`;
  const featured = p.id === site.data.featured && where === 'shelf';
  const h = p.headline || {};
  const headline = h.value
    ? `<strong class="pack-num">${esc(h.value)}</strong> <span class="pack-numlabel">${esc(h.label || '')}</span>`
    : h.text
      ? `<span class="pack-fact">${esc(h.text)}</span>`
      : isDraft() ? '<span class="todo">Add a headline number</span>' : '';
  return `
    <li class="product${featured ? ' is-featured' : ''}" data-product="${esc(p.id)}" style="--aisle:${esc(aisle.color)}">
      <article class="pack" aria-labelledby="name-${esc(uid)}">
        <span class="pack-band" aria-hidden="true">${pixelSVG(ICONS[aisle.icon] ?? ICONS.rocket, { scale: 2 })}<span>${esc(aisle.name)}</span></span>
        ${featured ? '<span class="pack-sticker" aria-hidden="true">Featured</span>' : ''}
        <span class="pack-art" aria-hidden="true">${pixelSVG(ICONS[p.icon] ?? ICONS.satellite, { scale: 4 })}</span>
        <h3 class="pack-name" id="name-${esc(uid)}"><button type="button" class="pack-open" data-open="${esc(p.id)}" aria-haspopup="dialog">${escTitle(p.name)}</button></h3>
        <p class="pack-line">${esc(p.oneLine)}</p>
        ${headline ? `<p class="pack-headline">${headline}</p>` : ''}
        <span class="pack-cta" aria-hidden="true">Read the label</span>
      </article>
      <div class="shelf-edge">${priceTagHTML(p)}${addButtonHTML(p)}</div>
    </li>`;
}

function renderEndcap() {
  const p = site.byId.get(site.data.featured) || site.products[0];
  if (!p) return;
  els.endcap.innerHTML = `<ul class="endcap-list" role="list">${productHTML(p, aisleOf(p), 'endcap')}</ul>`;
}

function renderAisles() {
  const aisles = site.aisles
    .map((aisle) => {
      const items = site.products.filter((p) => p.aisle === aisle.id);
      if (!items.length) return '';
      return `
        <section class="aisle" id="aisle-${esc(aisle.id)}" style="--aisle:${esc(aisle.color)}" aria-labelledby="aisle-title-${esc(aisle.id)}">
          <div class="aisle-head">
            <h2 class="aisle-sign" id="aisle-title-${esc(aisle.id)}">
              <span class="aisle-num" aria-hidden="true">${aisle.num}</span>
              <span class="aisle-icon" aria-hidden="true">${pixelSVG(ICONS[aisle.icon] ?? ICONS.rocket, { scale: 2 })}</span>
              <span><span class="sr-only">Aisle ${aisle.num}: </span>${esc(aisle.name)}</span>
            </h2>
          </div>
          <div class="shelf">
            <ul class="shelf-row" role="list">${items.map((p) => productHTML(p, aisle)).join('')}</ul>
          </div>
          <div class="aisle-floor" aria-hidden="true"></div>
        </section>`;
    })
    .join('');
  els.aisles.innerHTML = `
    <p class="floor-intro"><span class="tag-shape" aria-hidden="true"></span>Prices on these shelves are the hours I spent, rounded.</p>
    <div class="aisle-grid">${aisles}</div>`;
}

// Pre-order now -------------------------------------------------------------------

function renderPreorders() {
  const list = site.data.preorders || [];
  els.preorderGrid.hidden = !list.length;
  els.preorderGrid.innerHTML = list
    .map((n) => {
      const url = link(n.link);
      return `
        <li class="po-card">
          <p class="po-tape">${esc(n.ships ? `Ships ${n.ships}` : 'Coming soon')}</p>
          <span class="po-art" aria-hidden="true">${pixelSVG(ICONS[n.icon] ?? ICONS.rocket, { scale: 4 })}</span>
          <h3 class="po-title">${escTitle(n.item)}</h3>
          ${n.note ? `<p class="po-text">${esc(n.note)}</p>` : ''}
          <div class="po-actions">
            ${n.id ? `<button type="button" class="add po-add" data-preorder="${esc(n.id)}" aria-pressed="false"><span class="add-icon" aria-hidden="true"></span><span class="add-text">Pre-order</span><span class="sr-only">: ${esc(n.item)}</span></button>` : ''}
            ${url ? `<a class="po-link" href="${esc(url)}" target="_blank" rel="noopener">Follow along<span class="sr-only">: ${esc(n.item)} (opens in a new tab)</span></a>` : ''}
          </div>
        </li>`;
    })
    .join('');
}

function updateTills() {
  if (!els.tillsText) return;
  const { count, total } = site.cart;
  const pre = site.preorders.count;
  els.tillsText.textContent = `${count} of ${total} products in your basket${pre ? `, plus ${pre} pre-order${pre === 1 ? '' : 's'}` : ''}.`;
}

// Opening products: the shopper walks there first ---------------------------------

async function openProduct(id, opener) {
  sound.unlock();
  const walk = Boolean(opener?.closest('.aisles'));
  if (state.walk) {
    if (state.walk.target === id) { state.walk.finish(); return; } // second click on the same product skips the walk
    state.walk.cancel();
  }
  if ($('#labelDialog').open) return;
  if (walk) {
    const li = opener.closest('.product');
    li?.classList.add('is-picked');
    const arrived = await walkTo({ kind: 'product', id });
    li?.classList.remove('is-picked');
    if (!arrived) return;
  } else if (site.byId.has(id)) {
    placeShopper({ kind: 'product', id });
  }
  openLabel(id, opener);
}

// The shopper -----------------------------------------------------------------------

function paintShopper() {
  const frames = Object.entries(SHOPPER).flatMap(([dir, list]) =>
    list.map((rows, i) => pixelSVG(rows, { scale: 3, className: `sf sf-${dir}-${i}` }))
  );
  els.shopper.innerHTML = `<span class="shopper-shadow"></span>${frames.join('')}`;
  $$('.sf', els.shopper).forEach((svg) => {
    const key = [...svg.classList].find((c) => c.startsWith('sf-')).slice(3);
    state.frames.set(key, svg);
  });
}

function setShopper(x, y, face = state.shopper.face, frame = 0) {
  state.shopper.x = x;
  state.shopper.y = y;
  state.shopper.face = face;
  els.shopper.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  const dir = face === 'left' || face === 'right' ? 'side' : face;
  const key = `${dir}-${frame}`;
  if (key !== state.poseKey) {
    state.frames.get(state.poseKey)?.classList.remove('on');
    state.frames.get(key)?.classList.add('on');
    state.poseKey = key;
  }
  els.shopper.classList.toggle('facing-left', face === 'left');
}

function walkwayX(floorRect) {
  const r = els.walkway.getBoundingClientRect();
  return r.left - floorRect.left + r.width / 2;
}

// Where the shopper stands, in floor coordinates (feet position).
function standPoint(at) {
  const f = els.floor.getBoundingClientRect();
  if (at.kind === 'product') {
    const li = $(`.aisles .product[data-product="${CSS.escape(at.id)}"]`);
    const strip = li?.closest('.aisle')?.querySelector('.aisle-floor');
    if (li && strip) {
      const r = li.getBoundingClientRect();
      const s = strip.getBoundingClientRect();
      // Aisles in one row stretch to the same height, so their floor strips line up.
      return { x: r.left + r.width / 2 - f.left, y: s.bottom - 18 - f.top, face: 'up' };
    }
  }
  const d = els.doors.getBoundingClientRect();
  return { x: walkwayX(f), y: d.bottom - f.top + 84, face: 'down' };
}

function placeShopper(at) {
  if (!site.data) return;
  state.shopper.at = at;
  const p = standPoint(at);
  setShopper(p.x, p.y, p.face, 0);
}

// Walk along the main walkway, then into the aisle. Resolves true on arrival, false if cancelled.
function walkTo(at) {
  state.walk?.cancel();
  const to = standPoint(at);
  state.shopper.at = at;
  const x = walkwayX(els.floor.getBoundingClientRect());
  const from = { x: state.shopper.x, y: state.shopper.y };
  const raw = Math.abs(from.y - to.y) < 6 ? [from, to] : [from, { x, y: from.y }, { x, y: to.y }, to];
  const pts = raw.filter((pt, i) => i === 0 || Math.hypot(pt.x - raw[i - 1].x, pt.y - raw[i - 1].y) > 1);
  const segs = pts.slice(1).map((b, i) => ({ a: pts[i], b, len: Math.hypot(b.x - pts[i].x, b.y - pts[i].y) }));
  const total = segs.reduce((sum, s) => sum + s.len, 0);

  if (!walkingAllowed() || total < 2) {
    setShopper(to.x, to.y, to.face, 0);
    return Promise.resolve(true);
  }

  const duration = Math.min(WALK_MAX_MS, Math.max(WALK_MIN_MS, total / WALK_SPEED));
  els.shopper.classList.add('is-walking');
  return new Promise((resolve) => {
    const start = performance.now();
    const end = (arrived) => {
      cancelAnimationFrame(state.walk?.raf);
      state.walk = null;
      els.shopper.classList.remove('is-walking');
      if (arrived) setShopper(to.x, to.y, to.face, 0);
      resolve(arrived);
    };
    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed >= duration) { end(true); return; }
      let d = (elapsed / duration) * total;
      let seg = segs[segs.length - 1];
      for (const s of segs) {
        if (d <= s.len) { seg = s; break; }
        d -= s.len;
      }
      const k = seg.len ? Math.min(1, d / seg.len) : 1;
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      setShopper(seg.a.x + dx * k, seg.a.y + dy * k, face, 1 + (Math.floor(elapsed / 110) % 2));
      if (state.walk) state.walk.raf = requestAnimationFrame(tick);
    };
    state.walk = { target: at.id ?? at.kind, raf: requestAnimationFrame(tick), finish: () => end(true), cancel: () => end(false) };
  });
}

function openDoors() {
  if (reducedMotion.matches) return;
  els.doors.classList.add('is-open');
  setTimeout(() => els.doors.classList.remove('is-open'), 900);
}

// Scrolling, capped so no motion runs longer than the plan allows.
function scrollToElement(el, gap = 12) {
  const bar = $('.topbar').getBoundingClientRect().height;
  const target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - bar - gap);
  const startY = window.scrollY;
  const dy = target - startY;
  if (Math.abs(dy) < 2) return Promise.resolve();
  if (reducedMotion.matches) {
    window.scrollTo(0, target);
    return Promise.resolve();
  }
  const duration = Math.min(SCROLL_MAX_MS, 180 + Math.abs(dy) * 0.12);
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, startY + dy * (1 - (1 - t) ** 3));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

// Store actions ------------------------------------------------------------------------

async function startShopping() {
  sound.unlock();
  const first = site.products[0];
  openDoors();
  const scrolling = scrollToElement(els.aisles);
  if (first) walkTo({ kind: 'product', id: first.id });
  await scrolling;
  $('.aisles .pack-open')?.focus({ preventScroll: true });
}

// Express checkout: everything goes in the basket, then straight to the receipt page.
function expressCheckout() {
  sound.unlock();
  state.walk?.finish();
  site.cart.addAll();
  safe(() => sessionStorage.setItem('parthmart.express', '1'));
  bounce($('#cartCount'));
  const go = () => { location.href = 'checkout.html'; };
  if (sound.on && !reducedMotion.matches) {
    sound.chime();
    setTimeout(go, 320); // long enough to hear the till, short enough to stay snappy
  } else {
    go();
  }
}

function setView(list, { save = true } = {}) {
  document.body.classList.toggle('list-view', list);
  els.view.setAttribute('aria-pressed', String(list));
  if (save) safe(() => localStorage.setItem(VIEW_KEY, list ? 'list' : 'store'));
  requestAnimationFrame(() => placeShopper(state.shopper.at));
}
