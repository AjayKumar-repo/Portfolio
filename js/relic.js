/* THE SENTINEL EYE
   A neural-network sphere with an iris that watches your cursor, orbited by runic rings.
   It keeps to the margins as it flows down the page, behind the text, with a pulse of
   "thought" travelling through its synapses and a comet trail while it moves.
   Drag to spin it; click to shatter it: it detonates into embers with a chromatic-aberration
   shockwave, then heals itself at once, every time. */
(function(){
  if(!window.THREE||!window.gsap)return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas=document.getElementById('relic'),renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:false,powerPreference:'high-performance'})}catch(e){canvas.remove();return}
  var DPR=Math.min(window.devicePixelRatio||1,1.25),qual=1; // qual steps down automatically if frames run slow
  renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);
  var scene=new THREE.Scene(),FOV=35,CZ=6;
  var camera=new THREE.PerspectiveCamera(FOV,1,.1,50);camera.position.z=CZ;
  var rt=new THREE.WebGLRenderTarget(4,4,{format:THREE.RGBAFormat}); // no MSAA: the cheapest part of this scene is the offscreen buffer, keep it that way

  var U={uBreak:{value:0},uTime:{value:0},uPx:{value:DPR},uS:{value:1},uPulse:{value:0}};
  var DISP='vec3 disp(vec3 p,vec3 r,float e){vec3 d=normalize(p+r*.2-.1);return p+d*e*(1.4+r.x*3.6)+(r-.5)*e*2.2;}';

  /* ---------- neural sphere: nodes + edges ---------- */
  function fib(n,R,jit,out){for(var i=0;i<n;i++){var y=1-(i+.5)/n*2,r=Math.sqrt(1-y*y),th=i*2.399963;
      out.push([Math.cos(th)*r*R+(Math.random()-.5)*jit,y*R+(Math.random()-.5)*jit,Math.sin(th)*r*R+(Math.random()-.5)*jit])}}
  var nodes=[],shell=[];
  fib(230,1,.05,nodes);nodes.forEach(function(){shell.push(0)});
  var inner=[];fib(70,.62,.05,inner);inner.forEach(function(p){nodes.push(p);shell.push(1)});
  var N=nodes.length,rnd=nodes.map(function(){return [Math.random(),Math.random(),Math.random()]});
  var pPos=new Float32Array(N*3),pRnd=new Float32Array(N*3),pSize=new Float32Array(N);
  nodes.forEach(function(p,i){pPos.set(p,i*3);pRnd.set(rnd[i],i*3);pSize[i]=(shell[i]?.9:1.15)+Math.random()*.7+(Math.random()<.07?1.8:0)});
  var edgePos=[],edgeRnd=[],seen={};
  for(var i=0;i<N;i++){var ds=[];for(var j=0;j<N;j++){if(i===j||shell[i]!==shell[j])continue;
      var dx=nodes[i][0]-nodes[j][0],dy=nodes[i][1]-nodes[j][1],dz=nodes[i][2]-nodes[j][2];ds.push([dx*dx+dy*dy+dz*dz,j])}
    ds.sort(function(a,b){return a[0]-b[0]});
    for(var k=0;k<3;k++){var j2=ds[k][1],key=Math.min(i,j2)*1000+Math.max(i,j2);if(seen[key])continue;seen[key]=1;
      edgePos.push(nodes[i][0],nodes[i][1],nodes[i][2],nodes[j2][0],nodes[j2][1],nodes[j2][2]);
      edgeRnd.push(rnd[i][0],rnd[i][1],rnd[i][2],rnd[j2][0],rnd[j2][1],rnd[j2][2])}}
  // a few long "synapse" links between shells
  for(var s=0;s<26;s++){var a=Math.floor(Math.random()*230),b=230+Math.floor(Math.random()*70);
    edgePos.push(nodes[a][0],nodes[a][1],nodes[a][2],nodes[b][0],nodes[b][1],nodes[b][2]);
    edgeRnd.push(rnd[a][0],rnd[a][1],rnd[a][2],rnd[b][0],rnd[b][1],rnd[b][2])}

  var pointVS=DISP+[
    'attribute vec3 aRand;attribute float aSize;uniform float uBreak,uTime,uPx,uS,uPulse;varying float vTw;varying float vF;varying float vP;',
    'void main(){float rad=length(position);vec3 p=position*(1.+.018*sin(uTime*1.4+aRand.y*6.283));p=disp(p,aRand,uBreak);',
    ' vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;vec4 oc=modelViewMatrix*vec4(0.,0.,0.,1.);',
    ' float rr=length(mv.xy-oc.xy)/max(uS,.001);vF=(mv.z>oc.z-.05)?mix(.1,1.,smoothstep(.4,.66,rr)):1.;vF=mix(vF,1.,uBreak);',
    ' vP=pow(max(0.,sin(rad*7.-uPulse*6.2832)),10.);',
    ' vTw=.5+.5*sin(uTime*2.+aRand.x*20.);gl_PointSize=aSize*uPx*uS*(1.+uBreak*.7+vP*1.6)*62./-mv.z;}'].join('\n');
  var pointFS=['precision highp float;varying float vTw;varying float vF;varying float vP;uniform float uBreak;',
    'void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;',
    ' vec3 base=mix(vec3(.98,.60,.08),vec3(1.,.92,.62),vTw*.55)*a*(.55+.5*vTw)*(1.-uBreak*.2)*vF;',
    ' vec3 c=base+vec3(1.,.92,.65)*vP*a*vF*1.4;gl_FragColor=vec4(c,1.);}'].join('\n');
  var pointMat=new THREE.ShaderMaterial({uniforms:U,vertexShader:pointVS,fragmentShader:pointFS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  var lineVS=DISP+['attribute vec3 aRand;uniform float uBreak,uS,uTime,uPulse;varying float vF;varying float vP;',
    'void main(){float rad=length(position);vec3 p=disp(position,aRand,uBreak);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;vec4 oc=modelViewMatrix*vec4(0.,0.,0.,1.);',
    ' float rr=length(mv.xy-oc.xy)/max(uS,.001);vF=(mv.z>oc.z-.05)?mix(.05,1.,smoothstep(.4,.7,rr)):1.;vF=mix(vF,1.,uBreak);',
    ' vP=pow(max(0.,sin(rad*7.-uPulse*6.2832)),10.);}'].join('\n');
  var lineMat=new THREE.ShaderMaterial({uniforms:U,vertexShader:lineVS,
    fragmentShader:'precision highp float;uniform float uBreak;varying float vF;varying float vP;void main(){vec3 c=vec3(.98,.62,.10)*.3*(1.-uBreak*.8)*vF+vec3(1.,.9,.6)*vP*vF*1.1;gl_FragColor=vec4(c,1.);}',
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});

  var rig=new THREE.Group();scene.add(rig);
  var g1=new THREE.BufferGeometry();g1.setAttribute('position',new THREE.BufferAttribute(pPos,3));g1.setAttribute('aRand',new THREE.BufferAttribute(pRnd,3));g1.setAttribute('aSize',new THREE.BufferAttribute(pSize,1));
  rig.add(new THREE.Points(g1,pointMat));
  var g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(edgePos,3));g2.setAttribute('aRand',new THREE.Float32BufferAttribute(edgeRnd,3));
  rig.add(new THREE.LineSegments(g2,lineMat));

  /* ---------- runic rings (dashed orbits + glyph beads) ---------- */
  var rings=[];
  [[1.5,[1.2,.2,0],.55],[1.85,[.3,0,1.1],-.4],[2.25,[.85,-.8,0],.3]].forEach(function(d,idx){
    var grp=new THREE.Group(),pts=[];for(var i=0;i<=200;i++){var t=i/200*6.2832;pts.push(new THREE.Vector3(Math.cos(t)*d[0],Math.sin(t)*d[0],0))}
    var lg=new THREE.BufferGeometry().setFromPoints(pts);
    var lm=new THREE.LineDashedMaterial({color:0xf5b41f,dashSize:.12+.05*idx,gapSize:.07+.04*idx,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false});
    var line=new THREE.Line(lg,lm);line.computeLineDistances();grp.add(line);
    var bn=[18,26,34][idx],bp=new Float32Array(bn*3),br=new Float32Array(bn*3),bs=new Float32Array(bn);
    for(var b=0;b<bn;b++){var th=b/bn*6.2832;bp.set([Math.cos(th)*d[0],Math.sin(th)*d[0],0],b*3);br.set([Math.random(),Math.random(),Math.random()],b*3);bs[b]=b%6===0?3.2:1.4}
    var bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(bp,3));bg.setAttribute('aRand',new THREE.BufferAttribute(br,3));bg.setAttribute('aSize',new THREE.BufferAttribute(bs,1));
    grp.add(new THREE.Points(bg,pointMat));
    grp.rotation.set(d[1][0],d[1][1],d[1][2]);rig.add(grp);rings.push({g:grp,lm:lm,sp:d[2],base:.5})});

  /* ---------- the iris (always faces the viewer, looks at the cursor) ---------- */
  var IU={uTime:U.uTime,uPupil:{value:.24},uBlink:{value:0},uFlash:{value:0}};
  var iris=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.15),new THREE.ShaderMaterial({uniforms:IU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:['precision highp float;varying vec2 vUv;uniform float uTime,uPupil,uBlink,uFlash;',
      'void main(){vec2 p=(vUv-.5)*2.;p.y/=max(.03,1.-uBlink*.97);float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x);',
      ' float s1=.5+.5*sin(a*34.+sin(a*7.+uTime*.35)*2.2),s2=.5+.5*sin(a*88.+uTime*.2);',
      ' vec3 iris=mix(vec3(.22,.08,.01),vec3(1.,.64,.13),smoothstep(uPupil,.88,r));',
      ' vec3 c=iris*(.4+.5*s1+.25*s1*s2);',
      ' c*=smoothstep(uPupil-.01,uPupil+.07,r);',            // pupil void
      ' c*=1.-smoothstep(.74,1.,r)*.88;',                   // limbal darkening
      ' c+=vec3(1.,.75,.3)*smoothstep(uPupil+.09,uPupil,r)*smoothstep(uPupil-.02,uPupil,r)*.55;', // pupil rim glow
      ' c+=vec3(1.,.95,.8)*smoothstep(.13,0.,length(p-vec2(-.34,.36)))*.9;',                       // glint
      ' c+=vec3(1.,.8,.4)*uFlash*(1.-r)*.9;',
      ' c*=smoothstep(1.,.93,r);gl_FragColor=vec4(c,1.);}'].join('\n')}));
  scene.add(iris);
  var haloTex=(function(){var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,'rgba(245,180,31,.32)');gr.addColorStop(.45,'rgba(245,180,31,.07)');gr.addColorStop(1,'rgba(245,180,31,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c)})();
  var halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  halo.position.z=-.8;scene.add(halo);

  /* ---------- comet trail: ghost halos echoing recent positions ---------- */
  var TR_N=7,trail=[];
  for(var ti=0;ti<TR_N;ti++){var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));sp.position.z=-.9;scene.add(sp);trail.push(sp)}
  var hist=[],HIST_MAX=46;

  /* ---------- spark burst on shatter ---------- */
  var SN=150,sPos=new Float32Array(SN*3),sDir=new Float32Array(SN*3),sSeed=new Float32Array(SN);
  for(var q=0;q<SN;q++){var v=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1);if(v.lengthSq()<1e-4)v.set(1,0,0);v.normalize();
    sDir.set([v.x,v.y,v.z],q*3);sSeed[q]=Math.random()}
  var SU={uSparkT:{value:1},uPx:U.uPx,uS:U.uS};
  var sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));
  sparkGeo.setAttribute('aDir',new THREE.BufferAttribute(sDir,3));sparkGeo.setAttribute('aSeed',new THREE.BufferAttribute(sSeed,1));
  var sparkMat=new THREE.ShaderMaterial({uniforms:SU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:['attribute vec3 aDir;attribute float aSeed;uniform float uSparkT,uPx,uS;varying float vA;',
      'void main(){float t=clamp((uSparkT-aSeed*.22)/max(1e-3,1.-aSeed*.22),0.,1.);vec3 p=aDir*(t*2.5*(.55+aSeed*.9));p.y-=t*t*1.05;',
      ' vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;',
      ' vA=smoothstep(0.,.07,t)*(1.-t)*(1.-t);gl_PointSize=(3.+aSeed*3.4)*uPx*uS*72./-mv.z;}'].join('\n'),
    fragmentShader:['precision highp float;varying float vA;',
      'void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);vec3 c=mix(vec3(1.,.5,.04),vec3(1.,.95,.72),.45);gl_FragColor=vec4(c*vA,a*vA);}'].join('\n')});
  var sparks=new THREE.Points(sparkGeo,sparkMat);scene.add(sparks);

  /* ---------- post: chromatic aberration + radial blur + shockwave ---------- */
  var PU={tD:{value:rt.texture},uCA:{value:0},uBlur:{value:0},uCenter:{value:new THREE.Vector2(.5,.5)},uShock:{value:-1},uInk:{value:0},uAspect:{value:1}};
  var postFull=new THREE.ShaderMaterial({uniforms:PU,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:['precision highp float;varying vec2 vUv;uniform sampler2D tD;uniform float uCA,uBlur,uShock,uInk,uAspect;uniform vec2 uCenter;',
      'void main(){vec2 uv=vUv;vec2 d=uv-uCenter;vec2 da=vec2(d.x*uAspect,d.y);float dist=length(da);vec2 dir=d/max(length(d),1e-4);',
      ' float ring=uShock>=0.?exp(-pow((dist-uShock*1.1)*8.,2.)):0.;',
      ' vec2 base=uv-dir*ring*.05*(1.-uShock);',
      ' vec2 off=d*uCA*(1.+ring*3.);vec3 acc=vec3(0.);const int N=8;float jit=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));',
      ' for(int i=0;i<N;i++){float t=(float(i)+jit)/float(N);vec2 s=base-d*uBlur*t;',
      '  acc.r+=texture2D(tD,s+off).r;acc.g+=texture2D(tD,s).g;acc.b+=texture2D(tD,s-off).b;}',
      ' vec3 c=acc/float(N);float a=clamp(max(max(c.r,c.g),c.b)*1.2,0.,1.);',
      ' vec3 ink=vec3(.10,.06,.015)*a*1.5+(c-vec3(max(max(c.r,c.g),c.b)))*.0;',
      ' c=mix(c,ink+vec3(c.r*.5,0.,0.)*uCA*8.,uInk);',
      ' gl_FragColor=vec4(min(c,vec3(a)),a);}'].join('\n')});
  // idle path: identical output when uCA/uBlur/uShock are 0, but one texture read instead of 36 per pixel
  var postLite=new THREE.ShaderMaterial({uniforms:{tD:PU.tD,uInk:PU.uInk},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:['precision mediump float;varying vec2 vUv;uniform sampler2D tD;uniform float uInk;',
      'void main(){vec3 c=texture2D(tD,vUv).rgb;float a=clamp(max(max(c.r,c.g),c.b)*1.2,0.,1.);',
      ' vec3 ink=vec3(.10,.06,.015)*a*1.5;c=mix(c,ink,uInk);gl_FragColor=vec4(min(c,vec3(a)),a);}'].join('\n')});
  var post=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postLite);
  var postScene=new THREE.Scene(),postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);postScene.add(post);

  /* ---------- layout / scroll path — kept to the margins, clear of every text column ---------- */
  var W=1,H=1,halfH=Math.tan(FOV*Math.PI/360)*CZ,halfW=halfH;
  function resize(){W=window.innerWidth;H=window.innerHeight;var px=DPR*qual;canvas.width=Math.round(W*px);canvas.height=Math.round(H*px);
    renderer.setSize(canvas.width,canvas.height,false);rt.setSize(canvas.width,canvas.height);
    camera.aspect=W/H;camera.updateProjectionMatrix();halfW=halfH*camera.aspect;PU.uAspect.value=W/H;U.uPx.value=px;calc()}
  // [selector, nx, ny, scale] — nx/ny in -1..1 viewport space, hugging the right/top margins
  var WP=[
    ['#hero',.86,.66,.34],       // top-right corner, above the photo, clear of eyebrow/name
    ['#manifesto',.92,.76,.28],     // upper-right, clear of the manifesto lines
    ['#work',.93,.9,.22],        // far corner during the pinned horizontal scroll
    ['#path',.92,.88,.3],        // upper-right, above the timeline column
    ['#numbers',.91,.78,.3],     // upper-right corner of the paper panel
    ['#stack',.92,.7,.3],        // above the skill reel
    ['#contact',.88,.8,.4]       // upper-right, clear of the closing headline
  ];
  var stops=[];
  function calc(){var vh=window.innerHeight,sy=window.scrollY;
    stops=WP.map(function(w,i){var el=document.querySelector(w[0]);if(!el)return null;var r=el.getBoundingClientRect();
      return {at:i===0?0:Math.max(0,sy+r.top+r.height/2-vh/2),nx:w[1],ny:w[2],s:w[3]}}).filter(Boolean);
    stops.sort(function(a,b){return a.at-b.at})}
  function target(y){
    if(!stops.length)return {nx:.85,ny:.6,s:.4};
    if(y<=stops[0].at)return stops[0];
    for(var i=0;i<stops.length-1;i++){var a=stops[i],b=stops[i+1];
      if(y<=b.at){var t=(y-a.at)/Math.max(1,b.at-a.at);t=t*t*(3-2*t);return {nx:a.nx+(b.nx-a.nx)*t,ny:a.ny+(b.ny-a.ny)*t,s:a.s+(b.s-a.s)*t}}}
    return stops[stops.length-1]}

  var cur={nx:.86,ny:1.7,s:.34},view={nx:.86,ny:1.7,s:.34},drop={v:0},vel={x:.0,y:.003},shakes=0,count=0,started=false,mouse={x:W/2,y:H/2};
  var hint=document.getElementById('relicHint'),cnt=document.getElementById('relicCount'),root=document.documentElement;
  function start(){if(started)return;started=true;gsap.to(drop,{v:1,duration:2.6,ease:'expo.out'})}
  window.addEventListener('intro:done',start);setTimeout(start,9000);
  function centerPx(){var dy=(1-drop.v)*1.6;return {x:(view.nx*.5+.5)*W,y:(.5-(view.ny+dy)*.5)*H,r:view.s*.86*1.2/halfH*(H/2),wx:view.nx*halfW,wy:view.ny*halfH+dy*halfH}}

  /* ---------- shatter: embers + chromatic shockwave, then instant heal ---------- */
  var fx={ca:0},shock={v:-1},haloPulse={v:0},heroGlow={v:0};
  function shatter(){
    count++;if(cnt)cnt.textContent=count;
    var c=centerPx();PU.uCenter.value.set(c.x/W,1-c.y/H);
    gsap.killTweensOf(U.uBreak);gsap.killTweensOf(fx);gsap.killTweensOf(shock);gsap.killTweensOf(IU.uPupil);gsap.killTweensOf(IU.uFlash);gsap.killTweensOf(SU.uSparkT);gsap.killTweensOf(haloPulse);gsap.killTweensOf(heroGlow);
    SU.uSparkT.value=0;
    gsap.timeline()
      .to(U.uBreak,{value:1,duration:.4,ease:'expo.out'},0)
      .to(U.uBreak,{value:0,duration:.85,ease:'power3.inOut'},.5)
      .to(fx,{ca:1,duration:.1,ease:'power2.out'},0)
      .to(fx,{ca:0,duration:1.2,ease:'power3.out'},.1)
      .fromTo(shock,{v:0},{v:1,duration:1.15,ease:'power1.out'},0)
      .to(SU.uSparkT,{value:1,duration:.95,ease:'power2.out'},0)
      .to(IU.uPupil,{value:.6,duration:.12,ease:'power2.out'},0).to(IU.uPupil,{value:.24,duration:1,ease:'power2.inOut'},.35)
      .fromTo(IU.uFlash,{value:1},{value:0,duration:.8,ease:'power2.out'},0)
      .fromTo(haloPulse,{v:0},{v:1,duration:.18,ease:'power2.out'},.42).to(haloPulse,{v:0,duration:.9,ease:'power3.out'},.6)
      // the shattered light reaches the portrait a beat later — it catches a golden glow off the blast
      .fromTo(heroGlow,{v:0},{v:1,duration:.28,ease:'power2.out'},.08).to(heroGlow,{v:0,duration:1.5,ease:'power3.out'},.36);
    vel.x+=(Math.random()-.5)*.2;vel.y+=(Math.random()-.5)*.2;shakes=1;
    if(hint)hint.classList.add('off');
  }
  window.__shatterRelic=shatter;
  window.__relicDebug=function(){return {cur:cur,W:W,H:H,c:centerPx(),stops:stops,started:started,dropv:drop.v}};

  /* ---------- pointer ---------- */
  var drag=null,hover=false;
  function hit(e){var c=centerPx(),dx=e.clientX-c.x,dy=e.clientY-c.y;return dx*dx+dy*dy<c.r*c.r}
  // the eye sits behind the fixed nav at times: links, buttons and tabs always win over it
  function onUI(e){var t=e.target;return !!(t&&t.closest&&t.closest('a,button,input,textarea,select,summary,label,[role=button],[role=tab]'))}
  window.addEventListener('pointermove',function(e){mouse.x=e.clientX;mouse.y=e.clientY;lastMove=performance.now();
    if(drag){var dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.moved+=Math.abs(dx)+Math.abs(dy);
      vel.y=dx*.01;vel.x=dy*.01;rig.rotation.y+=dx*.01;rig.rotation.x+=dy*.01;return}
    var h=hit(e)&&!onUI(e);if(h!==hover){hover=h;root.classList.toggle('relic-hover',h)}},{passive:true});
  window.addEventListener('pointerdown',function(e){if(e.button>0||!hit(e)||onUI(e))return;drag={x:e.clientX,y:e.clientY,moved:0};root.classList.add('relic-drag');if(e.pointerType==='mouse')e.preventDefault()});
  window.addEventListener('pointerup',function(){if(!drag)return;var tap=drag.moved<7;drag=null;root.classList.remove('relic-drag');if(tap)shatter()});
  window.addEventListener('pointercancel',function(){drag=null;root.classList.remove('relic-drag')});
  window.addEventListener('keydown',function(e){if(e.key==='b'||e.key==='B')shatter()});

  /* ---------- loop ---------- */
  var lastY=window.scrollY,clock=new THREE.Clock(),paper=document.querySelector('#numbers'),ink=0,nextBlink=2.5,blinkT=-1,caSet=false,heroGlowSet=false,flash=document.getElementById('caFlash'),heroEl=document.getElementById('hp');
  var lookX=0,lookY=0,pulseT=0;
  /* ---------- docking: in the Path section the eye leaves its corner, settles on the clock's hub and
     fires the beam. Blending is by weight (0..1), so it glides in as the clock scrolls into view and
     glides back out as it leaves; the position is read from the hub every frame, so it never drifts. */
  var near={stage:false,paper:false};
  if(window.IntersectionObserver){var nio=new IntersectionObserver(function(es){es.forEach(function(e){near[e.target.id==='numbers'?'paper':'stage']=e.isIntersecting})},{rootMargin:'60% 0px 60% 0px'});
    [document.getElementById('clockstage'),document.getElementById('numbers')].forEach(function(n){if(n)nio.observe(n)})}else{near.stage=near.paper=true}
  var dockEl=document.getElementById('eyeDock'),stageEl=document.getElementById('clockstage'),dockMQ=window.matchMedia('(min-width:901px)'),
      dockW=0,dockWT=0,lastDockW=-1,dockPos=window.__eyeHubPx={x:0,y:0},DOCK_S=.34;
  function sstep(a,b,v){var t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)}
  window.__eyeInfo=function(){return {w:dockW,r:view.s*.86*(H/2)/halfH}};  // sphere radius in px, and how docked it is
  // performance watchdog: if frames run slow for a sustained stretch (weak GPU, throttled tab,
  // a driver that hates MSAA — whatever the cause, on any browser), drop resolution and the
  // trail once, rather than staying janky forever. Never fires on a machine that's keeping up.
  var frameAcc=0,frameN=0,qualStep=0,trailOn=true,idleFlip=false,lastMove=0;
  function tick(){
    if(document.hidden&&!window.__forceVisible)return; // don't burn GPU time on a background tab
    var y=window.scrollY,busy=drag||shakes>0||fx.ca>.002||(shock.v>=0&&shock.v<1)||U.uBreak.value>.001||haloPulse.v>.001||drop.v<.995||Math.abs(dockWT-dockW)>.003||Math.abs(y-lastY)>.4||(performance.now()-lastMove)<500;
    // nothing is happening: the eye only drifts and twinkles, so render it every other frame
    if(!busy){idleFlip=!idleFlip;if(idleFlip)return}
    var dt=Math.min(.05,clock.getDelta()),T=clock.elapsedTime,dY=y-lastY;lastY=y;
    if(qualStep<1&&root.classList.contains('lite')){qualStep=1;qual=.7;trailOn=false;trail.forEach(function(sp){sp.material.opacity=0;sp.visible=false});resize()}
    if(busy){frameAcc+=dt;frameN++}
    if(frameN>=90){var avgMs=(frameAcc/frameN)*1000;frameAcc=0;frameN=0;
      if(qualStep<2&&avgMs>(qualStep?46:34)){qualStep++;qual=qualStep===1?.75:.55;trailOn=false;trail.forEach(function(sp){sp.material.opacity=0;sp.visible=false});resize()}}
    var tg=target(y),k=1-Math.pow(.0009,dt);
    cur.nx+=(tg.nx-cur.nx)*k;cur.ny+=(tg.ny-cur.ny)*k;cur.s+=(tg.s-cur.s)*k;
    if(dockEl&&dockMQ.matches&&(near.stage||dockW>.001)){
      var dr=dockEl.getBoundingClientRect(),hy=dr.top+dr.height/2;dockPos.x=dr.left+dr.width/2;dockPos.y=hy;
      dockWT=sstep(H*1.02,H*.6,hy)*sstep(-H*.12,H*.02,hy);   // arrives as the hub rises into view, leaves as it exits the top
    }else dockWT=0;
    dockW+=(dockWT-dockW)*(1-Math.pow(.015,dt));if(Math.abs(dockWT-dockW)<.002)dockW=dockWT;
    view.nx=cur.nx+((dockPos.x/W*2-1)-cur.nx)*dockW;view.ny=cur.ny+((1-dockPos.y/H*2)-cur.ny)*dockW;view.s=cur.s+(DOCK_S-cur.s)*dockW;
    if(Math.abs(dockW-lastDockW)>.003||(dockW===dockWT&&lastDockW!==dockW)){
      lastDockW=dockW;
      if(stageEl)stageEl.style.setProperty('--dock',dockW.toFixed(3));
      if(window.__eyeDockCb)window.__eyeDockCb();
    }
    var c=centerPx(),bob=Math.sin(T*.8)*.04*(1-dockW),sc=view.s*.86*(1+.025*Math.sin(T*1.6));
    rig.position.set(c.wx,c.wy+bob,0);rig.scale.setScalar(sc);sparks.position.copy(rig.position);sparks.scale.setScalar(sc);
    iris.position.set(c.wx,c.wy+bob,.02);iris.scale.setScalar(sc);
    var hp=1+haloPulse.v*1.3;halo.position.set(c.wx,c.wy+bob,-.8);halo.scale.setScalar(6.2*sc*hp);
    U.uS.value=sc;U.uTime.value=T;
    // "thought" pulse travelling outward through the synapses, continuous + a burst on shatter
    pulseT+=dt*.14;U.uPulse.value=(pulseT%1)*.62+haloPulse.v*.3;
    // rig spin: inertia + scroll + idle; rings orbit independently
    if(!drag){vel.x*=Math.pow(.06,dt);vel.y*=Math.pow(.06,dt);rig.rotation.x+=vel.x+(reduce?0:.0006);rig.rotation.y+=vel.y+(reduce?0:.0022)+dY*.0007}
    if(!reduce)rings.forEach(function(r,i){r.g.rotation.z+=r.sp*dt*(i%2?-1:1)});
    var e=U.uBreak.value;rings.forEach(function(r){var s=1+e*1.1;r.g.scale.setScalar(s);r.lm.opacity=r.base*(1-e*.85)});
    // iris tracks the cursor, blinks now and then
    var gx=mouse.x,gy=mouse.y,bt=dockW>.01&&window.__eyeAimPx?window.__eyeAimPx():null;
    if(bt){gx=mouse.x+(bt.x-mouse.x)*dockW;gy=mouse.y+(bt.y-mouse.y)*dockW}
    var tx=(gx-c.x)/(H*.5),ty=-(gy-c.y)/(H*.5),m=Math.hypot(tx,ty),cl=Math.min(1,m);if(m>0){tx=tx/m*cl;ty=ty/m*cl}
    lookX+=(tx-lookX)*(1-Math.pow(.002,dt));lookY+=(ty-lookY)*(1-Math.pow(.002,dt));
    iris.position.x+=lookX*.2*sc;iris.position.y+=lookY*.2*sc;
    if(T>nextBlink&&blinkT<0){blinkT=0;nextBlink=T+2.5+Math.random()*4}
    if(blinkT>=0){blinkT+=dt/.22;IU.uBlink.value=Math.sin(Math.min(1,blinkT)*Math.PI);if(blinkT>=1){blinkT=-1;IU.uBlink.value=0}}
    // ink mode over the paper-coloured section
    var inPaper=false;if(paper&&(near.paper||ink>.01)){var pr=paper.getBoundingClientRect();inPaper=pr.top-H*.12<c.y&&pr.bottom-H*.12>c.y} // ink once the gradient's pale half is under the eye
    ink+=((inPaper?1:0)-ink)*(1-Math.pow(.004,dt));PU.uInk.value=ink;
    // comet trail: echoes of recent positions, brighter the faster it flows
    hist.push({x:c.wx,y:c.wy+bob});if(hist.length>HIST_MAX)hist.shift();
    var last2=hist.length>1?hist[hist.length-2]:hist[0];
    var spd=hist.length>1?Math.hypot(c.wx-last2.x,(c.wy+bob)-last2.y)/Math.max(dt,1e-4):0;
    var spdN=THREE.MathUtils.clamp(spd/3.2,0,1);
    if(trailOn)trail.forEach(function(sp,i){var idx=hist.length-1-(i+1)*4;if(idx<0)idx=0;var h2=hist[idx]||hist[0];
      sp.position.set(h2.x,h2.y,-.9);var frac=1-i/TR_N,s=sc*(1-i/TR_N*.6)*5.4;sp.scale.set(s,s,1);
      sp.material.opacity=frac*.5*spdN*(1-e);sp.visible=sp.material.opacity>.004});
    // chromatic / blur / shock uniforms + DOM fringing
    PU.uCA.value=fx.ca*.03;PU.uBlur.value=fx.ca*.14;PU.uShock.value=(shock.v>=0&&shock.v<1)?shock.v:-1;
    if(fx.ca>.002||caSet){caSet=fx.ca>.002;if(flash)flash.style.opacity=fx.ca.toFixed(3)}
    if(heroGlow.v>.002||heroGlowSet){if(heroEl)heroEl.style.setProperty('--heroGlow',heroGlow.v.toFixed(3));var gOn=heroGlow.v>.002;if(gOn!==heroGlowSet&&heroEl)heroEl.classList.toggle('glow-on',gOn);heroGlowSet=gOn}   // the 1563x1752 bloom image only exists on screen while it is glowing
    if(hint)hint.classList.toggle('far',y>H*1.4); // the drag/shatter hint only matters near the hero
    if(shakes>0){shakes=Math.max(0,shakes-dt*2.4);camera.position.x=(Math.random()-.5)*.1*shakes;camera.position.y=(Math.random()-.5)*.1*shakes}else camera.position.set(0,0,CZ);
    var heavy=fx.ca>.002||(shock.v>=0&&shock.v<1);
    post.material=heavy?postFull:postLite;
    renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.clear();
    if(heavy){ // everything that can be distorted (eye, rings, sparks, halo) lives within a few radii of the eye
      var pxr=DPR*qual,RR=Math.max(280,c.r*5.4),bx0=Math.max(0,Math.floor((c.x-RR)*pxr)),bx1=Math.min(canvas.width,Math.ceil((c.x+RR)*pxr)),
          by0=Math.max(0,Math.floor((c.y-RR)*pxr)),by1=Math.min(canvas.height,Math.ceil((c.y+RR)*pxr));
      renderer.setScissorTest(true);renderer.setScissor(bx0,canvas.height-by1,Math.max(1,bx1-bx0),Math.max(1,by1-by0));
    }
    renderer.render(postScene,postCam);renderer.setScissorTest(false);
  }
  gsap.ticker.add(tick);
  // decode the bloom image once the intro is over so the first shatter doesn't wait for it
  window.addEventListener('intro:done',function(){var gi=heroEl&&heroEl.querySelector('img.glow');if(gi&&gi.decode)(window.requestIdleCallback||setTimeout)(function(){gi.decode().catch(function(){})})});
  window.addEventListener('resize',resize);
  if(window.ScrollTrigger)ScrollTrigger.addEventListener('refresh',calc);
  window.addEventListener('load',function(){setTimeout(calc,400)});
  resize();root.classList.add('has-relic');
  // compile AND link both post shaders now (a 1px throwaway draw forces the driver to finish the pipeline),
  // so the first shatter doesn't stall waiting on the GPU compiler
  try{
    post.material=postFull;renderer.compile(postScene,postCam);
    renderer.setRenderTarget(null);renderer.setScissorTest(true);renderer.setScissor(0,0,1,1);renderer.render(postScene,postCam);
    post.material=postLite;renderer.compile(postScene,postCam);renderer.render(postScene,postCam);
    renderer.setScissorTest(false);renderer.clear();
  }catch(e){renderer.setScissorTest(false)}
})();
