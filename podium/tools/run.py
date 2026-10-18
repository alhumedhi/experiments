import subprocess, os, glob, shutil, sys
from PIL import Image
AV = sys.argv[1:]
OUT='/home/user/experiments/podium/avatars'
for name in AV:
    if os.path.exists(f'{OUT}/{name}.glb'): continue
    group = 'Professions' if name.startswith('Business') else 'Adults'
    d=f'/tmp/rb/Assets/Avatars/{group}/{name}'
    open('/tmp/rb/.git/info/sparse-checkout','w').write(f'/Assets/Avatars/{group}/{name}/*\n')
    subprocess.run(['git','-C','/tmp/rb','checkout','-q','HEAD'],check=True)
    tex=f'/tmp/conv/{name}_tex'; os.makedirs(tex,exist_ok=True)
    for t in glob.glob(f'{d}/Textures/*.tga'):
        b=os.path.basename(t)[:-4]
        if b.endswith('_specular') or 'wrinkle' in b: continue
        im=Image.open(t)
        if b.endswith('opacity_color'):
            im.convert('RGBA').resize((512,512),Image.LANCZOS).save(f'{tex}/{b}.png',optimize=True)
        else:
            size = 1024 if b.endswith('head_color') else (768 if b.endswith('body_color') else 512)
            im.convert('RGB').resize((size,size),Image.LANCZOS).save(f'{tex}/{b}.jpg',quality=82,optimize=True)
    subprocess.run(['/tmp/tools/node_modules/fbx2gltf/bin/Linux/FBX2glTF','-b','--pbr-metallic-roughness','-i',f'{d}/Export/{name}.fbx','-o',f'/tmp/conv/{name}_raw'],check=True,capture_output=True)
    subprocess.run(['node','/tmp/tools/embed.mjs',f'/tmp/conv/{name}_raw.glb',f'{OUT}/{name}.glb',tex],check=True)
    png=glob.glob(f'{d}/*.png')[0]; im=Image.open(png).convert('RGB'); W,H=im.size
    im.crop((W//2-110,30,W//2+110,250)).resize((120,120),Image.LANCZOS).save(f'{OUT}/{name}.jpg',quality=82)
    shutil.rmtree(d,ignore_errors=True); shutil.rmtree(tex,ignore_errors=True); os.remove(f'/tmp/conv/{name}_raw.glb')
    print(name, os.path.getsize(f'{OUT}/{name}.glb')//1024,'KB',flush=True)
