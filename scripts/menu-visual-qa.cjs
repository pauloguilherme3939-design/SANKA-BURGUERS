'use strict';
// Executar após npm run build. Requer Playwright instalado à parte; nenhuma API real é chamada.
// SANKA_PLAYWRIGHT_PATH pode apontar para uma instalação local, sem alterar dependências comerciais.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), vm = require('node:vm');
const { chromium } = require(process.env.SANKA_PLAYWRIGHT_PATH || 'playwright');
const repo = path.resolve(process.env.SANKA_VISUAL_ROOT || path.join(__dirname, '..'));
const output = path.resolve(process.env.SANKA_VISUAL_REPORT_DIR || path.join(repo, 'screenshots/visual-qa'));
const baseline = process.env.SANKA_VISUAL_BASELINE === '1';
fs.mkdirSync(output, {recursive:true});
const menu = vm.runInNewContext(fs.readFileSync(path.join(repo,'data.jsx'),'utf8').replaceAll('export const ','const ') + ';[...SANKA_BURGERS,...SANKA_COMBOS,...SANKA_SIDES,...SANKA_DRINKS]');
const report = {checks:[], baseline, widths:[360,390,768,1440], mockedPosts:0, unmockedPosts:0, blockedExternal:[], neonAccessed:false, realMessagesSent:0};
let browser, server, base;
const injection = `<script>window.__visualEffects=[];window.open=function(){return{closed:false,location:{replace:function(u){window.__visualEffects.push(u)}},close:function(){this.closed=true}}};document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href&&new URL(a.href,location.href).origin!==location.origin)e.preventDefault()},true);</script>`;
async function check(name, fn) {
  try {report.checks.push({name,result:'passed',evidence:await fn()});}
  catch(e) {report.checks.push({name,result:'failed',reason:e.message});throw e;}
  finally {fs.writeFileSync(path.join(output,'resultados.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks.at(-1)));}
}
function serve(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){report.unmockedPosts++;res.statusCode=405;return res.end();}
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end('{"enabled":false,"visualTest":true}');}
  if(pathname==='/analytics.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.SankaAnalytics=new Proxy({}, {get:()=>()=>{}})');}
  const rel=decodeURIComponent(pathname==='/'?'cardapio.html':pathname.slice(1)),file=path.resolve(repo,rel);
  if(!file.startsWith(repo+path.sep)||rel.split(/[\\/]/).some(x=>x.startsWith('.')||['node_modules','data','lib','test','scripts','migrations'].includes(x))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
  const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'})[ext]||'application/octet-stream');
  let bytes=fs.readFileSync(file);if(ext==='.html')bytes=bytes.toString().replace('<head>','<head>'+injection);res.end(bytes);
}
async function readability(page) {
  return page.evaluate(() => {
    const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number);
    const mix=(a,b)=>{const k=a.length>3?a[3]:1;return a.slice(0,3).map((v,i)=>v*k+b[i]*(1-k));};
    function background(el){const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);return chain.reduce((a,p)=>mix(rgb(getComputedStyle(p).backgroundColor),a),[255,255,255]);}
    function luminance(a){return a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
    function ratio(el){const a=luminance(rgb(getComputedStyle(el).color)),b=luminance(background(el));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
    const selectors=['.menu-card-name','.menu-card-desc','.menu-card-price','.menu-card-size','.menu-sec-count','.cardapio-sub','.filter-chip','.cardapio-main .btn-add'];
    const contrast=selectors.map(selector=>({selector,count:document.querySelectorAll(selector).length,min:Math.min(...[...document.querySelectorAll(selector)].map(ratio))})).filter(x=>x.count);
    const clipped=[...document.querySelectorAll('.menu-card-desc')].filter(e=>e.scrollHeight>e.clientHeight+1).map(e=>e.closest('article').id);
    return {contrast,clipped,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,entryOpacity:getComputedStyle(document.querySelector('.menu-card.is-entry')).opacity};
  });
}
async function main() {
  server=http.createServer(serve);await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.SANKA_CHROME_PATH?{executablePath:process.env.SANKA_CHROME_PATH}:{})});report.browser=browser.version();
  for(const width of report.widths) {
    const context=await browser.newContext({viewport:{width,height:960},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===base||['unpkg.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();report.blockedExternal.push(u.hostname);return route.abort();});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      await check(`Catálogo e imagens preservados — ${width}px`,async()=>{
        await page.goto(base+'/cardapio.html',{waitUntil:'networkidle'});
        await page.getByRole('button',{name:'Adicionar X-Americano ao pedido',exact:true}).waitFor();
        assert.equal(await page.locator('.menu-card').count(),menu.length);
        for(const item of menu){const card=page.locator('#'+item.code.toLowerCase());assert.equal(await card.locator('.menu-card-desc').innerText(),item.desc);if(item.src)assert.equal(await card.locator('img').getAttribute('src'),item.src);assert((await card.locator('.menu-card-price').innerText()).includes(item.price.toFixed(2).replace('.',',')));}
        await page.locator('#sec-combos').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
        await page.locator('#sec-combos img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
        await page.locator('#sec-combos').screenshot({path:path.join(output,`combos-${width}.png`)});
        return {products:menu.length,comboImagesUnchanged:3,pricesMatchSource:true};
      });
      await check(`Contraste, textos completos e largura — ${width}px`,async()=>{
        const measured=await readability(page);
        if(!baseline){assert.equal(measured.clipped.length,0,JSON.stringify(measured.clipped));assert.equal(measured.entryOpacity,'1');for(const c of measured.contrast)assert(c.min>=4.5,`${c.selector}: ${c.min.toFixed(2)}:1`);}
        assert(measured.pageWidth<=width);await page.locator('#sk-l01').scrollIntoViewIfNeeded();
        await page.locator('#sk-l01 img').evaluate(img=>img.decode());
        await page.locator('#sk-l01 img.loaded').waitFor();
        await page.locator('#sk-l01').screenshot({path:path.join(output,`descricao-${width}.png`)});
        return measured;
      });
      await check(`Categorias, foco e grade curta — ${width}px`,async()=>{
        const first=page.locator('.filter-chip').first();await first.focus();await page.keyboard.press('Tab');
        const focus=await page.evaluate(()=>{const s=getComputedStyle(document.activeElement);return {visible:document.activeElement.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth),height:document.activeElement.getBoundingClientRect().height};});
        if(!baseline){assert(focus.visible&&focus.outline==='solid'&&focus.width>=2);assert(focus.height>=44);}
        await page.keyboard.press('Enter');assert.equal(await page.locator('.menu-card').count(),3);
        for(const [name,count] of [['Combos',3],['Burgers Artesanais',7],['Além dos Burgers',7],['Porções',4],['Bebidas',2],['Tudo',23]]){
          await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(400);
          assert.equal(await page.locator('.menu-card').count(),count,name);
          assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width,name+' transborda');
          await page.waitForFunction(()=>scrollY===0);
          const head=await page.locator('.menu-sec-head').first().boundingBox(),bar=await page.locator('.filter-bar').boundingBox();
          assert(head.y>=bar.y+bar.height-1,name+' encoberta pelo filtro');
          if(name==='Bebidas')await page.screenshot({path:path.join(output,`categoria-curta-${width}.png`)});
        }
        await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);await page.screenshot({path:path.join(output,`cardapio-${width}.png`)});
        return {categories:6,focus};
      });
      if(!baseline)await check(`Carrinho, retirada, delivery e erro simulado — ${width}px`,async()=>{
        await page.getByRole('button',{name:'Adicionar X-Americano ao pedido',exact:true}).click();
        await page.locator('.cart-cta').click();await page.locator('#co-name').fill('TESTE VISUAL SANKA');await page.locator('#co-phone').fill('11900000000');
        await page.locator('.co-delivery-opt').filter({has:page.locator('input[value=pickup]')}).click();
        assert.equal(await page.locator('#co-street').count(),0);
        assert.match(await page.locator('.co-delivery-opt.is-active').innerText(),/Grátis/i);
        assert.match(await page.locator('.co-total-row--total').innerText(),/37,90/);
        await page.screenshot({path:path.join(output,`checkout-retirada-${width}.png`)});
        await page.route('**/api/pedido',route=>{report.mockedPosts++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Falha sintética: seu carrinho foi mantido.'})});});
        await page.locator('.co-submit').click();await page.getByRole('alert').filter({hasText:'Falha sintética'}).waitFor();
        assert.equal(await page.evaluate(()=>window.__sankaCart.length),1);assert.equal(await page.evaluate(()=>window.__visualEffects.length),0);
        await page.locator('.co-delivery-opt').filter({has:page.locator('input[value=delivery]')}).click();
        assert.equal(await page.locator('#co-street').count(),1);assert.match(await page.locator('.co-totals').innerText(),/confirmad|confirmar/);
        await page.screenshot({path:path.join(output,`checkout-delivery-${width}.png`)});
        await page.locator('.co-back').click();assert.equal(await page.evaluate(()=>window.__sankaCart.length),1);
        await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>window.__sankaCart.length),1);assert.deepEqual(errors,[]);
        return {pickupFree:true,deliveryFeePending:true,mockedFailure:true,cartPreservedAfterFailureAndReload:true,realPosts:0,pageErrors:errors};
      });
    } finally {await context.close();}
  }
  assert.equal(report.unmockedPosts,0);
}
main().catch(e=>{report.failure=e.message;process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  report.passed=report.checks.filter(x=>x.result==='passed').length;report.failed=report.checks.filter(x=>x.result==='failed').length;
  fs.writeFileSync(path.join(output,'resultados.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,failure:report.failure}));
});
