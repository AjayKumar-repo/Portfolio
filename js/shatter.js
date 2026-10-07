/* THE NAME SHATTERS
   Hover the name (tap it on a phone) and the letters break into a few thousand irregular shards that
   fly apart, tilt in 3D and catch the light like faceted metal: pushed hardest around your cursor,
   with glints and dark seams. Move away and they reassemble into the real, selectable heading.
   A tiny dependency-free WebGL renderer: the letters are drawn into a mask once, cut into triangles
   with a jittered grid, and each triangle carries its own slice of that mask, so every shard is
   still a piece of a letter. */
(function(){
  var h1=document.getElementById('name'),cv=document.getElementById('nameFx');
  if(!h1||!cv)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var host=h1.parentNode,root=document.documentElement;
  var gl=null,prog,A,U,buf,tex,failed=false;

  /* ---------------- shaders ---------------- */
  var VS=[
  'attribute vec2 aPos;attribute vec2 aCen;attribute vec3 aRnd;attribute vec3 aBar;attribute float aLine;',
  'uniform vec2 uRes,uCur;uniform float uP,uPush,uTime,uUnit;',
  'varying vec3 vN;varying vec3 vBar;varying vec2 vUV;varying float vLine;varying float vSh;',
  'mat3 rot(vec3 ax,float a){ax=normalize(ax);float c=cos(a),s=sin(a),t=1.-c;',
  ' return mat3(t*ax.x*ax.x+c,t*ax.x*ax.y+s*ax.z,t*ax.x*ax.z-s*ax.y,',
  '             t*ax.x*ax.y-s*ax.z,t*ax.y*ax.y+c,t*ax.y*ax.z+s*ax.x,',
  '             t*ax.x*ax.z+s*ax.y,t*ax.y*ax.z-s*ax.x,t*ax.z*ax.z+c);}',
  'void main(){',
  ' vec2 d=aCen-uCur;float dist=length(d);vec2 nd=d/max(dist,1.);',
  ' float near=exp(-dist/(120.*uUnit));',
  ' float spread=uP*(2.5+9.*aRnd.x)*uUnit;',                                   // everything separates a little
  ' float burst=uP*uPush*(16.+44.*aRnd.y)*near*uUnit;',                      // shards near the cursor are blasted outward
  ' vec2 off=nd*(spread+burst)+vec2(0.,-uP*4.*aRnd.z*uUnit);',
  ' float lift=uP*(12.*aRnd.x+70.*near*aRnd.y)*uUnit;',
  ' float ang=uP*((aRnd.z-.5)*1.2+(aRnd.y-.5)*2.2*near)+sin(uTime*1.1+aRnd.x*40.)*.07*uP;',
  ' mat3 R=rot(vec3(aRnd.x*2.-1.,aRnd.y*2.-1.,.35),ang);',
  ' vec3 loc=R*vec3(aPos-aCen,0.);',
  ' vec3 w=vec3(aCen+off,lift)+loc;',
  ' float k=1.-w.z/1400.;',
  ' vec2 sp=(w.xy-uRes*.5)/k+uRes*.5;',
  ' gl_Position=vec4(sp.x/uRes.x*2.-1.,1.-sp.y/uRes.y*2.,0.,1.);',
  ' vN=R*normalize(vec3((aRnd.z-.5)*.5,(aRnd.x-.5)*.5,1.));',                  // every facet has its own slight tilt
  ' vBar=aBar;vUV=aPos/uRes;vLine=aLine;vSh=aRnd.y;',
  '}'].join('\n');
  var FS=[
  'precision mediump float;',
  'varying vec3 vN;varying vec3 vBar;varying vec2 vUV;varying float vLine;varying float vSh;',
  'uniform sampler2D uMask;uniform float uAlpha;',
  'void main(){',
  ' float cov=texture2D(uMask,vUV).a;if(cov<.02)discard;',
  ' vec3 N=normalize(vN);vec3 R=reflect(vec3(0.,0.,-1.),N);',
  // a procedural studio: dark teal floor, a bright overhead soft-box and two strip lights
  ' float h=R.y*.5+.5;',
  ' vec3 col=mix(vec3(.05,.09,.13),vec3(.70,.80,.90),smoothstep(.1,.9,h));',
  ' float box=smoothstep(.62,.82,R.y)*(1.-smoothstep(.9,1.,R.y));',
  ' float s1=1.-smoothstep(0.,.12,abs(R.x-.42+R.y*.25));',
  ' float s2=1.-smoothstep(0.,.10,abs(R.x+.55-R.y*.2));',
  ' col+=vec3(.95,.98,1.)*(box*1.1+s1*.7+s2*.5);',
  ' float glint=pow(max(dot(R,normalize(vec3(-.3,.5,.8))),0.),60.)*(.5+vSh);',
  ' col+=vec3(1.)*glint*1.2;',
  ' col*=mix(vec3(1.),vec3(1.12,.92,.6),vLine);',                                // the second word is warm gold metal
  ' float e=min(min(vBar.x,vBar.y),vBar.z);float seam=smoothstep(0.,.05,e);',
  ' col*=mix(.22,1.,seam);col+=(1.-seam)*vec3(.55,.68,.85)*.10;',               // dark crack with a faint lit edge
  ' col*=.9+.3*vSh;',
  ' float a=cov*uAlpha;gl_FragColor=vec4(col*a,a);',
  '}'].join('\n');

  var count=0,W=0,H=0,built=false,introDone=false;
  /* the WebGL context and shaders are created on the first idle moment after the intro (or at the first hover), never during page load */
  var vs,fs,par=null,ready=false;
  function finishGL(){
    if(!gl.getShaderParameter(vs,gl.COMPILE_STATUS)||!gl.getShaderParameter(fs,gl.COMPILE_STATUS)||!gl.getProgramParameter(prog,gl.LINK_STATUS)){failed=true;gl=null;return false}
    gl.useProgram(prog);
    A={pos:gl.getAttribLocation(prog,'aPos'),cen:gl.getAttribLocation(prog,'aCen'),rnd:gl.getAttribLocation(prog,'aRnd'),bar:gl.getAttribLocation(prog,'aBar'),line:gl.getAttribLocation(prog,'aLine')};
    U={};['uRes','uCur','uP','uPush','uTime','uUnit','uMask','uAlpha'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});
    buf=gl.createBuffer();tex=gl.createTexture();
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    ready=true;return true;
  }
  /* returns true once the program is usable. The first call starts compiling; where the browser supports
     KHR_parallel_shader_compile the compile runs on a driver thread and later calls just ask "done yet?", so it never freezes a frame */
  function initGL(){
    if(ready)return true;if(failed)return false;
    if(!gl){
      var g=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true});if(!g){failed=true;return false}
      gl=g;par=gl.getExtension('KHR_parallel_shader_compile');
      vs=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vs,VS);gl.compileShader(vs);
      fs=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fs,FS);gl.compileShader(fs);
      prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
    }
    if(par&&!gl.getProgramParameter(prog,par.COMPLETION_STATUS_KHR))return false;
    return finishGL();
  }
  function warm(){if(!initGL()&&!failed)setTimeout(warm,60)}

  /* ---------------- geometry: the letters, cut into shards ---------------- */
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function build(){
    if(!initGL())return false;
    var lines=[].slice.call(h1.querySelectorAll('.ln')),hr=host.getBoundingClientRect(),glyphs=[],lb=[],minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    lines.forEach(function(ln,li){
      var box={t:1e9,b:-1e9};
      [].forEach.call(ln.querySelectorAll('.ch'),function(c){
        var r=c.getBoundingClientRect(),cs=getComputedStyle(c);
        if(!r.width)return;
        glyphs.push({t:c.textContent,x:r.left-hr.left,y:r.top-hr.top,h:r.height,font:cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily,fs:parseFloat(cs.fontSize)});
        minX=Math.min(minX,r.left-hr.left);maxX=Math.max(maxX,r.right-hr.left);minY=Math.min(minY,r.top-hr.top);maxY=Math.max(maxY,r.bottom-hr.top);
        box.t=Math.min(box.t,r.top-hr.top);box.b=Math.max(box.b,r.bottom-hr.top);
      });
      lb.push(box);
    });
    if(!glyphs.length)return false;
    var padX=Math.max(70,(maxX-minX)*.12),padY=Math.max(60,(maxY-minY)*.2),ox=Math.floor(minX-padX),oy=Math.floor(minY-padY);
    W=Math.ceil(maxX-minX+2*padX);H=Math.ceil(maxY-minY+2*padY);
    cv.style.left=ox+'px';cv.style.top=oy+'px';cv.style.width=W+'px';cv.style.height=H+'px';
    var d=Math.min(window.devicePixelRatio||1,root.classList.contains('lite')?1:1.75);
    cv.width=Math.round(W*d);cv.height=Math.round(H*d);gl.viewport(0,0,cv.width,cv.height);
    // the letters, exactly where the real ones are (each glyph is its own inline box, so draw them one by one)
    var mc=document.createElement('canvas');mc.width=cv.width;mc.height=cv.height;
    var mx=mc.getContext('2d');mx.scale(d,d);mx.fillStyle='#fff';mx.textBaseline='alphabetic';mx.textAlign='left';
    glyphs.forEach(function(g){
      mx.font=g.font;var m=mx.measureText('M'),asc=m.fontBoundingBoxAscent||g.fs*.92,desc=m.fontBoundingBoxDescent||g.fs*.28;
      mx.fillText(g.t,g.x-ox,g.y-oy+(g.h-(asc+desc))/2+asc);
    });
    var md=mx.getImageData(0,0,mc.width,mc.height).data,MW=mc.width;
    function cov(x,y){if(x<0||y<0||x>=W||y>=H)return 0;return md[((((y*d)|0)*MW)+((x*d)|0))*4+3]}
    function hit(a,b,c){ // ten sample points, so hairline serifs are not missed
      var cx=(a[0]+b[0]+c[0])/3,cy=(a[1]+b[1]+c[1])/3;
      var P=[[cx,cy],a,b,c,[(a[0]+b[0])/2,(a[1]+b[1])/2],[(b[0]+c[0])/2,(b[1]+c[1])/2],[(a[0]+c[0])/2,(a[1]+c[1])/2],
             [(a[0]+cx)/2,(a[1]+cy)/2],[(b[0]+cx)/2,(b[1]+cy)/2],[(c[0]+cx)/2,(c[1]+cy)/2]];
      for(var i=0;i<P.length;i++)if(cov(P[i][0],P[i][1])>24)return true;return false}
    var fs0=glyphs[0].fs,unit=Math.max(.3,Math.min(1.5,fs0/208)),rnd=rng(20260707),s=Math.max(6,Math.min(30,fs0*.1)),gx=Math.ceil(W/s)+3,gy=Math.ceil(H/s)+3,pts=[],i,j;
    for(j=0;j<gy;j++){var row=[];for(i=0;i<gx;i++)row.push([(i-1)*s+(rnd()-.5)*s*.8,(j-1)*s+(rnd()-.5)*s*.8]);pts.push(row)}
    var tris=[];
    function add(a,b,c){if(hit(a,b,c))tris.push([a,b,c])}
    for(j=0;j<gy-1;j++)for(i=0;i<gx-1;i++){
      var a=pts[j][i],b=pts[j][i+1],c=pts[j+1][i+1],e=pts[j+1][i],t=[];
      if(rnd()<.5){t.push([a,b,c],[a,c,e])}else{t.push([a,b,e],[b,c,e])}
      t.forEach(function(T){
        if(!hit(T[0],T[1],T[2]))return;
        var r=rnd();
        if(r<.20){var m=[(T[0][0]+T[1][0]+T[2][0])/3,(T[0][1]+T[1][1]+T[2][1])/3];add(T[0],T[1],m);add(T[1],T[2],m);add(T[2],T[0],m)}      // 3 smaller shards
        else if(r<.30){var m01=[(T[0][0]+T[1][0])/2,(T[0][1]+T[1][1])/2],m12=[(T[1][0]+T[2][0])/2,(T[1][1]+T[2][1])/2],m20=[(T[2][0]+T[0][0])/2,(T[2][1]+T[0][1])/2];
          add(T[0],m01,m20);add(m01,T[1],m12);add(m20,m12,T[2]);add(m01,m12,m20)}                                                          // 4 tiny splinters
        else tris.push(T);
      });
    }
    var F=11,data=new Float32Array(tris.length*3*F),o=0;
    tris.forEach(function(T){
      var cx=(T[0][0]+T[1][0]+T[2][0])/3,cy=(T[0][1]+T[1][1]+T[2][1])/3,r1=rnd(),r2=rnd(),r3=rnd(),line=0,best=1e9;
      lb.forEach(function(b,li){var dd=Math.abs((b.t+b.b)/2-oy-cy);if(dd<best){best=dd;line=li}});
      for(var v=0;v<3;v++){
        data[o++]=T[v][0];data[o++]=T[v][1];data[o++]=cx;data[o++]=cy;data[o++]=r1;data[o++]=r2;data[o++]=r3;
        data[o++]=v===0?1:0;data[o++]=v===1?1:0;data[o++]=v===2?1:0;data[o++]=Math.min(1,line);
      }
    });
    count=tris.length*3;
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    var B=F*4;
    [[A.pos,2,0],[A.cen,2,8],[A.rnd,3,16],[A.bar,3,28],[A.line,1,40]].forEach(function(a){gl.enableVertexAttribArray(a[0]);gl.vertexAttribPointer(a[0],a[1],gl.FLOAT,false,B,a[2])});
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mc);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.uMask,0);gl.uniform2f(U.uRes,W,H);gl.uniform1f(U.uUnit,unit);
    cv._ox=ox;cv._oy=oy;built=true;return true;
  }

  /* ---------------- state + loop ---------------- */
  var p=0,tp=0,push=0,pushT=0,cur={x:0,y:0},curT={x:0,y:0},running=false,last=0,time=0,touchTimer=0;
  var smooth=function(a,b,v){var t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
  function draw(alpha){
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uP,p);gl.uniform1f(U.uPush,push);gl.uniform1f(U.uTime,time);gl.uniform1f(U.uAlpha,alpha);gl.uniform2f(U.uCur,cur.x,cur.y);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  function frame(now){
    var dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
    p+=(tp-p)*(1-Math.exp(-dt*(tp>p?11:5)));if(Math.abs(tp-p)<.003)p=tp;
    push+=(pushT-push)*(1-Math.exp(-dt*9));cur.x+=(curT.x-cur.x)*(1-Math.exp(-dt*16));cur.y+=(curT.y-cur.y)*(1-Math.exp(-dt*16));
    var a=smooth(0,.14,p);
    h1.style.opacity=(1-a).toFixed(3);                          // the real heading dissolves exactly as the shards take over
    draw(a);
    if(p===0&&tp===0){cv.style.display='none';h1.style.opacity='';running=false;return}
    requestAnimationFrame(frame);
  }
  function kick(){if(running)return;running=true;last=performance.now();cv.style.display='block';requestAnimationFrame(frame)}
  function enter(x,y){
    if(!built&&!build())return false;
    curT.x=x-host.getBoundingClientRect().left-cv._ox;curT.y=y-host.getBoundingClientRect().top-cv._oy;
    if(tp===0){cur.x=curT.x;cur.y=curT.y}
    tp=1;pushT=1;kick();return true}
  function leave(){tp=0;pushT=0;kick()}

  /* where the letters really are: union of each line's glyph boxes */
  function boxes(){
    var out=[];[].forEach.call(h1.querySelectorAll('.ln'),function(ln){
      var l=1e9,t=1e9,r=-1e9,b=-1e9;[].forEach.call(ln.querySelectorAll('.ch'),function(c){var q=c.getBoundingClientRect();if(!q.width)return;l=Math.min(l,q.left);t=Math.min(t,q.top);r=Math.max(r,q.right);b=Math.max(b,q.bottom)});
      if(r>l)out.push({l:l,t:t,r:r,b:b})});return out}
  function inside(x,y,pad){var bs=boxes();for(var i=0;i<bs.length;i++){var q=bs[i];if(x>=q.l-pad&&x<=q.r+pad&&y>=q.t-pad&&y<=q.b+pad)return true}return false}

  var mouseOn=false,lx=0,ly=0;
  window.addEventListener('pointermove',function(e){
    if(e.pointerType==='touch'||!introDone)return;lx=e.clientX;ly=e.clientY;
    var hr=h1.getBoundingClientRect();
    if(e.clientY<hr.top-80||e.clientY>hr.bottom+80){if(mouseOn){mouseOn=false;leave()}return}   // cheap early-out away from the name
    var shattered=tp===1,on=inside(e.clientX,e.clientY,shattered?70:6);                       // once broken, the hit area stays generous
    if(on){if(!mouseOn){mouseOn=enter(e.clientX,e.clientY)}else{curT.x=e.clientX-host.getBoundingClientRect().left-cv._ox;curT.y=e.clientY-host.getBoundingClientRect().top-cv._oy;pushT=1}}
    else if(mouseOn){mouseOn=false;leave()}
  },{passive:true});
  document.addEventListener('mouseleave',function(){if(mouseOn){mouseOn=false;leave()}});
  // scrolling moves the name out from under a still cursor: let it go
  window.addEventListener('scroll',function(){if(mouseOn&&!inside(lx,ly,70)){mouseOn=false;leave()}},{passive:true});
  // phones: tap the name, it shatters, then pulls itself back together
  window.addEventListener('pointerdown',function(e){
    if(e.pointerType!=='touch'||!introDone)return;
    if(!inside(e.clientX,e.clientY,14))return;
    clearTimeout(touchTimer);
    if(tp===1){leave();return}
    if(enter(e.clientX,e.clientY))touchTimer=setTimeout(leave,2700);
  },{passive:true});
  window.addEventListener('intro:done',function(){introDone=true;built=false;(window.requestIdleCallback||function(f){setTimeout(f,2000)})(warm,{timeout:5000})});
  window.addEventListener('resize',function(){built=false});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){built=false});
  // for tests and tinkering: window.__nameFx.show(1,x,y) freezes the shattered state, show(0) releases it
  window.__nameFx={static:function(on){introDone=true;if(!built)build();if(on){cv.style.display='block';p=0;push=0;draw(1)}else cv.style.display='none'},show:function(v,x,y){introDone=true;if(v){if(!built)build();curT.x=cur.x=x==null?W/2:x;curT.y=cur.y=y==null?H/2:y;tp=1;pushT=1;kick()}else leave()},ready:function(){return built},count:function(){return count/3}};
})();
