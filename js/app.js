/* GLOSSY storefront — products, cart, quick view, checkout. No backend required. */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  var PRODUCTS = window.GLOSSY_PRODUCTS;

  var cart = {};
  try { cart = JSON.parse(localStorage.getItem('glossy_cart')) || {}; } catch (e) {}
  var state = { cat: 'all', q: '' };

  function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function saveCart() { try { localStorage.setItem('glossy_cart', JSON.stringify(cart)); } catch (e) {} }
  function find(id) { return PRODUCTS.filter(function (p) { return p.id === +id; })[0]; }
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    $('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2500);
  }
  window.showToast = toast;

  /* Products */
  function renderProducts() {
    var list = PRODUCTS.filter(function (p) {
      return (state.cat === 'all' || p.cat === state.cat) &&
        (!state.q || (p.name + ' ' + p.cat).toLowerCase().indexOf(state.q) > -1);
    });
    $('productsGrid').innerHTML = list.length ? list.map(function (p) {
      return '<article class="product-card fade-up visible" data-id="' + p.id + '">' +
        '<div class="product-image"><img src="images/product-' + p.id + '.jpg" alt="' + p.name + '" loading="lazy">' +
        (p.badge ? '<span class="product-badge">' + p.badge + '</span>' : '') +
        '<button class="quick-btn" data-id="' + p.id + '">Quick View</button></div>' +
        '<div class="product-info"><span class="product-cat">' + p.cat + '</span>' +
        '<h3 class="product-name">' + p.name + '</h3>' +
        '<div class="product-price">' + fmt(p.price) + (p.old ? ' <s>' + fmt(p.old) + '</s>' : '') + '</div>' +
        '<button class="btn btn-primary add-btn" data-id="' + p.id + '">Add to Bag</button></div></article>';
    }).join('') : '<p class="no-results">No gifts found. Try another category.</p>';
  }

  function setFilter(cat) {
    state.cat = cat;
    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.filter === cat);
    });
    renderProducts();
  }
  window.filterProducts = function (cat) {
    state.q = '';
    setFilter(cat);
    $('products').scrollIntoView({ behavior: 'smooth' });
  };

  /* Cart */
  function totals() {
    var qty = 0, sub = 0;
    Object.keys(cart).forEach(function (id) {
      var p = find(id); if (!p) return;
      qty += cart[id]; sub += p.price * cart[id];
    });
    var save = qty >= 3 ? sub * 0.1 : 0;
    return { qty: qty, sub: sub, save: save, total: sub - save };
  }

  function renderCart() {
    var t = totals(), ids = Object.keys(cart).filter(function (id) { return find(id); });
    $('cartCount').textContent = t.qty;
    $('cartCount').style.display = t.qty ? 'flex' : 'none';
    $('cartItemCount').textContent = t.qty;
    $('cartEmpty').style.display = ids.length ? 'none' : 'block';
    $('cartFooter').style.display = ids.length ? 'block' : 'none';
    var old = $('cartItems').querySelectorAll('.cart-item');
    old.forEach(function (n) { n.remove(); });
    ids.forEach(function (id) {
      var p = find(id), div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = '<img src="images/product-' + p.id + '.jpg" alt="">' +
        '<div class="cart-item-info"><h4>' + p.name + '</h4><span>' + fmt(p.price) + '</span>' +
        '<div class="qty"><button data-act="dec" data-id="' + id + '">−</button><b>' + cart[id] +
        '</b><button data-act="inc" data-id="' + id + '">+</button></div></div>' +
        '<button class="cart-remove" data-act="rm" data-id="' + id + '" aria-label="Remove">×</button>';
      $('cartItems').appendChild(div);
    });
    $('cartSubtotal').textContent = fmt(t.sub);
    $('cartSavingsRow').style.display = t.save ? 'flex' : 'none';
    $('cartSavings').textContent = '− ' + fmt(t.save);
    $('cartTotal').textContent = fmt(t.total);
    saveCart();
  }

  function openCart(open) {
    $('cartSidebar').classList.toggle('open', open);
    $('cartOverlay').classList.toggle('open', open);
  }

  function add(id) {
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    toast('Added to bag');
  }

  window.checkout = function () {
    if (!totals().qty) return toast('Your bag is empty');
    saveCart();
    window.location.href = 'checkout.html';
  };

  /* Quick view */
  function openModal(id) {
    var p = find(id);
    $('modalImage').innerHTML = '<img src="images/product-' + p.id + '.jpg" alt="' + p.name + '">';
    $('modalContent').innerHTML = '<button class="modal-close" id="modalClose" aria-label="Close">×</button>' +
      '<span class="product-cat">' + p.cat + '</span><h3>' + p.name + '</h3>' +
      '<div class="product-price">' + fmt(p.price) + (p.old ? ' <s>' + fmt(p.old) + '</s>' : '') + '</div>' +
      '<p>' + p.desc + '</p><button class="btn btn-primary add-btn" data-id="' + p.id + '">Add to Bag</button>';
    $('modalOverlay').classList.add('open');
  }
  function closeModal() { $('modalOverlay').classList.remove('open'); }

  /* Events */
  document.addEventListener('click', function (e) {
    var el = e.target;
    var add_ = el.closest('.add-btn'); if (add_) { add(add_.dataset.id); closeModal(); return; }
    var q = el.closest('.quick-btn, .product-image'); if (q) { var c = el.closest('.product-card'); if (c) openModal(c.dataset.id); return; }
    var a = el.closest('[data-act]');
    if (a) {
      var id = a.dataset.id;
      if (a.dataset.act === 'inc') cart[id]++;
      if (a.dataset.act === 'dec') cart[id]--;
      if (a.dataset.act === 'rm' || cart[id] <= 0) delete cart[id];
      renderCart(); return;
    }
    var f = el.closest('.filter-btn, .nav-link[data-filter]');
    if (f) { e.preventDefault(); state.q = ''; setFilter(f.dataset.filter); if (f.classList.contains('nav-link')) $('products').scrollIntoView({ behavior: 'smooth' }); }
  });
  $('cartToggle').addEventListener('click', function () { openCart(true); });
  $('cartClose').addEventListener('click', function () { openCart(false); });
  $('cartOverlay').addEventListener('click', function () { openCart(false); });
  $('modalOverlay').addEventListener('click', function (e) { if (e.target === this || e.target.id === 'modalClose') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); openCart(false); } });
  $('menuToggle').addEventListener('click', function () { $('mobileMenu').classList.add('open'); });
  $('menuClose').addEventListener('click', function () { $('mobileMenu').classList.remove('open'); });
  $('mobileMenu').addEventListener('click', function (e) { if (e.target.tagName === 'A') this.classList.remove('open'); });
  $('searchToggle').addEventListener('click', function () {
    var q = prompt('Search gifts (e.g. candle, hamper, wedding):');
    if (q === null) return;
    state.q = q.trim().toLowerCase(); setFilter('all');
    $('products').scrollIntoView({ behavior: 'smooth' });
  });
  window.addEventListener('scroll', function () {
    $('header').classList.toggle('scrolled', window.scrollY > 50);
  });

  /* Init */
  window.addEventListener('load', function () { setTimeout(function () { $('preloader').classList.add('hide'); }, 400); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('visible'); io.unobserve(x.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade-up').forEach(function (n) { io.observe(n); });
  } else {
    document.querySelectorAll('.fade-up').forEach(function (n) { n.classList.add('visible'); });
  }
  renderProducts();
  renderCart();
})();
