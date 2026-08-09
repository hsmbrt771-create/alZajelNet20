/* =========================================================
   Al-Zajel Hotspot UI JS
   - Theme mode: dark / light
   - Carousel
   - Random quote
   - Top toast notifications
   - MikroTik-friendly login/status helpers
   ========================================================= */
(function(){
  'use strict';

  const CONFIG = {
    // true = local preview mode. false = real MikroTik form submission mode.
    demoMode: true,
    urls: {
      prices: 'prices.html',
      ads: 'ads.html',
      lounge: 'lounge.html',
      matches: 'matches.html',
      status: 'status.html',
      logout: '$(link-logout)'
    },
    successRedirect: 'status.html'
  };

 

  const religiousTexts = [
    'قال تعالى: ﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾',
    'قال تعالى: ﴿إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾',
    'قال رسول الله ﷺ: خير الناس أنفعهم للناس',
    'قال تعالى: ﴿وَتَوَكَّلْ عَلَى اللَّهِ وَكَفَىٰ بِاللَّهِ وَكِيلًا﴾',
    'اللهم بارك لنا في أرزاقنا وأوقاتنا وأعمالنا'
  ];

  const errorMessages = {
    invalidCard: 'رقم الكرت غير صحيح، يرجى التأكد من الرقم والمحاولة مرة أخرى.',
    emptyField: 'يرجى إدخال رقم الكرت أولًا.',
    expiredCard: 'انتهت صلاحية هذا الكرت، يرجى استخدام كرت جديد.',
    timeFinished: 'انتهى الوقت المتاح لهذا الكرت.',
    dataFinished: 'انتهى رصيد البيانات لهذا الكرت.',
    alreadyActive: 'هذا الكرت مستخدم حاليًا على جهاز آخر.',
    serverBusy: 'السيرفر مشغول حاليًا، يرجى المحاولة بعد قليل.',
    connectionError: 'تعذر الاتصال بالخادم، تحقق من الشبكة وحاول مرة أخرى.',
    tooManyAttempts: 'تم إجراء محاولات كثيرة، يرجى الانتظار قليلًا قبل المحاولة مرة أخرى.',
    success: 'تم تسجيل الدخول بنجاح، سيتم نقلك الآن إلى صفحة بيانات الكرت.',
    unknown: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقًا.',
    info: 'تم تنفيذ العملية بنجاح.'
  };

  const toastTitles = { error:'خطأ', warning:'تنبيه', success:'نجاح', info:'معلومة' };
  const toastIcons = { error:'✕', warning:'!', success:'✓', info:'i' };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const unresolved = value => !value || /^\$\(.+\)$/.test(String(value).trim());
  const cleanValue = (value, fallback='-') => unresolved(value) ? fallback : value;

  function setHeaderLinks(){
    const map = {
      prices: CONFIG.urls.prices,
      ads: CONFIG.urls.ads,
      lounge: CONFIG.urls.lounge,
      matches: CONFIG.urls.matches,
      status: CONFIG.urls.status
    };
    Object.entries(map).forEach(([key,url]) => {
      $$(`[data-link="${key}"]`).forEach(a => a.setAttribute('href', url));
    });
  }

  function initTheme(){
    const root = document.documentElement;
    const saved = localStorage.getItem('zajel:theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const initial = saved || (prefersLight ? 'light' : 'dark');

    function applyTheme(theme){
      const mode = theme === 'light' ? 'light' : 'dark';
      root.setAttribute('data-theme', mode);
      localStorage.setItem('zajel:theme', mode);
      const meta = document.querySelector('meta[name="theme-color"]');
      if(meta) meta.setAttribute('content', mode === 'light' ? '#eaf8ff' : '#061226');
      const btn = $('.theme-toggle');
      if(btn){
        btn.setAttribute('aria-label', mode === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل وضع النهار');
        btn.setAttribute('title', mode === 'light' ? 'الوضع الليلي' : 'وضع النهار');
        btn.innerHTML = `<span>${mode === 'light' ? '🌙' : '☀️'}</span>`;
      }
    }

    if(!$('.theme-toggle')){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-toggle';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        const current = root.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
    applyTheme(initial);
  }

  function showToast(type='info', message=errorMessages.info, timeout=5200){
    let stack = $('.toast-stack');
    if(!stack){
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role','alert');
    toast.innerHTML = `
      <div class="toast-icon">${toastIcons[type] || toastIcons.info}</div>
      <div><h4>${toastTitles[type] || toastTitles.info}</h4><p>${message}</p></div>
      <button type="button" aria-label="إغلاق">×</button>
    `;
    stack.appendChild(toast);
    const close = () => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 260); };
    toast.querySelector('button').addEventListener('click', close);
    setTimeout(close, timeout);
  }

  function mapBackendError(errorText){
    const err = String(errorText || '').toLowerCase().trim();
    if(!err || err.includes('$(error)')) return null;
    if(/invalid|not found|wrong|password|username|no valid profile|user does not exist|incorrect/.test(err)) return 'invalidCard';
    if(/expired|validity|صلاحية|expire/.test(err)) return 'expiredCard';
    if(/uptime|time limit|session time|time left|انتهى الوقت/.test(err)) return 'timeFinished';
    if(/traffic|transfer|data|bytes|quota|limit reached/.test(err)) return 'dataFinished';
    if(/already|simultaneous|session limit|logged in|another device/.test(err)) return 'alreadyActive';
    if(/server|radius|busy|timeout|not responding/.test(err)) return 'serverBusy';
    if(/network|connection|fetch|offline|disconnected/.test(err)) return 'connectionError';
    if(/many|attempt|rate|blocked|temporary/.test(err)) return 'tooManyAttempts';
    return 'unknown';
  }

  function handleHotspotError(){
    const key = mapBackendError(window.HOTSPOT_ERROR || '');
    if(key){
      const type = ['serverBusy','alreadyActive','tooManyAttempts'].includes(key) ? 'warning' : 'error';
      showToast(type, errorMessages[key]);
    }
  }

  function initCarousel(){
    const stage = $('#topCarouselStage');
    const dotsWrap = $('#topCarouselDots');
    if(!stage || !dotsWrap) return;
    let active = 0;
    let timer = null;
    let startX = 0;

    stage.innerHTML = topAds.map((ad,i)=>`
      <article class="ad-card" data-index="${i}">
        <img src="${ad.image}" alt="${ad.title}">
        <div class="ad-overlay"><h3>${ad.title}</h3><p>${ad.desc}</p><a class="mini-btn" href="${ad.url}">${ad.action}</a></div>
      </article>
    `).join('');
    dotsWrap.innerHTML = topAds.map((_,i)=>`<button class="dot" type="button" data-dot="${i}" aria-label="إعلان ${i+1}"></button>`).join('');

    const cards = $$('.ad-card', stage);
    const dots = $$('.dot', dotsWrap);

    const render = () => {
      cards.forEach((card,i)=>{
        const diff = (i - active + cards.length) % cards.length;
        card.className = 'ad-card ' + (diff === 0 ? 'is-active' : diff === 1 ? 'is-next' : diff === cards.length - 1 ? 'is-prev' : 'is-far');
      });
      dots.forEach((d,i)=>d.classList.toggle('is-active', i === active));
    };
    const go = step => { active = (active + step + topAds.length) % topAds.length; render(); reset(); };
    const jump = i => { active = i; render(); reset(); };
    const reset = () => { clearInterval(timer); timer = setInterval(()=>go(1), 4500); };

    $('#topPrev')?.addEventListener('click', ()=>go(-1));
    $('#topNext')?.addEventListener('click', ()=>go(1));
    dots.forEach(d=>d.addEventListener('click',()=>jump(Number(d.dataset.dot))));
    stage.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive:true});
    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if(Math.abs(dx) > 45) go(dx > 0 ? -1 : 1);
    }, {passive:true});
    render();
    reset();
  }

  function initQuote(){
    const el = $('#quoteText');
    if(!el) return;
    let last = Number(localStorage.getItem('zajel:lastQuote') || -1);
    let index = Math.floor(Math.random() * religiousTexts.length);
    if(index === last) index = (index + 1) % religiousTexts.length;
    const setText = () => {
      el.classList.remove('switching');
      void el.offsetWidth;
      el.textContent = religiousTexts[index];
      el.classList.add('switching');
      localStorage.setItem('zajel:lastQuote', String(index));
    };
    setText();
    setInterval(() => { index = (index + 1) % religiousTexts.length; setText(); }, 9000);
  }

  function initLowerAds(){
    const grid = $('#lowerAdsGrid');
    if(!grid) return;
    grid.innerHTML = lowerAds.map(ad=>`
      <article class="lower-card">
        <img src="${ad.image}" alt="${ad.title}">
        <div class="lower-card-body"><h3>${ad.title}</h3><p>${ad.desc}</p><a class="mini-btn" href="${ad.url}">${ad.action}</a></div>
      </article>
    `).join('');
  }

  function setStatusValues(data){
    const defaults = {
      username:'-', packageName:'باقة الإنترنت', price:'حسب الكرت', usedTime:'-', remainingTime:'-',
      usedData:'-', remainingData:'حسب الباقة', loginTime:'-', ipAddress:'-', macAddress:'-', timePercent:0, dataPercent:0
    };
    const v = Object.assign(defaults, data || {});
    Object.entries(v).forEach(([key,value]) => {
      $$(`[data-status="${key}"]`).forEach(el => el.textContent = cleanValue(value, defaults[key] || '-'));
    });
    $$('[data-progress="time"]').forEach(el => el.style.width = `${Math.max(0, Math.min(100, Number(v.timePercent) || 0))}%`);
    $$('[data-progress="data"]').forEach(el => el.style.width = `${Math.max(0, Math.min(100, Number(v.dataPercent) || 0))}%`);
  }

  function saveDemoSession(card){
    localStorage.setItem('zajel:lastSession', JSON.stringify({
      username: card,
      packageName: 'كرت الزاجل التجريبي',
      price: 'قابل للتعديل',
      usedTime: '00:03:25',
      remainingTime: '03:56:35',
      usedData: '18 MB',
      remainingData: 'حسب الباقة',
      loginTime: new Date().toLocaleTimeString('ar-YE',{hour:'2-digit',minute:'2-digit'}),
      //ipAddress: '192.168.88.25',
     // macAddress: 'AA:BB:CC:DD:EE:FF',
      timePercent: 8,
      dataPercent: 14
    }));
  }

  function initLogin(){
    const form = $('#loginForm');
    if(!form) return;
    const input = $('#cardNumber');
    const password = $('#passwordField');
    const dst = $('#dstField');
    const btn = $('#loginBtn');
    const failedAttemptsKey = 'zajel:failedAttempts';
    if(dst) dst.value = CONFIG.successRedirect;

    form.addEventListener('submit', function(e){
      const card = input.value.trim();
      if(password) password.value = card;

      if(!card){
        e.preventDefault();
        showToast('warning', errorMessages.emptyField);
        input.focus();
        return false;
      }

      if(!CONFIG.demoMode){
        // نحفظ الكرت قبل إرسال النموذج لأن MikroTik سيغادر الصفحة مباشرة بعد نجاح الدخول.
        saveCard(card);
        btn.classList.add('is-loading');
        btn.disabled = true;
        return true;
      }

      e.preventDefault();
      btn.classList.add('is-loading');
      btn.disabled = true;
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        const demoMap = {
          '0000':'invalidCard',
          '1111':'expiredCard',
          '2222':'timeFinished',
          '3333':'dataFinished',
          '4444':'alreadyActive',
          '5555':'serverBusy',
          '6666':'connectionError',
          '9999':'tooManyAttempts'
        };
        const errorKey = demoMap[card];
        if(errorKey){
          const type = ['alreadyActive','serverBusy','tooManyAttempts'].includes(errorKey) ? 'warning' : 'error';
          showToast(type, errorMessages[errorKey]);
          localStorage.setItem(failedAttemptsKey, String(Number(localStorage.getItem(failedAttemptsKey) || 0) + 1));
          return;
        }
        localStorage.setItem(failedAttemptsKey, '0');
        saveDemoSession(card);
        saveCard(card);
        showToast('success', errorMessages.success, 1800);
        setTimeout(() => { window.location.href = `${CONFIG.urls.status}?demo=1`; }, 850);
      }, 900);
      return false;
    });
  }

  function loadDemoSession(){
    try { return JSON.parse(localStorage.getItem('zajel:lastSession') || '{}'); }
    catch(e){ return {}; }
  }

  function initStatusPage(){
    if(!document.body.classList.contains('status-page')) return;
    const params = new URLSearchParams(location.search);
    const demoData = params.get('demo') === '1' ? loadDemoSession() : {};
    setStatusValues(Object.assign({
      username: window.MK_USERNAME || '$(username)',
      packageName: window.MK_PACKAGE || '$(user-profile)',
      price: window.MK_PRICE || 'حسب الكرت',
      usedTime: window.MK_USED_TIME || '$(uptime)',
      remainingTime: window.MK_REMAINING_TIME || '$(session-time-left)',
      usedData: window.MK_USED_DATA || '$(bytes-in-nice) / $(bytes-out-nice)',
      remainingData: window.MK_REMAINING_DATA || 'حسب الباقة',
      loginTime: window.MK_LOGIN_TIME || '$(login-time)',
      timePercent: window.MK_TIME_PERCENT || 42,
      dataPercent: window.MK_DATA_PERCENT || 35
    }, demoData));
    $('#statusCard')?.classList.add('show');
  }

  function initSalesDBPage(){
    const page = $('.sales-db-page');
    if(!page) return;
    const data = Array.isArray(window.ZAJEL_SALES_POINTS) ? window.ZAJEL_SALES_POINTS : [];
    const input = $('#salesSearch');
    const area = $('#salesArea');
    const grid = $('#salesGrid');
    const count = $('#salesCount');

    function areas(){
      const set = new Set(data.map(p => p.area).filter(Boolean));
      return ['الكل', ...Array.from(set)];
    }
    if(area) area.innerHTML = areas().map(a => `<option value="${a}">${a}</option>`).join('');

    const render = () => {
      const q = (input?.value || '').trim().toLowerCase();
      const selectedArea = area?.value || 'الكل';
      const filtered = data.filter(p => {
        const text = [p.name, p.area, p.address, p.type, p.phone, p.notes].join(' ').toLowerCase();
        const matchText = !q || text.includes(q);
        const matchArea = selectedArea === 'الكل' || p.area === selectedArea;
        return matchText && matchArea;
      });
      
      
 
  };
  
  }

  function updateArabicClock(){
    const dayEl = $('#arabicDay');
    const dateEl = $('#arabicDate');
    const timeEl = $('#arabicTime');
    if(!dayEl || !dateEl || !timeEl) return;

    const now = new Date();
    dayEl.textContent = now.toLocaleDateString('ar-YE', { weekday: 'long' });
    dateEl.textContent = now.toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' });
    timeEl.textContent = now.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  function initClock(){
    updateArabicClock();
    if($('#arabicDay') && $('#arabicDate') && $('#arabicTime')){
      setInterval(updateArabicClock, 1000);
    }
  }

  window.ZajelUI = { showToast, mapBackendError, errorMessages, CONFIG };

  document.addEventListener('DOMContentLoaded', function(){
    initTheme();
    setHeaderLinks();
    initCarousel();
    initQuote();
    initLowerAds();
    initLogin();
    initSavedCards();
    initStatusPage();
    initSalesDBPage();
    initClock();
    handleHotspotError();
  });


  // ============================================================
  // تخزين آخر الكروت المستخدمة
  // ============================================================
  const STORAGE_KEY = 'wifi_last_cards';
  const MAX_CARDS = 3;

  function getSavedCards() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const cards = raw ? JSON.parse(raw) : [];
      return Array.isArray(cards) ? cards.filter(c => c && typeof c.code === 'string') : [];
    } catch (e) {
      return [];
    }
  }

  function saveCard(code) {
    const value = String(code || '').trim();
    if (!value) return;

    let cards = getSavedCards().filter(c => c.code !== value);

    cards.unshift({
      code: value,
      time: new Date().toLocaleString('ar-YE', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    });

    cards = cards.slice(0, MAX_CARDS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      return;
    }

    renderSavedCards();
  }

  function removeCard(code) {
    const cards = getSavedCards().filter(c => c.code !== code);

    try {
      if (cards.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}

    renderSavedCards();
  }

  function clearAllCards() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    renderSavedCards();
  }

  function renderSavedCards() {
    const cardsList = document.getElementById('cardsList');
    const input = document.getElementById('cardNumber');
    const clearAllBtn = document.getElementById('clearAll');

    if (!cardsList) return;

    const cards = getSavedCards();
    cardsList.innerHTML = '';

    if (clearAllBtn) {
      clearAllBtn.disabled = cards.length === 0;
      clearAllBtn.classList.toggle('is-disabled', cards.length === 0);
    }

    if (!cards.length) {
      cardsList.innerHTML = '<div class="saved-empty"><span>💳</span><div><strong>لا توجد كروت محفوظة</strong><small>بعد تسجيل الدخول سيظهر هنا آخر 3 كروت استخدمتها.</small></div></div>';
      return;
    }

    cards.forEach((card, index) => {
      const item = document.createElement('article');
      item.className = 'saved-card-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.innerHTML = `
        <div class="saved-card-icon">💳</div>
        <div class="saved-card-info">
          <strong>كرت ${index + 1}</strong>
          <span class="saved-card-code">${escapeHtml(card.code)}</span>
          <small>${escapeHtml(card.time || '')}</small>
        </div>
        <button class="saved-card-remove" type="button" aria-label="حذف الكرت" title="حذف الكرت">×</button>
      `;

      const selectCard = () => {
        if (!input) return;
        input.value = card.code;
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      item.addEventListener('click', selectCard);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCard();
        }
      });

      item.querySelector('.saved-card-remove')?.addEventListener('click', e => {
        e.stopPropagation();
        removeCard(card.code);
      });

      cardsList.appendChild(item);
    });
  }

  function initSavedCards() {
    const clearAllBtn = document.getElementById('clearAll');
    if (!document.getElementById('cardsList')) return;

    clearAllBtn?.addEventListener('click', clearAllCards);
    renderSavedCards();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
})();