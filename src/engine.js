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
    else if(k==='m'){ items.push({type:'form',form:a,x:b,y:c}); }
    else if(k==='F'){ flag=a; }
  }
  return {W,grid,enemies,items,flag,zones:def.zones,arena:def.arena||null,def};
}
const tileAt=(s,tx,ty)=>(ty<0||tx<0||tx>=s.W)?'.':(ty>=ROWS?'.':s.grid[ty][tx]);
function groundY(s,tx){ let y=0; while(y<ROWS&&!SOLID[tileAt(s,tx,y)]) y++; return y*T; }

function newGame(cfg){
  const def=STAGES[cfg.stage-1], st=buildStage(def);
  /* 변신 버튼은 없다. 변신은 배지를 주울 때만 일어나고, 다른 배지를 주우면 또 그 모습으로 바뀐다. 목숨을 잃으면 출전 명령 2로 정한 시작 모습(기본은 포동이)으로 돌아온다. 앞 스테이지에서 변신한 모습(carry.formId)은 다음 스테이지 시작 모습으로 이어진다 */
  const baseForm=(cfg.forms&&cfg.forms.find(f=>f>0))||0;
  const startForm=(cfg.carry&&cfg.carry.formId)||baseForm;
  const forms=startForm?[0,startForm]:[0];
  const S={stage:cfg.stage,def,W:st.W,grid:st.grid,zones:st.zones,flagX:st.flag,forms,formI:startForm?1:0,baseForm,arena:st.arena,bossOn:false,boss:null,
    frame:0,score:(cfg.carry&&cfg.carry.score)|0,bones:0,lives:cfg.lives===0?Infinity:(cfg.lives||3),invincible:cfg.lives===0,time:0,status:'play',msg:null,msgT:0,camX:0,
    hero:null,enemies:[],items:[],shots:[],fx:[],events:[],rng:mulberry(cfg.seed||((Date.now()%2147483646)+1)),
    spawn:{x:def.start[0]*T,y:def.start[1]*T},checkpoint:null};
  S.enemies=st.enemies.map((e,i)=>spawnEnemy(S,e.type,e.x,i)); S.boss=S.enemies.find(e=>e.boss)||null;
  S.items=st.items.map(it=>({...it,px:it.x*T+(it.type==='bone'?3:it.type==='form'?2:4),py:it.y*T+(it.type==='form'?2:5),taken:false}));
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
  return {id:i,type,x:tx*T+(T-d.w)/2,y:gy-d.h-(d.fly?4*T-2:0),x0:tx*T,w:d.w,h:d.h,vx:-d.speed,vy:0,dir:-1,hp:d.hits,maxhp:d.hits,alive:true,anim:0,t:S.rng()*60|0,punch:0,charge:0,fire:0,hurt:0,boss:!!d.boss,shots:0};
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
  // 변신 바꾸기(S)는 없다: 배지를 주우면 그 모습으로 끝까지 간다(transform)
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
  if(onSpikes(S,h)&&!f.armor) hurt(S,h,2,'spike');
  // 상태
  if(h.atkT>0) h.state='attack'; else if(!h.onGround) h.state=h.vy<0?'jump':'fall'; else if(Math.abs(h.vx)>0.2) h.state='run'; else h.state='idle';
  if(h.state==='run') h.anim+=Math.abs(h.vx)*0.9; else h.anim++;
  if(h.inv>0) h.inv--; if(h.flash>0) h.flash--;
  // 아이템
  for(const it of S.items){ if(it.taken) continue; const r={x:it.px,y:it.py,w:it.type==='bone'?10:it.type==='form'?12:8,h:it.type==='bone'?7:it.type==='form'?12:6}; if(overlap(h,r)){ it.taken=true; if(it.type==='bone'){ S.bones++; S.score+=100; S.events.push({t:'bone'}); } else if(it.type==='form'){ S.score+=300; if(S.forms[S.formI]!==it.form) transform(S,it.form); else { S.msg='같은 모습 · 배지 300점'; S.msgT=80; S.events.push({t:'bone'}); } } else { h.hp=Math.min(h.maxhp,h.hp+1); S.score+=200; S.events.push({t:'heart'}); } addFx(S,'spark',r.x+r.w/2,r.y); } }
  // 깃발
  if(S.flagX!=null&&!(S.boss&&S.boss.alive)&&h.x+h.w>S.flagX*T+6&&!h.win){ h.win=1; h.vx=0; S.score+=(1000+Math.max(0,3000-S.time)|0)+(S.lives===Infinity?0:S.lives*500); S.checkpoint=null; S.events.push({t:'win'}); }
  // 보스 싸움터: 들어서면 왼쪽 벽이 생긴다
  if(S.arena&&S.boss&&S.boss.alive){ if(!S.bossOn&&h.x>=S.arena[0]*T+8){ S.bossOn=true; S.msg=ENEMIES.neo.name+' 등장 · 열두 번 쳐서 부순다'; S.msgT=120; S.events.push({t:'boss'}); }
    if(S.bossOn&&h.x<S.arena[0]*T){ h.x=S.arena[0]*T; if(h.vx<0) h.vx=0; } }
  // 적
  for(const e of S.enemies){ if(!e.alive) continue; stepEnemy(S,e,h); if(!e.alive) continue;
    if(!h.dead&&overlap(h,e)){
      const d=ENEMIES[e.type], stomp=d.stomp&&h.vy>0&&(h.y+h.h-e.y)<Math.max(8,e.h*0.6)&&!e.punchBox;
      if(h.charge>0){ hitEnemy(S,e,1,'charge'); } // 돌진은 무적 중에도 친다(이전에는 무적 판정에 가려 한 번도 안 맞았다)
      else if(h.inv>0){ }
      else if(stomp){ hitEnemy(S,e,e.type==='knight'?1:99,'stomp'); h.vy=JUMP*0.72; h.jumps=1; S.events.push({t:'stomp'}); }
      else hurt(S,h,1,e.type);
    }
    if(e.punchBox&&h.inv<=0&&!h.dead&&overlap(h,e.punchBox)&&h.charge<=0) hurt(S,h,1,'punch');
  }
  // 발사체
  for(const p of S.shots){ if(!p.alive) continue; if(p.g) p.vy=Math.min(MAXFALL,p.vy+p.g); p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) p.alive=false;
    if(p.life<=0&&p.splash){ boom(S,p); continue; }
    if(rectSolid(S,p.x,p.y,p.w,p.h,0,false)){
      if(p.kind==='bomb'&&p.vy>0&&!rectSolid(S,p.x,p.y-p.vy,p.w,p.h,0,false)){ p.y=Math.floor((p.y+p.h)/T)*T-p.h-0.01; p.vy=0; p.vx*=0.9; } // 폭탄은 바닥에 떨어지면 구른다
      else { p.alive=false; if(p.splash) boom(S,p); else addFx(S,'puff',p.x,p.y); continue; } }
    if(p.owner==='hero'){ for(const e of S.enemies){ if(e.alive&&overlap(p,e)){ if(p.splash){ p.alive=false; boom(S,p); } else { hitEnemy(S,e,(p.bonus&&p.bonus[e.type])||p.dmg,'shot'); if(!p.pierce) p.alive=false; } break; } } }
    else if(h.inv<=0&&!h.dead&&overlap(p,h)&&h.charge<=0){ p.alive=false; hurt(S,h,1,({arrow:'arrow',stone:'stone',rocket:'rocketshot'})[p.kind]||'shell'); }
  }
  S.shots=S.shots.filter(p=>p.alive);
  // 체크포인트: 구역 경계를 지나면
  for(const z of S.zones){ if(z.x>0&&h.x>=z.x*T&&(!S.checkpoint||S.checkpoint.x<z.x*T)){ S.checkpoint={x:z.x*T,y:groundY(S,z.x)}; S.msg=z.name+' 도착 · 여기서 다시 시작한다'; S.msgT=110; S.events.push({t:'zone'}); } }
  // 카메라
  const target=h.x+h.w/2-160, camMin=S.bossOn&&S.arena?S.arena[0]*T-16:0; S.camX=Math.max(camMin,Math.min(S.W*T-320,S.camX+(target-S.camX)*0.15));
  tickFx(S);
}
function attack(S,h,f){
  const k=f.atk; h.atkT=14; S.events.push({t:'atk',kind:k});
  if(k==='paw'){ h.cool=18; const box={x:h.dir>0?h.x+h.w:h.x-10,y:h.y+4,w:10,h:12}; for(const e of S.enemies) if(e.alive&&overlap(box,e)) hitEnemy(S,e,1,'paw'); h.pawBox=box; }
  else if(k==='shell'){ h.cool=34; S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-4,y:h.y+5,w:4,h:3,vx:h.dir*3.2,vy:0,life:36,dmg:1,alive:true,kind:'shell'}); }
  else if(k==='charge'){ h.cool=40; h.charge=12; h.inv=Math.max(h.inv,14); const box={x:h.dir>0?h.x:h.x-48,y:h.y,w:h.w+48,h:h.h}; h.chargeBox=box; }
  else if(k==='shotgun'){ h.cool=48; for(let i=-1;i<=1;i++) S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-3,y:h.y+7+i*2,w:3,h:2,vx:h.dir*3.6,vy:i*0.9,life:14,dmg:1,alive:true,kind:'pellet',pierce:true}); }
  /* 헬기: 폭탄을 아래로 떨어뜨린다(활공 중이면 폭격). 바닥·적에 닿으면 터져 주변 1칸을 친다 */
  else if(k==='bomb'){ h.cool=30; S.shots.push({owner:'hero',x:h.x+h.w/2-2,y:h.y+h.h-5,w:4,h:4,vx:h.dir*1.4+h.vx*0.5,vy:Math.max(0.3,h.vy),g:GRAV,life:48,dmg:1,alive:true,kind:'bomb',splash:16}); }
  /* 초파리: 침을 빠르게 뱉는다(짧은 사거리, 연타) */
  else if(k==='spit'){ h.cool=9; h.atkT=8; S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-3,y:h.y+6,w:3,h:2,vx:h.dir*4.2,vy:0,life:12,dmg:1,alive:true,kind:'spit'}); }
  /* 사석포: 돌을 높이 던진다(포물선, 떨어진 자리 주변을 친다) */
  else if(k==='lob'){ h.cool=46; S.shots.push({owner:'hero',x:h.x+h.w/2-2,y:h.y-4,w:5,h:5,vx:h.dir*2.0,vy:-4.6,g:GRAV,life:120,dmg:2,alive:true,kind:'stone',splash:16}); }
  /* 산병(동현워 정예 산병): 투창. 살짝 포물선으로 날아가 사거리 약 6칸. 멀리서 쏘는 적(장궁병·사석포)에는 2 피해 */
  else if(k==='javelin'){ h.cool=22; h.atkT=10; S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-8,y:h.y+3,w:8,h:2,vx:h.dir*3.4,vy:-1.6,g:GRAV*0.5,life:48,dmg:1,bonus:{archer:2,bombard:2},alive:true,kind:'javelin'}); }
  /* 로켓포: 곧게 멀리 나는 로켓, 맞은 자리 주변을 친다 */
  else if(k==='rocket'){ h.cool=70; S.shots.push({owner:'hero',x:h.dir>0?h.x+h.w:h.x-6,y:h.y+5,w:6,h:3,vx:h.dir*4.5,vy:0,life:55,dmg:2,alive:true,kind:'rocket',splash:18}); }
  /* 전함: 함포 두 발(멀리·가까이 포물선) */
  else if(k==='salvo'){ h.cool=60; for(const [vx,vy] of [[2.8,-5.4],[1.6,-5.0]]) S.shots.push({owner:'hero',x:h.x+h.w/2-2,y:h.y-2,w:4,h:4,vx:h.dir*vx,vy,g:GRAV,life:140,dmg:2,alive:true,kind:'shell2',splash:12}); }
}
/* 터지는 발사체: 반지름 안의 적을 모두 친다 */
function boom(S,p){
  p.alive=false; const cx=p.x+p.w/2, cy=p.y+p.h/2, r=p.splash; addFx(S,'boom',cx,cy); S.events.push({t:'boom'});
  for(const e of S.enemies){ if(!e.alive) continue; const ex=Math.max(e.x,Math.min(cx,e.x+e.w)), ey=Math.max(e.y,Math.min(cy,e.y+e.h)); if((ex-cx)**2+(ey-cy)**2<=r*r) hitEnemy(S,e,p.dmg,'boom'); }
}
function transform(S,fi){
  const h=S.hero; S.forms=fi?[0,fi]:[0]; S.formI=fi?1:0; const nf=form(S); h.maxhp=nf.hp; h.hp=nf.hp; h.inv=Math.max(h.inv,30); h.flash=30; h.charge=0;
  S.events.push({t:'swap',form:nf}); S.msg=nf.name+'으로 변신'; S.msgT=110;
}
/* 목숨을 잃으면 시작 모습으로 돌아온다 */
function revertForm(S){
  const cur=S.forms[S.formI]; if(cur===S.baseForm) return false;
  S.forms=S.baseForm?[0,S.baseForm]:[0]; S.formI=S.baseForm?1:0; return true;
}
function hitEnemy(S,e,dmg,how){
  const d=ENEMIES[e.type];
  if(e.type==='pike'&&how==='stomp') return; // 창 위로는 밟을 수 없다(위에서 막힘)
  if(e.boss&&e.hurt>0) return; // 보스는 맞은 직후 잠깐 다시 맞지 않는다(돌진·산탄으로 한 번에 녹지 않게)
  e.hp-=dmg; e.hurt=10; S.events.push({t:'hit',type:e.type,how});
  if(e.hp<=0){ e.alive=false; S.score+=({lion:100,shushu:200,inf:150,tank:500,pike:250,knight:400,archer:200,bombard:450,recon:300,rocket:400,heli:450,neo:3000})[e.type]||100; addFx(S,'pop',e.x+e.w/2,e.y+e.h/2); S.events.push({t:'kill',type:e.type});
    if(e.boss){ S.bossOn=false; S.msg='신형전차 격파 · 깃발이 섰다'; S.msgT=150; S.events.push({t:'bosskill'}); for(const p of S.shots) if(p.owner==='enemy') p.alive=false; } }
  else if(!e.boss){ e.vx=-e.vx; e.dir=-e.dir; }
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
  const at=S.checkpoint||S.spawn; S.shots=[]; const reverted=revertForm(S); spawnHero(S,{x:at.x,y:at.y}); S.hero.inv=90; S.camX=Math.max(0,Math.min(S.W*T-320,at.x-120)); S.events.push({t:'respawn'});
  if(reverted){ S.events.push({t:'revert',form:form(S)}); S.msg=form(S).name+' 모습으로 돌아왔다'; S.msgT=100; }
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
  else if(e.type==='archer'){ /* 같은 높이의 포동이를 보면 멈춰 서서 화살을 곧게 쏜다 */
    if(e.fire>0){ e.fire--; e.vx=0; if(e.fire===12){ S.shots.push({owner:'enemy',x:e.dir>0?e.x+e.w:e.x-8,y:e.y+9,w:8,h:2,vx:e.dir*3.0,vy:0,life:56,alive:true,kind:'arrow'}); S.events.push({t:'arrow'}); } }
    else { if(near&&Math.abs(e.y-h.y)<20&&Math.abs(dx)>20&&Math.abs(dx)<170&&e.t%96===0){ e.dir=dx>0?1:-1; e.fire=30; } e.vx=e.dir*d.speed; }
  }
  else if(e.type==='bombard'){ /* 제자리에서 포동이 자리로 돌을 높이 던진다 */
    e.vx=0; if(Math.abs(dx)>8) e.dir=dx>0?1:-1; if(e.fire>0) e.fire--;
    if(Math.abs(dx)<210&&Math.abs(dx)>28&&e.t%120===0){ e.fire=14; const vy=-5.4, tf=(2*5.4)/GRAV, vx=Math.max(-3,Math.min(3,dx/tf)); S.shots.push({owner:'enemy',x:e.x+e.w/2-2,y:e.y-6,w:5,h:5,vx,vy,g:GRAV,life:130,alive:true,kind:'stone'}); S.events.push({t:'cannon'}); }
  }
  else if(e.type==='rocket'){ /* 천천히 오가며 로켓을 높이 쏘아 포동이 자리에 떨어뜨린다 */
    e.vx=e.dir*d.speed; if(near) e.dir=dx>0?1:-1;
    if(Math.abs(dx)<230&&Math.abs(dx)>30&&e.t%130===0){ const vy=-6.2, tf=(2*6.2)/GRAV, vx=Math.max(-3.4,Math.min(3.4,dx/tf)); S.shots.push({owner:'enemy',x:e.x+e.w/2-3,y:e.y-4,w:6,h:3,vx,vy,g:GRAV,life:140,alive:true,kind:'rocket'}); S.events.push({t:'cannon'}); }
  }
  else if(e.type==='recon'){ /* 빠르고, 보면 달려든다 */
    if(near&&Math.abs(e.y-h.y)<30&&e.t%24===0) e.dir=dx>0?1:-1; e.vx=e.dir*(near?d.speed*1.4:d.speed);
  }
  else if(e.type==='heli'){ /* 발판 높이에서 집 주변을 오가며 포탄을 떨어뜨린다. 땅에 매이지 않는다 */
    if(Math.abs(e.x-e.x0)>72&&(e.x-e.x0)*e.dir>0) e.dir=-e.dir; e.vx=e.dir*d.speed; e.vy=Math.sin(e.t/14)*0.35;
    if(Math.abs(dx)<40&&h.y>e.y&&e.t%90===0){ S.shots.push({owner:'enemy',x:e.x+e.w/2-2,y:e.y+e.h,w:4,h:3,vx:0,vy:0.6,g:GRAV,life:90,alive:true,kind:'shell'}); S.events.push({t:'cannon'}); }
    e.x+=e.vx; e.y+=e.vy; if(rectSolid(S,e.x,e.y,e.w,e.h,0,false)){ e.x-=e.vx; e.dir=-e.dir; } e.onGround=false; return;
  }
  else if(e.type==='neo'){
    if(!S.bossOn){ e.vx=0; e.vy=Math.min(MAXFALL,e.vy+GRAV); moveBody(S,e,true); return; }
    const rage=e.hp<=e.maxhp/2, spd=rage?0.55:d.speed, every=rage?52:80;
    if(e.charge>0){ e.charge--; e.vx=e.dir*2.0; if(e.charge===0) e.rest=40; }
    else if(e.rest>0){ e.rest--; e.vx=0; }
    else {
      if(Math.abs(dx)>24) e.dir=dx>0?1:-1;
      e.vx=Math.abs(dx)>28?e.dir*spd:0;
      if(rage&&e.t%150===0&&Math.abs(dx)<140&&Math.abs(dx)>30){ e.charge=34; S.events.push({t:'horse'}); }
      if(e.t%every===0&&Math.abs(dx)>20){ e.shots++;
        if(e.shots%3===0){ const vx=Math.max(-3,Math.min(3,dx/32)); S.shots.push({owner:'enemy',x:e.x+e.w/2-2,y:e.y-6,w:4,h:3,vx,vy:-5.2,g:GRAV,life:130,alive:true,kind:'shell'}); }
        else S.shots.push({owner:'enemy',x:e.dir>0?e.x+e.w:e.x-4,y:e.y+7,w:4,h:3,vx:e.dir*2.4,vy:0,life:90,alive:true,kind:'shell'});
        S.events.push({t:'cannon'}); }
    }
    // 싸움터 안에서만 움직인다
    if(S.arena){ const L=S.arena[0]*T+4, R=S.arena[1]*T-e.w-4; if(e.x+e.vx<L){ e.x=L; e.vx=0; e.charge=0; } if(e.x+e.vx>R){ e.x=R; e.vx=0; e.charge=0; } }
  }
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
root.Engine={newGame,step,form,transform,buildStage,tileAt,groundY,FORMS,ENEMIES,STAGES,T,ROWS};
})(window);
