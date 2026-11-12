// Red-pen marks draw on as they scroll into view. They stay visible if this script never runs.
(function () {
  var marks = document.querySelectorAll('.pen');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;

  marks.forEach(function (m) { m.classList.add('pending'); });
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.remove('pending');
      e.target.classList.add('drawn');
      seen.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  marks.forEach(function (m) { seen.observe(m); });
})();

// Enquiry forms: check every field, show each problem next to its field, send without leaving the page.
(function () {
  var messages = {
    name: 'Please add your name.',
    email: 'Please add your email so I can reply.',
    emailBad: 'That email address doesn\'t look right. Check for a typo.',
    message: 'Please say a little about what you need help with.'
  };

  document.querySelectorAll('.enquiry').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('.send');

    function say(text, ok) {
      status.textContent = text;
      status.classList.toggle('ok', !!ok);
    }

    function check(field) {
      var value = field.value.trim();
      var text = '';
      if (!value) text = messages[field.name] || 'Please fill this in.';
      else if (field.type === 'email' && !field.checkValidity()) text = messages.emailBad;
      var slot = document.getElementById(field.id + '-err');
      if (slot) slot.textContent = text;
      field.setAttribute('aria-invalid', text ? 'true' : 'false');
      return !text;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var bad = [];
      form.querySelectorAll('[required]').forEach(function (field) {
        if (!check(field)) bad.push(field);
      });
      if (bad.length) {
        say(bad.length === 1 ? 'One thing to fix before this can send.' : bad.length + ' things to fix before this can send.');
        bad[0].focus();
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending...';
      say('');

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            say('Thanks. Your enquiry is on its way and I\'ll reply by email.', true);
            return;
          }
          // Formspree rejected something. Show its message next to the field it names, if it names one.
          return res.json().catch(function () { return {}; }).then(function (data) {
            var placed = 0;
            (data && data.errors || []).forEach(function (err) {
              var field = err.field && form.querySelector('[name="' + err.field + '"]');
              var slot = field && document.getElementById(field.id + '-err');
              if (slot) {
                slot.textContent = err.message || 'Please check this field.';
                field.setAttribute('aria-invalid', 'true');
                if (!placed) field.focus();
                placed++;
              }
            });
            say(placed
              ? 'Something needs fixing before this can send. See the note above.'
              : 'Your enquiry didn\'t send, but your message is still here. Please try again in a minute.');
          });
        })
        .catch(function () {
          say('Your enquiry didn\'t send, but your message is still here. Please try again in a minute.');
        })
        .then(function () {
          button.disabled = false;
          button.textContent = 'Send enquiry';
        });
    });

    // Once a field has been flagged, re-check it as the visitor fixes it.
    form.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') check(field);
      });
    });
  });
})();

// Phone shortcut: show the "Send an enquiry" tab once the opening form is out of view,
// and hide it again near the closing form so it never covers it.
(function () {
  var tab = document.querySelector('.enquiry-tab');
  var top = document.getElementById('enquire');
  var end = document.getElementById('enquire-end');
  if (!tab || !top || !end || !('IntersectionObserver' in window)) return;

  var topVisible = true;
  var endVisible = false;
  function update() { tab.classList.toggle('show', !topVisible && !endVisible); }

  new IntersectionObserver(function (e) { topVisible = e[0].isIntersecting; update(); }).observe(top);
  new IntersectionObserver(function (e) { endVisible = e[0].isIntersecting; update(); }).observe(end);
})();
