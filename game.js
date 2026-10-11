(() => {
  'use strict';

  // Original browser surf run with a locally bundled, user-provided 3D character.
  const canvas = document.querySelector('#game');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) {
    const hint = document.querySelector('#hint');
    hint.textContent = 'WEBGL IS UNAVAILABLE IN THIS BROWSER';
    return;
  }
  const $ = (id) => document.getElementById(id);
  const courses = [
    { name: 'Whiteout Run', info: 'Snow ravine · 3 checkpoints · Flowing', sky: [0.48, 0.64, 0.68], water: [0.24, 0.48, 0.53], ramp: [0.62, 0.72, 0.72], accent: [0.63, 0.89, 0.48], mountain: [0.43, 0.51, 0.52], seed: 1 },
    { name: 'Glasswater Cut', info: 'Coastal canyon · 3 checkpoints · Fast', sky: [0.35, 0.57, 0.62], water: [0.18, 0.43, 0.47], ramp: [0.55, 0.73, 0.71], accent: [0.93, 0.77, 0.43], mountain: [0.35, 0.49, 0.49], seed: 2 },
    { name: 'Blue Hour', info: 'Alpine dusk · 3 checkpoints · Advanced', sky: [0.17, 0.25, 0.37], water: [0.22, 0.34, 0.45], ramp: [0.43, 0.57, 0.67], accent: [0.94, 0.72, 0.41], mountain: [0.22, 0.31, 0.39], seed: 3 }
  ];
  let courseIndex = 0, course = courses[0], started = false, finished = false, chaseCamera = false;
  let x = 0, y = 0, z = 1.45, vx = 0, vz = 0, speed = 0, yaw = 0, pitch = 0;
  let elapsed = 0, last = performance.now(), lastFrame = last, frames = 0, fpsAt = last;
  let sensitivity = 2.5, fov = 90, autoHop = true, jumping = false, grounded = true, checkpoint = 0;
  const keys = new Set(), recordsKey = 'cold-current-records-v2';
  let surferModel = null;
  const vertexSource = `attribute vec3 p; attribute vec3 c; uniform mat4 mvp; varying vec3 col; void main(){gl_Position=mvp*vec4(p,1.0);col=c;}`;
  const fragmentSource = `precision mediump float; varying vec3 col; void main(){gl_FragColor=vec4(col,1.0);}`;
  function shader(type, source) { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const program=gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource)); gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program); const pLoc=gl.getAttribLocation(program,'p'), cLoc=gl.getAttribLocation(program,'c'), mLoc=gl.getUniformLocation(program,'mvp');
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc,3,gl.FLOAT,false,24,0); gl.enableVertexAttribArray(cLoc); gl.vertexAttribPointer(cLoc,3,gl.FLOAT,false,24,12);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);

  const mix=(a,b,t)=>a+(b-a)*t;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const color=(a,f=1)=>a.map(v=>clamp(v*f,0,1));
  fetch('surfer-character.json').then(r=>{if(!r.ok)throw new Error(`Character model failed to load (${r.status})`);return r.json()}).then(m=>{if(m.format!=='triangle-list-position-rgb-v1'||!Array.isArray(m.vertices)||m.vertices.length%6)throw new Error('Character model format is invalid');surferModel=new Float32Array(m.vertices)}).catch(e=>console.error(e));
  function matrixMultiply(a,b){const o=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
  function perspective(fovDeg,aspect,near,far){const f=1/Math.tan(fovDeg*Math.PI/360),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
  function viewMatrix(eye,look,roll=0){let fx=look[0]-eye[0],fy=look[1]-eye[1],fz=look[2]-eye[2],fl=Math.hypot(fx,fy,fz)||1;fx/=fl;fy/=fl;fz/=fl;let rx=fy,ry=-fx,rz=0,rl=Math.hypot(rx,ry)||1;rx/=rl;ry/=rl;let ux=ry*fz,uy=-rx*fz,uz=rx*fy-ry*fx;const cr=Math.cos(roll),sr=Math.sin(roll),oldRx=rx,oldRy=ry,oldRz=rz;rx=oldRx*cr+ux*sr;ry=oldRy*cr+uy*sr;rz=oldRz*cr+uz*sr;ux=ux*cr-oldRx*sr;uy=uy*cr-oldRy*sr;uz=uz*cr-oldRz*sr;return new Float32Array([rx,ux,-fx,0,ry,uy,-fy,0,rz,uz,-fz,0,-(rx*eye[0]+ry*eye[1]+rz*eye[2]),-(ux*eye[0]+uy*eye[1]+uz*eye[2]),fx*eye[0]+fy*eye[1]+fz*eye[2],1]);}
  function geometry(){
    const out=[];
    function tri(a,b,c,col){for(const v of [a,b,c])out.push(v[0],v[1],v[2],col[0],col[1],col[2]);}
    function quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col);}
    function box(cx,cy,cz,sx,sy,sz,col){
      const a=[cx-sx/2,cy-sy/2,cz-sz/2],b=[cx+sx/2,cy-sy/2,cz-sz/2],c=[cx+sx/2,cy+sy/2,cz-sz/2],d=[cx-sx/2,cy+sy/2,cz-sz/2],e=[cx-sx/2,cy-sy/2,cz+sz/2],f=[cx+sx/2,cy-sy/2,cz+sz/2],g=[cx+sx/2,cy+sy/2,cz+sz/2],h=[cx-sx/2,cy+sy/2,cz+sz/2];
      quad(a,b,c,d,color(col,.62));quad(e,h,g,f,color(col,1.05));quad(a,e,f,b,color(col,.76));quad(d,c,g,h,color(col,.88));quad(b,f,g,c,color(col,.96));quad(a,d,h,e,color(col,.70));
    }
    function prism(cx,cy,width,depth,height,col){
      const left=[cx-width/2,cy-depth/2,0],right=[cx+width/2,cy-depth/2,0],back=[cx,cy-depth/2,height];
      const l2=[cx-width/2,cy+depth/2,0],r2=[cx+width/2,cy+depth/2,0],b2=[cx,cy+depth/2,height*.82];
      quad(left,back,b2,l2,color(col,.86));quad(back,right,r2,b2,color(col,.68));tri(left,right,back,color(col,.96));tri(l2,r2,b2,color(col,.80));
    }
    const ahead=y+176, start=Math.floor((y-24)/7)*7, lane=10;
    const curveAt=q=>Math.sin((q+course.seed*31)*.018)*2.2+Math.sin(q*.043+course.seed)*.7;
    // Low runout, paired glass-like surf faces, and a changing ravine line.
    for(let yy=start;yy<ahead;yy+=7){
      const y0=yy,y1=yy+7,c0=curveAt(y0),c1=curveAt(y1),phase=Math.sin(yy*.038+course.seed),mid=phase*.75;
      const center0=c0+mid,center1=c1+mid;
      const l=[center0-lane,y0,.03],r=[center0+lane,y0,.03],ln=[center1-lane,y1,.03],rn=[center1+lane,y1,.03];
      quad(l,ln,[center1,y1,.03],[center0,y0,.03],color(course.water,(Math.floor(yy/7)%2?1.05:.93)));
      quad([center0,y0,.03],[center1,y1,.03],rn,r,color(course.water,.78));
      for(const side of [-1,1]){
        const x0=center0+side*lane,x1=center1+side*lane;
        const outer0=center0+side*(lane+16),outer1=center1+side*(lane+16);
        const lift0=4.3+1.45*Math.sin(yy*.033+course.seed+side*.72),lift1=4.3+1.45*Math.sin((yy+7)*.033+course.seed+side*.72);
        const inner0=[x0,y0,.03],inner1=[x1,y1,.03],crest0=[outer0,y0,lift0],crest1=[outer1,y1,lift1];
        quad(inner0,inner1,crest1,crest0,color(course.ramp,(Math.floor(yy/7)%2?1.03:.94)));
        // Thin outside lip and pale seam stripe make the ramp read as a hard-surfaced run.
        const lip0=[center0+side*(lane+17.5),y0,lift0-.52],lip1=[center1+side*(lane+17.5),y1,lift1-.52];
        quad(crest0,crest1,lip1,lip0,color(course.mountain,.80));
        const seam0=[center0+side*(lane-.24),y0,.06],seam1=[center1+side*(lane-.24),y1,.06];
        quad(seam0,seam1,[center1+side*(lane+.20),y1,.06],[center0+side*(lane+.20),y0,.06],color(course.accent,.42));
      }
    }
    // Tall broken snow walls and distant angular peaks: a new, deterministic ravine layout.
    for(const side of [-1,1])for(let yy=Math.floor((y-72)/24)*24;yy<ahead+40;yy+=24){
      const n=Math.abs(Math.sin(yy*.071+side*23+course.seed*7)),wallX=side*(46+n*12),height=13+n*31;
      prism(wallX,yy+9,20+n*10,27,height,color(course.mountain,.84+n*.18));
      prism(wallX-side*9,yy+20,15+n*9,32,height*.56,color(course.ramp,.76));
      if(n>.54)prism(side*(71+n*7),yy+10,22,30,height*1.22,color(course.mountain,.72));
    }
    // Sparse dark conifers on the ridge line add scale without imported artwork.
    for(let i=0;i<30;i++){
      const yy=y+((i*31)%194)-10,side=i%2?1:-1,n=Math.abs(Math.sin(i*17.3+course.seed));
      const tx=side*(50+n*17),base=.2,treeH=2.7+n*4.2;
      box(tx,yy,base+treeH*.13,.34,.34,treeH*.26,[.13,.22,.23]);
      prism(tx,yy,1.2+n*.6,1.2+n*.6,treeH,color(course.mountain,.52));
    }
    const gates=[0,48,96,144];
    for(let i=0;i<gates.length;i++){
      const gy=gates[i];if(gy<y-10||gy>ahead)continue;
      const shift=curveAt(gy),cc=i===0?course.accent:(i===gates.length-1?[.96,.73,.39]:[.82,.88,.85]);
      box(shift-13,gy,4.2,.55,.75,8.4,cc);box(shift+13,gy,4.2,.55,.75,8.4,cc);box(shift,gy,8.25,26,.75,.5,cc);
    }
    return new Float32Array(out);
  }
  function addModelQuad(out,a,b,c,d,col){for(const v of [a,b,c,a,c,d])out.push(v[0],v[1],v[2],col[0],col[1],col[2]);}
  function addEllipsoid(out,cx,cy,cz,rx,ry,rz,col){const rings=9,slices=14;for(let j=0;j<rings;j++){const p0=-Math.PI/2+j*Math.PI/rings,p1=-Math.PI/2+(j+1)*Math.PI/rings;for(let i=0;i<slices;i++){const a0=i*Math.PI*2/slices,a1=(i+1)*Math.PI*2/slices;const point=(p,a)=>[cx+rx*Math.cos(p)*Math.cos(a),cy+ry*Math.cos(p)*Math.sin(a),cz+rz*Math.sin(p)];const bright=.78+Math.max(0,Math.sin((p0+p1)/2))*.2;addModelQuad(out,point(p0,a0),point(p0,a1),point(p1,a1),point(p1,a0),color(col,bright));}}}
  function appendSurferModel(out,by,deck,now){if(!surferModel)return;const pivot=.82,bank=clamp(-vx*.012,-.32,.32),turn=clamp(vx*.006,-.18,.18),cb=Math.cos(bank),sb=Math.sin(bank),ct=Math.cos(turn),st=Math.sin(turn),bob=grounded?Math.sin(now*.009)*.014:clamp(vz*.006,-.06,.06);for(let i=0;i<surferModel.length;i+=6){const px=surferModel[i],py=surferModel[i+1],pz=surferModel[i+2],dx=px, dz=pz-pivot,rx=dx*cb+dz*sb,rz=-dx*sb+dz*cb;out.push(x+rx*ct-py*st,by+rx*st+py*ct,deck+pivot+rz+bob,surferModel[i+3],surferModel[i+4],surferModel[i+5]);}}
  function addSurfer(out,now){const deck=Math.max(.12,z-1.35),by=y+.12;for(let i=0;i<16;i++){const a=-1.42+i*2.84/16,b=-1.42+(i+1)*2.84/16,wa=.08+.46*Math.pow(Math.max(0,Math.sin(i*Math.PI/16)),.72),wb=.08+.46*Math.pow(Math.max(0,Math.sin((i+1)*Math.PI/16)),.72);addModelQuad(out,[x-wa,by+a,deck+.12],[x+wa,by+a,deck+.12],[x+wb,by+b,deck+.12],[x-wb,by+b,deck+.12],[.88,.91,.84]);addModelQuad(out,[x-.035,by+a,deck+.145],[x+.035,by+a,deck+.145],[x+.035,by+b,deck+.145],[x-.035,by+b,deck+.145],course.accent);}addModelQuad(out,[x-.13,by+1.20,deck+.10],[x+.13,by+1.20,deck+.10],[x+.12,by+1.38,deck+.12],[x-.12,by+1.38,deck+.12],[.18,.23,.25]);
    // Small under-fin and leash details keep the deck silhouette readable.
    addModelQuad(out,[x-.035,by-.18,deck+.02],[x+.035,by-.18,deck+.02],[x+.035,by+.26,deck+.02],[x-.035,by+.26,deck+.02],[.08,.12,.14]);addModelQuad(out,[x-.25,by-.12,deck+.02],[x-.18,by-.12,deck+.02],[x-.12,by+.08,deck+.02],[x-.18,by+.12,deck+.02],[.08,.12,.14]);addModelQuad(out,[x+.25,by-.12,deck+.02],[x+.18,by-.12,deck+.02],[x+.12,by+.08,deck+.02],[x+.18,by+.12,deck+.02],[.08,.12,.14]);
    if(surferModel)appendSurferModel(out,by,deck+.13,now);else{addEllipsoid(out,x,by+.02,deck+1.1,.32,.25,.78,[.08,.25,.30]);addEllipsoid(out,x,by+.02,deck+1.78,.24,.23,.24,[.71,.45,.32]);}}
  function updateCourse(){course=courses[courseIndex];$('courseName').textContent=course.name;$('courseInfo').textContent=course.info;$('courseHud').textContent=course.name.toUpperCase();updateBest();}
  function readRecords(){try{return JSON.parse(localStorage.getItem(recordsKey)||'{}')}catch{return {}}}
  function records(){return readRecords()[course.name]||[]}
  function format(t){const mm=Math.floor(t/60),ss=Math.floor(t%60),ms=Math.floor(t*1000)%1000;return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(ms).padStart(3,'0')}`}
  function updateBest(){const rs=records();$('best').textContent=rs.length?format(rs[0]):'—';$('runCount').textContent=String(rs.length)}
  function saveRecord(t){const all=readRecords(),rs=all[course.name]||[];rs.push(t);rs.sort((a,b)=>a-b);all[course.name]=rs.slice(0,10);localStorage.setItem(recordsKey,JSON.stringify(all));updateBest()}
  function showRecords(){const list=$('recordList');list.replaceChildren();const rs=records();if(!rs.length){const p=document.createElement('p');p.className='muted';p.textContent='No runs yet. Drop in and set your first time.';list.append(p)}else rs.forEach((v,i)=>{const row=document.createElement('div');row.className='record-row';row.innerHTML=`<span>${String(i+1).padStart(2,'0')} &nbsp; ${course.name}</span><span>${format(v)}</span>`;list.append(row)});$('recordsPanel').classList.remove('hidden')}
  function setState(s){$('runState').textContent=s}
  function reset(){x=0;y=0;z=1.45;vx=0;vz=0;speed=0;yaw=0;pitch=0;elapsed=0;checkpoint=0;started=true;finished=false;grounded=true;jumping=false;$('finishPanel').classList.add('hidden');$('menuOverlay').classList.add('hidden');$('recordsPanel').classList.add('hidden');setState('LIVE');$('checkpoint').textContent='START';$('hint').textContent='W / S SPEED  ·  A / D SURF  ·  MOUSE LOOK  ·  SPACE / WHEEL JUMP  ·  SHIFT DUCK  ·  V CAMERA';canvas.requestPointerLock?.();last=performance.now();}
  function finish(){if(finished)return;finished=true;started=false;setState('FINISH');saveRecord(elapsed);$('finishTime').textContent=format(elapsed);$('finishPanel').classList.remove('hidden');document.exitPointerLock?.();}
  function menu(){started=false;finished=false;setState('READY');$('menuOverlay').classList.remove('hidden');$('finishPanel').classList.add('hidden');document.exitPointerLock?.()}
  function closePanels(){document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'))}
  $('play').addEventListener('click',reset);$('again').addEventListener('click',reset);$('finishMenu').addEventListener('click',menu);$('records').addEventListener('click',showRecords);
  $('prevCourse').addEventListener('click',()=>{courseIndex=(courseIndex+courses.length-1)%courses.length;updateCourse()});$('nextCourse').addEventListener('click',()=>{courseIndex=(courseIndex+1)%courses.length;updateCourse()});
  $('settingsTop').addEventListener('click',()=>$('settingsPanel').classList.remove('hidden'));$('settingsBottom').addEventListener('click',()=>$('settingsPanel').classList.remove('hidden'));document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closePanels));
  $('sensitivity').value=String(sensitivity);$('fov').value=String(fov);$('sensValue').value=sensitivity.toFixed(1);$('fovValue').value=`${fov}°`;$('sensitivity').addEventListener('input',e=>{sensitivity=Number(e.target.value);$('sensValue').value=sensitivity.toFixed(1)});$('fov').addEventListener('input',e=>{fov=Number(e.target.value);$('fovValue').value=`${fov}°`});$('bhop').addEventListener('change',e=>autoHop=e.target.checked);$('fpsToggle').addEventListener('change',e=>$('fps').classList.toggle('hidden',!e.target.checked));$('clearRecords').addEventListener('click',()=>{const all=readRecords();delete all[course.name];localStorage.setItem(recordsKey,JSON.stringify(all));showRecords();updateBest()});
  function jump(){if(started&&grounded){vz=9.6;grounded=false;jumping=true}}
  window.addEventListener('keydown',e=>{if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key==='Escape'&&started)menu();if(e.key.toLowerCase()==='r'&&started)reset();if(e.key.toLowerCase()==='v')chaseCamera=!chaseCamera;if(e.code==='Space')jump()});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('wheel',e=>{if(e.deltaY>0){e.preventDefault();jump()}},{passive:false});
  canvas.addEventListener('click',()=>{if(started&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});document.addEventListener('mousemove',e=>{if(started&&document.pointerLockElement===canvas){yaw=clamp(yaw-e.movementX*sensitivity*.00065,-.78,.78);pitch=clamp(pitch-e.movementY*sensitivity*.00035,-.18,.22)}});
  function resize(){const dpr=Math.min(devicePixelRatio||1,1.8),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}}window.addEventListener('resize',resize);
  function frame(now){resize();const dt=Math.min((now-lastFrame)/1000,.04);lastFrame=now;frames++;if(now-fpsAt>500){$('fps').textContent=`${Math.round(frames*1000/(now-fpsAt))} FPS`;frames=0;fpsAt=now}
    if(started){elapsed+=dt;const left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),back=keys.has('s')||keys.has('arrowdown'),forward=keys.has('w')||keys.has('arrowup'),duck=keys.has('shift');const steer=(right?1:0)-(left?1:0);const airControl=grounded?1:.68;vx+=(steer*(duck?11:17)+yaw*24)*dt*airControl;vx*=Math.pow(grounded?.988:.996,dt*60);vx=clamp(vx,-24,24);x+=vx*dt;const ramped=Math.abs(x)>8;const slope=-Math.cos(y*.075+course.seed+Math.PI)*.06;const pull=(ramped&&grounded?10+Math.max(0,slope)*72:0);speed+=pull*dt;if(forward)speed+=(duck?11:27)*dt;if(back)speed-=(duck?38:25)*dt;speed=clamp(speed,0,82);y+=speed*Math.max(.5,Math.cos(yaw*.8))*dt;
      const ramp=clamp((Math.abs(x)-8)/16,0,1),targetZ=1.45+ramp*(4.8+.8*Math.sin(y*.075+course.seed));if(grounded){z=mix(z,targetZ,Math.min(1,dt*8));if(autoHop&&jumping&&Math.abs(x)>7){vz=8.8;grounded=false;jumping=false}}else{z+=vz*dt;vz-=19*dt;if(z<=targetZ){z=targetZ;vz=0;grounded=true;jumping=true}}
      if(Math.abs(x)>32){x=Math.sign(x)*31;vx*=-.42;speed*=.985}const cp=Math.min(3,Math.floor(y/48));if(cp>checkpoint){checkpoint=cp;$('checkpoint').textContent=cp===3?'FINISH':`CP ${cp} / 3`}if(y>=170)finish();$('timer').textContent=format(elapsed);$('speed').textContent=String(Math.round(speed));}
    const cameraX=chaseCamera?x-Math.sin(yaw)*2.2:x+Math.sin(yaw)*.3,cameraY=chaseCamera?y-8:y,cameraZ=chaseCamera?z+2.65:z+(keys.has('shift')?1.08:1.55)+Math.sin(now*.006)*.018;const dir=[Math.sin(yaw)*Math.cos(pitch),Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch)-(chaseCamera ? .20 : .015)];const bank=chaseCamera?clamp(-vx*.012-x*.004,-.3,.3):0;const proj=perspective(fov,canvas.width/canvas.height,.1,320),view=viewMatrix([cameraX,cameraY,cameraZ],[cameraX+dir[0],cameraY+dir[1],cameraZ+dir[2]],bank);gl.uniformMatrix4fv(mLoc,false,matrixMultiply(proj,view));const sky=course.sky;gl.clearColor(sky[0],sky[1],sky[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const data=Array.from(geometry());if(chaseCamera)addSurfer(data,now);const vertices=new Float32Array(data);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,vertices.length/6);requestAnimationFrame(frame);}
  updateCourse();updateBest();resize();requestAnimationFrame(frame);
})();
