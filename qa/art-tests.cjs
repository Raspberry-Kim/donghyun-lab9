// node qa/art-tests.cjs [URL]. Rendering fixtures are not campaign completion.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const key=fs.readFileSync(path.join(root,'src/app.js'),'utf8').match(/window\.__donghyun(cr|mon|q|doc)=/)[1];
const scenes=eval('('+fs.readFileSync(path.join(__dirname,'design-scenes.js'),'utf8')+')');
const url=process.argv[2]||'file://'+path.join(root,'index.html');
const out=path.join(__dirname,'tmp','art');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chromium'});
  try{
    const p=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true}),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url);await p.evaluate(()=>document.fonts.ready);
    const result=await p.evaluate(scenes,key);assert.deepEqual(result.failures,[]);
    for(const shot of result.shots)fs.writeFileSync(path.join(out,shot.name+'.png'),Buffer.from(shot.image.split(',')[1],'base64'));
    console.log(`PASS ${key}: ${result.shots.length} fixed render scenes, deterministic, no new state mutation`);
    await p.click('#run');await p.waitForFunction(k=>window['__donghyun'+k].mode==='play',key);
    await p.locator('#board').scrollIntoViewIfNeeded();
    // Actual key events plus menus; full game-specific flows remain in the existing suites.
    await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('Enter');await p.locator('#menu').waitFor({state:'visible'});
    await p.screenshot({path:path.join(out,'menu.png')});await p.keyboard.press('z');
    await p.locator('#menu').waitFor({state:'hidden'});
    for(const size of [{width:1280,height:900},{width:375,height:812},{width:1440,height:650}]){
      await p.setViewportSize(size);await p.click('#full');await p.locator('#exit-full').waitFor({state:'visible'});
      await p.screenshot({path:path.join(out,`fullscreen-${size.width}-${size.height}.png`)});
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await p.click('#exit-full');await p.locator('#exit-full').waitFor({state:'hidden'});
    }
    await p.setViewportSize({width:1280,height:900});await p.click('#theme');await p.click('#theme');
    assert.deepEqual(errors,[]);
    console.log('PASS start, arrows, pause/resume, fullscreen round trips, mobile, short desktop, theme; page errors 0');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
