import fs from 'fs'; import { execFileSync } from 'child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const A='/tmp/rb/Assets/Animations/all_animations_max_motextr_static';
const CL=process.argv.slice(2);
const san=n=>n.replace(/\s/g,'_').replace(/[\[\].:\/]/g,'');
// bones that exist on the avatars
const av=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('/home/user/experiments/podium/avatars/Business_Male_02.glb');
const bones=new Set(av.getRoot().listNodes().map(j=>j.getName()).filter(n=>/^Bip01/.test(n)&&n!=='Bip01 Footsteps'));
const FPS=12, MAXT=24, r4=v=>Math.round(v*1e4)/1e4;
for(const g of ['m','f']){
  const out=[];
  for(const c of CL){
    const src=`${A}/${g}_sit_chair_${c}.max.fbx`; if(!fs.existsSync(src)) continue;
    execFileSync('/tmp/tools/node_modules/fbx2gltf/bin/Linux/FBX2glTF',['-b','-i',src,'-o','/tmp/conv/clip']);
    const doc=await new NodeIO().read('/tmp/conv/clip.glb'); const anim=doc.getRoot().listAnimations()[0];
    const tracks=[]; let dur=0;
    for(const ch of anim.listChannels()){
      const node=ch.getTargetNode().getName(), path=ch.getTargetPath();
      if(!bones.has(node)) continue;
      if(path==='translation' && node!=='Bip01') continue;
      if(path==='scale') continue;
      const s=ch.getSampler(), inp=s.getInput().getArray(), outp=s.getOutput().getArray(), k=path==='rotation'?4:3;
      dur=Math.max(dur,Math.min(MAXT,inp[inp.length-1]));
      // resample to FPS, drop constant tracks to a single key
      const times=[],vals=[]; const T=Math.min(MAXT,inp[inp.length-1]);
      for(let t=0;t<=T+1e-6;t+=1/FPS){ let i=0; while(i<inp.length-2&&inp[i+1]<t) i++; const a=inp[i],b=inp[Math.min(i+1,inp.length-1)], f=b>a?Math.min(1,Math.max(0,(t-a)/(b-a))):0;
        times.push(r4(t)); for(let j=0;j<k;j++){ const v0=outp[i*k+j], v1=outp[Math.min(i+1,inp.length-1)*k+j]; vals.push(r4(v0+(v1-v0)*f)); } }
      let constant=true; for(let i=k;i<vals.length&&constant;i++) if(Math.abs(vals[i]-vals[i%k])>2e-4) constant=false;
      tracks.push([san(node)+(path==='rotation'?'.quaternion':'.position'), (constant?vals.slice(0,k):vals).map(v=>Math.round(v*1000))]);
    }
    // bones with no curve in this capture keep the capture skeleton's own static rotation
    const have=new Set(tracks.map(t=>t[0]));
    for(const n of doc.getRoot().listNodes()){ const nm=n.getName(); if(!bones.has(nm)) continue; const tn=san(nm)+'.quaternion'; if(have.has(tn)) continue;
      tracks.push([tn, n.getRotation().map(v=>Math.round(v*1000))]); }
    out.push({name:c,fps:FPS,duration:r4(dur),tracks});
  }
  fs.writeFileSync(`/home/user/experiments/podium/anims/${g}.json`, JSON.stringify(out));
  console.log(g, out.length, 'clips', Math.round(fs.statSync(`/home/user/experiments/podium/anims/${g}.json`).size/1024),'KB', out.map(o=>o.name+':'+o.duration.toFixed(1)).join(' '));
}
