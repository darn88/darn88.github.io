// Inquiry forms: check every field, show each problem next to its field, send without leaving the page.
(function () {
  var messages = {
    name: 'Please enter your name.',
    email: 'Please enter your email address so I can reply.',
    emailBad: 'Enter a valid email address, for example name@company.com.',
    message: 'Please describe how I can help.'
  };

  document.querySelectorAll('.inquiry').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('.send');

    function say(text, ok, withLinkedIn) {
      status.textContent = text;
      if (withLinkedIn) {
        var a = document.createElement('a');
        a.href = 'https://www.linkedin.com/in/ArnoldDamico';
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'LinkedIn';
        status.appendChild(document.createTextNode(' You can also reach me on '));
        status.appendChild(a);
        status.appendChild(document.createTextNode('.'));
      }
      status.classList.toggle('ok', !!ok);
    }

    function check(field) {
      var value = field.value.trim();
      var text = '';
      if (!value) text = messages[field.name] || 'Please fill this in.';
      else if (field.type === 'email' && !/^[^\s@]+@(?!.*\.\.)[^\s@.][^\s@]*\.[^\s@.]{2,}$/.test(value)) text = messages.emailBad;
      var slot = document.getElementById(field.id + '-err');
      if (slot) slot.textContent = text;
      field.setAttribute('aria-invalid', text ? 'true' : 'false');
      return !text;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      form.dataset.tried = '1';
      var bad = [];
      form.querySelectorAll('[required]').forEach(function (field) {
        if (!check(field)) bad.push(field);
      });
      if (bad.length) {
        say(bad.length === 1 ? 'Please correct the highlighted field.' : 'Please correct the ' + bad.length + ' highlighted fields.');
        bad[0].focus();
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending...';
      say('');

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (res.ok) {
            var first = (form.querySelector('[name="name"]').value.trim().split(/\s+/)[0] || '');
            form.reset();
            say('');
            var sent = form.parentNode.querySelector('.sent');
            if (sent) {
              sent.querySelector('.sent-h').textContent = first ? 'Thank you, ' + first + '.' : 'Thank you.';
              form.hidden = true;
              sent.hidden = false;
              sent.querySelector('.sent-h').focus();
            } else {
              say('Thank you. Your inquiry has been received.', true);
            }
            return;
          }
          // Formspree rejected something. Show its message next to the field it names, if it names one.
          return res.json().catch(function () { return {}; }).then(function (data) {
            var placed = 0;
            (data && data.errors || []).forEach(function (err) {
              var field = err.field && form.querySelector('[name="' + err.field + '"]');
              var slot = field && document.getElementById(field.id + '-err');
              if (slot) {
                // Say it in the site's voice, not the form service's.
                slot.textContent = messages[field.name === 'email' ? 'emailBad' : field.name] || 'Please check this field.';
                field.setAttribute('aria-invalid', 'true');
                if (!placed) field.focus();
                placed++;
              }
            });
            say(placed
              ? 'Please correct the highlighted field.'
              : 'Your inquiry could not be sent. Your message has been kept. Please try again shortly.', false, !placed);
          });
        })
        .catch(function () {
          say('Your inquiry could not be sent. Your message has been kept. Please try again shortly.', false, true);
        })
        .then(function () {
          button.disabled = false;
          button.textContent = 'Send an inquiry';
          // Sending disabled the button and dropped keyboard focus. Put it back if the form is still showing.
          if (!form.hidden && document.activeElement === document.body) button.focus();
        });
    });

    // "Send another inquiry" brings the form back.
    var sentPanel = form.parentNode.querySelector('.sent');
    var again = sentPanel && sentPanel.querySelector('.send-another');
    if (again) again.addEventListener('click', function () {
      sentPanel.hidden = true;
      form.hidden = false;
      form.querySelector('input:not([type=hidden]):not(.trap)').focus();
    });

    // Keep the "N things to fix" line honest as fields get fixed.
    function recount() {
      if (!status.textContent || status.classList.contains('ok') || !form.dataset.tried) return;
      var left = form.querySelectorAll('[required][aria-invalid="true"]').length;
      say(left === 0 ? '' : left === 1 ? 'Please correct the highlighted field.' : 'Please correct the ' + left + ' highlighted fields.');
    }

    // Once a field has been flagged, re-check it as the visitor fixes it.
    // For email, only clear the flag while typing; check the format again when they leave the field.
    form.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') !== 'true') return;
        if (field.type === 'email' && field.value.trim()) {
          var slot = document.getElementById(field.id + '-err');
          if (slot) slot.textContent = '';
          field.setAttribute('aria-invalid', 'false');
        } else {
          check(field);
        }
        recount();
      });
      if (field.type === 'email') field.addEventListener('blur', function () {
        if (form.dataset.tried && field.value.trim()) { check(field); recount(); }
      });
    });
  });
})();

// Phone shortcut: show the "Send an inquiry" tab once the opening section is out of view,
// and hide it again at the inquiry form so it never covers it.
(function () {
  var tab = document.querySelector('.inquiry-tab');
  var top = document.querySelector('.hero-cta');
  var end = document.getElementById('inquire');
  if (!tab || !top || !end || !('IntersectionObserver' in window)) return;

  var topVisible = true;
  var endVisible = false;
  function update() { tab.classList.toggle('show', !topVisible && !endVisible); }

  new IntersectionObserver(function (e) { topVisible = e[0].isIntersecting; update(); }).observe(top);
  new IntersectionObserver(function (e) { endVisible = e[0].isIntersecting; update(); }).observe(end);
})();

// Resume pop-up: the link opens the PDF if this script never runs.
(function () {
  var dialog = document.getElementById('resume');
  var opener = document.querySelector('.cv-open');
  if (!dialog || !opener || typeof dialog.showModal !== 'function') return;

  opener.addEventListener('click', function (event) {
    event.preventDefault();
    dialog.showModal();
    dialog.querySelector('.cv-body').scrollTop = 0;
    dialog.querySelector('.cv-close').focus();
  });
  dialog.querySelector('.cv-close').addEventListener('click', function () { dialog.close(); });
  // A click on the dimmed area outside the panel closes it too.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', function () { opener.focus(); });
})();

// Any "Send an inquiry" link: after the page scrolls to the form, put the cursor in the first field.
(function () {
  var first = document.getElementById('a-name');
  var dialog = document.getElementById('resume');
  if (!first) return;
  document.querySelectorAll('a[href="#inquire"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (dialog && dialog.open) dialog.close();
      setTimeout(function () {
        var form = first.form;
        if (form && !form.hidden) first.focus({ preventScroll: true });
      }, 450);
    });
  });
})();

// Header: phone menu toggle, and highlight the section currently in view.
(function () {
  var row = document.querySelector('.nav-row');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && row && nav) {
    function setOpen(open) {
      row.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
      document.body.classList.toggle('menu-open', open);
    }
    toggle.addEventListener('click', function () { setOpen(!row.classList.contains('open')); });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && row.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  }

  if (!nav) return;
  var links = {};
  nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  // The current section is the last one whose top has passed 40% of the screen height.
  function mark() {
    var line = window.innerHeight * 0.4, current = null;
    sections.forEach(function (el) { if (el.getBoundingClientRect().top <= line) current = el.id; });
    if (current && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1].id;
    Object.keys(links).forEach(function (id) {
      if (id === current) links[id].setAttribute('aria-current', 'true');
      else links[id].removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; mark(); });
  }, { passive: true });
  mark();
})();
