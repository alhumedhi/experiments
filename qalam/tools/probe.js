const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:850}});
for(const u of process.argv.slice(2)){try{await p.goto(u,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForTimeout(3000);
const t=await p.evaluate(()=>document.body.innerText);const html=await p.content();
const em=[...new Set((html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)||[]).filter(x=>!/png|jpg|sentry|wix|example|w3\.org|wordpress/i.test(x)))];
console.log('==',u,'|',(await p.title()).slice(0,50),'|',em.slice(0,4).join(','),'|',t.replace(/\s+/g,' ').slice(0,160));
await p.screenshot({path:'shots/desk_'+u.replace(/[^a-z0-9]/gi,'_').slice(8,40)+'.png'});}catch(e){console.log('ERR',u,String(e).slice(0,80))}}
await b.close();})();
