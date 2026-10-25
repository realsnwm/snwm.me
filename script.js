document.body.classList.add('loading');

const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loaderBar');
const loaderPct = document.getElementById('loaderPct');

const counted = new WeakSet();
function animateCount(el){
  if(counted.has(el)) return;
  counted.add(el);
  const target = Number(el.dataset.count || 0);
  const suffix = el.dataset.suffix || '';
  const start = performance.now();
  const duration = 1350;

  function tick(now){
    const p = Math.min(1,(now-start)/duration);
    const eased = 1-Math.pow(1-p,4);
    el.textContent = Math.floor(target*eased) + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const revealEls = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    io.unobserve(entry.target);

    const stat = entry.target.matches('[data-count]')
      ? entry.target
      : entry.target.querySelector('[data-count]');
    if(stat) animateCount(stat);
  });
},{threshold:.12,rootMargin:'0px 0px -8% 0px'});

let revealsStarted = false;
function startRevealSystem(){
  if(revealsStarted) return;
  revealsStarted = true;

  revealEls.forEach(function(el){
    const r = el.getBoundingClientRect();
    if(r.top < innerHeight * .92 && r.bottom > 0){
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          el.classList.add('visible');
          const stat = el.matches('[data-count]') ? el : el.querySelector('[data-count]');
          if(stat) animateCount(stat);
        });
      });
    } else {
      io.observe(el);
    }
  });
}

let progress = 0;
const loaderTimer = setInterval(function(){
  progress += Math.max(2, Math.round((100-progress)*0.14));
  if(progress > 100) progress = 100;
  loaderBar.style.width = progress + '%';
  loaderPct.textContent = progress + '%';

  if(progress >= 100){
    clearInterval(loaderTimer);
    setTimeout(function(){
      loader.classList.add('done');
      document.body.classList.remove('loading');

      requestAnimationFrame(function(){
        document.body.classList.add('site-ready');
        startRevealSystem();
      });
    },260);
  }
},45);

async function hydrateB64Icons(){
  const icons = Array.from(document.querySelectorAll('.b64-icon[data-b64]'));
  await Promise.all(icons.map(async function(img){
    try{
      const res = await fetch(img.dataset.b64,{cache:'no-store'});
      if(!res.ok) throw new Error('icon file unavailable');
      const b64 = (await res.text()).replace(/\s+/g,'');
      await new Promise(function(resolve,reject){
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'data:image/webp;base64,' + b64;
      });
      img.classList.add('loaded');
    }catch(err){
      console.warn('Could not load icon',img.dataset.b64);
    }
  }));
}
hydrateB64Icons();

const viewAllBtn = document.getElementById('viewAllBtn');
const currentGrid = document.getElementById('currentGrid');
viewAllBtn.addEventListener('click',function(){
  const open = viewAllBtn.getAttribute('aria-expanded') === 'true';
  viewAllBtn.setAttribute('aria-expanded',String(!open));
  currentGrid.classList.toggle('expanded',!open);
  viewAllBtn.childNodes[0].nodeValue = open ? 'View all 7 ' : 'Show less ';

  if(!open){
    requestAnimationFrame(function(){
      currentGrid.querySelectorAll('.extra-current').forEach(function(el,index){
        setTimeout(function(){ el.classList.add('visible'); },index*85);
      });
    });
  }
});

const topbar = document.querySelector('.topbar');
addEventListener('scroll',function(){
  topbar.classList.toggle('scrolled',scrollY > 24);
},{passive:true});

const cursorGlow = document.getElementById('cursorGlow');
if(matchMedia('(pointer:fine)').matches){
  let gx = innerWidth/2, gy = innerHeight/2, tx = gx, ty = gy;
  cursorGlow.style.opacity = '1';

  addEventListener('pointermove',function(e){
    tx=e.clientX;
    ty=e.clientY;
  },{passive:true});

  function glowLoop(){
    gx += (tx-gx)*.085;
    gy += (ty-gy)*.085;
    cursorGlow.style.left = gx+'px';
    cursorGlow.style.top = gy+'px';
    requestAnimationFrame(glowLoop);
  }
  glowLoop();
}

const bigProject = document.querySelector('.big-project');
if(bigProject && matchMedia('(pointer:fine)').matches){
  bigProject.addEventListener('pointermove',function(e){
    const r = bigProject.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width-.5;
    const y = (e.clientY-r.top)/r.height-.5;
    bigProject.style.transform =
      'translateY(-8px) perspective(900px) rotateX('+(-y*2.5)+'deg) rotateY('+(x*2.5)+'deg)';
  });
  bigProject.addEventListener('pointerleave',function(){
    bigProject.style.transform='';
  });
}

const statuses = {
  online:'online',
  idle:'idle',
  dnd:'do not disturb',
  offline:'offline'
};

async function loadDiscord(){
  try{
    const res = await fetch('https://api.lanyard.rest/v1/users/1163055480046878720',{
      cache:'no-store',
      signal:AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined
    });
    if(!res.ok) throw new Error('presence unavailable');

    const json = await res.json();
    if(!json.success || !json.data) throw new Error('presence unavailable');

    const data = json.data;
    const user = data.discord_user;
    const status = data.discord_status || 'offline';

    document.getElementById('discordName').textContent =
      user.global_name || user.display_name || 'Snowman';
    document.getElementById('discordStatus').textContent =
      statuses[status] || status;

    const dot = document.getElementById('statusDot');
    dot.className = 'status-dot '+status;

    if(user.avatar){
      const ext = user.avatar.indexOf('a_')===0 ? 'gif' : 'webp';
      const url =
        'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.'+ext+'?size=256';
      const img = document.getElementById('discordAvatar');

      img.onload=function(){
        img.style.display='block';
        document.getElementById('avatarFallback').style.display='none';
      };
      img.src=url;
    }
  }catch(err){
    document.getElementById('discordStatus').textContent='status unavailable';
  }
}

loadDiscord();
let discordTimer = setInterval(function(){
  if(!document.hidden) loadDiscord();
},30000);

document.addEventListener('visibilitychange',function(){
  if(!document.hidden) loadDiscord();
});

const params = new URLSearchParams(location.search);
if(params.get('sent')==='1'){
  document.getElementById('workForm').hidden=true;
  document.getElementById('sentState').hidden=false;
}

document.getElementById('sendAnother').addEventListener('click',function(){
  const url = new URL(location.href);
  url.searchParams.delete('sent');
  history.replaceState({},'',url.pathname+url.hash);
  document.getElementById('sentState').hidden=true;
  document.getElementById('workForm').hidden=false;
});

document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if(el){
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
});
