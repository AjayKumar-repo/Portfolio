/* THE THEME
   A spinning record in the corner plays the first minute of the song. Click the disc to play/pause;
   hover it (or press the controls button) for mute, volume and a timeline you can drag anywhere
   in the minute. The minute loops, fading out and back in at the seam so it never clicks.
   Browsers only allow sound after a gesture, so the first click anywhere on the page starts it
   (unless you have paused it yourself before; that choice is remembered). */
(function(){
  var el=document.getElementById('player');if(!el)return;
  var $=function(id){return document.getElementById(id)};
  var disc=$('pDisc'),play=$('pPlay'),mute=$('pMute'),vol=$('pVol'),seek=$('pSeek'),cur=$('pCur'),dur=$('pDur'),toggle=$('pToggle'),
      prg=el.querySelector('.prg'),CIRC=2*Math.PI*30;
  var SRC='assets/theme.mp3',a=window.__theme=new Audio();a.preload='none';a.loop=true;
  /* load the whole 1.2 MB clip into memory and play it from there: a blob is seekable anywhere on every server,
     whereas a plain file URL is only seekable if the host supports HTTP range requests (many dev servers don't) */
  var readyP=null,load=function(){return readyP||(readyP=fetch(SRC).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){a.src=URL.createObjectURL(b)}).catch(function(){a.src=SRC}))};
  // not at page load (it would compete with the fonts and scripts the first paint needs): once the intro is over and the browser is idle, or the moment someone presses play
  window.addEventListener('intro:done',function(){(window.requestIdleCallback||function(f){setTimeout(f,1500)})(load,{timeout:4000})});
  var userVol=.7,muted=false,userPaused=false,startAt=0,seeking=false,raf=0,armed=true,attempts=0,store=null;

  try{store=window.localStorage}catch(e){}
  try{var s=JSON.parse(store.getItem('ak-theme')||'{}');if(typeof s.v==='number')userVol=Math.max(0,Math.min(1,s.v));muted=!!s.m;userPaused=!!s.p}catch(e){}
  function save(){try{store.setItem('ak-theme',JSON.stringify({v:userVol,m:muted,p:userPaused}))}catch(e){}}

  var fmt=function(t){t=Math.max(0,t||0);var m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+(s<10?'0':'')+s};
  var LEN=60,D=function(){return isFinite(a.duration)&&a.duration>1?Math.min(a.duration,LEN):LEN}; // the clip is one minute, whatever the browser's estimate says

  /* the sound's envelope: quick fade-in whenever it starts and at every loop, fade-out before the seam */
  function envelope(){
    var t=a.currentTime,d=D(),e=1;
    e=Math.min(e,t/.45);                              // loop start
    e=Math.min(e,(d-t)/1.1);                          // loop end
    e=Math.min(e,(performance.now()-startAt)/900);    // just pressed play
    e=Math.max(0,Math.min(1,e));return e*e*(3-2*e);
  }
  function applyVolume(){a.muted=muted;a.volume=Math.max(0,Math.min(1,userVol*envelope()))}

  function paintUI(){
    var playing=!a.paused;
    el.dataset.state=playing?'playing':'paused';
    disc.setAttribute('aria-pressed',playing);disc.setAttribute('aria-label',playing?'Pause theme music':'Play theme music');
    play.setAttribute('aria-label',playing?'Pause':'Play');
    var off=muted||userVol===0;
    el.dataset.muted=off?'1':'0';mute.setAttribute('aria-label',off?'Unmute':'Mute');mute.setAttribute('aria-pressed',off);
    var pct=Math.round(userVol*100);vol.value=pct;vol.style.setProperty('--p',(muted?0:pct)+'%');
  }
  function paintTime(){
    var t=a.currentTime,d=D();
    if(!seeking){seek.max=d;seek.value=t;seek.style.setProperty('--p',(t/d*100)+'%')}
    cur.textContent=fmt(seeking?+seek.value:t);dur.textContent=fmt(d);
    prg.style.strokeDashoffset=CIRC*(1-Math.min(1,t/d));
  }
  function tick(){raf=0;applyVolume();paintTime();if(!a.paused)raf=requestAnimationFrame(tick)}
  function kick(){if(!raf)raf=requestAnimationFrame(tick)}

  function doPlay(user){
    if(user){userPaused=false;save()}
    startAt=performance.now();applyVolume();
    load().then(function(){
      var p=a.play();
      if(p&&p.catch)p.catch(function(){paintUI()});   // blocked by the autoplay policy: stay paused, wait for a gesture
    });
  }
  function doPause(user){if(user){userPaused=true;save()}a.pause()}
  function toggleMusic(){a.paused?doPlay(true):doPause(true)}

  a.addEventListener('play',function(){paintUI();kick()});
  a.addEventListener('pause',function(){paintUI();paintTime()});
  a.addEventListener('loadedmetadata',function(){seek.max=D();dur.textContent=fmt(D());paintTime()});
  a.addEventListener('timeupdate',function(){if(a.paused)paintTime()});

  disc.addEventListener('click',toggleMusic);
  play.addEventListener('click',toggleMusic);
  mute.addEventListener('click',function(){
    if(muted||userVol===0){muted=false;if(userVol===0)userVol=.5}else muted=true;
    save();applyVolume();paintUI()});
  vol.addEventListener('input',function(){userVol=vol.value/100;if(userVol>0)muted=false;save();applyVolume();paintUI()});
  var endSeek=function(){seeking=false;paintTime()};
  seek.addEventListener('pointerdown',function(){seeking=true});
  seek.addEventListener('input',function(){seeking=true;a.currentTime=+seek.value;seek.style.setProperty('--p',(seek.value/D()*100)+'%');cur.textContent=fmt(+seek.value);prg.style.strokeDashoffset=CIRC*(1-seek.value/D());applyVolume()});
  seek.addEventListener('change',endSeek);seek.addEventListener('pointerup',endSeek);seek.addEventListener('keyup',endSeek);
  toggle.addEventListener('click',function(){var o=el.classList.toggle('open');toggle.setAttribute('aria-expanded',o)});
  var closeDeck=function(){el.classList.remove('open');toggle.setAttribute('aria-expanded','false')};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeDeck();if(el.contains(document.activeElement))document.activeElement.blur()}});
  document.addEventListener('pointerdown',function(e){if(el.classList.contains('open')&&!el.contains(e.target))closeDeck()});   // tap anywhere else to tuck the controls away

  /* first gesture anywhere starts the music (browsers won't allow sound before one) */
  function gesture(e){
    if(!armed)return;
    if(e.type==='keydown'&&/^(Tab|Shift|Control|Alt|Meta|Escape|CapsLock)$/.test(e.key))return;
    if(el.contains(e.target)){armed=false;return}      // they are using the player itself: that wins
    if(userPaused){armed=false;return}                  // they paused it before: respect that
    attempts++;doPlay(false);
    setTimeout(function(){if(!a.paused||attempts>=3){armed=false;off()}},400);
  }
  function off(){window.removeEventListener('pointerdown',gesture,true);window.removeEventListener('keydown',gesture,true)}
  window.addEventListener('pointerdown',gesture,true);window.addEventListener('keydown',gesture,true);

  /* a gentle nudge toward the disc once the intro is over */
  var nudge=function(){if(a.paused&&!userPaused){el.classList.add('hint');setTimeout(function(){el.classList.remove('hint')},9000)}};
  window.addEventListener('intro:done',function(){setTimeout(nudge,1200)});
  a.addEventListener('play',function(){el.classList.remove('hint')});

  paintUI();paintTime();
})();
