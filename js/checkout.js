/* GLOSSY checkout — no backend needed.
 * Reads the bag saved by the shop page, calculates totals, and creates an order request
 * that the customer sends via WhatsApp / email. Set ORDER_ENDPOINT (Formspree, Web3Forms...)
 * to also have the order posted to a form service.
 */
(function () {
  var CONFIG = { WHATSAPP: '919876543210', EMAIL: 'hello@glossygifts.in', ORDER_ENDPOINT: '' };
  var PRICES = { standard: 99, express: 249, wrap: 149, freeShipAbove: 2000, bundleQty: 3, bundlePct: 0.1, gst: 18 };

  var $ = function (id) { return document.getElementById(id); };
  var form = $('checkoutForm');
  var products = window.GLOSSY_PRODUCTS || [];
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem('glossy_cart')) || {}; } catch (e) {}
  var codeOk = false;

  function find(id) { return products.filter(function (p) { return p.id === +id; })[0]; }
  function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ids() { return Object.keys(cart).filter(function (id) { return find(id) && cart[id] > 0; }); }
  function saveCart() { try { localStorage.setItem('glossy_cart', JSON.stringify(cart)); } catch (e) {} }
  function toast(msg) {
    $('toastMsg').textContent = msg; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2800);
  }

  function calc() {
    var qty = 0, sub = 0;
    ids().forEach(function (id) { qty += cart[id]; sub += find(id).price * cart[id]; });
    var save = qty >= PRICES.bundleQty ? sub * PRICES.bundlePct : 0, net = sub - save;
    var express = form.elements.shipping.value === 'express';
    var ship = express ? PRICES.express : (net >= PRICES.freeShipAbove ? 0 : PRICES.standard);
    var wrapFree = codeOk && net >= PRICES.freeShipAbove;
    var wrap = form.elements.wrap.checked ? (wrapFree ? 0 : PRICES.wrap) : 0;
    var total = net + ship + wrap;
    return { qty: qty, sub: sub, save: save, ship: ship, wrap: wrap, wrapFree: wrapFree, total: total,
             gst: total * PRICES.gst / (100 + PRICES.gst), express: express };
  }

  function render() {
    var list = ids();
    $('coEmpty').style.display = list.length ? 'none' : 'block';
    $('coGrid').style.display = list.length ? 'grid' : 'none';
    if (!list.length) return;
    $('coItems').innerHTML = list.map(function (id) {
      var p = find(id);
      return '<div class="cart-item"><img src="images/product-' + p.id + '.jpg" alt="">' +
        '<div class="cart-item-info"><h4>' + esc(p.name) + '</h4><span>' + fmt(p.price) + '</span>' +
        '<div class="qty"><button type="button" data-act="dec" data-id="' + id + '">−</button><b>' + cart[id] +
        '</b><button type="button" data-act="inc" data-id="' + id + '">+</button></div></div>' +
        '<button type="button" class="cart-remove" data-act="rm" data-id="' + id + '" aria-label="Remove">×</button></div>';
    }).join('');
    var t = calc();
    $('priceStandard').textContent = t.sub - t.save >= PRICES.freeShipAbove ? 'Free' : fmt(PRICES.standard);
    $('priceWrap').textContent = t.wrapFree ? 'Free' : fmt(PRICES.wrap);
    $('coTotals').innerHTML =
      row('Subtotal (' + t.qty + (t.qty > 1 ? ' items' : ' item') + ')', fmt(t.sub)) +
      (t.save ? row('Bundle savings (10%)', '− ' + fmt(t.save), 'saving') : '') +
      row('Shipping', t.ship ? fmt(t.ship) : 'Free') +
      (form.elements.wrap.checked ? row('Gift wrapping', t.wrap ? fmt(t.wrap) : 'Free', t.wrap ? '' : 'saving') : '') +
      row('Total', fmt(t.total), 'total') +
      row('Includes GST (' + PRICES.gst + '%)', fmt(t.gst));
    saveCart();
  }
  function row(a, b, cls) { return '<div class="sum-row ' + (cls || '') + '"><span>' + a + '</span><span>' + b + '</span></div>'; }

  /* Events */
  $('coItems').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var id = b.dataset.id;
    if (b.dataset.act === 'inc') cart[id]++;
    if (b.dataset.act === 'dec') cart[id]--;
    if (b.dataset.act === 'rm' || cart[id] <= 0) delete cart[id];
    render();
  });
  form.addEventListener('change', function () { applyCodeState(false); render(); });
  function applyCodeState(show) {
    var v = $('code').value.trim().toUpperCase(), net = calc().sub - calc().save;
    codeOk = v === 'GLOSSY25' && net >= PRICES.freeShipAbove;
    if (!show) return;
    var m = $('codeMsg');
    if (!v) { m.textContent = ''; }
    else if (v !== 'GLOSSY25') { m.textContent = 'This code is not valid.'; m.style.color = '#c0392b'; }
    else if (!codeOk) { m.textContent = 'GLOSSY25 needs an order of ₹2,000 or more.'; m.style.color = '#c0392b'; }
    else { m.textContent = 'GLOSSY25 applied — gift wrapping is free.'; m.style.color = '#3d7a4f'; }
  }
  $('applyCode').addEventListener('click', function () {
    applyCodeState(true);
    if (codeOk && !form.elements.wrap.checked) { form.elements.wrap.checked = true; }
    render();
  });

  var d = $('date'), now = new Date();
  d.min = now.toISOString().slice(0, 10);
  d.value = new Date(now.getTime() + 2 * 864e5).toISOString().slice(0, 10);

  /* Place order */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var t = calc(), f = form.elements, list = ids();
    var order = {
      id: 'GL' + Date.now().toString(36).toUpperCase().slice(-7),
      date: new Date().toISOString(),
      customer: { name: f.name.value.trim(), phone: f.phone.value, email: f.email.value.trim() },
      address: [f.address.value.trim(), f.city.value.trim(), f.state.value.trim(), f.pincode.value].join(', '),
      deliveryDate: f.date.value,
      shipping: t.express ? 'Same-day / Express' : 'Standard',
      wrap: f.wrap.checked, giftMessage: f.giftmsg.value.trim(),
      payment: f.payment.value === 'cod' ? 'Cash on Delivery' : 'UPI / Bank Transfer',
      items: list.map(function (id) { var p = find(id); return { name: p.name, qty: cart[id], price: p.price }; }),
      totals: t
    };
    try {
      var all = JSON.parse(localStorage.getItem('glossy_orders') || '[]'); all.push(order);
      localStorage.setItem('glossy_orders', JSON.stringify(all));
    } catch (err) {}

    var text = message(order);
    if (CONFIG.ORDER_ENDPOINT) {
      fetch(CONFIG.ORDER_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(order) })
        .catch(function () {});
    }
    finish(order, text);
  });

  function message(o) {
    var t = o.totals;
    return 'Hello GLOSSY, new order request ' + o.id + '\n\n' +
      o.items.map(function (i) { return '• ' + i.name + ' × ' + i.qty + ' — ' + fmt(i.price * i.qty); }).join('\n') +
      '\n\nSubtotal: ' + fmt(t.sub) + (t.save ? '\nBundle savings: −' + fmt(t.save) : '') +
      '\nShipping (' + o.shipping + '): ' + (t.ship ? fmt(t.ship) : 'Free') +
      (o.wrap ? '\nGift wrapping: ' + (t.wrap ? fmt(t.wrap) : 'Free') : '') +
      '\nTOTAL: ' + fmt(t.total) + '\nPayment: ' + o.payment +
      '\n\nName: ' + o.customer.name + '\nPhone: ' + o.customer.phone + '\nEmail: ' + o.customer.email +
      '\nAddress: ' + o.address + '\nDeliver on: ' + o.deliveryDate +
      (o.giftMessage ? '\nGift message: ' + o.giftMessage : '');
  }

  function finish(o, text) {
    var wa = 'https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(text);
    $('doneName').textContent = o.customer.name.split(' ')[0];
    $('doneId').textContent = 'Order ' + o.id;
    $('doneRecap').innerHTML = o.items.map(function (i) { return row(esc(i.name) + ' × ' + i.qty, fmt(i.price * i.qty)); }).join('') +
      row('Total (' + esc(o.payment) + ')', fmt(o.totals.total), 'total');
    $('doneWa').href = wa;
    $('doneMail').href = 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent('Order ' + o.id) + '&body=' + encodeURIComponent(text);
    $('coGrid').style.display = 'none';
    $('coDone').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    cart = {}; saveCart();
    window.open(wa, '_blank');
  }

  window.addEventListener('scroll', function () { $('header').classList.toggle('scrolled', window.scrollY > 50); });
  render();
})();
