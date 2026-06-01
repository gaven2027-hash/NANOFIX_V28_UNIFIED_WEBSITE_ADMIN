(function () {
  if (window.__nanofixPhoneCountrySplitterReady) return;
  window.__nanofixPhoneCountrySplitterReady = true;

  var priority = [
    ['Singapore', 'SG', '+65'],
    ['Malaysia', 'MY', '+60'],
    ['China', 'CN', '+86'],
    ['India', 'IN', '+91']
  ];

  var rest = [
    ['Afghanistan', 'AF', '+93'], ['Albania', 'AL', '+355'], ['Algeria', 'DZ', '+213'], ['Argentina', 'AR', '+54'], ['Armenia', 'AM', '+374'], ['Australia', 'AU', '+61'], ['Austria', 'AT', '+43'], ['Azerbaijan', 'AZ', '+994'],
    ['Bahrain', 'BH', '+973'], ['Bangladesh', 'BD', '+880'], ['Belgium', 'BE', '+32'], ['Brazil', 'BR', '+55'], ['Brunei', 'BN', '+673'], ['Cambodia', 'KH', '+855'], ['Canada', 'CA', '+1'], ['Chile', 'CL', '+56'], ['Colombia', 'CO', '+57'],
    ['Denmark', 'DK', '+45'], ['Egypt', 'EG', '+20'], ['France', 'FR', '+33'], ['Germany', 'DE', '+49'], ['Greece', 'GR', '+30'], ['Hong Kong', 'HK', '+852'], ['Indonesia', 'ID', '+62'], ['Ireland', 'IE', '+353'], ['Italy', 'IT', '+39'],
    ['Japan', 'JP', '+81'], ['Laos', 'LA', '+856'], ['Macau', 'MO', '+853'], ['Maldives', 'MV', '+960'], ['Myanmar', 'MM', '+95'], ['Nepal', 'NP', '+977'], ['Netherlands', 'NL', '+31'], ['New Zealand', 'NZ', '+64'], ['Pakistan', 'PK', '+92'],
    ['Philippines', 'PH', '+63'], ['Qatar', 'QA', '+974'], ['Russia', 'RU', '+7'], ['Saudi Arabia', 'SA', '+966'], ['South Africa', 'ZA', '+27'], ['South Korea', 'KR', '+82'], ['Sri Lanka', 'LK', '+94'], ['Taiwan', 'TW', '+886'],
    ['Thailand', 'TH', '+66'], ['United Arab Emirates', 'AE', '+971'], ['United Kingdom', 'GB', '+44'], ['United States', 'US', '+1'], ['Vietnam', 'VN', '+84']
  ];

  var countries = priority.concat(rest.sort(function (a, b) { return a[0].localeCompare(b[0]); }));

  function isPhoneInput(input) {
    if (!input || input.dataset.nanofixPhoneSplit === 'done' || input.name === 'phone_local') return false;
    if (input.closest('[data-nanofix-phone-split]')) return false;
    var text = [input.type, input.name, input.id, input.placeholder, input.getAttribute('aria-label')].join(' ').toLowerCase();
    return /tel|phone|mobile|whatsapp|手机|电话|联系电话/.test(text);
  }

  function buildSelect(input, originalName) {
    var select = document.createElement('select');
    select.name = originalName + '_country_code';
    select.setAttribute('aria-label', 'Country calling code / 国家区号');
    select.className = input.className;
    select.style.cssText = (input.getAttribute('style') || '') + ';width:100%;min-width:0;height:100%;padding-left:10px;padding-right:8px;appearance:auto;';
    countries.forEach(function (country) {
      var option = document.createElement('option');
      option.value = country[2];
      option.textContent = country[0] + ' ' + country[2];
      select.appendChild(option);
    });
    select.value = '+65';
    return select;
  }

  function applyPhoneSplit(input) {
    if (!isPhoneInput(input)) return;
    input.dataset.nanofixPhoneSplit = 'done';
    var originalName = input.name || 'phone';
    var originalValue = (input.value || '').trim();
    var wrapper = document.createElement('div');
    wrapper.setAttribute('data-nanofix-phone-split', 'legacy');
    wrapper.className = 'nanofix-phone-split-wrapper';
    wrapper.style.cssText = 'display:grid;grid-template-columns:30% 70%;gap:8px;width:100%;align-items:stretch;';

    var select = buildSelect(input, originalName);
    var hiddenFull = document.createElement('input');
    hiddenFull.type = 'hidden';
    hiddenFull.name = originalName + '_full_international';

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(select);
    wrapper.appendChild(input);
    wrapper.appendChild(hiddenFull);
    input.style.width = '100%';
    input.style.minWidth = '0';
    input.placeholder = input.placeholder || 'Phone / WhatsApp number';

    var detected = originalValue.match(/^\s*(\+\d{1,4}(?:-\d{1,4})?)\s*(.*)$/);
    if (detected) {
      select.value = detected[1];
      input.value = detected[2] || '';
    }

    function syncFullNumber() {
      var local = (input.value || '').trim();
      var full = local ? (select.value + ' ' + local).trim() : '';
      hiddenFull.value = full;
      input.dataset.nanofixFullPhone = full;
    }

    input.addEventListener('input', syncFullNumber);
    select.addEventListener('change', syncFullNumber);
    var form = input.closest('form');
    if (form && !form.dataset.nanofixPhoneSubmitSync) {
      form.dataset.nanofixPhoneSubmitSync = 'true';
      form.addEventListener('submit', function () {
        form.querySelectorAll('[data-nanofix-phone-split="legacy"] input[data-nanofix-phone-split="done"]').forEach(function (phoneInput) {
          var split = phoneInput.closest('[data-nanofix-phone-split="legacy"]');
          var code = split && split.querySelector('select') ? split.querySelector('select').value : '+65';
          var local = (phoneInput.value || '').trim();
          var full = local ? (code + ' ' + local).trim() : '';
          var hidden = split && split.querySelector('input[type="hidden"]');
          if (hidden) hidden.value = full;
          if (full) phoneInput.value = full;
        });
      }, true);
    }
    syncFullNumber();
  }

  function scanPhoneInputs() {
    document.querySelectorAll('input').forEach(applyPhoneSplit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanPhoneInputs, { once: true });
  else setTimeout(scanPhoneInputs, 0);

  if ('MutationObserver' in window) {
    new MutationObserver(function () { scanPhoneInputs(); }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
