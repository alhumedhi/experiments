/* Seated rig for Rocketbox avatars.
   Body motion comes from Rocketbox's seated motion-capture clips when they are loaded; reactions are layered on top:
   head and eye direction, nods, lean, brows, smile, blinks, and arm overlays (phone, crossed arms, clapping, hand to chin).
   Overlay poses are authored by aiming bones at directions in the avatar's own space (faces +z, its left is +x). */
window.PodiumRig = (function(){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const key = n => n.replace(/^Bip01[ _]/,'').replace(/[ _]/g,'');
  function bonesOf(root){ const B={}; root.traverse(o=>{ if(o.isBone) B[key(o.name)]=o; }); return B; }
  const wp=o=>o.getWorldPosition(new THREE.Vector3());
  function aim(bone, child, dir){
    bone.updateWorldMatrix(true,true);
    const q=new THREE.Quaternion().setFromUnitVectors(wp(child).sub(wp(bone)).normalize(), dir.clone().normalize());
    const pw=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(pw.multiply(q.multiply(bone.getWorldQuaternion(new THREE.Quaternion()))));
    bone.updateWorldMatrix(false,true);
  }
  function twist(bone, dir, ang){ bone.updateWorldMatrix(true,true); const q=new THREE.Quaternion().setFromAxisAngle(dir.clone().normalize(), ang);
    const pw=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); bone.quaternion.copy(pw.multiply(q.multiply(bone.getWorldQuaternion(new THREE.Quaternion())))); bone.updateWorldMatrix(false,true); }
  const lap = s=>[V(s*.1,-1,.12), V(-s*.32,-.32,1), V(-s*.2,-.75,1)];
  const ARM_POSES = { // [upperArm->forearm, forearm->hand, hand->middle finger, forearm twist], s = +1 left / -1 right; null keeps that arm on the body motion
    lap,
    phone:    s=>[V(s*.05,-1,.2), V(-s*.42,.55,1), V(-s*.25,.25,1)],
    crossed:  s=>[V(s*.25,-1,.5), V(-s,.25,.2), V(-s,0,.1), .75],
    clapOpen: s=>[V(s*.12,-1,.3), V(-s*.25,.6,1), V(-s*.1,.55,1), -1.6],
    clapShut: s=>[V(s*.1,-1,.3), V(-s*.5,.6,1), V(-s*.35,.55,1), -1.6],
    chin:     s=>s<0 ? [V(s*.1,-1,.75), V(-s*.3,1.7,.15), V(-s*.15,1,.05), .75] : null,
  };
  const ARM=['UpperArm','Forearm','Hand'], ANIM=['Spine','Spine1','Spine2','Neck','Head','LEye','REye'];
  const FACE=['LInnerEyebrow','RInnerEyebrow','LOuterEyebrow','ROuterEyebrow','LMouthCorner','RMouthCorner','LEyeBlinkTop','REyeBlinkTop'];

  // Compact clip format from the build script: {name,fps,duration,tracks:[[trackName,[ints×1000]]]}
  function parseClips(list){
    return list.map(c=>{ const tracks=c.tracks.map(([name,ints])=>{ const quat=name.endsWith('.quaternion'), k=quat?4:3, n=ints.length/k;
      const values=new Float32Array(ints.length); for(let i=0;i<ints.length;i++) values[i]=ints[i]/1000;
      const times=new Float32Array(n); for(let i=0;i<n;i++) times[i]=i/c.fps;
      return quat ? new THREE.QuaternionKeyframeTrack(name,times,values) : new THREE.VectorKeyframeTrack(name,times,values); });
      return new THREE.AnimationClip(c.name,c.duration,tracks); });
  }

  // Prepare a loaded template once: seat it, then record overlay rest data and arm pose libraries.
  function prepare(scene, seatHeight=.5, clips=null){
    scene.updateMatrixWorld(true);
    const B=bonesOf(scene);
    scene.traverse(o=>{ if(o.isSkinnedMesh){ o.frustumCulled=false; o.castShadow=true; } if(o.material && o.material.alphaTest>0){ o.material.side=THREE.DoubleSide; o.material.alphaToCoverage=true; } });
    const animated=new Set();
    if(clips && clips.length){
      const mixer=new THREE.AnimationMixer(scene), base=clips.find(c=>c.name==='breathe_01')||clips[0];
      mixer.clipAction(base).play(); mixer.update(0); scene.updateMatrixWorld(true);
      for(const c of clips) for(const t of c.tracks) animated.add(key(t.name.split('.')[0]));
      const hip=wp(B.Pelvis); scene.position.y+=seatHeight-hip.y; scene.position.z+=.03-hip.z; scene.updateMatrixWorld(true);
      mixer.stopAllAction();
mixer.stopAllAction(); mixer.uncacheRoot(scene);
    } else {
      for(const s of [1,-1]){ const L=s>0?'L':'R';
        aim(B[L+'Thigh'],B[L+'Calf'],V(s*.13,-.06,1)); aim(B[L+'Calf'],B[L+'Foot'],V(s*.03,-1,.1)); aim(B[L+'Foot'],B[L+'Toe0'],V(s*.08,-.3,1)); }
      aim(B.Spine,B.Neck,V(0,1,-.06));
      const hip=wp(B.LThigh).y; scene.position.y+=seatHeight-hip; scene.updateMatrixWorld(true);
    }
    const original={}; for(const s of 'LR') for(const a of ARM) original[s+a]=B[s+a].quaternion.clone();
    const poses={};
    for(const [name,fn] of Object.entries(ARM_POSES)){ poses[name]={};
      for(const s of [1,-1]){ const L=s>0?'L':'R'; for(const a of ARM) B[L+a].quaternion.copy(original[L+a]); scene.updateMatrixWorld(true);
        const d=fn(s); if(!d){ continue; }
        aim(B[L+'UpperArm'],B[L+'Forearm'],d[0]); aim(B[L+'Forearm'],B[L+'Hand'],d[1]); if(d[3]) twist(B[L+'Forearm'],d[1],d[3]*s); aim(B[L+'Hand'],B[L+'Finger2'],d[2]);
        for(const a of ARM) poses[name][L+a]=B[L+a].quaternion.clone(); } }
    for(const s of 'LR') for(const a of ARM) B[s+a].quaternion.copy(poses.phone[s+a]);
    scene.updateMatrixWorld(true); const phonePos=wp(B.LHand).add(wp(B.RHand)).multiplyScalar(.5).add(V(0,.03,.04));
    for(const s of 'LR') for(const a of ARM) B[s+a].quaternion.copy(clips&&clips.length?original[s+a]:poses.lap[s+a]);
    scene.updateMatrixWorld(true);
    const rest={}, sq=scene.getWorldQuaternion(new THREE.Quaternion()).invert();
    for(const n of ANIM.concat(FACE)){ const b=B[n]; if(!b) continue; const P=b.parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(sq); rest[n]={q:b.quaternion.clone(),p:b.position.clone(),P,Pi:P.clone().invert(),animated:animated.has(n)}; }
    return {scene, poses, rest, phonePos, headY:wp(B.Head).y, clips:clips||[]};
  }

  const _q=new THREE.Quaternion(), _e=new THREE.Euler(), _v=new THREE.Vector3(), _v2=new THREE.Vector3(), _v3=new THREE.Vector3(), _a=new THREE.Quaternion(), _b=new THREE.Quaternion(), _c=new THREE.Quaternion();
  function instance(tpl){
    const root=THREE.SkeletonUtils.clone(tpl.scene), B=bonesOf(root);
    root.traverse(o=>{ if(o.isSkinnedMesh) o.frustumCulled=false; });
    const inst={root,B,tpl,pose:null,poseTarget:null,w:0,mixer:null,actions:{},current:null};
    if(tpl.clips.length){ inst.mixer=new THREE.AnimationMixer(root); for(const c of tpl.clips) inst.actions[c.name]=inst.mixer.clipAction(c); }
    return inst;
  }
  // Body motion: loop a base clip, or play a one-shot (yawn, cough...) that returns to the base clip.
  function play(inst,name,{once=false,fade=.8,offset}={}){
    const a=inst.actions[name]; if(!a) return false;
    if(!once && inst.current===a) return true;
    const prev=inst.current;
    a.reset(); a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity); a.clampWhenFinished=false;
    if(offset!==undefined) a.time=offset*a.getClip().duration;
    a.play(); if(prev && prev!==a) prev.crossFadeTo(a,fade,false); else a.fadeIn(fade);
    if(once){ const back=inst.base||prev; inst.mixer.addEventListener('finished',function f(e){ if(e.action===a){ inst.mixer.removeEventListener('finished',f); if(back&&inst.current===a){ inst.current=null; play(inst,back.getClip().name,{fade:.9}); } } }); }
    else inst.base=a;
    inst.current=a; return true;
  }
  // Add a rotation (expressed in the avatar's own space) on top of whatever the body motion set this frame.
  function addRot(inst,n,x,y,z){ const r=inst.tpl.rest[n], b=inst.B[n]; if(!r||!b) return;
    _q.setFromEuler(_e.set(x,y,z,'YXZ')); _c.copy(b.quaternion); b.quaternion.copy(r.Pi).multiply(_q).multiply(r.P).multiply(_c); }
  function move(inst,n,x,y,z){ const r=inst.tpl.rest[n], b=inst.B[n]; if(!r||!b) return; _v.set(x,y,z).applyQuaternion(r.Pi); b.position.copy(r.p).add(_v); }
  function setPose(inst,name){ inst.poseTarget = name==='lap' && inst.mixer ? null : name; if(!inst.mixer && !inst.poseTarget) inst.poseTarget='lap'; }
  // s: {lean, pitch, yaw, roll, eyeYaw, eyePitch, brow, furrow, smile, blink, clap, phase}
  function apply(inst,s,time,dt){
    // reset overlay bones first, so a clip without a track for one of them can't let the additions pile up
    for(const n of ANIM){ const rr=inst.tpl.rest[n], bb=inst.B[n]; if(rr&&bb) bb.quaternion.copy(rr.q); }
    if(inst.mixer) inst.mixer.update(dt);
    // each capture has its own torso angle; measure it and slowly ease it to the same relaxed lean (about 8 degrees back),
    // so motion within a clip survives but the clip's built-in recline doesn't
    if(inst.mixer){ inst.root.getWorldQuaternion(_a).invert(); _v.copy(inst.B.Neck.getWorldPosition(_v2)).sub(inst.B.Pelvis.getWorldPosition(_v3)).applyQuaternion(_a);
      const lean=Math.atan2(-_v.z,_v.y); inst.corr=inst.corr===undefined?lean-.14:inst.corr+(lean-.14-inst.corr)*Math.min(1,dt*2); addRot(inst,'Spine',inst.corr,0,0); }
    addRot(inst,'Spine1',s.lean*.45,0,0); addRot(inst,'Spine2',s.lean*.55,s.yaw*.15,0);
    addRot(inst,'Neck',s.pitch*.4,s.yaw*.35,s.roll*.4); addRot(inst,'Head',s.pitch*.6,s.yaw*.5,s.roll*.6);
    addRot(inst,'LEye',s.eyePitch,s.eyeYaw,0); addRot(inst,'REye',s.eyePitch,s.eyeYaw,0);
    const br=s.brow*.004, fu=s.furrow*.0025;
    move(inst,'LInnerEyebrow',-fu,br+fu*.4,0); move(inst,'RInnerEyebrow',fu,br+fu*.4,0);
    move(inst,'LOuterEyebrow',0,br*.7-fu*.5,0); move(inst,'ROuterEyebrow',0,br*.7-fu*.5,0);
    const sm=s.smile*.0045; move(inst,'LMouthCorner',sm*.6,sm,-sm*.3); move(inst,'RMouthCorner',-sm*.6,sm,-sm*.3);
    const bl=s.blink*.0075; move(inst,'LEyeBlinkTop',0,-bl,0); move(inst,'REyeBlinkTop',0,-bl,0);
    const P=inst.tpl.poses;
    if(s.clap>.02){ const k=(Math.sin(time*16+s.phase)+1)/2; for(const L of 'LR') for(const a of ARM){ const b=inst.B[L+a]; _a.copy(P.clapOpen[L+a]).slerp(P.clapShut[L+a],k); b.quaternion.slerp(_a,s.clap); } return; }
    // arm overlay: fade out the old pose, switch, fade in the new one
    if(inst.poseTarget!==inst.pose){ inst.w-=dt*2.6; if(inst.w<=0){ inst.w=0; inst.pose=inst.poseTarget; } }
    else if(inst.pose) inst.w=Math.min(1,inst.w+dt*2.2);
    if(inst.pose && inst.w>0){ const lib=P[inst.pose]; const e=inst.w*inst.w*(3-2*inst.w);
      for(const L of 'LR') for(const a of ARM){ const t=lib[L+a]; if(!t) continue; const b=inst.B[L+a]; if(!inst.mixer) b.quaternion.copy(P.lap[L+a]); b.quaternion.slerp(t,e); } }
    else if(!inst.mixer) for(const L of 'LR') for(const a of ARM) inst.B[L+a].quaternion.copy(P.lap[L+a]);
  }
  const posed = inst => inst.pose && inst.w>.7 ? inst.pose : null;
  return {prepare, instance, apply, setPose, play, posed, parseClips, bonesOf};
})();
