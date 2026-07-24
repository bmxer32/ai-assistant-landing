(function(){
"use strict";
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/* ---------- бегущая строка ---------- */
var phrases = ['⚡ ответ за 3 секунды','🌙 работает, пока вы спите','✅ ни одной потерянной заявки','📅 записывает клиентов','💬 telegram · whatsapp · сайт · avito','🧠 знает ваш бизнес наизусть'];
var track = document.getElementById('tickerTrack');
if(track){
  var half = phrases.map(function(p){return '<span>'+p+'</span>';}).join('');
  track.innerHTML = half + half; /* дубль для бесшовного цикла */
}

/* ---------- появление при скролле ---------- */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  });
},{threshold:.18});
document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

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
    {q:'Вы завтра работаете? Хочу записаться', a:'Да, с 10:00 до 19:00. Есть окно в 12:30 — записать вас? 📅'},
    {q:'Сколько стоит стрижка + борода?', a:'Стрижка + борода — 1 500 ₽. Могу записать на сегодня в 18:00 ✂️'},
    {q:'А вы точно не робот?', a:'Робот, но обученный: отвечаю строго по прайсу компании и ничего не выдумываю. Сложный вопрос сразу передам живому менеджеру 😉'}
  ];
  var busy = false;

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

/* ---------- FAQ ---------- */
document.querySelectorAll('.qa').forEach(function(qa){
  var btn = qa.querySelector('.qa-btn');
  var body = qa.querySelector('.qa-body');
  btn.addEventListener('click', function(){
    var open = qa.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    body.style.maxHeight = open ? body.scrollHeight+'px' : 0;
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
})();
