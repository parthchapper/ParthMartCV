// Parth Mart checkout page: the till, Parth as cashier, and the receipt.
import { sound, bounce, receiptHTML } from './cart.js';
import { pixelSVG, SHOPPER, CASHIER, REGISTER } from './sprites.js';
import {
  $, safe, reducedMotion, inFrame, site, isDraft, link,
  loadData, showLoadError, prepare, paintToolIcons, bindTopbar, syncCart, watchBaskets,
  bindLabel, openLinkedLabel, bindClicks, preflight,
} from './site.js';

const els = {
  receipt: $('#receipt'),
  bubble: $('#bubble'),
  cashier: $('#cashier'),
  register: $('#register'),
  shopper: $('#tillShopper'),
};

init();

async function init() {
  paintToolIcons();
  paintTill();
  bindTopbar();
  bindLabel();
  bindClicks({ express: expressHere });

  try {
    prepare(await loadData());
  } catch (error) {
    showLoadError(els.receipt, error);
    return;
  }
  site.hooks.onSync = updateBubble;
  renderReceipt();
  watchBaskets(() => renderReceipt());
  syncCart();

  // Arriving from Express checkout on the store page: print the receipt.
  const express = safe(() => sessionStorage.getItem('parthmart.express')) === '1';
  safe(() => sessionStorage.removeItem('parthmart.express'));
  if (express) printReceipt();
  waveCashier();
  preflight();
  openLinkedLabel();
}

function paintTill() {
  els.cashier.innerHTML =
    pixelSVG(CASHIER.idle, { scale: 4, className: 'cashier-idle' }) +
    pixelSVG(CASHIER.wave, { scale: 4, className: 'cashier-wave' });
  els.register.innerHTML = pixelSVG(REGISTER, { scale: 4 });
  els.shopper.innerHTML = pixelSVG(SHOPPER.up[0], { scale: 3 });
}

function renderReceipt() {
  els.receipt.innerHTML = receiptHTML({
    data: site.data,
    cart: site.cart,
    preorders: site.preorders,
    link,
    draft: isDraft(),
    canPrint: !inFrame,
  });
}

function updateBubble() {
  const { count, total, full } = site.cart;
  els.bubble.textContent = full
    ? "You've seen the whole store. Thanks for shopping!"
    : count
      ? `${count} of ${total} in your basket. Here's your receipt.`
      : "Hi, I'm Parth. Your basket is empty, but Express checkout puts everything on the receipt.";
}

function expressHere() {
  sound.unlock();
  site.cart.addAll();
  sound.chime();
  if (!reducedMotion.matches) bounce($('#cartCount'));
  printReceipt();
  waveCashier();
  els.receipt.focus({ preventScroll: true });
}

function printReceipt() {
  if (reducedMotion.matches) return;
  $('.receipt-paper', els.receipt)?.animate(
    [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-12px)' }, { clipPath: 'inset(0 0 -20px 0)', transform: 'none' }],
    { duration: 420, easing: 'steps(7, end)' }
  );
}

function waveCashier() {
  if (reducedMotion.matches) return;
  els.cashier.classList.remove('is-waving');
  void els.cashier.offsetWidth;
  els.cashier.classList.add('is-waving');
  setTimeout(() => els.cashier.classList.remove('is-waving'), 1300);
}
