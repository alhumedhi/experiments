# Build pen-stroke reveal data for a word: outline paths + ordered centre-line strokes.
import sys, json, re, subprocess, numpy as np
sys.path.insert(0, 'tools')
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from skimage.morphology import skeletonize
from scipy import ndimage as ndi
from PIL import Image

def outline(fontfile, text, track=0):
    font = hb.Font(hb.Face(hb.Blob.from_file_path(fontfile))); buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); hb.shape(font, buf)
    tt = TTFont(fontfile); gs = tt.getGlyphSet(); order = tt.getGlyphOrder(); upm = tt['head'].unitsPerEm; x = 0; paths = []; bp = BoundsPen(gs)
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        g = order[info.codepoint]; t = (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)
        p = SVGPathPen(gs); gs[g].draw(TransformPen(p, t)); gs[g].draw(TransformPen(bp, t))
        if p.getCommands(): paths.append(p.getCommands())
        x += pos.x_advance + track * upm
    x0, y0, x1, y1 = bp.bounds; pad = 0.03 * upm
    return paths, (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)

def raster(paths, vb, H=900):
    W = int(round(H * vb[2] / vb[3]))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" width="{W}" height="{H}"><rect x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" fill="#fff"/>' + ''.join(f'<path d="{d}"/>' for d in paths) + '</svg>'
    open('tmp_word.svg', 'w').write(svg)
    subprocess.run(['node', '-e', f"const{{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:{W},height:{H}}}}});await p.goto('file://'+process.cwd()+'/tmp_word.svg');await p.screenshot({{path:'tmp_word.png'}});await b.close()}})()"], check=True)
    im = np.array(Image.open('tmp_word.png').convert('L')) < 128
    return im, vb[3] / H

N8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
def strokes_from(mask, rtl):
    sk = skeletonize(mask); dist = ndi.distance_transform_edt(mask)
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda p: [(p[0]+a, p[1]+b) for a, b in N8 if (p[0]+a, p[1]+b) in pts]
    lab, n = ndi.label(sk, structure=np.ones((3, 3)))
    comps = []
    for k in range(1, n + 1):
        cp = set(zip(*np.nonzero(lab == k)))
        if len(cp) < 6: continue
        ends = [p for p in cp if len(nb(p)) == 1] or list(cp)
        # start where a writer starts: rightmost (Arabic) / leftmost (Latin), preferring the top
        start = max(ends, key=lambda p: (p[1] if rtl else -p[1]) * 3 - p[0])
        seen = set(); strokes = []; stack = [start]
        while stack:
            s = stack.pop()
            if s in seen: continue
            line = [s]; seen.add(s); cur = s
            while True:
                nxt = [q for q in nb(cur) if q not in seen]
                if not nxt: break
                # prefer continuing straight
                if len(line) >= 3:
                    d0 = np.subtract(cur, line[-3]); nxt.sort(key=lambda q: -np.dot(np.subtract(q, cur), d0))
                for q in nxt[1:]: stack.append(q)
                cur = nxt[0]; seen.add(cur); line.append(cur)
            if len(line) >= 3:
                # connect branch start to its parent junction so the ink is continuous
                par = [q for q in nb(line[0]) if q in seen and q not in line]
                if par: line = [par[0]] + line
                strokes.append(line)
        area = int(mask[lab == k].sum()) if False else len(cp)
        comps.append({'strokes': strokes, 'size': len(cp), 'x': np.mean([p[1] for p in cp])})
    return comps, dist

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float); ab = b - a; L = np.hypot(*ab) or 1e-9
    d = [abs(ab[0]*(p[1]-a[1]) - ab[1]*(p[0]-a[0])) / L for p in pts[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i - 1] > eps: return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]

def build(fontfile, text, rtl, track=0):
    paths, vb = outline(fontfile, text, track)
    mask, s = raster(paths, vb)
    comps, dist = strokes_from(mask, rtl)
    big = max(c['size'] for c in comps)
    main = sorted([c for c in comps if c['size'] > big * 0.15], key=lambda c: -c['x'] if rtl else c['x'])
    marks = sorted([c for c in comps if c['size'] <= big * 0.15], key=lambda c: -c['x'] if rtl else c['x'])
    out = []
    for gi, c in enumerate(main + marks):
        for si, line in enumerate(c['strokes']):
            w = 2 * max(dist[p] for p in line) + 6
            pl = rdp(line, 1.2)
            d = 'M' + ' L'.join(f'{vb[0] + p[1] * s:.1f} {vb[1] + p[0] * s:.1f}' for p in pl)
            out.append({'d': d, 'w': round(w * s, 1), 'lift': si == 0 and gi > 0})
    return {'vb': ' '.join(f'{v:.0f}' for v in vb), 'paths': paths, 'strokes': out}

if __name__ == '__main__':
    data = {'en': build('fonts/InterTight.ttf', 'Qalam', False, -0.055), 'ar': build('fonts/ArefRuqaa.ttf', 'قلم', True)}
    json.dump(data, open('pen.json', 'w'), ensure_ascii=False)
    for k, v in data.items(): print(k, len(v['strokes']), [s['lift'] for s in v['strokes']])
