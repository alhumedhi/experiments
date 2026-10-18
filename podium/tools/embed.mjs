import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize } from '@gltf-transform/functions';
const [,, inp, out, texdir] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { const c=p.getAttribute('COLOR_0'); if(c){ p.setAttribute('COLOR_0', null); } }
for (const n of root.listNodes()) if (n.getName()==='Bip01 Footsteps') n.dispose();
for (const mat of root.listMaterials()) {
  const name = mat.getName(); const kind = name.split('_').pop();
  const find = (suffix) => ['jpg','png'].map(e=>`${texdir}/${name}_${suffix}.${e}`).find(f=>fs.existsSync(f));
  const col = find('color'), nor = find('normal');
  mat.setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(kind==='opacity'?0.75:0.58).setEmissiveFactor([0,0,0]);
  mat.setBaseColorTexture(col ? doc.createTexture(name+'_c').setImage(fs.readFileSync(col)).setMimeType(col.endsWith('png')?'image/png':'image/jpeg') : null);
  mat.setNormalTexture(nor ? doc.createTexture(name+'_n').setImage(fs.readFileSync(nor)).setMimeType('image/jpeg') : null);
  mat.setMetallicRoughnessTexture(null); mat.setOcclusionTexture(null); mat.setEmissiveTexture(null);
  if (kind==='opacity') { mat.setAlphaMode('MASK').setAlphaCutoff(0.45).setDoubleSided(true); } else mat.setAlphaMode('OPAQUE');
}
await doc.transform(prune(), dedup(), quantize({quantizePosition:14, quantizeNormal:10, quantizeTexcoord:12}));
await io.write(out, doc);
