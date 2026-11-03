// 동현크 자동 주파 검사: node qa/bot-run.cjs [playwright 경로] [목숨(0 무적)] [시작 변신 0~5] [출발 스테이지]
// 단순한 봇(오른쪽으로 달리며 구덩이·벽·가시 앞에서 뛰고, 적·보스 앞에서 공격)이 스테이지 1→2→3을 끝까지 가는지 본다. 지형이 지나갈 수 있는지, 보스가 부서지는지, 다음 스테이지로 이어지는지 확인한다.
const path=require('path');
const {chromium}=require(process.argv[2]||'playwright'); const LIVES=+(process.argv[3]||0), FORM=+(process.argv[4]||0), STAGE=+(process.argv[5]||1);
const file='file://'+path.resolve(__dirname,'..','dist','index.html');
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(file); await page.waitForFunction(()=>window.__donghyuncr); if(process.env.TRACE) await page.evaluate(()=>{window.__trace=1;});
  const r=await page.evaluate(({LIVES,FORM,STAGE})=>{
    const H=window.__donghyuncr, E=window.Engine, T=16;
    document.querySelector('#code').value=['나는 동현이냐?','뿡뿡 도옹~뿡뿡뿡~뿡뿡 '+(LIVES===0?'도옹ㅠ':'도'+'오'.repeat(LIVES-1)+'옹')+'~뿡뿡뿡',...(FORM?['뿡뿡 도오옹~뿡뿡뿡~뿡뿡 도'+'오'.repeat(FORM-1)+'옹~뿡뿡뿡']:[]),...(STAGE>1?['뿡뿡 도오오옹~뿡뿡뿡~뿡뿡 도'+'오'.repeat(STAGE-1)+'옹~뿡뿡뿡']:[]),'뿡뿡 도오오오오오옹~뿡뿡뿡','동현이구나'].join('\n');
    document.querySelector('#run').click();
    const S0=H.state; if(!S0) return {err:'출전 실패: '+document.querySelector('#result').textContent};
    const log=[]; let frames=0, jumpHold=0, stuck=0, lastX=0, maxFrames=60*60*12;
    const tile=(S,tx,ty)=>E.tileAt(S,tx,ty); const solid=t=>t==='#'||t==='='||t==='B'; const walk=t=>solid(t)||t==='-';
    const stages={}, deaths=[], trace=[];
    while(frames<maxFrames){
      const S=H.state; if(!S) break;
      if(H.mode==='over'){ break; }
      if(H.mode==='clear'){ if(S.status==='win'){ stages[S.stage]={score:S.score,time:S.time,form:E.form(S).key,lives:S.lives}; log.push(`stage ${S.stage} clear f=${frames} score=${S.score} form=${E.form(S).key}`); H.keyDown('x'); } else H.step(1); frames++; continue; }
      const h=S.hero, k=H.keys; k.left=false; k.right=true; k.attackPressed=false;
      const footRow=Math.floor((h.y+h.h+1)/T), aheadX=h.x+h.w+2, tx1=Math.floor(aheadX/T), tx2=Math.floor((aheadX+14)/T);
      const bodyRow=Math.floor((h.y+h.h-2)/T), headRow=Math.floor((h.y+2)/T);
      const hasGround=tx=>{ for(let y=footRow;y<E.ROWS;y++) if(walk(tile(S,tx,y))) return true; return false; };
      const pit=h.onGround&&!hasGround(tx1)&&!hasGround(tx2);
      const wall=solid(tile(S,tx1,bodyRow))||solid(tile(S,tx1,headRow));
      const spike=tile(S,tx1,footRow-1)==='^'||tile(S,tx2,footRow-1)==='^';
      let enemyAhead=null; for(const e of S.enemies){ if(!e.alive) continue; const dx=e.x-(h.x+h.w); if(dx>-8&&dx<40&&Math.abs(e.y-h.y)<28) enemyAhead=e; }
      if(S.bossOn&&S.boss&&S.boss.alive){ const b=S.boss, dx=b.x-(h.x+h.w); k.right=dx>8; k.left=dx<-30; if(Math.abs(dx)<12||frames%2===0) k.attackPressed=true; if(frames%47===0&&h.onGround) jumpHold=16; }
      else if(enemyAhead&&frames%3===0) k.attackPressed=true;
      if(h.onGround&&(pit||wall||spike)) jumpHold=16;
      if(Math.abs(h.x-lastX)<0.3&&!h.dead){ stuck++; if(stuck>90&&h.onGround){ jumpHold=16; stuck=0; } } else stuck=0; lastX=h.x;
      if(jumpHold>0){ if(jumpHold===16) k.jumpPressed=true; k.jump=true; jumpHold--; } else { k.jump=false; }
      if(window.__trace&&h.x>1380&&h.x<1480&&S.stage===2&&frames<1000) trace.push([frames,Math.round(h.x),Math.round(h.y),h.onGround,pit,wall,jumpHold,Math.round(h.vy*10)/10,h.coyote,h.buffer,h.state]);
      H.step(1); frames++;
      if(h.dead===1&&deaths.length<12) deaths.push([S.stage,Math.round(h.x),Math.round(h.y),frames,pit,wall,spike,jumpHold]);
    }
    const S=H.state;
    return {trace,deaths,frames,mode:H.mode,stage:S&&S.stage,status:S&&S.status,score:S&&S.score,lives:S&&S.lives,form:S&&E.form(S).key,bossAlive:S&&S.boss&&S.boss.alive,stages,log,hero:S&&{x:Math.round(S.hero.x),y:Math.round(S.hero.y)},tail:[...document.querySelectorAll('#log li')].slice(0,6).map(l=>l.textContent)};
  },{LIVES,FORM,STAGE});
  console.log(JSON.stringify({...r,errors:errors.slice(0,3)},null,0));
  await browser.close();
})();
