/* Photoreal audience for Podium.
   Front row: live faces. Each person is a photoreal portrait; the Modal server re-poses it with LivePortrait
   from the reactions the crowd model computes here, and streams back 512px face crops that are composited onto
   the portrait cut-out. Everyone else plays pre-generated photoreal clips (listen, engaged, bored, phone,
   confused, clap), switched as their state changes. No 3D people appear in this mode. */
window.PodiumLive = (function(){
  const ROOMS = ["auditorium","lecture"];
  const CLIP_FOR = {idle:"listen",listening:"listen",engaged:"engaged",drifting:"bored",bored:"bored","checked-out":"bored",phone:"phone",confused:"confused",applause:"clap"};
  const FRONT_CLIP = {phone:"phone",applause:"clap"};   // front-row bodies switch to a clip for these; otherwise the face is live
  const NAMES = ["Ayo","Martin","Dev","Mei","Rosa","Kofi","Ellen","Mateo","Noor","Liam","Hiro","Clara","Idris","Priya"];
  const AGE_WORDS = {twenties:25,"early twenties":22,thirties:34,"late twenties":28,forties:44,"mid forties":45,fifties:55,"late fifties":58,sixties:63};
  const st = {base:null, cast:"auditorium", manifest:null, on:false, ws:null, faces:{}, sendAcc:0, status:"off", videos:new Map(), mask:null};
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

  function ageOf(desc){ const m=desc.match(/(early |late |mid )?(twenties|thirties|forties|fifties|sixties)/); return m?(AGE_WORDS[(m[1]||"")+m[2]]||AGE_WORDS[m[2]]):38; }
  function url(path){ return `${st.base}/cast/${st.cast}/${path}`; }

  async function configure(base, enabled){
    st.base=(base||"").trim().replace(/\/+$/,""); st.on=!!enabled&&!!st.base; st.manifest=null;
    store.set("podium.live.base",st.base); store.set("podium.live.on",st.on?"1":"");
    if(!st.on){ st.status="off"; return false; }
    try{ const r=await fetch(url("manifest.json")); if(!r.ok) throw new Error(r.status); st.manifest=await r.json(); st.status="ready"; return true; }
    catch(e){ st.status="unreachable"; st.manifest=null; return false; }
  }
  const usable = room => st.on && !!st.manifest && ROOMS.includes(room) && (st.manifest.back.length||st.manifest.front.length);

  /* ---------- shared, reference-counted clip textures */
  function clipTexture(id,state){
    const key=`${id}/${state}`; let v=st.videos.get(key);
    if(!v){ const el=document.createElement("video"); el.crossOrigin="anonymous"; el.muted=true; el.loop=true; el.playsInline=true; el.preload="auto"; el.src=url(`${key}.alpha.mp4`);
      const tex=new THREE.VideoTexture(el); v={el,tex,refs:0}; st.videos.set(key,v); }
    if(v.refs++===0) v.el.play().catch(()=>{});
    return v;
  }
  function release(v){ if(v&&--v.refs<=0){ v.refs=0; v.el.pause(); } }
  function releaseAll(){ for(const v of st.videos.values()){ v.el.pause(); v.el.removeAttribute("src"); v.el.load(); v.tex.dispose(); } st.videos.clear(); if(st.ws){ st.ws.close(); st.ws=null; } st.faces={}; }

  /* ---------- seating */
  // Seated person framed head to knees in a 4:5 clip, about 1.25 m tall.
  const W=1.0, H=1.25, BOTTOM=.28;
  // Clips are ordinary MP4s with the picture on top and its cut-out mask stacked underneath (plays in every browser).
  const stackedMaterial = tex => new THREE.ShaderMaterial({uniforms:{map:{value:tex}}, transparent:true, depthWrite:false, side:THREE.DoubleSide,
    vertexShader:"varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader:"uniform sampler2D map; varying vec2 vUv; void main(){ vec3 c=texture2D(map,vec2(vUv.x,.5+vUv.y*.5)).rgb; float a=texture2D(map,vec2(vUv.x,vUv.y*.5)).r; if(a<.02) discard; gl_FragColor=vec4(c,a); }"});
  function plane(holder, tex, mirror){
    const m=tex.isVideoTexture?stackedMaterial(tex):new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false,side:THREE.DoubleSide,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(W,H),m); mesh.position.set(0,BOTTOM+H/2,.08); if(mirror) mesh.scale.x=-1; holder.add(mesh); return mesh;
  }
  function plan(seats, eye){
    // live faces go in the front row, nearest the centre; everyone else plays clips
    const front=(st.manifest.front||[]).filter(f=>f.id);
    const d=s=>Math.hypot(s.x-eye.x,s.z-eye.z), minD=Math.min(...seats.map(d));
    const row=seats.map((s,i)=>({i,s})).filter(o=>d(o.s)<minD+.6).sort((a,b)=>Math.abs(a.s.x)-Math.abs(b.s.x));
    const live=new Map(); row.slice(0,front.length).forEach((o,k)=>live.set(o.i,front[k]));
    return live;
  }
  function place(seat,i,holder,liveCast){
    const back=st.manifest.back;
    if(liveCast){
      const canvas=document.createElement("canvas"), tex=new THREE.CanvasTexture(canvas); tex.encoding=THREE.sRGBEncoding;
      const mesh=plane(holder,tex,false), person={kind:"live",cast:liveCast,canvas,tex,mesh,clip:null,clipMesh:null,yawnUntil:0,pose:{},ready:false};
      const img=new Image(); img.crossOrigin="anonymous"; img.onload=()=>{ person.cut=img; const k=Math.min(1,640/img.naturalWidth); canvas.width=Math.round(img.naturalWidth*k); canvas.height=Math.round(img.naturalHeight*k); canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height); tex.needsUpdate=true; mesh.scale.y=(img.naturalHeight/img.naturalWidth)/(H/W); };
      img.src=url(`${liveCast.id}/portrait_cut.png`);
      st.faces[liveCast.id]=person;
      return {person,name:NAMES[(i*3)%NAMES.length],age:ageOf(liveCast.desc)};
    }
    const row=Math.round(Math.hypot(seat.x,seat.z)), c=back[(i*3+row)%back.length];
    const person={kind:"video",cast:c,mirror:(i+row)%2===1,state:null,v:null,mesh:null,holder};
    setClip(person,"listen");
    return {person,name:NAMES[(i*5+row)%NAMES.length],age:ageOf(c.desc)};
  }
  function setClip(person,clip){
    const states=person.cast.states||[]; if(!states.includes(clip)) clip=states.includes("listen")?"listen":states[0];
    if(!clip||person.state===clip) return;
    const v=clipTexture(person.cast.id,clip);
    if(!person.mesh) person.mesh=plane(person.holder,v.tex,person.mirror); else person.mesh.material.uniforms.map.value=v.tex;
    release(person.v); person.v=v; person.state=clip;
  }

  /* ---------- live faces */
  function loadMask(){ if(st.mask) return st.mask; st.mask=new Promise(res=>{ const img=new Image(); img.onload=()=>{ const c=document.createElement("canvas"); c.width=c.height=512; const g=c.getContext("2d"); g.drawImage(img,0,0,512,512);
      const d=g.getImageData(0,0,512,512); for(let i=0;i<d.data.length;i+=4){ d.data[i+3]=d.data[i]; d.data[i]=d.data[i+1]=d.data[i+2]=255; } g.putImageData(d,0,0); res(c); }; img.src="live/mask_template.png"; }); return st.mask; }
  async function connect(){
    const ids=Object.keys(st.faces); if(!ids.length||st.ws) return;
    const mask=await loadMask(); const layer=document.createElement("canvas"); layer.width=layer.height=512; const lg=layer.getContext("2d");
    const ws=new WebSocket(st.base.replace(/^http/,"ws")+"/ws"); ws.binaryType="arraybuffer"; st.ws=ws; st.status="connecting";
    let order=[];
    ws.onopen=()=>ws.send(JSON.stringify({type:"hello",cast:st.cast,faces:ids}));
    ws.onmessage=async ev=>{
      if(typeof ev.data==="string"){ const m=JSON.parse(ev.data); if(m.type==="faces"){ order=m.faces.map(f=>f.id); m.faces.forEach(f=>{ if(st.faces[f.id]){ st.faces[f.id].meta=f; st.faces[f.id].ready=true; } }); st.status="live"; } else if(m.type==="error") console.warn("Podium live:",m.message); return; }
      const buf=new Uint8Array(ev.data), p=st.faces[order[buf[0]]]; if(!p||!p.cut||!p.meta) return;
      const bmp=await createImageBitmap(new Blob([buf.subarray(1)],{type:"image/jpeg"}));
      lg.globalCompositeOperation="source-over"; lg.clearRect(0,0,512,512); lg.drawImage(bmp,0,0,512,512); lg.globalCompositeOperation="destination-in"; lg.drawImage(mask,0,0); bmp.close();
      const g=p.canvas.getContext("2d"), M=p.meta.matrix, k=p.canvas.width/p.meta.width;
      g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation="source-over"; g.clearRect(0,0,p.canvas.width,p.canvas.height); g.drawImage(p.cut,0,0,p.canvas.width,p.canvas.height);
      g.setTransform(M[0]*k,M[3]*k,M[1]*k,M[4]*k,M[2]*k,M[5]*k); g.drawImage(layer,0,0);   // the face crop, back where it came from
      g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation="destination-in"; g.drawImage(p.cut,0,0,p.canvas.width,p.canvas.height); g.globalCompositeOperation="source-over";
      p.tex.needsUpdate=true;
    };
    ws.onclose=()=>{ st.ws=null; st.status=st.on?"disconnected":"off"; };
  }
  const deg=r=>r*57.2958;
  function update(p, s, dt, now){
    const L=p.live;
    if(L.kind==="video"){ setClip(L, CLIP_FOR[p.state]||"listen"); return; }
    // front row: clip for phone and applause, live face otherwise
    const want=FRONT_CLIP[p.state];
    if(want&&(L.cast.states||[]).includes(want)){ if(!L.clipMesh){ L.holder=p.holder; const v=clipTexture(L.cast.id,want); L.clip=v; L.clipMesh=plane(p.holder,v.tex,false); L.mesh.visible=false; } }
    else if(L.clipMesh){ p.holder.remove(L.clipMesh); release(L.clip); L.clip=null; L.clipMesh=null; L.mesh.visible=true; }
    L.pose={pitch:deg(s.pitch)*.9, yaw:deg(s.yaw)*.8, roll:deg(s.roll), smile:s.smile*.9, eyebrow:s.brow*12-s.furrow*18,
      eye_x:deg(s.eyeYaw), eye_y:-deg(s.eyePitch), blink:s.blink, mouth:now<L.yawnUntil?1:0};
  }
  function tick(dt){
    if(!st.ws||st.ws.readyState!==1) return; st.sendAcc+=dt; if(st.sendAcc<1/15) return; st.sendAcc=0;
    const faces={}; for(const [id,p] of Object.entries(st.faces)) faces[id]=p.pose; st.ws.send(JSON.stringify({type:"pose",faces}));
  }
  function yawn(p){ const L=p.live; if(L.kind==="live"){ L.yawnUntil=performance.now()+2600; return true; } setClip(L,"bored"); return true; }

  return {
    rooms:ROOMS, configure, usable, plan, place, update, tick, connect, yawn, releaseAll,
    get status(){ return st.status; }, get base(){ return st.base; }, get on(){ return st.on; },
    saved(){ return {base:store.get("podium.live.base")||"", on:store.get("podium.live.on")==="1"}; },
  };
})();
