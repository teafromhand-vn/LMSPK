import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch();
fs.mkdirSync('tmp/layout-audit',{recursive:true});
const results=[];
for(const width of [320,390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['', '#/documents','#/flashcards','#/syllabus','#/donate','#/subjects/jpd123/tests','#/subjects/jpd123/deck/jpd123-grammar-4-7','#/subjects/jpd123/quiz']){
  await page.goto((process.env.AUDIT_URL??'https://lmspk-azure.vercel.app/')+route);
  await page.waitForLoadState('networkidle');
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,overflow:[...document.querySelectorAll('main *,header *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,60)})),text:document.querySelector('main')?.innerText.slice(0,200)}));
  results.push({width,route,...layout,errors:[...errors]});
  if(!route||route.includes('/deck/')||route.endsWith('/quiz'))await page.screenshot({path:`tmp/layout-audit/${width}-${route.includes('/deck/')?'deck':route.endsWith('/quiz')?'quiz':'home'}.png`,fullPage:true});
 }
 await page.close();
}
await browser.close();fs.writeFileSync('tmp/layout-audit/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.filter(r=>r.scroll>r.width||r.errors.length||r.overflow.length),null,2));
