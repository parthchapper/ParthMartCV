// Cart state, the ding, the add-to-cart arc and the receipt.
import { pixelSVG, iconSVG, ICONS, UI } from './sprites.js';

// Storage that never throws (private windows and blocked storage just fall back to memory).
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
const SOUND_KEY = 'parthmart.sound';

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// Escape, and keep hyphenated words like "full-time" on one line.
export const escTitle = (value) =>
  esc(value).replace(/([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)/g, '<span class="nowrap">$1</span>');

export const formatHours = (hours) =>
  typeof hours === 'number' ? `~${hours.toLocaleString('en-US')} h` : '? h';

export const spokenHours = (hours) =>
  typeof hours === 'number' ? `about ${hours.toLocaleString('en-US')} hours` : 'hours not added yet';

// A basket of ids, kept for this browser tab so it survives moving between pages.
// Used for the cart (products) and for pre-orders.
export class Basket extends EventTarget {
  constructor(items, key) {
    super();
    this.items = items;
    this.key = key;
    const known = new Set(items.map((p) => p.id));
    const saved = safe(() => JSON.parse(sessionStorage.getItem(key) || '[]'), []);
    this.ids = new Set(Array.isArray(saved) ? saved.filter((id) => known.has(id)) : []);
  }

  has(id) { return this.ids.has(id); }
  get count() { return this.ids.size; }
  get total() { return this.items.length; }
  get full() { return this.total > 0 && this.count === this.total; }

  add(id) { if (!this.ids.has(id)) { this.ids.add(id); this.#changed('add', id); } }
  remove(id) { if (this.ids.delete(id)) this.#changed('remove', id); }
  toggle(id) { this.has(id) ? this.remove(id) : this.add(id); return this.has(id); }
  addAll() {
    this.items.forEach((p) => this.ids.add(p.id));
    this.#changed('all', null);
  }

  // Products in the cart, most hours first. Products without hours go last, in shelf order.
  sorted() {
    return this.items
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => this.ids.has(p.id))
      .sort((a, b) => {
        const ha = typeof a.p.hours === 'number' ? a.p.hours : -1;
        const hb = typeof b.p.hours === 'number' ? b.p.hours : -1;
        return hb - ha || a.index - b.index;
      })
      .map(({ p }) => p);
  }

  #changed(type, id) {
    safe(() => sessionStorage.setItem(this.key, JSON.stringify([...this.ids])));
    this.dispatchEvent(new CustomEvent('change', { detail: { type, id } }));
  }
}

// Sound --------------------------------------------------------------
// Synthesised with the Web Audio API: no audio file, nothing to license.
// Browsers only allow audio after a click, and every sound here starts from one.

let audio = null;
let soundOn = safe(() => localStorage.getItem(SOUND_KEY), null) !== 'off';

export const sound = {
  get on() { return soundOn; },
  set on(value) {
    soundOn = Boolean(value);
    safe(() => localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'));
  },
  unlock() {
    if (!soundOn) return null;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { audio = null; }
    return audio;
  },
  // A small shop bell: a bright fundamental plus two quieter partials, all decaying.
  ding({ delay = 0, pitch = 1, volume = 1 } = {}) {
    const ctx = this.unlock();
    if (!ctx) return;
    const start = ctx.currentTime + Math.max(0, delay);
    const master = ctx.createGain();
    master.gain.value = 0.11 * volume;
    master.connect(ctx.destination);
    [[1318.5, 1, 0.9], [2637, 0.22, 0.6], [3290, 0.3, 0.4]].forEach(([freq, amp, decay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * pitch;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(amp, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + decay + 0.05);
    });
  },
  // Two notes, used for Express checkout and for a full basket.
  chime(delay = 0) {
    this.ding({ delay });
    this.ding({ delay: delay + 0.13, pitch: 1.26 });
  },
};

// Add-to-cart arc ----------------------------------------------------

export function flyToCart({ from, to, icon, color, layer = document.body }) {
  return new Promise((resolve) => {
    if (!from || !to) { resolve(); return; }
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    if (!a.width || !b.width) { resolve(); return; }
    const sx = a.left + a.width / 2;
    const sy = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - sx;
    const dy = b.top + b.height / 2 - sy;

    const outer = document.createElement('div');
    outer.className = 'fly';
    outer.style.left = `${sx}px`;
    outer.style.top = `${sy}px`;
    const inner = document.createElement('div');
    inner.className = 'fly-item';
    inner.style.color = color;
    inner.innerHTML = pixelSVG(ICONS[icon] ?? ICONS.satellite, { scale: 3 });
    outer.append(inner);
    layer.append(outer);

    const duration = 520;
    const apex = Math.min(0, dy) - Math.min(140, 60 + Math.abs(dy) * 0.25);
    outer.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { duration, easing: 'linear', fill: 'forwards' });
    const vertical = inner.animate(
      [
        { transform: 'translateY(0) scale(1)', easing: 'cubic-bezier(.2,.6,.35,1)' },
        { transform: `translateY(${apex}px) scale(.85)`, offset: 0.4, easing: 'cubic-bezier(.6,0,.85,.4)' },
        { transform: `translateY(${dy}px) scale(.4)` },
      ],
      { duration, fill: 'forwards' }
    );
    vertical.onfinish = () => { outer.remove(); resolve(); };
    vertical.oncancel = () => { outer.remove(); resolve(); };
  });
}

export function bounce(el) {
  el?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
}

// Receipt ------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, '0');
const receiptDate = (d) =>
  `${pad2(d.getDate())} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}  ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// A decorative barcode drawn from the letters of the store name.
function barcodeSVG(text) {
  let x = 0;
  let bars = '';
  [...text].forEach((ch) => {
    const code = ch.charCodeAt(0);
    for (let bit = 0; bit < 6; bit += 1) {
      const w = (code >> bit) & 1 ? 2 : 1;
      if (bit % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="24"/>`;
      x += w + 1;
    }
  });
  return `<svg class="barcode" viewBox="0 0 ${x} 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bars}</svg>`;
}

// `link(key)` turns a key from the links block (or a direct URL) into an address.
export function receiptHTML({ data, cart, preorders, link, draft, canPrint }) {
  const items = cart.sorted();
  const store = data.store || {};
  const timed = items.filter((p) => typeof p.hours === 'number');
  const total = timed.reduce((sum, p) => sum + p.hours, 0);
  const missing = items.length - timed.length;

  const head = `
    <div class="receipt-head">
      <h2 class="receipt-store" id="receiptTitle">${esc(store.name)}</h2>
      <p>${esc(store.city)}</p>
      <p>Cashier: ${esc(store.owner)}</p>
      <p>${esc(receiptDate(new Date()))}</p>
    </div>`;

  const c = {
    email: link('email'),
    linkedin: link('linkedin'),
    github: link('github'),
  };
  const contact = [
    c.email
      ? `<div class="contact-row"><span class="contact-label">Email</span><a class="contact-value" href="mailto:${esc(c.email)}">${esc(c.email)}</a><button type="button" class="copy" data-copy="${esc(c.email)}" aria-label="Copy email address">${iconSVG(UI.copy, { scale: 2 })}<span class="copy-text">Copy</span></button></div>`
      : draft ? '<div class="contact-row"><span class="contact-label">Email</span><span class="todo">Add "email" in links</span></div>' : '',
    c.linkedin ? `<div class="contact-row"><span class="contact-label">LinkedIn</span><a class="contact-value" href="${esc(c.linkedin)}" target="_blank" rel="noopener">Parth on LinkedIn</a></div>` : '',
    c.github
      ? `<div class="contact-row"><span class="contact-label">GitHub</span><a class="contact-value" href="${esc(c.github)}" target="_blank" rel="noopener">${esc(c.github.replace(/^https?:\/\/(www\.)?/, ''))}</a></div>`
      : draft ? '<div class="contact-row"><span class="contact-label">GitHub</span><span class="todo">Add "github" in links</span></div>' : '',
  ].join('');
  const contactBlock = contact ? `<div class="receipt-contact"><h3 class="receipt-sub">Ask the cashier</h3>${contact}</div>` : '';

  if (!items.length) {
    return `
      <div class="receipt-paper">
        ${head}
        <p class="receipt-rule" aria-hidden="true"></p>
        <p class="receipt-empty">Your basket is empty.</p>
        <p class="receipt-empty-help">Add products in the aisles, or put every product on this receipt at once.</p>
        <div class="receipt-empty-actions">
          <button type="button" class="btn btn-go btn-small" data-action="express">Express checkout</button>
          <a class="btn btn-go-outline btn-small" href="index.html#aisles">Back to the aisles</a>
        </div>
        <p class="receipt-rule" aria-hidden="true"></p>
        ${contactBlock}
      </div>`;
  }

  const lines = items
    .map((p) => {
      const h = p.headline || {};
      const sub = h.value ? `${h.value} ${h.label || ''}` : h.text || '';
      const hours = typeof p.hours === 'number' || draft
        ? `<span class="ri-hours${typeof p.hours === 'number' ? '' : ' todo-text'}"><span class="sr-only">${esc(spokenHours(p.hours))}</span><span aria-hidden="true">${esc(formatHours(p.hours))}</span></span>`
        : '';
      return `
        <li class="receipt-item">
          <button type="button" class="receipt-name" data-open="${esc(p.id)}" aria-haspopup="dialog">
            <span class="ri-name">${esc(p.name)}</span>
            <span class="ri-dots" aria-hidden="true"></span>
            ${hours}
          </button>
          <p class="ri-line">${esc(p.oneLine)}</p>
          ${sub.trim() ? `<p class="ri-sub">${esc(sub.trim())}</p>` : ''}
        </li>`;
    })
    .join('');

  // Only show a total when every item has hours, so the sum never understates.
  const totalText = !missing
    ? `~${total.toLocaleString('en-US')} h`
    : draft ? (timed.length ? `~${total.toLocaleString('en-US')} h + ${missing} to add` : 'hours to add') : '';

  const highlights = (data.achievements || [])
    .map((a) => `<li><span class="rw-title">${esc(a.value)}</span> <span class="rw-result">${esc(a.text)}</span></li>`)
    .join('');

  const pre = (data.preorders || [])
    .map((n) => {
      const mine = preorders?.has(n.id);
      return `<li${mine ? ' class="is-mine"' : ''}><span class="po-item">${mine ? `<span class="po-check" aria-hidden="true">${iconSVG(UI.check, { scale: 1 })}</span>` : ''}${esc(n.item)}</span><span class="po-note">${mine ? 'Pre-ordered. ' : ''}${esc(n.ships ? `Ships ${n.ships}` : 'Coming soon')}</span></li>`;
    })
    .join('');

  const thanks = cart.full
    ? `<p class="receipt-thanks receipt-thanks-full">Full basket! Thank you for looking at everything I've built.</p>`
    : `<p class="receipt-thanks">Thank you for shopping. ${cart.total - cart.count} more ${cart.total - cart.count === 1 ? 'product is' : 'products are'} still on the shelves.</p>`;

  return `
    <div class="receipt-paper">
      ${head}
      <p class="receipt-rule" aria-hidden="true"></p>
      <p class="receipt-sort">Sorted by time spent, most first</p>
      <ol class="receipt-items">${lines}</ol>
      <p class="receipt-rule" aria-hidden="true"></p>
      <dl class="receipt-totals">
        <div><dt>Items</dt><dd>${items.length} of ${cart.total}</dd></div>
        ${totalText ? `<div class="receipt-total"><dt>Total time</dt><dd>${esc(totalText)}</dd></div>` : ''}
      </dl>
      ${highlights ? `<p class="receipt-rule" aria-hidden="true"></p><h3 class="receipt-sub">Highlights</h3><ul class="receipt-rewards">${highlights}</ul>` : ''}
      ${pre ? `<p class="receipt-rule" aria-hidden="true"></p><h3 class="receipt-sub">Pre-orders: what's coming</h3><ul class="receipt-preorders">${pre}</ul>` : ''}
      <p class="receipt-rule" aria-hidden="true"></p>
      ${thanks}
      ${contactBlock}
      ${barcodeSVG(store.name || 'PARTH MART')}
    </div>
    ${canPrint ? '<div class="receipt-actions"><button type="button" class="btn btn-go-outline btn-small" data-action="print">Print receipt</button></div>' : ''}`;
}
