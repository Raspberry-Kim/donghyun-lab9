/* 동현크 엔진: 격자 충돌·상태기계(대기·달리기·점프·공격·피격)·적·발사체. 그림은 render.js가 그린다.
   한 프레임은 1/60초. 숫자는 모두 픽셀/프레임. */
(function(root){
'use strict';
const {T,ROWS,FORMS,ENEMIES,STAGES}=root.DATA;
const GRAV=0.32, JUMP=-6.1, RUN=1.5, MAXFALL=6.5, COYOTE=6, BUFFER=7;
const SOLID={'#':1,'=':1,'B':1}, ONEWAY={'-':1};

function buildStage(def){
  const W=def.W, grid=Array.from({length:ROWS},()=>Array(W).fill('.'));
  const enemies=[], items=[]; let flag=null;
  for(const op of def.ops){
    const [k,a,b,c]=op;
    if(k==='g'){ for(let x=a;x<=b;x++){ for(let y=c;y<ROWS;y++) grid[y][x]=y===c?'#':'='; } }
    else if(k==='s'){ for(let x=a;x<=b;x++) grid[c][x]='B'; }
    else if(k==='p'){ for(let x=a;x<=b;x++) grid[c][x]='-'; }
    else if(k==='k'){ for(let x=a;x<=b;x++){ let y=0; while(y<ROWS&&grid[y][x]==='.') y++; grid[y-1][x]='^'; } }
    else if(k==='e'){ enemies.push({type:a,x:b}); }
    else if(k==='b'){ items.push({type:'bone',x:a,y:b}); }
    else if(k==='h'){ items.push({type:'heart',x:a,y:b}); }
    else if(k==='F'){ flag=a; }
  }
  return {W,grid,enemies,items,flag,zones:def.zones,def};
}
const tileAt=(s,tx,ty)=>(ty<0||tx<0||tx>=s.W)?'.':(ty>=ROWS?'.':s.grid[ty][tx]);
function groundY(s,tx){ let y=0; while(y<ROWS&&!SOLID[tileAt(s,tx,y)]) y++; return y*T; }

function newGame(cfg){
  const def=STAGES[cfg.stage-1], st=buildStage(def);
  const forms=[0,...cfg.forms.filter(f=>f>0)];
  const S={stage:cfg.stage,def,W:st.W,grid:st.grid,zones:st.zones,flagX:st.flag,forms,formI:0,
    frame:0,score:0,bones:0,lives:cfg.lives===0?Infinity:(cfg.lives||3),invincible:cfg.lives===0,time:0,status:'play',msg:null,msgT:0,camX:0,
    hero:null,enemies:[],items:[],shots:[],fx:[],events:[],rng:mulberry(cfg.seed||((Date.now()%2147483646)+1)),
    spawn:{x:def.start[0]*T,y:def.start[1]*T},checkpoint:null};
  S.enemies=st.enemies.map((e,i)=>spawnEnemy(S,e.type,e.x,i));
  S.items=st.items.map(it=>({...it,px:it.x*T+ (it.type==='bone'?3:4),py:it.y*T+(it.type==='bone'?5:5),taken:false}));
  spawnHero(S,S.spawn);
  return S;
}
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function form(S){ return FORMS[S.forms[S.formI]]; }
function spawnHero(S,at){
  const f=form(S), prev=S.hero;
  S.hero={x:at.x,y:at.y-16,w:16,h:16,vx:0,vy:0,dir:1,onGround:false,state:'idle',anim:0,hp:f.hp,maxhp:f.hp,inv:0,coyote:0,buffer:0,
    atkT:0,cool:0,jumps:0,charge:0,dead:0,win:0,flash:0};
  if(prev&&prev.hp>0){ S.hero.hp=Math.min(f.hp,prev.hp); }
}
function spawnEnemy(S,type,tx,i){
  const d=ENEMIES[type], gy=groundY(S,tx);
  return {id:i,type,x:tx*T+(T-d.w)/2,y:gy-d.h,w:d.w,h:d.h,vx:-d.speed,vy:0,dir:-1,hp:d.hits,alive:true,anim:0,t:S.rng()*60|0,punch:0,charge:0,fire:0,hurt:0};
}
/* ---------- 충돌 ---------- */
function rectSolid(S,x,y,w,h,vy,oneway){
  const x0=Math.floor(x/T), x1=Math.floor((x+w-1)/T), y0=Math.floor(y/T), y1=Math.floor((y+h-0.001)/T);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){ const t=tileAt(S,tx,ty); if(SOLID[t]) return true;
    if(oneway&&ONEWAY[t]&&vy>=0){ const top=ty*T; if(y+h-vy<=top+0.01) return true; } }
  return false;
}
function moveBody(S,b,oneway){
  // 가로
  b.x+=b.vx;
  if(rectSolid(S,b.x,b.y,b.w,b.h,0,false)){ if(b.vx>0) b.x=Math.floor((b.x+b.w)/T)*T-b.w-0.001; else b.x=Math.floor(b.x/T+1)*T; b.vx=0; b.hitWall=true; } else b.hitWall=false;
  if(b.x<0){ b.x=0; b.vx=0; } if(b.x+b.w>S.W*T){ b.x=S.W*T-b.w; b.vx=0; }
  // 세로
  b.y+=b.vy; b.onGround=false;
  if(rectSolid(S,b.x,b.y,b.w,b.h,b.vy,oneway)){
    if(b.vy>0){ b.y=Math.floor((b.y+b.h)/T)*T-b.h; b.onGround=true; } else { b.y=Math.floor(b.y/T+1)*T; }
    b.vy=0;
  }
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function onSpikes(S,b){ const x0=Math.floor(b.x/T), x1=Math.floor((b.x+b.w-1)/T), ty=Math.floor((b.y+b.h+1)/T); for(let tx=x0;tx<=x1;tx++) if(tileAt(S,tx,ty)==='^'&&b.y+b.h>ty*T+6) return true; return false; }

/* ---------- 입력: keys={left,right,jump,jumpPressed,attack,attackPressed,swap} ---------- */
function step(S,keys){
  S.frame++; if(S.msgT>0) S.msgT--;
  const h=S.hero, f=form(S);
  if(S.status==='over'||S.status==='win'){ tickFx(S); return; }
  S.time++;
  if(h.dead){ h.dead++; h.vy=Math.min(MAXFALL,h.vy+GRAV); h.y+=h.vy; if(h.dead>70) respawn(S); tickFx(S); return; }
  if(h.win){ h.win++; h.anim++; if(h.win>90){ S.status='win'; } tickFx(S); return; }
  if(keys.swap&&S.forms.length>1&&h.atkT<=0){ S.formI=(S.formI+1)%S.forms.length; const nf=form(S); h.maxhp=nf.hp; h.hp=Math.min(h.hp,nf.hp); h.inv=Math.max(h.inv,20); h.flash=20; S.events.push({t:'swap',form:nf}); S.msg=nf.name; S.msgT=70; }
  // 가로 이동
  const spd=RUN*f.speed, ax=h.onGround?0.35:0.22;
  if(h.charge>0){ h.vx=h.dir*4.2; h.charge--; h.state='attack'; }
  else{
    const want=(keys.right?1:0)-(keys.left?1:0);
    if(want){ h.dir=want; h.vx+= (want*spd-h.vx)*ax; } else { h.vx+=(0-h.vx)*(h.onGround?0.3:0.08); if(Math.abs(h.vx)<0.05) h.vx=0; }
  }
  // 점프
  h.coyote=h.onGround?COYOTE:Math.max(0,h.coyote-1);
  h.buffer=keys.jumpPressed?BUFFER:Math.max(0,h.buffer-1);
  if(h.onGround) h.jumps=0;
  if(h.buffer>0&&h.charge<=0){
    if(h.coyote>0){ h.vy=JUMP*f.jump; h.coyote=0; h.buffer=0; h.jumps=1; S.events.push({t:'jump'}); }
    else if(f.doubleJump&&h.jumps===1){ h.vy=JUMP*f.jump*0.9; h.buffer=0; h.jumps=2; S.events.push({t:'jump2'}); addFx(S,'puff',h.x+h.w/2,h.y+h.h); }
  }
  if(!keys.jump&&h.vy<-2.2) h.vy=-2.2; // 짧게 누르면 낮게 뛴다
  const glide=f.glide&&keys.jump&&h.vy>0.6&&!h.onGround;
  h.vy=Math.min(glide?0.6:MAXFALL,h.vy+(glide?0.12:GRAV)); h.glide=glide;
  // 공격
  if(h.cool>0) h.cool--; if(h.atkT>0) h.atkT--;
  if(keys.attackPressed&&h.cool<=0&&h.charge<=0){ attack(S,h,f); }
  moveBody(S,h,true);
  if(h.y>ROWS*T+8) return die(S,'fall');
  if(onSpikes(S,h)) hurt(S,h,2,'spike');
  // 상태
  if(h.atkT>0) h.state='attack'; else if(!h.onGround) h.state=h.vy<0?'jump':'fall'; else if(Math.abs(h.vx)>0.2) h.state='run'; else h.state='idle';
  if(h.state==='run') h.anim+=Math.abs(h.vx)*0.9; else h.anim++;
  if(h.inv>0) h.inv--; if(h.flash>0) h.flash--;
  // 아이템
  for(const it of S.items){ if(it.taken) continue; const r={x:it.px,y:it.py,w:it.type==='bone'?10:8,h:it.type==='bone'?7:6}; if(overlap(h,r)){ it.taken=true; if(it.type==='bone'){ S.bones++; S.score+=100; S.events.push({t:'bone'}); } else { h.hp=Math.min(h.maxhp,h.hp+1); S.score+=200; S.events.push({t:'heart'}); } addFx(S,'spark',r.x+r.w/2,r.y); } }
  // 깃발
  if(S.flagX!=null&&h.x+h.w>S.flagX*T+6&&!h.win){ h.win=1; h.vx=0; S.score+=(1000+Math.max(0,3000-S.time)|0)+(S.lives===Infinity?0:S.lives*500); S.checkpoint=null; S.events.push({t:'win'}); }
  // 적
  for(const e of S.enemies){ if(!e.alive) continue; stepEnemy(S,e,h); if(!e.alive) continue;
    if(h.inv<=0&&!h.dead&&overlap(h,e)){
      const d=ENEMIES[e.type], stomp=d.stomp&&h.vy>0&&(h.y+h.h-e.y)<Math.max(8,e.h*0.6)&&!e.punchBox;
      if(h.charge>0){ hitEnemy(S,e,1,'charge'); }
      else if(stomp){ hitEnemy(S,e,e.type==='knight'?1:99,'stomp'); h.vy=JUMP*0.72; h.jumps=1; S.events.push({t:'stomp'}); }
      else hurt(S,h,1,e.type);
    }
    if(e.punchBox&&h.inv<=0&&!h.dead&&overlap(h,e.punchBox)&&h.charge<=0) hurt(S,h,1,'punch');
  }
  // 발사체
  for(const p of S.shots){ if(!p.alive) continue; p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) p.alive=false;
    if(rectSolid(S,p.x,p.y,p.w,p.h,0,false)){ p.alive=false; addFx(S,'puff',p.x,p.y); continue; }
    if(p.owner==='hero'){ for(const e of S.enemies){ if(e.alive&&overlap(p,e)){ hitEnemy(S,e,p.dmg,'shot'); if(!p.pierce) p.alive=false; break; } } }
    else if(h.inv<=0&&!h.dead&&overlap(p,h)&&h.charge<=0){ p.alive=false; hurt(S,h,1,'shell'); }
  }
  S.shots=S.shots.filter(p=>p.alive);
  // 체크포인트: 구역 경계를 지나면
  for(const z of S.zones){ if(z.x>0&&h.x>=z.x*T&&(!S.checkpoint||S.checkpoint.x<z.x*T)){ S.checkpoint={x:z.x*T,y:groundY(S,z.x)}; S.msg=z.name+' 도착 · 여기서 다시 시작한다'; S.msgT=110; S.events.push({t:'zone'}); } }
  // 카메라
  const target=h.x+h.w/2-160; S.camX=Math.max(0,Math.min(S.W*T-320,S.camX+(target-S.camX)*0.15));
  tickFx(S);
}
function attack(S,h,f){
  const k=f.atk; h.atkT=14; S.events.push({t:'atk',kind:k});
  if(k==='paw'){ h.cool=18; const box={x:h.dir>0?h.x+h.w:h.x-10,y:h.y+4,w:10,h:12}; for(const e of S.enemies) if(e.alive&&overlap(box,e)) hitEnemy(S,e,1,'paw'); h.pawBox=box; }
  else if(k==='shell'){ h.cool=34; S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-4,y:h.y+5,w:4,h:3,vx:h.dir*3.2,vy:0,life:36,dmg:1,alive:true,kind:'shell'}); }
  else if(k==='charge'){ h.cool=40; h.charge=12; h.inv=Math.max(h.inv,14); const box={x:h.dir>0?h.x:h.x-48,y:h.y,w:h.w+48,h:h.h}; h.chargeBox=box; }
  else if(k==='shotgun'){ h.cool=48; for(let i=-1;i<=1;i++) S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-3,y:h.y+7+i*2,w:3,h:2,vx:h.dir*3.6,vy:i*0.9,life:14,dmg:1,alive:true,kind:'pellet',pierce:true}); }
}
function hitEnemy(S,e,dmg,how){
  const d=ENEMIES[e.type];
  if(e.type==='pike'&&how==='stomp') return; // 창 위로는 밟을 수 없다(위에서 막힘)
  e.hp-=dmg; e.hurt=10; S.events.push({t:'hit',type:e.type,how});
  if(e.hp<=0){ e.alive=false; S.score+=({lion:100,shushu:200,inf:150,tank:500,pike:250,knight:400})[e.type]||100; addFx(S,'pop',e.x+e.w/2,e.y+e.h/2); S.events.push({t:'kill',type:e.type}); }
  else { e.vx=-e.vx; e.dir=-e.dir; }
}
function hurt(S,h,dmg,by){
  if(h.inv>0||h.dead) return;
  if(S.invincible){ h.inv=40; S.events.push({t:'ping'}); return; }
  h.hp-=dmg; h.inv=75; h.vy=-3.2; h.vx=(h.dir>0?-1:1)*2.2; h.charge=0; S.events.push({t:'hurt',by});
  if(h.hp<=0) die(S,by);
}
function die(S,by){ const h=S.hero; if(h.dead) return; if(S.invincible&&by!=='fall'){ h.inv=40; return; } h.dead=1; h.vy=-5; h.vx=0; h.hp=0; S.events.push({t:'die',by}); }
function respawn(S){
  if(S.lives!==Infinity) S.lives--; if(S.lives<=0){ S.status='over'; S.events.push({t:'over'}); return; }
  for(const e of S.enemies){ if(e.alive) continue; }
  const at=S.checkpoint||S.spawn; S.shots=[]; spawnHero(S,{x:at.x,y:at.y}); S.hero.inv=90; S.camX=Math.max(0,Math.min(S.W*T-320,at.x-120)); S.events.push({t:'respawn'});
  // 다시 시작 지점 주변 적은 제자리로
  for(const e of S.enemies){ if(!e.alive) continue; if(Math.abs(e.x-at.x)<200){ const d=ENEMIES[e.type]; e.charge=0; e.punch=0; e.punchBox=null; } }
}
/* ---------- 적 ---------- */
function stepEnemy(S,e,h){
  const d=ENEMIES[e.type]; e.anim++; e.t++; if(e.hurt>0) e.hurt--;
  const dx=(h.x+h.w/2)-(e.x+e.w/2), near=Math.abs(dx)<170&&Math.abs(e.y-h.y)<64;
  if(Math.abs(e.x-S.camX-160)>420) return; // 화면에서 먼 적은 쉰다
  e.punchBox=null;
  if(e.type==='shushu'){
    if(e.punch>0){ e.punch--; e.vx=0; if(e.punch>6&&e.punch<16) e.punchBox={x:e.dir>0?e.x+e.w:e.x-10,y:e.y+12,w:10,h:6}; }
    else { if(near&&Math.abs(dx)<30&&Math.abs(e.y-h.y)<28&&e.t%40===0){ e.punch=22; e.dir=dx>0?1:-1; S.events.push({t:'punch'}); } e.vx=e.dir*d.speed; }
  }
  else if(e.type==='tank'){
    e.vx=e.dir*d.speed; if(near) e.dir=dx>0?1:-1;
    if(near&&e.t%110===0&&Math.abs(dx)>20){ S.shots.push({owner:'enemy',x:e.dir>0?e.x+e.w:e.x-4,y:e.y+5,w:4,h:3,vx:e.dir*2.2,vy:0,life:80,alive:true,kind:'shell'}); S.events.push({t:'cannon'}); }
  }
  else if(e.type==='knight'){
    if(e.charge>0){ e.charge--; e.vx=e.dir*2.4; if(e.charge===0) e.rest=50; }
    else if(e.rest>0){ e.rest--; e.vx=0; }
    else { if(near&&Math.abs(dx)<120&&Math.abs(e.y-h.y)<30&&e.t%50===0){ e.dir=dx>0?1:-1; e.charge=36; S.events.push({t:'horse'}); } else e.vx=e.dir*d.speed; }
  }
  else if(e.type==='inf'){ if(near&&e.t%90===0) e.dir=dx>0?1:-1; e.vx=e.dir*d.speed; }
  else e.vx=e.dir*d.speed;
  // 벼랑에서 돌아선다(돌진 중 기사 제외)
  if(e.onGround!==false&&!(e.type==='knight'&&e.charge>0)){
    const ax=e.dir>0?e.x+e.w+1:e.x-1, ty=Math.floor((e.y+e.h+2)/T), tx=Math.floor(ax/T);
    const t=tileAt(S,tx,ty); if(!SOLID[t]&&!ONEWAY[t]){ e.dir=-e.dir; e.vx=-e.vx; if(e.charge>0){ e.charge=0; e.rest=30; } }
  }
  e.vy=Math.min(MAXFALL,e.vy+GRAV);
  moveBody(S,e,true);
  if(e.hitWall){ e.dir=-e.dir; if(e.charge>0){ e.charge=0; e.rest=30; } }
  if(e.y>ROWS*T+20) e.alive=false;
}
function addFx(S,kind,x,y){ S.fx.push({kind,x,y,t:0}); }
function tickFx(S){ for(const f of S.fx) f.t++; S.fx=S.fx.filter(f=>f.t<24); if(S.hero){ if(S.hero.atkT<4){ S.hero.pawBox=null; } } }
root.Engine={newGame,step,form,buildStage,tileAt,groundY,FORMS,ENEMIES,STAGES,T,ROWS};
})(window);
