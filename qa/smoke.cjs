// 동현크 점검: 페이지 불러오기 → 예제 전부 출력 확인 → 무적으로 스테이지 1 완주 → 다음 스테이지 이어짐 → 목숨 1 패배. 세 스테이지 완주·보스는 qa/bot-run.cjs. node qa/smoke.cjs [playwright 경로]
const path=require('path');
const {chromium}=require(process.argv[2]||'playwright');
(async()=>{
  const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(__dirname,'..','dist','index.html'));await p.waitForTimeout(400);
  const ex=await p.evaluate(()=>examples.map(e=>{try{const o=Donghyun.run(e.code,{maxSteps:300000}).output.trim().split(/\s+/).filter(Boolean);return [e.id,o.length===0||o[o.length-1]==='6'];}catch(err){return [e.id,false,err.message];}}));
  for(const [id,ok,m] of ex) if(!ok) errs.push('example '+id+' '+(m||'no 6'));
  await p.selectOption('#example','god');await p.waitForTimeout(300);await p.click('#run');await p.waitForTimeout(200);
  const god=await p.evaluate(()=>{const D=window.__donghyuncr,k=D.keys,S=D.state,solid=c=>c==='#'||c==='='||c==='B'||c==='-';let f=0,hold=0;
    while(f<15000&&S.status==='play'){const h=S.hero,tx=Math.floor((h.x+h.w+6)/16),ty=Math.floor((h.y+h.h-1)/16);
      let gap=true,wall=false;for(let y=ty+1;y<12;y++)if(solid(S.grid[y]?.[tx])){gap=false;break;}for(let y=ty-1;y<=ty;y++)if(solid(S.grid[y]?.[tx]))wall=true;
      const wantJump=(gap||wall||S.enemies.some(e=>e.alive&&Math.abs(e.x-h.x)<40&&e.x>h.x))&&h.onGround;
      if(wantJump){k.jump=true;k.jumpPressed=true;hold=18;}else if(hold>0){hold--;}else k.jump=false;
      k.right=true;if(f%20===0){k.attack=true;k.attackPressed=true;}else k.attack=false;D.step(1);f++;}
    return {f,status:S.status,score:S.score,mode:D.mode,x:Math.round(S.hero.x)};});
  if(god.status!=='win') errs.push('god run did not win: '+JSON.stringify(god));
  // 스테이지 1을 깨면 클리어 카드 → 다음 스테이지(점수 그대로, 목숨 다시 채움)
  await p.waitForSelector('#rc-next',{timeout:3000});await p.click('#rc-next');await p.waitForTimeout(200);
  const next=await p.evaluate(()=>{const D=window.__donghyuncr,S=D.state;return {stage:S.stage,status:S.status,score:S.score,mode:D.mode,lives:String(S.lives),form:window.Engine.form(S).key};});
  if(!(next.stage===2&&next.status==='play'&&next.mode==='play'&&next.score===god.score)) errs.push('next stage failed: '+JSON.stringify(next));
  await p.click('#concede');await p.waitForTimeout(100);await p.evaluate(()=>window.__donghyuncr.keyDown('x'));await p.waitForTimeout(200);
  await p.fill('#code','나는 동현이냐?\n뿡뿡 도옹~뿡뿡뿡~뿡뿡 도옹~뿡뿡뿡\n뿡뿡 도오오오오오옹~뿡뿡뿡\n동현이구나');await p.waitForTimeout(300);await p.click('#run');await p.waitForTimeout(200);
  const one=await p.evaluate(()=>{const D=window.__donghyuncr,k=D.keys;let f=0;while(f<6000&&D.state.status==='play'){k.right=true;D.step(1);f++;}return {f,status:D.state.status,lives:D.state.lives};});
  if(one.status!=='over') errs.push('lives-1 run did not end: '+JSON.stringify(one));
  console.log(JSON.stringify({examples:ex.length,god,next,one,errors:errs}));
  await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
