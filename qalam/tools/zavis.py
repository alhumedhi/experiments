import sys, re, subprocess, json, concurrent.futures as cf
def get(u):
    return subprocess.run(["curl","-sSL","-m","30","-A","Mozilla/5.0",u],capture_output=True).stdout.decode("utf-8","replace")
cats=sys.argv[1:]
details=set()
for c in cats:
    for page in ["", "?page=2", "?page=3"]:
        h=get("https://www.zavis.ai/"+c+page)
        found=set(re.findall(r'href="(/'+re.escape(c)+r'/[a-z0-9-]+)"',h))
        if not found: break
        details|=found
def det(p):
    h=get("https://www.zavis.ai"+p)
    w=re.findall(r'data-zavis-cta="website" href="([^"]+)"',h)
    rv=re.search(r'"ratingValue":"?([0-9.]+)',h); rc=re.search(r'"reviewCount":"?(\d+)',h)
    nm=re.search(r'<h1[^>]*>(.*?)</h1>',h,re.S)
    name=re.sub("<[^>]+>","",nm.group(1)).strip() if nm else p
    return {"name":name,"path":p,"website":w[0] if w else None,"rating":float(rv.group(1)) if rv else None,"reviews":int(rc.group(1)) if rc else 0}
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(det,sorted(details)):
        print(json.dumps(r,ensure_ascii=False),flush=True)
