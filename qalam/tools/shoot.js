const { chromium, devices } = require('playwright');
const fs=require('fs');
const urls=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');
(async()=>{
 const b=await chromium.launch();
 const out=[];
 const work=async(u)=>{
  const slug=u.replace(/https?:\/\/(www\.)?/,'').replace(/[^a-z0-9]/gi,'_').slice(0,40);
  const ctx=await b.newContext({...devices['iPhone 13'],locale:'ar-SA'});
  const p=await ctx.newPage(); const t=Date.now(); let r={url:u,slug};
  try{
   await p.goto(u,{waitUntil:'domcontentloaded',timeout:30000});
   await p.waitForTimeout(3500); r.loadMs=Date.now()-t;
   r.data=await p.evaluate(()=>{
     const vis=e=>{const s=e.getBoundingClientRect();return s.width>0&&s.height>0&&s.top<innerHeight&&s.top>=0};
     const txt=[...document.querySelectorAll('a,button')].filter(vis).map(e=>e.innerText.trim()).filter(Boolean);
     const book=/احجز|حجز|موعد|book|appointment/i;
     return {title:document.title,lang:document.documentElement.lang,dir:getComputedStyle(document.body).direction,
      overflowX:document.documentElement.scrollWidth>innerWidth+5, scrollW:document.documentElement.scrollWidth,
      aboveFoldCTA:txt.filter(x=>book.test(x)).slice(0,3), anyBooking:[...document.querySelectorAll('a,button')].some(e=>book.test(e.innerText)),
      tel:!!document.querySelector('a[href^="tel:"]'), wa:!!document.querySelector('a[href*="wa.me"],a[href*="whatsapp"]'),
      forms:document.forms.length, brokenImgs:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,
      imgs:document.images.length, h1:(document.querySelector('h1')||{}).innerText||null,
      pageH:document.documentElement.scrollHeight, smallText:[...document.querySelectorAll('p,li,a')].filter(e=>parseFloat(getComputedStyle(e).fontSize)<12&&e.innerText.trim().length>20).length};
   });
   await p.screenshot({path:`shots/${slug}_m.png`});
   await p.screenshot({path:`shots/${slug}_mfull.png`,fullPage:true}).catch(()=>{});
  }catch(e){r.err=String(e).slice(0,100)}
  await ctx.close(); out.push(r);
 };
 const q=[...urls]; await Promise.all(Array.from({length:5},async()=>{while(q.length) await work(q.shift())}));
 fs.writeFileSync(process.argv[3],JSON.stringify(out,null,1)); await b.close();
})();
