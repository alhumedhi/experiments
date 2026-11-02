const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const u of process.argv.slice(2)){try{await p.goto(u,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForTimeout(2500);
const l=await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.href).filter(h=>/contact|تواصل|mailto|tel:|wa\.me|whatsapp|instagram/i.test(decodeURI(h))));
console.log('==',u,[...new Set(l)].slice(0,10).join('  '));}catch(e){console.log('ERR',u)}}
await b.close();})();
