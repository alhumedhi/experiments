import sys, re, subprocess, json, time
def fetch(url):
    t=time.time()
    p=subprocess.run(["curl","-sSL","-m","25","-A","Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)","-w","\n__META__%{http_code} %{url_effective} %{size_download}",url],capture_output=True)
    out=p.stdout.decode("utf-8","replace"); dt=time.time()-t
    if "__META__" not in out: return None,dt,p.stderr.decode()[:120]
    body,meta=out.rsplit("\n__META__",1); return body,dt,meta
for d in sys.argv[1:]:
    url=d if d.startswith("http") else "https://"+d
    body,dt,meta=fetch(url)
    if body is None:
        body,dt,meta=fetch(url.replace("https://","http://"))
    r={"site":d,"meta":meta,"secs":round(dt,1)}
    if body:
        b=body.lower()
        r["viewport"]="name=\"viewport\"" in b or "name='viewport'" in b or "name=viewport" in b
        yrs=[int(y) for y in re.findall(r"(?:©|&copy;|copyright)[^<]{0,40}?((?:19|20)\d\d)",b)]
        r["copyright"]=max(yrs) if yrs else None
        jq=re.findall(r"jquery[.-]?(\d\.\d+(?:\.\d+)?)",b); r["jquery"]=jq[:1]
        r["arabic"]=bool(re.search(r"[؀-ۿ]",body)); r["rtl"]='dir="rtl"' in b or "dir=rtl" in b
        r["whatsapp"]="wa.me" in b or "whatsapp" in b
        r["form"]="<form" in b; r["tables"]=b.count("<table"); r["flash"]=".swf" in b
        r["gen"]=re.findall(r'name="generator" content="([^"]+)"',b)[:1]
        t=re.search(r"<title[^>]*>(.*?)</title>",body,re.S|re.I); r["title"]=(t.group(1).strip()[:70] if t else None)
        r["kb"]=len(body)//1024
    print(json.dumps(r,ensure_ascii=False))
