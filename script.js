// Inquiry forms: check every field, show each problem next to its field, send without leaving the page.
(function () {
  var messages = {
    name: 'Please add your name.',
    email: 'Please add your email so I can reply.',
    emailBad: 'That email address doesn\'t look right. Check for a typo.',
    message: 'Please say a little about what you need help with.'
  };

  document.querySelectorAll('.inquiry').forEach(function (form) {
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
      else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) text = messages.emailBad;
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
            var first = (form.querySelector('[name="name"]').value.trim().split(/\s+/)[0] || '');
            form.reset();
            say('');
            var sent = form.parentNode.querySelector('.sent');
            if (sent) {
              sent.querySelector('.sent-h').textContent = first ? 'Thanks, ' + first + '.' : 'Thanks.';
              form.hidden = true;
              sent.hidden = false;
              sent.querySelector('.sent-h').focus();
            } else {
              say('Thanks. Your inquiry is on its way and I\'ll reply by email.', true);
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
              ? 'Something needs fixing before this can send. See the note above.'
              : 'Your inquiry didn\'t send, but your message is still here. Please try again in a minute.');
          });
        })
        .catch(function () {
          say('Your inquiry didn\'t send, but your message is still here. Please try again in a minute.');
        })
        .then(function () {
          button.disabled = false;
          button.textContent = 'Send inquiry';
        });
    });

    // "Send another note" brings the form back.
    var sentPanel = form.parentNode.querySelector('.sent');
    var again = sentPanel && sentPanel.querySelector('.send-another');
    if (again) again.addEventListener('click', function () {
      sentPanel.hidden = true;
      form.hidden = false;
      form.querySelector('input:not([type=hidden]):not(.trap)').focus();
    });

    // Once a field has been flagged, re-check it as the visitor fixes it.
    form.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') check(field);
      });
    });
  });
})();

// Phone shortcut: show the "Send an inquiry" tab once the opening section is out of view,
// and hide it again at the inquiry form so it never covers it.
(function () {
  var tab = document.querySelector('.inquiry-tab');
  var top = document.getElementById('top');
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
