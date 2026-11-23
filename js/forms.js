/* GLOSSY — forms without PHP.
 * Replaces php/contact.php and php/newsletter.php.
 *
 * A static site has no server to receive form data, so this works in two modes:
 *  1) ENDPOINT set  -> posts the form to a form service (Formspree, Web3Forms, Getform...).
 *  2) ENDPOINT empty -> contact opens the visitor's email app pre-filled; newsletter emails are
 *                       kept in this browser's localStorage only.
 */
(function () {
  var CONFIG = {
    CONTACT_ENDPOINT: '',     // e.g. 'https://formspree.io/f/xxxxxxx'
    NEWSLETTER_ENDPOINT: '',  // e.g. 'https://formspree.io/f/yyyyyyy'
    EMAIL: 'hello@glossygifts.in'
  };

  function toast(msg) {
    var t = document.getElementById('toast'), m = document.getElementById('toastMsg');
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3000);
  }

  function store(key, item) {
    try {
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      item.date = new Date().toISOString();
      list.push(item);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  function post(url, form) {
    return fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
      .then(function (r) { if (!r.ok) throw new Error('failed'); });
  }

  // Header shadow on scroll (contact page has no app.js)
  var header = document.getElementById('header');
  if (header) window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Contact form
  var cf = document.getElementById('contactForm');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {};
    new FormData(cf).forEach(function (v, k) { d[k] = v; });
    var topic = cf.elements.subject.options[cf.elements.subject.selectedIndex].text;
    function done() {
      cf.style.display = 'none';
      document.getElementById('formSuccess').classList.add('show');
    }
    store('glossy_messages', d);
    if (CONFIG.CONTACT_ENDPOINT) {
      post(CONFIG.CONTACT_ENDPOINT, cf).then(done).catch(function () {
        toast('Could not send. Please try again or email ' + CONFIG.EMAIL);
      });
    } else {
      var body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nPhone: ' + (d.phone || '-') +
        '\n\n' + d.message;
      window.location.href = 'mailto:' + CONFIG.EMAIL + '?subject=' +
        encodeURIComponent('[' + topic + '] ' + d.name) + '&body=' + encodeURIComponent(body);
      done();
    }
  });

  // Newsletter
  var nf = document.getElementById('newsletterForm');
  if (nf) nf.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = nf.elements.email.value.trim();
    function done() { toast('Thank you for subscribing!'); nf.reset(); }
    store('glossy_newsletter', { email: email });
    if (CONFIG.NEWSLETTER_ENDPOINT) {
      post(CONFIG.NEWSLETTER_ENDPOINT, nf).then(done).catch(function () {
        toast('Could not subscribe right now. Please try again.');
      });
    } else {
      done();
    }
  });
})();
