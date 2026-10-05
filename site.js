// Shared by the store page and the checkout page:
// loading products.json, resolving links, the top bar, the label (back of pack) and the draft check.
import { Basket, sound, flyToCart, bounce, esc, escTitle, formatHours, spokenHours } from './cart.js';
import { pixelSVG, iconSVG, ICONS, UI } from './sprites.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const inFrame = safe(() => window.self !== window.top, true);

export const site = {
  data: null,
  cart: null,
  preorders: null,
  products: [],
  byId: new Map(),
  aisles: [],
  aisleById: new Map(),
  opener: null,
  openId: null,
  hooks: { onNext: null, onSync: null },
};

export const isDraft = () => Boolean(site.data?.draft);
export const aisleOf = (p) =>
  site.aisleById.get(p.aisle) ?? { id: '', name: '', color: '#2B2118', icon: 'rocket', num: 0 };

// Links ---------------------------------------------------------------------
// Every address lives in the "links" block of products.json. Anywhere else in the file,
// a link can be one of those names (like "lagrange-repo") or a direct address.
export function link(ref) {
  if (!ref) return '';
  const links = site.data?.links || {};
  if (Object.prototype.hasOwnProperty.call(links, ref)) return String(links[ref] || '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(ref) || ref.includes('/') || /\.[a-z0-9]{2,5}$/i.test(ref)) return ref;
  console.warn(`products.json: there is no link called "${ref}" in the links block.`);
  return '';
}

// Loading -------------------------------------------------------------------

export async function loadData() {
  let response;
  try {
    response = await fetch('products.json');
  } catch (error) {
    throw new Error(
      location.protocol === 'file:'
        ? 'Browsers block reading products.json straight from a file. In this folder run "python3 -m http.server", then open http://localhost:8000.'
        : `products.json could not be loaded (${error.message}).`
    );
  }
  if (!response.ok) throw new Error(`products.json could not be loaded (HTTP ${response.status}).`);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`products.json has a formatting mistake: ${error.message}. Look for a missing comma or quote near that spot.`);
  }
}

export function showLoadError(container, error) {
  if (container) container.innerHTML = `<div class="load-error" role="alert"><h2>The shelves are empty</h2><p>${esc(error.message)}</p></div>`;
  console.error(error);
}

export function prepare(data) {
  site.data = data;
  site.aisles = (data.aisles || []).map((a, i) => ({ ...a, num: i + 1 }));
  site.aisles.forEach((a) => site.aisleById.set(a.id, a));
  const all = data.products || [];
  site.products = site.aisles.flatMap((a) => all.filter((p) => p.aisle === a.id));
  const lost = all.filter((p) => !site.aisleById.has(p.aisle));
  if (lost.length) console.warn('These products name an aisle that does not exist, so they are not shown:', lost.map((p) => p.id));
  site.products.forEach((p) => site.byId.set(p.id, p));
  site.cart = new Basket(site.products, 'parthmart.cart');
  site.preorders = new Basket((data.preorders || []).filter((n) => n.id), 'parthmart.preorders');

  const badge = $('#draftBadge');
  if (badge) badge.hidden = !data.draft;
  const sign = $('#storeSign');
  if (sign && data.store?.name) sign.textContent = data.store.name;
  const built = $('#builtWith');
  if (built && data.store?.builtWith) built.textContent = data.store.builtWith;
  const repo = $('#repoLine');
  const source = link('source-code');
  if (repo) repo.innerHTML = source ? `Source code: <a href="${esc(source)}" target="_blank" rel="noopener">${esc(source.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : '';
}

// Top bar -------------------------------------------------------------------

export function paintToolIcons() {
  $$('.tool-icon[data-icon]').forEach((el) => { el.innerHTML = iconSVG(UI[el.dataset.icon], { scale: 2 }); });
}

export function syncSoundButton() {
  const btn = $('#soundToggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(sound.on));
  $('.tool-icon', btn).innerHTML = iconSVG(sound.on ? UI.soundOn : UI.soundOff, { scale: 2 });
  $('.tool-label', btn).textContent = sound.on ? 'Sound on' : 'Sound off';
}

export function bindTopbar() {
  syncSoundButton();
  $('#soundToggle')?.addEventListener('click', () => {
    sound.on = !sound.on;
    syncSoundButton();
    if (sound.on) sound.ding({ volume: 0.6 });
    announce(sound.on ? 'Sound on' : 'Sound off');
  });
}

// Cart and pre-orders ---------------------------------------------------------

export function syncCart() {
  if (!site.cart) return;
  const { count, total, full } = site.cart;
  const countEl = $('#cartCount');
  if (countEl) countEl.textContent = `${count}/${total}`;
  const cartBtn = $('#cartButton');
  if (cartBtn) {
    const here = cartBtn.getAttribute('aria-current') === 'page';
    cartBtn.setAttribute('aria-label', `Cart: ${count} of ${total} products. ${here ? 'You are at checkout' : 'Go to checkout'}`);
    cartBtn.classList.toggle('is-full', full);
  }
  $$('[data-add]').forEach((btn) => {
    const inCart = site.cart.has(btn.dataset.add);
    btn.setAttribute('aria-pressed', String(inCart));
    $('.add-text', btn).textContent = inCart ? 'In cart' : 'Add to cart';
    $('.add-icon', btn).innerHTML = iconSVG(inCart ? UI.check : UI.cart, { scale: 2 });
  });
  $$('[data-preorder]').forEach((btn) => {
    const mine = site.preorders.has(btn.dataset.preorder);
    btn.setAttribute('aria-pressed', String(mine));
    $('.add-text', btn).textContent = mine ? 'Pre-ordered' : 'Pre-order';
    $('.add-icon', btn).innerHTML = mine ? iconSVG(UI.check, { scale: 2 }) : '';
  });
  const labelCount = $('#labelCount');
  if (labelCount) labelCount.textContent = `${count} of ${total} in cart`;
  site.hooks.onSync?.();
}

export async function toggleCart(id, button) {
  sound.unlock();
  const added = site.cart.toggle(id);
  if (!added) return;
  const p = site.byId.get(id);
  const full = site.cart.full;
  if (!reducedMotion.matches) {
    const dialog = $('#labelDialog');
    await flyToCart({ from: button, to: $('#cartButton'), icon: p.icon, color: aisleOf(p).color, layer: dialog?.open ? dialog : document.body });
    bounce($('#cartCount'));
  }
  if (full) sound.chime();
  else sound.ding();
}

export function togglePreorder(id, button) {
  sound.unlock();
  const mine = site.preorders.toggle(id);
  if (!mine) return;
  if (!reducedMotion.matches) bounce(button);
  sound.ding({ pitch: 1.12 });
}

export function watchBaskets(onChange) {
  site.cart.addEventListener('change', (event) => {
    const { type, id } = event.detail;
    syncCart();
    const p = id ? site.byId.get(id) : null;
    const tally = `${site.cart.count} of ${site.cart.total} products in your cart`;
    if (type === 'add') announce(`Added ${p.name}. ${tally}.${site.cart.full ? ' Your basket is full.' : ''}`);
    if (type === 'remove') announce(`Removed ${p.name}. ${tally}.`);
    if (type === 'all') announce(`Express checkout: all ${site.cart.total} products are on your receipt.`);
    onChange?.(event.detail);
  });
  site.preorders.addEventListener('change', (event) => {
    const { type, id } = event.detail;
    syncCart();
    const n = (site.data.preorders || []).find((x) => x.id === id);
    if (n && type === 'add') announce(`Pre-ordered ${n.item}. It's on your receipt.`);
    if (n && type === 'remove') announce(`Pre-order cancelled: ${n.item}.`);
    onChange?.(event.detail);
  });
}

// Shared pieces of markup -------------------------------------------------------

export function priceTagHTML(p) {
  if (typeof p.hours !== 'number' && !isDraft()) return '<span></span>';
  return `<span class="price-tag${typeof p.hours === 'number' ? '' : ' is-todo'}"><span class="sr-only">Time spent: ${esc(spokenHours(p.hours))}</span><span aria-hidden="true">${esc(formatHours(p.hours))}</span></span>`;
}

export function addButtonHTML(p, extraClass = '') {
  return `<button type="button" class="add ${extraClass}" data-add="${esc(p.id)}" aria-pressed="false"><span class="add-icon" aria-hidden="true"></span><span class="add-text">Add to cart</span><span class="sr-only">: ${esc(p.name)}</span></button>`;
}

// The label (back of pack). Nutrition facts are the proof: every fact carries its evidence.

export function labelHTML(p) {
  const a = aisleOf(p);
  const todo = (text) => (isDraft() ? `<span class="todo">${esc(text)}</span>` : '');
  const fact = (term, value, hint = '') =>
    value ? `<div class="fact"><dt>${term}${hint ? `<span class="fact-hint">${hint}</span>` : ''}</dt><dd>${value}</dd></div>` : '';
  const rows = (p.facts || [])
    .map((f) => {
      const wantsProof = Object.prototype.hasOwnProperty.call(f, 'proof');
      const url = wantsProof ? link(f.proof) : '';
      const proof = url
        ? `<a class="proof-link" href="${esc(url)}" target="_blank" rel="noopener">${iconSVG(UI.proof, { scale: 1 })}Proof<span class="sr-only"> for ${esc(f.label)} (opens in a new tab)</span></a>`
        : wantsProof && isDraft() ? '<span class="todo todo-small">Add proof</span>' : '';
      return `<tr><th scope="row">${esc(f.label)}</th><td><span class="fact-value">${esc(f.value)}</span>${proof}</td></tr>`;
    })
    .join('');
  const status = { shipped: 'Shipped', ongoing: 'Ongoing', review: 'Under review' }[p.status] || p.status || '';

  return `
    <header class="label-band">
      <p class="label-aisle">${pixelSVG(ICONS[a.icon] ?? ICONS.rocket, { scale: 2 })}<span>Aisle ${a.num}: ${esc(a.name)}</span></p>
      <button type="button" class="label-close" data-close aria-label="Close label">${iconSVG(UI.close, { scale: 2 })}</button>
    </header>
    <div class="label-scroll">
      <div class="label-title">
        <span class="label-art" aria-hidden="true">${pixelSVG(ICONS[p.icon] ?? ICONS.satellite, { scale: 4 })}</span>
        <div>
          <h2 class="label-name" id="labelName" tabindex="-1">${escTitle(p.name)}</h2>
          <p class="label-line">${esc(p.oneLine)}</p>
        </div>
      </div>
      <dl class="facts">
        ${fact('Made by', esc(p.madeBy) || todo('Say exactly what your part was'))}
        ${fact('Ingredients', (p.ingredients || []).map(esc).join(', ') || todo('List the real tools'))}
      </dl>
      <section class="nutrition" aria-labelledby="nutritionTitle">
        <h3 class="nutrition-title" id="nutritionTitle">Nutrition facts</h3>
        <p class="nutrition-serving">Every fact, with its proof</p>
        ${rows ? `<table class="nutrition-table"><tbody>${rows}</tbody></table>` : todo('Add facts and their proof')}
      </section>
      <dl class="facts">
        ${fact('Status', status ? `<span class="status status-${esc(p.status)}">${esc(status)}</span>${p.statusNote ? ` <span class="status-note">${esc(p.statusNote)}</span>` : ''}` : '')}
        ${fact('Best before', esc(p.bestBefore) || todo("Add what's next"), "What's next")}
      </dl>
    </div>
    <footer class="label-foot">
      ${priceTagHTML(p)}
      <span class="label-count" id="labelCount"></span>
      ${addButtonHTML(p, 'add-label')}
      <button type="button" class="btn-next" data-action="next">Next product</button>
    </footer>`;
}

export function openLabel(id, opener) {
  const p = site.byId.get(id);
  const dialog = $('#labelDialog');
  const body = $('#labelBody');
  if (!p || !dialog) return;
  site.openId = id;
  if (opener !== undefined) site.opener = opener;
  body.innerHTML = labelHTML(p);
  body.style.setProperty('--aisle', aisleOf(p).color);
  syncCart();
  if (!dialog.open) {
    dialog.showModal();
    if (!reducedMotion.matches) {
      body.animate(
        [{ transform: 'perspective(900px) rotateY(75deg)', opacity: 0.3 }, { transform: 'none', opacity: 1 }],
        { duration: 240, easing: 'cubic-bezier(.2,.8,.3,1)' }
      );
    }
  }
  $('#labelName', body)?.focus({ preventScroll: true });
  $('.label-scroll', body).scrollTop = 0;
  safe(() => history.replaceState(null, '', `#p-${id}`));
}

export function nextProduct() {
  const i = site.products.findIndex((p) => p.id === site.openId);
  const next = site.products[(i + 1) % site.products.length];
  if (!next) return;
  site.opener = $(`[data-open="${CSS.escape(next.id)}"]`);
  site.hooks.onNext?.(next.id);
  openLabel(next.id);
}

export function bindLabel() {
  const dialog = $('#labelDialog');
  if (!dialog) return;
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    const id = site.openId;
    site.openId = null;
    safe(() => history.replaceState(null, '', location.pathname + location.search));
    const target = site.opener?.isConnected ? site.opener : $(`[data-open="${CSS.escape(id || '')}"]`);
    target?.focus({ preventScroll: true });
  });
}

export function openLinkedLabel() {
  if (!location.hash.startsWith('#p-')) return;
  const id = decodeURIComponent(location.hash.slice(3));
  if (site.byId.has(id)) openLabel(id, null);
}

// Clicks shared by both pages. `pageHandlers` adds page-specific actions.
export function bindClicks(pageHandlers = {}) {
  document.addEventListener('click', (event) => {
    const t = event.target.closest('[data-open], [data-add], [data-preorder], [data-action], [data-close], [data-copy]');
    if (!t || !site.data) return;
    if (t.dataset.open) pageHandlers.open ? pageHandlers.open(t.dataset.open, t) : openLabel(t.dataset.open, t);
    else if (t.dataset.add) toggleCart(t.dataset.add, t);
    else if (t.dataset.preorder) togglePreorder(t.dataset.preorder, t);
    else if (t.hasAttribute('data-close')) $('#labelDialog')?.close();
    else if (t.dataset.copy) copyText(t);
    else if (t.dataset.action === 'next') nextProduct();
    else if (t.dataset.action === 'print') window.print();
    else if (pageHandlers[t.dataset.action]) pageHandlers[t.dataset.action](t);
  });
}

async function copyText(button) {
  const label = $('.copy-text', button);
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    if (label) label.textContent = 'Copied';
    announce('Email address copied');
  } catch {
    const value = button.parentElement.querySelector('.contact-value');
    if (value) getSelection().selectAllChildren(value);
    if (label) label.textContent = 'Selected';
  }
  setTimeout(() => { if (label) label.textContent = 'Copy'; }, 1800);
}

export function announce(text) {
  const el = $('#announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = text; });
}

// Draft check: lists what still needs filling before launch ------------------------

export function preflight() {
  if (!isDraft()) return;
  const todo = [];
  const links = site.data.links || {};
  site.products.forEach((p) => {
    if (typeof p.hours !== 'number') todo.push({ item: p.id, field: 'hours', fix: 'Add an honest, rounded hour estimate' });
    (p.facts || []).forEach((f) => {
      if ('proof' in f && !link(f.proof)) todo.push({ item: p.id, field: `proof: ${f.proof}`, fix: `Fill "${f.proof}" in the links block, or delete "proof" from the "${f.label}" fact` });
    });
  });
  (site.data.achievements || []).forEach((a) => {
    if ('proof' in a && !link(a.proof)) todo.push({ item: `highlight ${a.value}`, field: `proof: ${a.proof}`, fix: `Fill "${a.proof}" in the links block` });
  });
  ['email', 'github'].forEach((k) => { if (!links[k]) todo.push({ item: 'links', field: k, fix: `Fill "${k}"` }); });
  if (document.querySelector('meta[property="og:url"]')?.content.includes('YOUR-DOMAIN')) {
    todo.push({ item: 'index.html', field: 'og:url, og:image', fix: 'Replace YOUR-DOMAIN with your domain' });
  }
  console.groupCollapsed(`Parth Mart draft check: ${todo.length} things to fill before launch. Set "draft": false when done.`);
  console.table(todo);
  console.groupEnd();
}
