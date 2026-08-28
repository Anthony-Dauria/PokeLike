import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=join('dist',normalize(p).replace(/^(\.\.[/\\])+/,''));const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end('x');}});
await new Promise(r=>server.listen(4179,r));
const OUT='screenshots'; await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:412,height:890},deviceScaleFactor:2,hasTouch:true,isMobile:true});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto('http://localhost:4179/index.html',{waitUntil:'networkidle'});
await page.waitForTimeout(400);
await page.evaluate(()=>window.pokelike.newGameQuick('Sprites','brasillon'));
await page.waitForTimeout(1400);
const skip=async(n=8)=>{for(let i=0;i<n;i++){try{if(!(await page.locator('#bt-log').isVisible()))break;await page.locator('#bt-log').click({timeout:900});}catch{}await page.waitForTimeout(180);}};
for (const [sp,lv,name] of [['pikachu',30,'40-pikachu'],['umbreon',45,'41-noctali'],['charizard',50,'42-dracaufeu'],['gengar',45,'43-ectoplasma']]) {
  await page.evaluate(([s,l])=>window.pokelike.debugWild(s,l),[sp,lv]);
  await page.waitForTimeout(2200);
  await skip(10);
  await page.waitForTimeout(700);
  await page.screenshot({path:`${OUT}/${name}.png`});
  // on remet la partie à zéro plutôt que de fuir : plus simple et plus fiable
  await page.evaluate(()=>window.pokelike.newGameQuick('Sprites','brasillon'));
  await page.waitForTimeout(1200);
}
await browser.close(); server.close();
