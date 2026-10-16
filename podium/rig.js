/* Seated rig for Rocketbox avatars. Poses are authored by aiming bones at directions in the
   avatar's own space (faces +z, its left is +x, y up), so they work across every model. */
window.PodiumRig = (function(){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const key = n => n.replace(/^Bip01[ _]/,'').replace(/[ _]/g,'');
  function bonesOf(root){ const B={}; root.traverse(o=>{ if(o.isBone) B[key(o.name)]=o; }); return B; }
  const wp=o=>o.getWorldPosition(new THREE.Vector3());
  function aim(bone, child, dir){
    bone.updateWorldMatrix(true,true);
    const cur=wp(child).sub(wp(bone)).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
    const pw=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const bw=bone.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(pw.multiply(q.multiply(bw)));
    bone.updateWorldMatrix(false,true);
  }
  function twist(bone, dir, ang){ bone.updateWorldMatrix(true,true); const q=new THREE.Quaternion().setFromAxisAngle(dir.clone().normalize(), ang);
    const pw=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); const bw=bone.getWorldQuaternion(new THREE.Quaternion()); bone.quaternion.copy(pw.multiply(q.multiply(bw))); bone.updateWorldMatrix(false,true); }
  const lap = s=>[V(s*.1,-1,.12), V(-s*.32,-.32,1), V(-s*.2,-.75,1)];
  const ARM_POSES = { // [upperArm->forearm, forearm->hand, hand->middle finger, forearm twist], s = +1 left / -1 right
    lap,
    phone:    s=>[V(s*.05,-1,.2), V(-s*.42,.55,1), V(-s*.25,.25,1)],
    crossed:  s=>[V(s*.25,-1,.5), V(-s,.25,.2), V(-s,0,.1), .75],
    clapOpen: s=>[V(s*.12,-1,.3), V(-s*.25,.6,1), V(-s*.1,.55,1), -1.6],
    clapShut: s=>[V(s*.1,-1,.3), V(-s*.5,.6,1), V(-s*.35,.55,1), -1.6],
    chin:     s=>s<0 ? [V(s*.1,-1,.75), V(-s*.3,1.7,.15), V(-s*.15,1,.05), .75] : lap(s),
  };

  const ARM = ['UpperArm','Forearm','Hand'], ANIM=['Spine1','Spine2','Neck','Head','LEye','REye'];
  const FACE=['LInnerEyebrow','RInnerEyebrow','LOuterEyebrow','ROuterEyebrow','LMouthCorner','RMouthCorner','LEyeBlinkTop','REyeBlinkTop','MJaw'];

  // Prepare a loaded template once: seat it, then record rest data and arm pose libraries.
  function prepare(scene, seatHeight=.5){
    scene.updateMatrixWorld(true);
    const B=bonesOf(scene);
    scene.traverse(o=>{ if(o.isSkinnedMesh){ o.frustumCulled=false; o.castShadow=true; } if(o.material && o.material.alphaTest>0){ o.material.side=THREE.DoubleSide; o.material.alphaToCoverage=true; } });
    for(const s of [1,-1]){ const L=s>0?'L':'R';
      aim(B[L+'Thigh'],B[L+'Calf'],V(s*.13,-.06,1));
      aim(B[L+'Calf'],B[L+'Foot'],V(s*.03,-1,.1));
      aim(B[L+'Foot'],B[L+'Toe0'],V(s*.08,-.3,1));
    }
    aim(B.Spine,B.Neck,V(0,1,-.06));
    const hip=wp(B.LThigh).y; scene.position.y += seatHeight - hip; scene.updateMatrixWorld(true);
    const original={}; for(const s of 'LR') for(const a of ARM) original[s+a]=B[s+a].quaternion.clone();
    const poses={};
    for(const [name,fn] of Object.entries(ARM_POSES)){ poses[name]={};
      for(const s of [1,-1]){ const L=s>0?'L':'R'; for(const a of ARM) B[L+a].quaternion.copy(original[L+a]); scene.updateMatrixWorld(true);
        const d=fn(s); aim(B[L+'UpperArm'],B[L+'Forearm'],d[0]); aim(B[L+'Forearm'],B[L+'Hand'],d[1]);
        if(d[3]) twist(B[L+'Forearm'], d[1], d[3]*s);
        aim(B[L+'Hand'],B[L+'Finger2'],d[2]);
        for(const a of ARM) poses[name][L+a]=B[L+a].quaternion.clone(); } }
    for(const s of 'LR') for(const a of ARM) B[s+a].quaternion.copy(poses.phone[s+a]);
    scene.updateMatrixWorld(true); const phonePos=wp(B.LHand).add(wp(B.RHand)).multiplyScalar(.5).add(V(0,.03,.04));
    for(const s of 'LR') for(const a of ARM) B[s+a].quaternion.copy(poses.lap[s+a]);
    scene.updateMatrixWorld(true);
    const rest={};
    for(const n of ANIM.concat(FACE)){ const b=B[n]; if(!b) continue; const P=b.parent.getWorldQuaternion(new THREE.Quaternion()); const sq=scene.getWorldQuaternion(new THREE.Quaternion()).invert(); P.premultiply(sq); rest[n]={q:b.quaternion.clone(), p:b.position.clone(), P, Pi:P.clone().invert()}; }
    return {scene, poses, rest, phonePos, headY:wp(B.Head).y};
  }

  // Per-instance driver
  const _q=new THREE.Quaternion(), _e=new THREE.Euler(), _v=new THREE.Vector3(), _a=new THREE.Quaternion(), _b=new THREE.Quaternion();
  function instance(tpl){
    const root=THREE.SkeletonUtils.clone(tpl.scene); const B=bonesOf(root);
    root.traverse(o=>{ if(o.isSkinnedMesh) o.frustumCulled=false; });
    return {root,B,tpl, from:'lap', to:'lap', t:1};
  }
  function rot(inst,n,x,y,z){ const r=inst.tpl.rest[n], b=inst.B[n]; if(!r||!b) return; _q.setFromEuler(_e.set(x,y,z,'YXZ')); b.quaternion.copy(r.Pi).multiply(_q).multiply(r.P).multiply(r.q); }
  function move(inst,n,x,y,z){ const r=inst.tpl.rest[n], b=inst.B[n]; if(!r||!b) return; _v.set(x,y,z).applyQuaternion(r.Pi); b.position.copy(r.p).add(_v); }
  // s: {lean, pitch, yaw, roll, eyeYaw, eyePitch, brow, furrow, smile, blink, jaw, pose, poseT, clap}
  function apply(inst, s, time){
    const lean=s.lean||0;
    rot(inst,'Spine1', lean*.45,0,0); rot(inst,'Spine2', lean*.55, s.yaw*.15, 0);
    rot(inst,'Neck', s.pitch*.4, s.yaw*.35, s.roll*.4); rot(inst,'Head', s.pitch*.6, s.yaw*.5, s.roll*.6);
    rot(inst,'LEye', s.eyePitch, s.eyeYaw, 0); rot(inst,'REye', s.eyePitch, s.eyeYaw, 0);
    const br=s.brow*.004, fu=s.furrow*.0025;
    move(inst,'LInnerEyebrow', -fu, br+fu*.4, 0); move(inst,'RInnerEyebrow', fu, br+fu*.4, 0);
    move(inst,'LOuterEyebrow', 0, br*.7-fu*.5, 0); move(inst,'ROuterEyebrow', 0, br*.7-fu*.5, 0);
    const sm=s.smile*.0045; move(inst,'LMouthCorner', sm*.6, sm, -sm*.3); move(inst,'RMouthCorner', -sm*.6, sm, -sm*.3);
    const bl=s.blink*.0075; move(inst,'LEyeBlinkTop',0,-bl,0); move(inst,'REyeBlinkTop',0,-bl,0);
    rot(inst,'MJaw', 0,0,0);
    // arms: blend between pose libraries, clap oscillates between open/shut
    const P=inst.tpl.poses; let A=P[inst.from], Bp=P[inst.to]; let t=inst.t;
    if(s.clap>.02){ const k=(Math.sin(time*16+s.phase)+1)/2; for(const L of 'LR') for(const a of ARM){ _a.copy(P.clapOpen[L+a]).slerp(P.clapShut[L+a],k); _b.copy(P.lap[L+a]).slerp(_a,s.clap); inst.B[L+a].quaternion.copy(_b);} return; }
    for(const L of 'LR') for(const a of ARM) inst.B[L+a].quaternion.copy(A[L+a]).slerp(Bp[L+a],t);
  }
  function setPose(inst,name){ if(name===inst.to) return; inst.from=inst.to; inst.to=name; inst.t=0; }
  return {prepare, instance, apply, setPose, bonesOf};
})();
