/* Procedural, animated project thumbnails (2D canvas). Each art draws in a dark film-noir + amber palette. */
(function(){
  var AMB='245,180,31', PAP='239,231,214', RED='226,59,46';
  var MONO='"JetBrains Mono",ui-monospace,monospace', SERIF='"Fraunces",Georgia,serif';
  var TAMIL='"Noto Sans Tamil","Nirmala UI","Latha",sans-serif';
  function rgba(c,a){return 'rgba('+c+','+a+')'}
  function rr(x,y,w,h,r){this.beginPath();this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath()}
  function bg(c,W,H,hue){
    var g=c.createRadialGradient(W*.3,H*.25,0,W*.5,H*.5,Math.max(W,H)*.85);
    g.addColorStop(0,hue||'#1c1508');g.addColorStop(.6,'#0a0806');g.addColorStop(1,'#040302');
    c.fillStyle=g;c.fillRect(0,0,W,H);
  }
  var CUR_W=0;
  // labels never run off the right edge of whatever canvas is currently drawing
  function label(c,txt,x,y,a,size){
    size=size||10;c.font='300 '+size+'px '+MONO;c.fillStyle=rgba(AMB,a==null?.8:a);c.textBaseline='alphabetic';
    var ta=c.textAlign;if(ta==='left'||ta==='start'||!ta){
      var w=c.measureText(txt).width;
      if(CUR_W&&x+w>CUR_W-10)x=Math.max(6,CUR_W-10-w);
    }
    c.fillText(txt,x,y)}
  function seed(n){var s=n;return function(){s=(s*9301+49297)%233280;return s/233280}}

  /* ---------- 1. AdaptEval: Tamil glyph field + model robustness probe ---------- */
  var GL='அஆஇஈஉஊஎஏஐஒஓகஙசஞடணதநபமயரலவழளறன';
  var adapt={init:function(s,W,H){var r=seed(7);s.g=[];var cw=Math.max(26,W/26),cols=Math.ceil(W/cw),rows=Math.ceil(H/cw);s.cw=cw;s.cols=cols;
      for(var i=0;i<cols*rows;i++)s.g.push({ch:GL[Math.floor(r()*GL.length)],ph:r()*6.28,col:i%cols,row:Math.floor(i/cols)});
      s.cases=[];for(var k=0;k<30;k++)s.cases.push({ph:r()*6,bad:r()});
      // the ~600 resting glyphs are painted once into an offscreen layer; each frame only
      // redraws the handful of columns the scan line is currently lighting up
      var d=Math.min(window.devicePixelRatio||1,1.5),oc=document.createElement('canvas');oc.width=Math.round(W*d);oc.height=Math.round(H*d);
      var o=oc.getContext('2d');o.setTransform(d,0,0,d,0,0);o.textAlign='center';o.textBaseline='middle';o.font='300 '+(cw*.62)+'px '+TAMIL;o.fillStyle=rgba(PAP,.11);
      s.g.forEach(function(g){o.fillText(g.ch,g.col*cw+cw/2,g.row*cw+cw/2)});
      s.base=oc;},
    draw:function(c,W,H,t,s){
      bg(c,W,H,'#1d1507');
      c.globalAlpha=.8+.2*Math.sin(t*.8);c.drawImage(s.base,0,0,W,H);c.globalAlpha=1;
      c.textAlign='center';c.textBaseline='middle';c.font='300 '+(s.cw*.62)+'px '+TAMIL;
      var scan=((t*.22)%1.25-.12)*W,span=W*.12,c0=Math.floor((scan-span)/s.cw),c1=Math.ceil((scan+span)/s.cw);
      for(var gi=0;gi<s.g.length;gi++){var g=s.g[gi];if(g.col<c0||g.col>c1)continue;
        var x=g.col*s.cw+s.cw/2,y=g.row*s.cw+s.cw/2,hit=Math.max(0,1-Math.abs(x-scan)/span);
        if(hit<=.02)continue;
        c.fillStyle=rgba(AMB,Math.min(.95,.07+hit*.75));
        if(hit>.6&&Math.sin(t*9+g.ph)>.7)c.fillStyle=rgba(RED,.9);
        c.fillText(g.ch,x,y);
      }
      c.textAlign='left';
      // scan line
      var lg=c.createLinearGradient(scan-40,0,scan+4,0);lg.addColorStop(0,'rgba('+AMB+',0)');lg.addColorStop(1,'rgba('+AMB+',.45)');
      c.fillStyle=lg;c.fillRect(scan-40,0,44,H);c.fillStyle=rgba(AMB,.9);c.fillRect(scan,0,1.5,H);
      // vignette panel + probe bars
      var pw=Math.min(W*.5,300),px=W*.06,py=H*.5,ph=H*.42;
      c.fillStyle='rgba(6,5,4,.82)';rr.call(c,px,py,pw,ph,6);c.fill();c.strokeStyle=rgba(AMB,.25);c.stroke();
      label(c,'ROBUSTNESS PROBE · TAMIL MEDICAL',px+14,py+22,.85,Math.max(8,W*.017));
      var models=['XLM-R','mBERT','IndicBERT','MuRIL'],bh=(ph-52)/4;
      models.forEach(function(m,i){
        var y=py+38+i*bh,v=.45+.35*Math.abs(Math.sin(t*.7+i*1.7));
        label(c,m,px+14,y+bh*.5,.6,Math.max(7,W*.015));
        var bx=px+14+W*.14,bw=pw-28-W*.14;
        c.fillStyle=rgba(PAP,.08);c.fillRect(bx,y+bh*.25,bw,bh*.32);
        var gg=c.createLinearGradient(bx,0,bx+bw,0);gg.addColorStop(0,rgba(AMB,.9));gg.addColorStop(1,rgba(AMB,.35));
        c.fillStyle=gg;c.fillRect(bx,y+bh*.25,bw*v,bh*.32);
      });
      // test-case dots
      for(var k=0;k<s.cases.length;k++){var cs=s.cases[k],on=Math.sin(t*1.2+cs.ph)>-.2,bad=cs.bad>.78&&Math.sin(t*2+cs.ph)>0;
        c.fillStyle=rgba(bad?RED:AMB,on?.9:.18);c.beginPath();c.arc(W*.62+(k%10)*W*.03,H*.1+Math.floor(k/10)*W*.03,Math.max(2,W*.007),0,6.28);c.fill();}
      label(c,'CODE-MIXED · DIALECT · TERMINOLOGY',W*.62,H*.1+W*.11,.5,Math.max(7,W*.014));
    }};

  /* ---------- 2. EduMind: RAG pipeline ---------- */
  var edu={init:function(s){},
    draw:function(c,W,H,t){
      bg(c,W,H,'#1a1408');
      // rising difficulty curve
      c.strokeStyle=rgba(AMB,.18);c.lineWidth=1;c.beginPath();
      for(var x=0;x<=W;x+=6){var y=H*.92-Math.pow(x/W,1.6)*H*.5-Math.sin(x*.03+t)*4;x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();
      var N=[{x:.12,y:.5,n:'STUDENT'},{x:.36,y:.28,n:'EMBED'},{x:.4,y:.72,n:'CHROMADB'},{x:.68,y:.5,n:'LLM'},{x:.9,y:.5,n:'NEXT LESSON'}];
      var E=[[0,1],[0,2],[1,3],[2,3],[3,4]];
      E.forEach(function(e,i){
        var a=N[e[0]],b=N[e[1]],ax=a.x*W,ay=a.y*H,bx=b.x*W,by=b.y*H,mx=(ax+bx)/2,my=(ay+by)/2+(i%2?-1:1)*H*.06;
        c.strokeStyle=rgba(PAP,.16);c.lineWidth=1;c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo(mx,my,bx,by);c.stroke();
        for(var k=0;k<3;k++){var u=((t*.35+k/3+i*.17)%1),p=1-u;
          var px=p*p*ax+2*p*u*mx+u*u*bx,py=p*p*ay+2*p*u*my+u*u*by;
          c.fillStyle=rgba(AMB,.2);c.beginPath();c.arc(px,py,6,0,6.28);c.fill();
          c.fillStyle=rgba(AMB,.95);c.beginPath();c.arc(px,py,2.4,0,6.28);c.fill()}
      });
      N.forEach(function(n,i){
        var x=n.x*W,y=n.y*H,r=Math.max(14,W*.04)*(i===3?1.5:1),pulse=1+.06*Math.sin(t*2+i);
        c.strokeStyle=rgba(AMB,.85);c.fillStyle='rgba(8,6,4,.92)';c.lineWidth=1.4;
        if(i===2){ // db stack
          for(var k=0;k<3;k++){c.beginPath();c.ellipse(x,y-8+k*9,r,r*.35,0,0,6.28);c.fill();c.stroke()}
        }else{c.beginPath();c.arc(x,y,r*pulse,0,6.28);c.fill();c.stroke();
          if(i===3){c.strokeStyle=rgba(AMB,.35);c.beginPath();c.arc(x,y,r*pulse+8+3*Math.sin(t*3),0,6.28);c.stroke();
            c.fillStyle=rgba(AMB,.9);for(var q=0;q<6;q++){var an=t*.8+q*1.047;c.beginPath();c.arc(x+Math.cos(an)*r*.55,y+Math.sin(an)*r*.55,1.8,0,6.28);c.fill()}}
          else{c.fillStyle=rgba(AMB,.9);c.beginPath();c.arc(x,y,3,0,6.28);c.fill()}}
        c.textAlign='center';label(c,n.n,x,y+r+(i===2?24:16),.7,Math.max(7,W*.015));c.textAlign='left';
      });
      label(c,'RAG · CONTEXT-AWARE · ADAPTIVE',W*.34,H*.08,.6,Math.max(7,W*.015));
    }};

  /* ---------- 3. Smart glasses: through-the-lens detection ---------- */
  var glasses={init:function(s,W,H){var r=seed(3);s.b=[];for(var i=0;i<9;i++)s.b.push({x:r(),w:.06+r()*.09,h:.25+r()*.4});},
    draw:function(c,W,H,t,s){
      bg(c,W,H,'#170f05');
      var lw=W*.36,lh=Math.min(H*.6,lw*.85),cy=H*.5,lx1=W*.5-lw-W*.02,lx2=W*.5+W*.02,tags=[['PERSON','.94'],['OBSTACLE','.88'],['DOOR','.91'],['STAIRS','.86']];
      [lx1,lx2].forEach(function(lx,li){
        c.save();rr.call(c,lx,cy-lh/2,lw,lh,lh*.32);c.clip();
        var g=c.createLinearGradient(0,cy-lh/2,0,cy+lh/2);g.addColorStop(0,'#231a0c');g.addColorStop(1,'#080604');c.fillStyle=g;c.fillRect(lx,cy-lh/2,lw,lh);
        // horizon + moving buildings
        c.fillStyle=rgba(AMB,.12);c.fillRect(lx,cy+lh*.12,lw,1);
        s.b.forEach(function(b,i){var bx=lx+((b.x*lw*1.6-t*(20+i*6)+lw*3)%(lw*1.6))-lw*.3,bh=b.h*lh;
          c.fillStyle=rgba(PAP,.05+.03*(i%3));c.fillRect(bx,cy+lh*.12-bh,b.w*lw,bh);});
        // detection boxes
        for(var k=0;k<2;k++){var idx=Math.floor(t*.7+k*2+li)%4,ph=(t*.7+k*2+li)%1,al=Math.sin(ph*3.14),bx2=lx+lw*(.22+.4*((idx*.37+k*.3)%1)),bw=lw*.24,bh2=lh*(.3+.12*k),by=cy+lh*.12-bh2;
          c.strokeStyle=rgba(AMB,al);c.lineWidth=1.4;c.strokeRect(bx2,by,bw,bh2);
          c.fillStyle=rgba(AMB,al*.9);c.fillRect(bx2,by-13,bw*.95,13);c.fillStyle='#0a0806';c.font='400 '+Math.max(7,W*.013)+'px '+MONO;c.fillText(tags[idx][0]+' '+tags[idx][1],bx2+3,by-3);}
        // scanline
        var sy=cy-lh/2+((t*.5+li*.3)%1)*lh;c.fillStyle=rgba(AMB,.25);c.fillRect(lx,sy,lw,1.5);
        c.restore();
        c.strokeStyle=rgba(PAP,.55);c.lineWidth=2;rr.call(c,lx,cy-lh/2,lw,lh,lh*.32);c.stroke();
      });
      // bridge + temples
      c.strokeStyle=rgba(PAP,.55);c.lineWidth=2;c.beginPath();c.moveTo(lx1+lw,cy-lh*.12);c.quadraticCurveTo(W*.5,cy-lh*.28,lx2,cy-lh*.12);c.stroke();
      c.beginPath();c.moveTo(lx1,cy-lh*.2);c.lineTo(W*.02,cy-lh*.3);c.moveTo(lx2+lw,cy-lh*.2);c.lineTo(W*.98,cy-lh*.3);c.stroke();
      // audio waves
      for(var w=0;w<3;w++){var a=((t*.6+w/3)%1);c.strokeStyle=rgba(AMB,(1-a)*.6);c.beginPath();c.arc(W*.93,H*.82,6+a*W*.06,-1.2,1.2);c.stroke()}
      label(c,'YOLOv4 · ESP32-CAM · OFFLINE',W*.05,H*.92,.6,Math.max(7,W*.014));
      label(c,'AUDIO CUE ▸',W*.8,H*.92,.6,Math.max(7,W*.014));
    }};

  /* ---------- 4. ADHD review: signal + network ---------- */
  var mind={init:function(s,W,H){var r=seed(11);s.n=[];for(var i=0;i<34;i++){var a=r()*6.28,d=Math.sqrt(r());s.n.push({a:a,d:d,sp:.1+r()*.25,ph:r()*6})}},
    draw:function(c,W,H,t,s){
      bg(c,W,H,'#171008');
      var cx=W*.5,cy=H*.44,rx=W*.3,ry=H*.3,pts=s.n.map(function(n){var a=n.a+t*n.sp*.3;return {x:cx+Math.cos(a)*n.d*rx*(1+.04*Math.sin(t+n.ph)),y:cy+Math.sin(a)*n.d*ry*(1+.04*Math.cos(t+n.ph))}});
      for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++){var d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);if(d<W*.16){c.strokeStyle=rgba(AMB,(1-d/(W*.16))*.4);c.lineWidth=1;c.beginPath();c.moveTo(pts[i].x,pts[i].y);c.lineTo(pts[j].x,pts[j].y);c.stroke()}}
      pts.forEach(function(p,i){var pu=.5+.5*Math.sin(t*2+i);c.fillStyle=rgba(i%7===0?PAP:AMB,.5+pu*.5);c.beginPath();c.arc(p.x,p.y,2+pu*2,0,6.28);c.fill()});
      // signal traces
      for(var L=0;L<3;L++){c.strokeStyle=rgba(L?PAP:AMB,L?.22:.9);c.lineWidth=L?1:1.6;c.beginPath();
        for(var x=0;x<=W;x+=4){var y=H*(.8+L*.06)+Math.sin(x*.02+t*(2+L))*8*(L+1)+Math.sin(x*.07-t*3)*(4+2*L)*Math.sin(t*.5+L)+(x%97<3?-14*Math.sin(t*4+L):0);x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
      label(c,'SYSTEMATIC REVIEW · AI × ADHD',W*.34,H*.09,.7,Math.max(7,W*.015));
      label(c,'DETECT · INTERVENE',W*.34,H*.09+16,.4,Math.max(7,W*.013));
    }};

  /* ---------- 5. Fake news: classifier gauge ---------- */
  var news={init:function(s,W,H){var r=seed(21);s.l=[];for(var i=0;i<22;i++)s.l.push({w:.3+r()*.6,f:r()>.68})},
    draw:function(c,W,H,t,s){
      bg(c,W,H,'#180f06');
      var lh=H/16,off=(t*22)%(lh*2),x0=W*.06,lw=W*.46;
      for(var i=0;i<22;i++){var l=s.l[i%s.l.length],y=i*lh*1.0-off;if(y<-lh||y>H)continue;
        var on=Math.abs(y-H*.5)<lh*1.6;
        c.fillStyle=rgba(on?(l.f?RED:AMB):PAP,on?.85:.12+.05*(i%3));c.fillRect(x0,y,lw*l.w,lh*.42);
        if(on&&l.f){c.strokeStyle=rgba(RED,.9);c.lineWidth=1.5;c.beginPath();c.moveTo(x0,y+lh*.21);c.lineTo(x0+lw*l.w,y+lh*.21);c.stroke()}}
      // focus band
      c.strokeStyle=rgba(AMB,.5);c.lineWidth=1;c.strokeRect(x0-8,H*.5-lh*1.7,lw+16,lh*3.4);
      // gauge
      var gx=W*.76,gy=H*.56,gr=Math.min(W*.17,H*.34),p=Math.min(.9943,(t%6)/2.4);p=Math.min(p,.9943);
      c.lineWidth=8;c.lineCap='round';c.strokeStyle=rgba(PAP,.1);c.beginPath();c.arc(gx,gy,gr,Math.PI*.8,Math.PI*2.2);c.stroke();
      c.strokeStyle=rgba(AMB,.2);c.lineWidth=18;c.beginPath();c.arc(gx,gy,gr,Math.PI*.8,Math.PI*(.8+1.4*p));c.stroke();
      c.strokeStyle=rgba(AMB,.95);c.lineWidth=8;c.beginPath();c.arc(gx,gy,gr,Math.PI*.8,Math.PI*(.8+1.4*p));c.stroke();c.lineCap='butt';
      c.textAlign='center';c.fillStyle=rgba(PAP,.95);c.font='300 '+gr*.5+'px '+SERIF;c.fillText((p*100).toFixed(2)+'%',gx,gy+gr*.12);
      label(c,'ACCURACY',gx,gy+gr*.5,.7,Math.max(7,W*.014));c.textAlign='left';
      var lx=W*.62;
      label(c,'REAL',lx,H*.09,.8,Math.max(7,W*.014));label(c,'FAKE',lx+W*.11,H*.09,.8,Math.max(7,W*.014));
      c.fillStyle=rgba(AMB,.9);c.fillRect(lx-14,H*.09-7,6,6);c.fillStyle=rgba(RED,.9);c.fillRect(lx+W*.11-14,H*.09-7,6,6);
    }};

  /* ---------- path cards: six small, wide scenes for the clock timeline. These sit inside
     an already-dark card, so they need their own flat, lighter backdrop (not the big radial
     bg() meant for full-size project shots) and bolder strokes to read at this tiny size. */
  function ring(c,x,y,r,a){c.beginPath();c.arc(x,y,r,0,6.28);c.strokeStyle=rgba(AMB,a);c.stroke()}
  function bgSmall(c,W,H,hue){
    var g=c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,hue||'#241a0c');g.addColorStop(1,'#120d06');
    c.fillStyle=g;c.fillRect(0,0,W,H);
    c.strokeStyle='rgba(245,180,31,.18)';c.lineWidth=1;c.strokeRect(.5,.5,W-1,H-1);
  }

  var pathEdu={init:function(s,W,H){var r=seed(31);s.n=[];for(var i=0;i<14;i++)s.n.push({x:r()*W,y:r()*H*.85+H*.08,ph:r()*6,r:1.3+r()*1.7})},
    draw:function(c,W,H,t,s){
      bgSmall(c,W,H,'#241a0c');
      // knowledge graph: dots + lines connecting nearby nodes, gently drifting
      var pts=s.n.map(function(n){return {x:n.x+Math.sin(t*.3+n.ph)*4,y:n.y+Math.cos(t*.25+n.ph)*3}});
      for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++){
        var d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<W*.28){c.strokeStyle=rgba(AMB,(1-d/(W*.28))*.75);c.lineWidth=1;c.beginPath();c.moveTo(pts[i].x,pts[i].y);c.lineTo(pts[j].x,pts[j].y);c.stroke()}
      }
      pts.forEach(function(p,i){var pu=.5+.5*Math.sin(t*1.6+i);c.fillStyle=rgba(AMB,.7+pu*.3);c.beginPath();c.arc(p.x,p.y,s.n[i].r+pu,0,6.28);c.fill()});
      // a graduation-cap glyph, right side
      var cx=W*.8,cy=H*.42,cs=Math.min(W*.16,H*.5);
      c.strokeStyle=rgba(AMB,1);c.lineWidth=1.8;c.beginPath();
      c.moveTo(cx-cs,cy);c.lineTo(cx,cy-cs*.55);c.lineTo(cx+cs,cy);c.lineTo(cx,cy+cs*.55);c.closePath();c.stroke();
      c.beginPath();c.moveTo(cx-cs*.4,cy+cs*.18);c.lineTo(cx-cs*.4,cy+cs*.6);c.quadraticCurveTo(cx,cy+cs*.95,cx+cs*.4,cy+cs*.6);c.lineTo(cx+cs*.4,cy+cs*.18);c.stroke();
      var tassel=Math.sin(t*2)*3;c.beginPath();c.moveTo(cx+cs*.7,cy-cs*.1);c.lineTo(cx+cs*.7+tassel,cy+cs*.5);c.stroke();
      label(c,'9.0 CGPA',W*.04,H*.92,1,Math.max(8,W*.075));
    }};

  var pathCorp={init:function(s,W,H){var r=seed(17);s.w=[];var cols=10,rows=5;for(var i=0;i<cols*rows;i++)s.w.push({on:r()>.5,ph:r()*6,sp:1+r()*2});s.cols=cols;s.rows=rows;},
    draw:function(c,W,H,t,s){
      bgSmall(c,W,H,'#231a0b');
      var cw=W/(s.cols+1),ch=H*.72/s.rows,ox=cw*.5,oy=H*.14;
      for(var i=0;i<s.w.length;i++){var col=i%s.cols,row=(i/s.cols)|0,w=s.w[i];
        var flick=.5+.5*Math.sin(t*w.sp+w.ph),on=w.on&&flick>.35;
        c.fillStyle=on?rgba(AMB,.45+flick*.5):rgba(PAP,.1);
        c.fillRect(ox+col*cw,oy+row*ch,cw*.68,ch*.6);
      }
      // ascending bar chart overlay suggesting growth
      var bars=5;for(var b=0;b<bars;b++){var bh=(H*.55)*((b+1)/bars)*(.7+.3*Math.sin(t*.8+b));
        c.fillStyle=rgba(AMB,.4);c.fillRect(W*.05+b*W*.05,H*.92-bh*.3,W*.034,bh*.3)}
      label(c,'TECHNOOK PROGRAM',W*.04,H*.12,.85,Math.max(7,W*.05));
    }};

  var pathTalk={init:function(s,W,H){var r=seed(44);s.aud=[];for(var i=0;i<9;i++)s.aud.push({x:r()*.86+.08,ph:r()*6});s.bars=[];for(var k=0;k<6;k++)s.bars.push(.3+r()*.7)},
    draw:function(c,W,H,t,s){
      bgSmall(c,W,H,'#241a0c');
      // screen
      var sx=W*.1,sy=H*.08,sw=W*.8,sh=H*.5;
      c.strokeStyle=rgba(AMB,.95);c.lineWidth=1.6;c.strokeRect(sx,sy,sw,sh);
      var bw=sw/(s.bars.length*1.6);
      s.bars.forEach(function(b,i){var h=sh*b*(.75+.25*Math.sin(t*1.4+i));
        c.fillStyle=rgba(AMB,.8);c.fillRect(sx+sw*.08+i*bw*1.6,sy+sh-h*.8,bw,h*.8)});
      // spotlight cone from screen down to audience
      var g=c.createLinearGradient(0,sy+sh,0,H);g.addColorStop(0,rgba(AMB,.22));g.addColorStop(1,rgba(AMB,0));
      c.fillStyle=g;c.beginPath();c.moveTo(sx+sw*.3,sy+sh);c.lineTo(sx+sw*.7,sy+sh);c.lineTo(W*.92,H);c.lineTo(W*.08,H);c.closePath();c.fill();
      // audience dots
      s.aud.forEach(function(a,i){var bob=Math.sin(t*2+a.ph)*1.5;c.fillStyle=rgba(PAP,.85);c.beginPath();c.arc(a.x*W,H*.86+bob,2.4,0,6.28);c.fill()});
      label(c,'60+ STUDENTS',W*.1,H*.97,.85,Math.max(7,W*.05));
    }};

  var pathStartup={init:function(s,W,H){var r=seed(63);s.n=[];for(var i=0;i<10;i++)s.n.push({x:r()*W,y:r()*H});
      s.pulse=[];for(var k=0;k<16;k++)s.pulse.push({a:r(),sp:.3+r()*.6,ph:r()*6})},
    draw:function(c,W,H,t,s){
      bgSmall(c,W,H,'#201709');
      var n=s.n;
      for(var i=0;i<n.length;i++)for(var j=i+1;j<n.length;j++){
        var d=Math.hypot(n[i].x-n[j].x,n[i].y-n[j].y);
        if(d<W*.42){c.strokeStyle=rgba(AMB,(1-d/(W*.42))*.65);c.lineWidth=1;c.beginPath();c.moveTo(n[i].x,n[i].y);c.lineTo(n[j].x,n[j].y);c.stroke();
          var u=(t*.6+s.pulse[(i+j)%s.pulse.length].ph)%1,px=n[i].x+(n[j].x-n[i].x)*u,py=n[i].y+(n[j].y-n[i].y)*u;
          c.fillStyle=rgba(AMB,1);c.beginPath();c.arc(px,py,1.8,0,6.28);c.fill()}
      }
      n.forEach(function(p,i){var pu=.5+.5*Math.sin(t*2.2+i);c.fillStyle=rgba(AMB,.75+pu*.25);c.beginPath();c.arc(p.x,p.y,2.2+pu*1.5,0,6.28);c.fill()});
      label(c,'ADAPTIVE LEARNING',W*.04,H*.94,.85,Math.max(7,W*.05));
    }};

  var pathMic={init:function(s,W,H){},
    draw:function(c,W,H,t){
      bgSmall(c,W,H,'#231a0c');
      var cx=W*.26,cy=H*.5,mw=W*.09,mh=H*.42;
      c.fillStyle=rgba(AMB,.18);c.strokeStyle=rgba(AMB,1);c.lineWidth=1.8;
      rr.call(c,cx-mw/2,cy-mh/2,mw,mh,mw/2);c.fill();c.stroke();
      c.beginPath();c.arc(cx,cy+mh*.1,mw*1.35,.25*Math.PI,.75*Math.PI);c.stroke();
      c.beginPath();c.moveTo(cx,cy+mh*.1+mw*1.35);c.lineTo(cx,cy+mh*.95);c.moveTo(cx-mw*.7,cy+mh*.95);c.lineTo(cx+mw*.7,cy+mh*.95);c.stroke();
      for(var r=0;r<4;r++){var a=((t*.5+r/4)%1),rad=mw*1.6+a*W*.3;
        c.strokeStyle=rgba(AMB,(1-a)*.75);c.lineWidth=1.3;c.beginPath();c.arc(cx,cy,rad,-.6,.6);c.stroke()}
      label(c,'IEEE CONFERENCE',W*.44,H*.22,.9,Math.max(7,W*.05));
      label(c,'GEN2 EDUCATION SYSTEM',W*.44,H*.38,.6,Math.max(6,W*.042));
    }};

  var pathGlobe={init:function(s,W,H){var r=seed(81);s.dots=[];for(var i=0;i<7;i++)s.dots.push({a:r()*6.28,el:r()*.6-.3,ph:r()*6})},
    draw:function(c,W,H,t,s){
      bgSmall(c,W,H,'#152019');
      var cx=W*.32,cy=H*.5,R=Math.min(W*.26,H*.4);
      c.save();c.translate(cx,cy);
      c.strokeStyle=rgba(AMB,.85);c.lineWidth=1.4;ring(c,0,0,R,.85);
      // latitude ellipses (rotating look) + longitude arcs
      for(var k=-2;k<=2;k++){c.beginPath();c.ellipse(0,k*R*.32,R*Math.sqrt(Math.max(.05,1-(k*.32)*(k*.32))),R*.18,0,0,6.28);c.strokeStyle=rgba(AMB,.4);c.stroke()}
      var rot=t*.25;
      for(var m=0;m<3;m++){var ang=rot+m*Math.PI/3;c.beginPath();c.ellipse(0,0,Math.abs(R*Math.cos(ang))+.001,R,0,0,6.28);c.strokeStyle=rgba(AMB,.32);c.stroke()}
      // connection arc (research link) + glowing nodes
      s.dots.forEach(function(d,i){var a=d.a+t*.15,x=Math.cos(a)*R*Math.cos(d.el),y=Math.sin(d.el)*R;
        var pu=.5+.5*Math.sin(t*2+d.ph);c.fillStyle=rgba(AMB,.7+pu*.3);c.beginPath();c.arc(x,y,1.8+pu,0,6.28);c.fill()});
      c.restore();
      label(c,'NCCU TAIWAN',W*.66,H*.32,.9,Math.max(7,W*.05));
      if(W>220)label(c,'ADHD · LIT. REVIEW',W*.66,H*.47,.6,Math.max(7,W*.034));
    }};

  var ARTS={adapteval:adapt,edumind:edu,glasses:glasses,mind:mind,news:news,
    'path-edu':pathEdu,'path-corp':pathCorp,'path-talk':pathTalk,'path-startup':pathStartup,'path-mic':pathMic,'path-globe':pathGlobe};
  var items=[],reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches),root=document.documentElement;
  function size(it){
    // the canvas's on-screen box is fixed by CSS — never set it.el.style.width/height here.
    // (An inline height:100% once resolved back against the canvas's own intrinsic size, which
    // this function then re-read and baked in, so every resize inflated the box without bound.)
    // These are soft, glowing scenes: 1.25x (big shots) / 1.5x (small) is plenty, and far cheaper than 2x.
    var r=it.el.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,it.kind==='big'?1.25:1.5);
    it.W=Math.max(60,Math.round(r.width));it.H=Math.max(40,Math.round(r.height));
    it.el.width=Math.round(it.W*d);it.el.height=Math.round(it.H*d);
    it.ctx.setTransform(d,0,0,d,0,0);CUR_W=it.W;it.art.init(it.state={},it.W,it.H);it.dirty=true;
  }
  // Every canvas that is meaningfully on screen keeps moving; only the *rate* adapts. Slow ambient
  // motion at 10-20fps reads as perfectly smooth, and it drops further while the page is scrolling
  // or when the machine is struggling (lite mode) — it never simply stops.
  function live(it){
    if(it.kind==='big')return it.ratio>=.12;
    return true;
  }
  var RATE={big:1/20,frame:1/10,screen:1/24};
  function boot(){
    Array.prototype.forEach.call(document.querySelectorAll('canvas[data-art]'),function(el,i){
      var art=ARTS[el.dataset.art];if(!art)return;
      var kind=el.classList.contains('thumb')?'big':el.classList.contains('fthumb')?'frame':'screen';
      var it={el:el,ctx:el.getContext('2d'),art:art,kind:kind,host:el.closest('.cframe'),vis:false,ratio:0,hot:0,off:i*1.3,acc:0,dirty:true};
      items.push(it);size(it);
      new IntersectionObserver(function(es){var e=es[es.length-1];it.vis=e.isIntersecting;it.ratio=e.intersectionRatio;if(it.vis)it.dirty=true},{rootMargin:'120px',threshold:[0,.12,.55]}).observe(el);
      var sc=el.closest('.scene, .cframe');if(sc){sc.addEventListener('pointerenter',function(){it.hot=1});sc.addEventListener('pointerleave',function(){it.hot=0})}
    });
    var rz;window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){items.forEach(size)},200)});
    var scrolling=false,st;window.addEventListener('scroll',function(){scrolling=true;clearTimeout(st);st=setTimeout(function(){scrolling=false},140)},{passive:true});
    var last=performance.now(),acc={big:0,frame:0,screen:0},fire={},step={};
    // one shared loop. Canvases of the same kind redraw on the same frames (so the compositor wakes
    // once, not once per canvas); hovered canvases and the selected Path frame get a faster private clock.
    (function loop(now){requestAnimationFrame(loop);var dt=Math.min(.05,(now-last)/1000);last=now;
      var mul=(scrolling?2.2:1)*(root.classList.contains('lite')?1.5:1);
      for(var kk in acc){acc[kk]+=dt;fire[kk]=acc[kk]>=RATE[kk]*mul*.9;step[kk]=acc[kk];if(fire[kk])acc[kk]=0}
      for(var k=0;k<items.length;k++){var it=items[k];if(!it.vis)continue;
        if(reduce||!live(it)){if(it.dirty){if(it.t==null)it.t=1.8+it.off;CUR_W=it.W;it.art.draw(it.ctx,it.W,it.H,it.t,it.state);it.dirty=false}continue}
        var fast=it.hot||(it.kind==='frame'&&it.host&&it.host.classList.contains('sel')),st2;
        if(fast){it.acc+=dt;if(it.acc<(scrolling?1/15:1/30)*.9)continue;st2=it.acc;it.acc=0}
        else{if(!fire[it.kind])continue;st2=step[it.kind]}
        it.sp=(it.sp||1)+((it.hot?2.2:1)-(it.sp||1))*.1;it.t=(it.t==null?it.off:it.t)+st2*it.sp;
        CUR_W=it.W;it.art.draw(it.ctx,it.W,it.H,it.t,it.state);it.dirty=false}
    })(last);
  }
  // re-point an existing canvas at a different scene (the Path screen swaps art per chapter)
  window.Thumbs={retarget:function(el,key){var art=ARTS[key];if(!art)return;
    for(var i=0;i<items.length;i++)if(items[i].el===el){var it=items[i];it.art=art;el.dataset.art=key;size(it);it.acc=1;return}}};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(boot);
})();
