(function(){
"use strict";
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   ЯНДЕКС.МЕТРИКА
   Впишите сюда номер счётчика — единственное место на весь сайт.
   Пока стоит 0, счётчик не подключается и цели молча не срабатывают.
   ============================================================ */
var METRIKA_ID = 0;

if(METRIKA_ID){
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=+new Date();
    k=e.createElement(t);a=e.getElementsByTagName(t)[0];
    k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
  })(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');

  ym(METRIKA_ID,'init',{
    clickmap:true,
    trackLinks:true,
    accurateTrackBounce:true,
    webvisor:true,
    trackHash:true
  });
}

/* Цель Метрики. Безопасно вызывать, даже если счётчик не подключён. */
function goal(name, params){
  if(!METRIKA_ID || typeof window.ym !== 'function') return;
  try{ window.ym(METRIKA_ID,'reachGoal',name,params); }catch(e){}
}

/* ---------- шапка: тень при скролле ---------- */
var head = document.querySelector('.site-head');
if(head){
  addEventListener('scroll', function(){
    head.classList.toggle('scrolled', scrollY > 8);
  }, {passive:true});
}

/* ---------- мобильное меню ---------- */
var burger = document.querySelector('.burger');
var menu = document.getElementById('mmenu');
if(burger && menu){
  burger.addEventListener('click', function(){
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded','false');
      document.body.style.overflow = '';
    });
  });
}

/* бегущая строка живёт в разметке — дублирована для бесшовного цикла */

/* ---------- появление при скролле ---------- */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  });
},{threshold:.18});
document.querySelectorAll('.reveal, .pop-card').forEach(function(el){ io.observe(el); });

/* ---------- звёзды в ночной секции ---------- */
var stars = document.querySelector('.night .stars');
if(stars){
  for(var i=0;i<26;i++){
    var s = document.createElement('i');
    s.style.left = (Math.random()*100)+'%';
    s.style.top = (Math.random()*100)+'%';
    s.style.animationDelay = (Math.random()*3)+'s';
    s.style.transform = 'scale('+(0.5+Math.random())+')';
    stars.appendChild(s);
  }
}

/* ---------- глаза следят за курсором ---------- */
var pupils = [].slice.call(document.querySelectorAll('.pupil'));
var mx = innerWidth/2, my = innerHeight/3, raf = null;
function movePupils(){
  raf = null;
  pupils.forEach(function(p){
    var r = p.parentElement.getBoundingClientRect();
    var cx = r.left + r.width/2, cy = r.top + r.height/2;
    var a = Math.atan2(my - cy, mx - cx);
    var d = Math.min(3.5, Math.hypot(mx-cx, my-cy)/40);
    p.style.transform = 'translate(calc(-50% + '+(Math.cos(a)*d).toFixed(1)+'px), calc(-50% + '+(Math.sin(a)*d).toFixed(1)+'px))';
  });
}
if(!reduced && pupils.length){
  addEventListener('mousemove', function(e){
    mx = e.clientX; my = e.clientY;
    if(!raf) raf = requestAnimationFrame(movePupils);
  }, {passive:true});
  /* на тачах — просто поглядывает по сторонам */
  if(matchMedia('(hover: none)').matches){
    setInterval(function(){
      mx = Math.random()*innerWidth; my = Math.random()*innerHeight;
      movePupils();
    }, 2600);
  }
}

/* ---------- чат-демо (главная) ---------- */
var log = document.getElementById('chatLog');
var suggest = document.getElementById('chatSuggest');
if(log && suggest){
  var dialogs = [
    {q:'Сколько стоит доставка по Москве?', a:'Курьером — 350 ₽, при заказе от 5 000 ₽ — бесплатно 🚚 Оформить заказ?'},
    {q:'До скольки принимаете заказы?', a:'Сегодня до 23:00 — ещё успеем доставить. Позже — оформлю на завтра, к нужному времени 📦'},
    {q:'Можно оплатить картой онлайн?', a:'Конечно! Пришлю ссылку на оплату прямо в чат — деньги сразу упадут в кассу магазина 💳'},
    {q:'А есть самовывоз?', a:'Да, бесплатно: ул. Пушкина, 10, ежедневно с 10:00 до 23:00. Соберём заказ за 30 минут 🛍️'}
  ];
  var busy = false;

  /* статичный диалог из разметки убираем — дальше проигрываем его с печатанием */
  log.innerHTML = '';

  /* свой ползунок прокрутки — родной скроллбар скрыт в CSS */
  var thumb = document.getElementById('chatThumb');
  function syncThumb(){
    if(!thumb) return;
    var sh = log.scrollHeight, ch = log.clientHeight;
    if(sh <= ch + 4){ thumb.classList.remove('on'); return; }
    thumb.classList.add('on');
    var h = Math.max(36, ch/sh*ch);
    var top = log.scrollTop/(sh - ch)*(ch - h);
    thumb.style.height = h+'px';
    thumb.style.transform = 'translateY('+top+'px)';
  }
  log.addEventListener('scroll', syncThumb, {passive:true});
  addEventListener('resize', syncThumb);
  if(thumb){
    var dragging = false, dragY = 0, startTop = 0;
    thumb.addEventListener('pointerdown', function(e){
      dragging = true; dragY = e.clientY; startTop = log.scrollTop;
      thumb.classList.add('drag');
      thumb.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    thumb.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var sh = log.scrollHeight, ch = log.clientHeight;
      var h = Math.max(36, ch/sh*ch);
      var free = ch - h;
      if(free <= 0) return;
      log.scrollTop = startTop + (e.clientY - dragY)*((sh - ch)/free);
    });
    var endDrag = function(){ dragging = false; thumb.classList.remove('drag'); };
    thumb.addEventListener('pointerup', endDrag);
    thumb.addEventListener('pointercancel', endDrag);
  }

  var now = function(){
    var d = new Date();
    return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  };
  var bubble = function(cls, html){
    var m = document.createElement('div');
    m.className = 'msg '+cls;
    m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    syncThumb();
    return m;
  };
  var playDialog = function(d, btn, done){
    busy = true;
    if(btn) btn.disabled = true;
    bubble('client', d.q);
    var wait1 = reduced ? 60 : 650;
    var wait2 = reduced ? 60 : 1100 + Math.random()*500;
    setTimeout(function(){
      var t = bubble('bot typing','<i></i><i></i><i></i>');
      setTimeout(function(){
        t.classList.remove('typing');
        t.innerHTML = d.a;
        var meta = document.createElement('div');
        meta.className = 'msg-meta';
        meta.textContent = 'прочитано · '+now();
        log.appendChild(meta);
        log.scrollTop = log.scrollHeight;
        syncThumb();
        busy = false;
        if(done) done();
      }, wait2);
    }, wait1);
  };
  /* чипы с вопросами */
  dialogs.slice(1).forEach(function(d){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'q-chip';
    b.textContent = d.q;
    b.addEventListener('click', function(){
      if(busy || b.disabled) return;
      playDialog(d, b);
    });
    suggest.appendChild(b);
  });

  /* первый диалог проигрывается сам, когда чат попал в кадр */
  var chatSeen = new IntersectionObserver(function(es){
    if(es[0].isIntersecting){
      chatSeen.disconnect();
      setTimeout(function(){ playDialog(dialogs[0]); }, reduced ? 100 : 900);
    }
  },{threshold:.4});
  chatSeen.observe(log);
}

/* ---------- калькулятор (главная) ---------- */
var rLeads = document.getElementById('rLeads'),
    rCheck = document.getElementById('rCheck'),
    oLeads = document.getElementById('oLeads'),
    oCheck = document.getElementById('oCheck'),
    lossOut = document.getElementById('lossOut');
if(rLeads && rCheck && lossOut){
  var fmt = new Intl.NumberFormat('ru-RU');
  var shown = 0, target = 0, animRaf = null;

  var fill = function(r){
    var pct = (r.value - r.min)/(r.max - r.min)*100;
    r.style.setProperty('--fill', pct+'%');
  };
  var render = function(){
    lossOut.textContent = '≈ '+fmt.format(Math.round(shown/100)*100)+' ₽';
  };
  var tick = function(){
    shown += (target - shown)*.18;
    if(Math.abs(target - shown) < 50){ shown = target; animRaf = null; }
    else animRaf = requestAnimationFrame(tick);
    render();
  };
  var calc = function(){
    fill(rLeads); fill(rCheck);
    oLeads.textContent = fmt.format(rLeads.value);
    oCheck.textContent = fmt.format(rCheck.value)+' ₽';
    /* 35% ночью × 60% не ждут × 30% конверсия */
    target = Math.round(rLeads.value * .35 * .6 * .3 * rCheck.value / 100)*100;
    if(reduced){ shown = target; render(); return; }
    if(!animRaf) animRaf = requestAnimationFrame(tick);
  };
  rLeads.addEventListener('input', calc);
  rCheck.addEventListener('input', calc);
  calc();
}

/* ---------- FAQ: вопрос — пузырь клиента, ответ «печатает» ассистент ---------- */
document.querySelectorAll('.fq').forEach(function(fq){
  var btn = fq.querySelector('.fq-q');
  var wrap = fq.querySelector('.fq-a');
  var bubble = fq.querySelector('.fq-bubble');
  var answered = false; /* печатаем только при первом открытии */
  btn.addEventListener('click', function(){
    var open = fq.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    if(!open){ wrap.style.maxHeight = 0; return; }
    if(answered || reduced){
      answered = true;
      wrap.style.maxHeight = wrap.scrollHeight+'px';
      return;
    }
    answered = true;
    var text = bubble.textContent;
    bubble.classList.add('typing');
    bubble.innerHTML = '<i></i><i></i><i></i>';
    wrap.style.maxHeight = wrap.scrollHeight+'px';
    setTimeout(function(){
      bubble.classList.remove('typing');
      bubble.textContent = text;
      /* не раскрываем обратно, если вопрос успели закрыть во время «печатания» */
      if(fq.classList.contains('open')) wrap.style.maxHeight = wrap.scrollHeight+'px';
    }, 700 + Math.random()*300);
  });
});

/* ---------- FAB: прячется рядом с CTA ---------- */
var fab = document.getElementById('fab');
var cta = document.getElementById('cta');
if(fab && cta){
  fab.addEventListener('click', function(){
    cta.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
  });
  var ctaWatch = new IntersectionObserver(function(es){
    fab.classList.toggle('hide', es[0].isIntersecting);
  },{threshold:.15});
  ctaWatch.observe(cta);
}

/* ---------- цели: клики по Telegram и телефону ---------- */
document.addEventListener('click', function(e){
  var a = e.target.closest && e.target.closest('a[href]');
  if(!a) return;
  var href = a.getAttribute('href') || '';
  if(href.indexOf('t.me/') > -1) goal('tg_click', {place: a.closest('.site-foot') ? 'footer' : 'page'});
  else if(href.indexOf('tel:') === 0) goal('phone_click');
}, true);

/* ---------- цель: пользовался калькулятором (один раз за визит) ---------- */
if(rLeads && rCheck){
  var calcCounted = false;
  var markCalc = function(){
    if(calcCounted) return;
    calcCounted = true;
    goal('calc_used');
  };
  rLeads.addEventListener('change', markCalc);
  rCheck.addEventListener('change', markCalc);
}

/* ---------- цель: долистал до тарифов ---------- */
var pricing = document.getElementById('pricing');
if(pricing){
  var priceWatch = new IntersectionObserver(function(es){
    if(es[0].isIntersecting){ priceWatch.disconnect(); goal('pricing_view'); }
  },{threshold:.3});
  priceWatch.observe(pricing);
}

/* ---------- форма заявки ---------- */
var form = document.getElementById('leadForm');
if(form && window.fetch){
  var statusEl = document.getElementById('formStatus');
  var submitBtn = form.querySelector('button[type=submit]');
  var sending = false;

  var say = function(text, cls){
    if(!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (cls ? ' ' + cls : '');
  };

  /* успех: форма и «или напишите сами» уступают место ответу */
  var showDone = function(){
    var card = form.closest('.lead-card');
    var done = document.createElement('div');
    done.className = 'lead-done';
    done.innerHTML = '<span class="tick" aria-hidden="true">✓</span>' +
      '<h4>Заявка принята</h4>' +
      '<p>Свяжемся в течение часа. Хотите быстрее — напишите в Telegram, он ниже.</p>';
    form.replaceWith(done);
    var or = card && card.querySelector('.lead-or span');
    if(or) or.textContent = 'а пока — можно написать';
  };

  form.addEventListener('submit', function(e){
    /* показываем подсветку незаполненного только после первой попытки */
    form.classList.add('tried');
    if(!form.checkValidity()) return;   /* дальше браузер сам покажет подсказки */

    e.preventDefault();
    if(sending) return;
    sending = true;
    submitBtn.disabled = true;
    say('Отправляем…');

    var fd = new FormData(form);
    fd.append('referrer', document.referrer || '');
    fd.append('url', location.href);

    fetch(form.action, {
      method: 'POST',
      headers: {'Accept': 'application/json'},
      body: new URLSearchParams(fd)
    })
    .then(function(r){ return r.json().catch(function(){ return {ok: r.ok}; }); })
    .then(function(d){
      if(!d || !d.ok) throw new Error((d && d.error) || 'fail');
      goal('lead_form', {page: fd.get('page') || ''});
      showDone();
    })
    .catch(function(){
      sending = false;
      submitBtn.disabled = false;
      say('Не удалось отправить — похоже, проблема со связью. Попробуйте ещё раз или напишите в Telegram, он чуть ниже.', 'err');
    });
  });
}
})();
