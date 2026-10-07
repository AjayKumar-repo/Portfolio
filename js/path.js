/* THE PATH
   A film strip of six chapters hangs under the clock; the clock's light beam sweeps to whichever
   frame you point at, and one fixed-size "projection screen" shows the chosen chapter in full.
   Selecting never flips, grows or scrolls anything — the screen already reserves the height of
   its tallest chapter, so the only things that move are the beam, the notch and the text. */
(function(){
  var stage=document.getElementById('clockstage');if(!stage)return;
  var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};
  var strip=$('#strip'),frames=$$('.cframe',strip),details=$$('.detail',stage),screen=$('#screen'),notch=$('#notch'),
      artEl=$('#screenArt'),artBox=$('.s-art .box',stage),sCount=$('#sCount'),sType=$('#sType'),prevB=$('#prevBtn'),nextB=$('#nextBtn');
  var N=frames.length,cur=N-1,lit=cur,hasG=!!window.gsap;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches,desktop=window.matchMedia('(min-width:901px)');
  var pad=function(n){return n<10?'0'+n:''+n};

  /* ---------- clock: decorative ticks (drawn once) ---------- */
  var ticksG=$('#clockTicks');
  if(ticksG&&!ticksG.childNodes.length){
    var CX=500,CY=90,R=460,frag=document.createDocumentFragment();
    for(var d=0;d<360;d+=6){
      var quarter=d%90===0,a=d*Math.PI/180,r1=R-10,r2=quarter?R-38:(d%30===0?R-30:R-18);
      var ln=document.createElementNS('http://www.w3.org/2000/svg','line');
      ln.setAttribute('x1',(CX+Math.cos(a)*r1).toFixed(1));ln.setAttribute('y1',(CY+Math.sin(a)*r1).toFixed(1));
      ln.setAttribute('x2',(CX+Math.cos(a)*r2).toFixed(1));ln.setAttribute('y2',(CY+Math.sin(a)*r2).toFixed(1));
      if(quarter)ln.setAttribute('class','q');
      frag.appendChild(ln);
    }
    ticksG.appendChild(frag);
  }

  /* ---------- clock: the hub and the beam ---------- */
  var dyn=$('#clockDynamic'),hand=$('#clockHand'),handGlow=$('#clockHandGlow'),hub=$('#clockHub'),hubDot=$('#clockHubDot'),
      hubCross=$('#clockHubCross'),handGrad=$('#handGrad'),bc=$('#beamCanvas'),bx=bc&&bc.getContext('2d');
  var HUB={x:0,y:0},anchors=[],beamT={x:0,y:0},lastW=-1,lastH=-1;

  // the hub (the "ball" the beam fires from) only moves when the stage's WIDTH genuinely changes.
  // Anchors are read from layout offsets, not bounding rects, so hover lifts and scroll never nudge them.
  function measure(){
    var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    anchors=frames.map(function(f){return {x:strip.offsetLeft+f.offsetLeft+f.offsetWidth/2,y:strip.offsetTop+f.offsetTop,w:f.offsetWidth}});
    if(w!==lastW||h!==lastH){
      dyn.setAttribute('viewBox','0 0 '+w+' '+h);dyn.setAttribute('width',w);dyn.setAttribute('height',h);sizeBeam(w,h);
      if(Math.abs(w-lastW)>=2){
        HUB.x=Math.round(w*.5);HUB.y=Math.round((w/1000)*90); // same relative spot as the decorative pivot (500,90 of 1000x400)
        [hub,hubDot].forEach(function(e){e.setAttribute('cx',HUB.x);e.setAttribute('cy',HUB.y)});
        hubCross.setAttribute('transform','translate('+HUB.x+','+HUB.y+')');
        stage.style.setProperty('--hx',HUB.x+'px');stage.style.setProperty('--hy',HUB.y+'px');
      }
      lastW=w;lastH=h;
    }
  }
  /* the beam is light, not geometry: every pixel's brightness is computed (a gaussian cone from the hub that
     thins out toward the frame, plus a soft pool where it lands) onto a small canvas the browser smooths up
     to full size. There is no polygon, so there is no edge anywhere for the eye to catch. */
  var BS=.4,bimg=null,bnoise=null,BELL=new Float32Array(256),POOL=new Float32Array(256);
  (function(){
    var e1=Math.exp(-5.29),r0=.3,pf=function(r){return 1/Math.pow(1+Math.pow(r/r0,2),1.25)},p0=pf(0),p1=pf(1);
    for(var i=0;i<256;i++){var u=i/255;BELL[i]=Math.max(0,(Math.exp(-Math.pow(2.3*u,2))-e1)/(1-e1));POOL[i]=Math.max(0,(pf(u)-p1)/(p0-p1))}
  })();
  function sizeBeam(w,h){
    if(!bc)return;
    bc.width=Math.max(2,Math.ceil(w*BS));bc.height=Math.max(2,Math.ceil(h*BS));
    bimg=bx.createImageData(bc.width,bc.height);
    bnoise=new Float32Array(bc.width*bc.height);for(var i=0;i<bnoise.length;i++)bnoise[i]=Math.random()-.5; // fixed dither: no 8-bit contour lines
  }
  function drawBeam(){
    if(!bx||!bimg||!anchors[lit])return;
    var d8=bimg.data;d8.fill(0);
    var tx=beamT.x,ty=beamT.y,dx=tx-HUB.x,dy=ty-HUB.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
    var info=window.__eyeInfo?window.__eyeInfo():null,dk=info?info.w:0,s0=dk*(info?info.r:0)*.6;   // docked: the cone starts at the iris, not the hub
    var ox=HUB.x+ux*s0,oy=HUB.y+uy*s0;len=Math.max(1,len-s0);
    var tip=anchors[lit].w*.6,h0=6+dk*14,AC=.62,AP=.46,inv=1/BS,cw=bc.width,ch=bc.height,pad=tip*1.7+24;
    var x0=Math.max(0,Math.floor((Math.min(HUB.x,tx)-pad)*BS)),x1=Math.min(cw,Math.ceil((Math.max(HUB.x,tx)+pad)*BS)),
        y0=Math.max(0,Math.floor((Math.min(HUB.y,ty)-pad)*BS)),y1=Math.min(ch,Math.ceil((Math.max(HUB.y,ty)+pad)*BS));
    for(var j=y0;j<y1;j++){
      var ry=(j+.5)*inv-oy;
      for(var k=x0;k<x1;k++){
        var rx=(k+.5)*inv-ox,d=rx*ux+ry*uy,l=ry*ux-rx*uy,I=0;
        if(d>0&&d<len*1.1){                                // the cone: narrow and bright at the lamp, wide and faint at the frame
          var u=d/len,w=h0+(tip-h0)*Math.pow(u,.8),q=(l<0?-l:l)/w;
          if(q<1){var fall=u<1?(1-u)*.7+.3:Math.max(0,(1.1-u)/.1)*.3,lead=d<36?d/36:1;I=AC*BELL[(q*255)|0]*fall*lead*lead*(3-2*lead)}
        }
        var pa=(d-len)/(tip*.9),pl=l/(tip*1.35),rr=Math.sqrt(pa*pa+pl*pl); // the pool of light on the frame
        if(rr<1)I+=AP*POOL[(rr*255)|0];
        var n=j*cw+k,o=n*4,a=I*255+bnoise[n];
        d8[o]=255;d8[o+1]=190;d8[o+2]=60;d8[o+3]=a<0?0:a>255?255:a+.5;
      }
    }
    bx.putImageData(bimg,0,0);
  }
  // the eye already tracks the hub's viewport position every frame; the beam's end is just an offset from it, so no layout read is needed here
  window.__eyeAimPx=function(){var h=window.__eyeHubPx;return h?{x:h.x+beamT.x-HUB.x,y:h.y+beamT.y-HUB.y}:null};
  window.__eyeDockCb=function(){drawBeam()};
  function render(){
    var dx=beamT.x-HUB.x,dy=beamT.y-HUB.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
    var hl=Math.min(len-14,HUB.y*.94),x2=HUB.x+ux*hl,y2=HUB.y+uy*hl;
    [hand,handGlow,handGrad].forEach(function(e){e.setAttribute('x1',HUB.x);e.setAttribute('y1',HUB.y);e.setAttribute('x2',x2);e.setAttribute('y2',y2)}); // the hand fades out along its length
    drawBeam();
  }
  // quickTo = a continuously retargetable, velocity-aware tween: sweeping across several frames
  // re-aims mid-flight instead of restarting from a dead stop, so the beam never feels jerky
  var qx=hasG?gsap.quickTo(beamT,'x',{duration:.75,ease:'power3',onUpdate:render}):null,
      qy=hasG?gsap.quickTo(beamT,'y',{duration:.75,ease:'power3'}):null;
  function aim(i,instant){
    var a=anchors[i];if(!a)return;
    lit=i;
    frames.forEach(function(f,k){f.classList.toggle('lit',k===i)});
    if(instant||!qx||!desktop.matches||reduce){beamT.x=a.x;beamT.y=a.y;render()}else{qx(a.x);qy(a.y)}
  }

  /* ---------- the screen ---------- */
  function placeNotch(){
    var f=frames[cur];if(!f||!screen)return;
    var x=strip.offsetLeft+f.offsetLeft+f.offsetWidth/2-screen.offsetLeft;
    notch.style.transform='translateX('+Math.round(x)+'px)';
  }
  function reveal(from,to,dir){
    var out=details[from],inc=details[to];
    if(out&&out!==inc){out.style.setProperty('--ox',(-dir*26)+'px');out.classList.remove('on')}
    // park the incoming chapter just off to the side with transitions off, commit that, then let it glide in
    inc.classList.add('noanim');inc.style.setProperty('--ox',(dir*26)+'px');void inc.offsetWidth;
    inc.classList.remove('noanim');inc.classList.add('on');
  }
  function select(i,first){
    if(i<0||i>=N)return;
    if(i===cur&&!first){aim(i);return}
    var dir=i>=cur?1:-1,f=frames[i];
    frames.forEach(function(fr,k){var on=k===i;fr.classList.toggle('sel',on);fr.setAttribute('aria-selected',on?'true':'false');fr.tabIndex=on?0:-1});
    if(!first)reveal(cur,i,dir);
    cur=i;
    sCount.textContent='Chapter '+pad(i+1)+' / '+pad(N);sType.textContent=details[i].dataset.type||'';
    prevB.disabled=i===0;nextB.disabled=i===N-1;
    placeNotch();
    if(!first&&window.Thumbs){
      artBox.classList.remove('swap');void artBox.offsetWidth;artBox.classList.add('swap');
      setTimeout(function(){window.Thumbs.retarget(artEl,f.dataset.key)},reduce?0:260);
    }
    aim(i,first);
    if(!desktop.matches&&strip.scrollTo){ // phones: the strip scrolls sideways, keep the chosen frame centred
      strip.scrollTo({left:f.offsetLeft-(strip.clientWidth-f.offsetWidth)/2,behavior:reduce?'auto':'smooth'});
    }
  }

  frames.forEach(function(f,i){
    f.addEventListener('click',function(){select(i)});
    f.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'&&desktop.matches)aim(i)});
    f.addEventListener('focus',function(){aim(i)});
    f.addEventListener('keydown',function(e){
      var k=e.key,n=k==='ArrowRight'?i+1:k==='ArrowLeft'?i-1:k==='Home'?0:k==='End'?N-1:null; // Up/Down stay free to scroll the page
      if(n==null)return;e.preventDefault();n=Math.max(0,Math.min(N-1,n));select(n);frames[n].focus();
    });
  });
  prevB.addEventListener('click',function(){select(cur-1)});
  nextB.addEventListener('click',function(){select(cur+1)});

  /* ---------- layout sync ---------- */
  var raf=0;
  function relayout(){raf=0;measure();placeNotch();aim(lit,true)}
  function queue(){if(!raf)raf=requestAnimationFrame(relayout)}
  if(window.ResizeObserver)new ResizeObserver(queue).observe(stage);else window.addEventListener('resize',queue);
  if(desktop.addEventListener)desktop.addEventListener('change',queue);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(queue);
  window.addEventListener('load',queue);

  measure();select(cur,true);
  notch.style.transition='none';placeNotch();void notch.offsetWidth;notch.style.transition='';

  /* ---------- entrance (only transforms/opacity, cleared afterwards so CSS owns the resting state) ---------- */
  function entrance(){
    if(!hasG||!window.ScrollTrigger||reduce)return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.side-list,.clock-decor',{opacity:0,duration:1.4,ease:'power2.out',scrollTrigger:{trigger:stage,start:'top 75%'}});
    gsap.from(frames,{y:46,opacity:0,duration:1,stagger:.08,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:strip,start:'top 88%'}});
    gsap.from(screen,{y:40,opacity:0,duration:1.1,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:screen,start:'top 94%'}});
  }
  // created after everything above has settled, so pinned sections higher up the page are already counted
  if(document.readyState==='complete')entrance();else window.addEventListener('load',entrance);
})();
