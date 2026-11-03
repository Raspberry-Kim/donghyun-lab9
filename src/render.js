/* 동현크 그림: 320×192 화면(16px 타일 20×12). 시차 배경·타일·포동이·적·HUD. 모두 코드로 그린다. */
(function(root){
'use strict';
const {T,ROWS,FORMS,ENEMIES}=root.DATA, SP=root.Sprites;
const VW=320, VH=ROWS*T;
const TILE_COL={
  grass:{top:'#5fb44a',top2:'#8fd36a',body:'#a56d3f',body2:'#8c5a33',edge:'#6b4426'},
  stone:{top:'#9aa0ad',top2:'#c3c8d2',body:'#6f7584',body2:'#5c6170',edge:'#3f4350'},
  brick:{top:'#c9664a',top2:'#e08a6e',body:'#9c4a35',body2:'#7f3a2a',edge:'#4f2419'}
};
function zoneAt(S,tx){ let z=S.zones[0]; for(const q of S.zones) if(tx>=q.x) z=q; return z; }
function px(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(x|0,y|0,w,h); }
let bgCache={};
function background(g,S,cam){
  const zx=Math.floor((cam+160)/T), z=zoneAt(S,zx);
  // 하늘: 구역 색을 부드럽게 섞는다
  const next=S.zones.find(q=>q.x>zx); let mix=0; if(next){ const d=next.x*T-(cam+160); if(d<160) mix=1-d/160; }
  const sky=lerpPair(z.sky,next?next.sky:z.sky,mix), hill=lerpCol(z.hill,next?next.hill:z.hill,mix);
  const gr=g.createLinearGradient(0,0,0,VH); gr.addColorStop(0,sky[0]); gr.addColorStop(1,sky[1]); g.fillStyle=gr; g.fillRect(0,0,VW,VH);
  // 구름(느린 시차)
  g.fillStyle='rgba(255,255,255,.75)';
  for(let i=0;i<7;i++){ const cx=((i*97+((S.frame*0.15)|0)-cam*0.2)%(VW+80)+VW+80)%(VW+80)-40, cy=14+((i*37)%50); px(g,cx,cy,22,6,'rgba(255,255,255,.8)'); px(g,cx+5,cy-4,12,4,'rgba(255,255,255,.8)'); }
  // 먼 언덕(시차 0.4)
  g.fillStyle=hill; const off=-cam*0.4;
  for(let i=-1;i<8;i++){ const bx=i*96+((off%96)+96)%96; g.beginPath(); g.moveTo(bx-20,VH); g.quadraticCurveTo(bx+28,88-(i%2)*18,bx+76,VH); g.fill(); }
  // 구역별 가까운 배경(시차 0.7)
  const off2=-cam*0.7; g.fillStyle='rgba(0,0,0,.14)';
  if(z.ground==='grass'){ for(let i=-1;i<8;i++){ const bx=i*72+((off2%72)+72)%72; px(g,bx+10,130,6,30,'rgba(60,40,20,.35)'); g.beginPath(); g.arc(bx+13,124,14,0,7); g.fillStyle='rgba(40,110,50,.45)'; g.fill(); } }
  else if(z.ground==='stone'){ for(let i=-1;i<8;i++){ const bx=i*64+((off2%64)+64)%64; px(g,bx,118,40,42,'rgba(70,75,90,.55)'); for(let k=0;k<4;k++) px(g,bx+k*10,112,6,6,'rgba(70,75,90,.55)'); px(g,bx+16,136,8,12,'rgba(30,32,40,.6)'); } }
  else { for(let i=-1;i<8;i++){ const bx=i*80+((off2%80)+80)%80; px(g,bx,124,30,36,'rgba(90,60,45,.5)'); px(g,bx+34,96,8,64,'rgba(90,60,45,.5)'); px(g,bx+30,90,16,6,'rgba(50,30,20,.6)'); const sm=(S.frame/3+i*7)%40; px(g,bx+36-sm*0.2,84-sm,6,5,'rgba(80,80,80,'+(0.35*(1-sm/40))+')'); } }
}
function lerpCol(a,b,t){ if(t<=0) return a; const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); const A=p(a),B=p(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
function lerpPair(a,b,t){ return [lerpCol(a[0],b[0],t),lerpCol(a[1],b[1],t)]; }
function tiles(g,S,cam){
  const x0=Math.floor(cam/T), x1=Math.min(S.W-1,x0+21);
  for(let tx=x0;tx<=x1;tx++){ const z=zoneAt(S,tx), c=TILE_COL[z.ground]; const sx=tx*T-cam;
    for(let ty=0;ty<ROWS;ty++){ const t=S.grid[ty][tx]; if(t==='.') continue; const sy=ty*T;
      if(t==='#'){ px(g,sx,sy,T,T,c.body); px(g,sx,sy,T,5,c.top); px(g,sx,sy,T,2,c.top2); if(z.ground==='grass'){ px(g,sx+3,sy-2,2,2,c.top); px(g,sx+10,sy-3,2,3,c.top2); } px(g,sx+4,sy+9,3,2,c.body2); px(g,sx+11,sy+12,2,2,c.body2); }
      else if(t==='='){ px(g,sx,sy,T,T,c.body); px(g,sx+2,sy+4,3,2,c.body2); px(g,sx+9,sy+10,4,2,c.body2); px(g,sx+12,sy+2,2,2,c.body2); }
      else if(t==='B'){ px(g,sx,sy,T,T,c.edge); px(g,sx+1,sy+1,14,6,c.top); px(g,sx+1,sy+9,6,6,c.top); px(g,sx+9,sy+9,6,6,c.top); px(g,sx+1,sy+1,14,2,c.top2); }
      else if(t==='-'){ px(g,sx,sy+2,T,4,'#8a5a2b'); px(g,sx,sy+2,T,1,'#c58b4a'); px(g,sx+2,sy+6,2,4,'#5e3a18'); px(g,sx+12,sy+6,2,4,'#5e3a18'); }
      else if(t==='^'){ for(let i=0;i<4;i++){ g.fillStyle='#d8d8e0'; g.beginPath(); g.moveTo(sx+i*4,sy+T); g.lineTo(sx+i*4+2,sy+6); g.lineTo(sx+i*4+4,sy+T); g.fill(); } px(g,sx,sy+14,T,2,'#555'); }
    }
  }
  // 깃발
  if(S.flagX!=null&&!(S.boss&&S.boss.alive)){ const fx=S.flagX*T-cam+7, gy=root.Engine.groundY(S,S.flagX); px(g,fx,gy-60,2,60,'#e6e6ee'); px(g,fx-1,gy-62,4,3,'#f2b705'); const wave=Math.sin(S.frame/8)*1.5; g.fillStyle='#d6403a'; g.beginPath(); g.moveTo(fx+2,gy-58); g.lineTo(fx+22+wave,gy-50); g.lineTo(fx+2,gy-42); g.fill(); px(g,fx+6,gy-54,8,6,'#f6ecd6'); }
}
function drawSprite(g,key,x,y,flip){ const c=SP.make(key,flip); g.drawImage(c,Math.round(x),Math.round(y)); }
/* 변신 장식: 포동이 머리 위·앞에 덧그린다 */
function formOverlay(g,S,h,x,y,flip){
  /* 포동이 24×20 기준 좌표. M(xo,w)는 왼쪽을 볼 때 좌우를 뒤집는다. 머리 12~23열, 몸 2~17열, 다리 15~19행 */
  const f=root.Engine.form(S), M=(xo,w)=>flip?x+24-xo-w:x+xo, fr=(xo,yo,w,hh,c)=>px(g,M(xo,w),y+yo,w,hh,c);
  if(f.key==='tank'){ /* 동현전 전차: 머리 위 회색 포탑·포신, 몸 아래 궤도 */
    fr(12,0,10,3,'#5d5b53'); fr(11,2,12,2,'#9a978c'); fr(19,2,6,2,'#5d5b53');
    fr(1,16,18,4,'#5d5b53'); fr(2,17,16,2,'#9a978c'); for(let i=0;i<4;i++) fr(3+i*4+((S.frame>>2)&1),17,2,2,'#3b3a36'); fr(8,16,4,2,'#e5483a'); }
  else if(f.key==='knight'){ /* 동현워 기사: 투구·깃·몸통 옆 방패 */
    fr(12,-1,10,4,'#8d919c'); fr(13,-3,8,2,'#c7c9d1'); fr(16,-7,2,5,'#3a78e8'); fr(18,-6,2,3,'#3a78e8');
    fr(4,9,6,7,'#24417a'); fr(5,10,4,5,'#3b63b5'); fr(6,12,2,2,'#f2b705'); }
  else if(f.key==='copter'){ /* 동현콥 헬기: 머리 위 돌아가는 날개, 몸 아래 스키드 */
    fr(16,-4,2,4,'#5d5b53'); const ph=(S.frame>>1)&3, w=[18,12,4,12][ph]; fr(17-w/2,-6,w,2,'#2bb0c8');
    fr(2,19,16,1,'#2bb0c8'); fr(0,6+((S.frame>>1)&1),3,2,'#2bb0c8'); }
  else if(f.key==='doom'){ /* 동현둠: 초록 철모·앞으로 든 산탄총 */
    fr(12,-1,10,4,'#5a8f3a'); fr(13,-3,8,2,'#6fb04a'); fr(12,2,10,1,'#3e6b28');
    fr(14,12,12,2,'#3b3f4a'); fr(13,14,4,2,'#7a4a22'); fr(25,11,2,3,'#231d18'); }
  else if(f.key==='fly'){ /* 동현초 초파리: 몸 위 반투명 날개, 더듬이 */
    const fl=(S.frame>>2)&1; fr(3,2+fl,9,6,'rgba(230,180,240,.75)'); fr(5,1+fl,9,6,'rgba(230,180,240,.6)');
    fr(14,-3,1,3,'#2e2a38'); fr(19,-3,1,3,'#2e2a38'); fr(13,-4,2,1,'#2e2a38'); fr(19,-4,2,1,'#2e2a38'); }
}
function hero(g,S,cam){
  const h=S.hero; if(h.inv>0&&!h.flash&&!h.dead&&(S.frame>>2)&1) return;
  let key='P_idle'; if(h.dead) key='P_hurt'; else if(h.state==='attack') key='P_attack'; else if(h.state==='jump'||h.state==='fall') key='P_jump'; else if(h.state==='run') key=((h.anim>>3)&1)?'P_run1':'P_run2'; else if(h.inv>60) key='P_hurt';
  const flip=h.dir<0, x=h.x-4-cam, y=h.y-4;
  if(h.win){ key=(S.frame>>3)&1?'P_jump':'P_idle'; }
  drawSprite(g,key,x,y,flip);
  formOverlay(g,S,h,x,y,flip);
  if(h.glide){ px(g,x+2,y+21,20,1,'rgba(43,176,200,.5)'); }
  if(h.charge>0){ px(g,flip?x-6:x+24,y+6,6,10,'rgba(58,120,232,.35)'); }
}
function enemies(g,S,cam){
  for(const e of S.enemies){ if(!e.alive) continue; const x=e.x-cam; if(x<-40||x>VW+40) continue;
    const flash=e.hurt>0&&(S.frame>>1)&1; if(flash) g.globalAlpha=0.5;
    const flip=e.dir<0;
    if(e.type==='lion') drawSprite(g,(e.anim>>4)&1?'L1':'L2',x,e.y,flip);
    else if(e.type==='shushu') drawSprite(g,e.punch>0?'S_punch':((e.anim>>4)&1?'S1':'S2'),x-2,e.y,!flip);
    else if(e.type==='inf') drawSprite(g,'inf',x-2,e.y-2,flip);
    else if(e.type==='tank') drawSprite(g,'tank',x,e.y-2,flip);
    else if(e.type==='pike') drawSprite(g,'pike',x-2,e.y,flip);
    else if(e.type==='knight') drawSprite(g,'knight',x,e.y,flip);
    else if(e.type==='neo') drawSprite(g,'neo',x,e.y-2,flip);
    g.globalAlpha=1;
  }
}
/* 변신 배지: 지금 모습과 같은 배지만 흐리게(점수만) */
const BADGE_ICON={tank:'tank',knight:'ic_knight',copter:'ic_copter',doom:'ic_doom',fly:'ic_fly'};
function badge(g,S,it,x,y){
  /* 배지는 그 모습이 온 세계의 그림이다: 전차=동현전 전차, 기사=동현워 투구·방패, 헬기=동현콥 꼬리콥터, 둠=동현둠 철모·산탄총, 초파리=동현초 초파리 */
  const f=FORMS[it.form]; if(!f) return; const dim=S.forms[S.formI]===it.form; if(dim) g.globalAlpha=0.45;
  const key=BADGE_ICON[f.key]; const bx=Math.round(x)-2, by=Math.round(y)-2;
  g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(bx-1,by+13,18,3);
  if(key) drawSprite(g,key,bx,by,false); else { px(g,bx+2,by+2,12,12,f.color); }
  if(!dim&&((S.frame>>3)&1)){ px(g,bx+14,by-2,2,2,'#f2b705'); px(g,bx,by+1,2,2,'#f2b705'); }
  g.globalAlpha=1;
}
function items(g,S,cam){
  for(const it of S.items){ if(it.taken) continue; const x=it.px-cam; if(x<-16||x>VW+16) continue; const bob=Math.sin((S.frame+it.x*7)/14)*1.5;
    if(it.type==='form') badge(g,S,it,x,it.py+bob); else drawSprite(g,it.type==='bone'?'bone':'heart',x,it.py+bob,false); }
  for(const p of S.shots){ const x=p.x-cam; if(p.kind==='shell') drawSprite(g,'shell',x,p.y,false); else px(g,x,p.y,3,2,'#f2b705'); }
  for(const f of S.fx){ const x=f.x-cam, k=f.t/24;
    if(f.kind==='pop'){ g.strokeStyle='rgba(255,255,255,'+(1-k)+')'; g.lineWidth=2; g.beginPath(); g.arc(x,f.y,4+k*14,0,7); g.stroke(); }
    else if(f.kind==='spark'){ for(let i=0;i<4;i++) px(g,x+Math.cos(i*1.57)*k*12,f.y-k*10+Math.sin(i*1.57)*k*6,2,2,'#f2b705'); }
    else { px(g,x-4+k*2,f.y-2-k*6,8-k*4,4,'rgba(255,255,255,'+(0.7-k*0.7)+')'); } }
}
function hud(g,S){
  const h=S.hero, f=root.Engine.form(S);
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,VW,14);
  for(let i=0;i<h.maxhp;i++) drawSprite(g,'heart',4+i*10,3,false), (i>=h.hp&&(px(g,4+i*10,3,8,6,'rgba(30,30,40,.75)')));
  g.font='bold 8px Pretendard, sans-serif'; g.textBaseline='top'; g.fillStyle='#fff';
  g.fillText(S.lives===Infinity?'×∞ 무적':'×'+S.lives,6+h.maxhp*10,3);
  drawSprite(g,'bone',VW-98,4,false); g.fillText(String(S.bones).padStart(2,'0'),VW-86,3);
  g.fillText(String(S.score).padStart(6,'0'),VW-66,3);
  // 변신 이름(가운데)
  const label=f.name, lw=g.measureText(label).width; if(f.key!=='base'){ px(g,VW/2-lw/2-9,4,6,6,f.color); } g.textAlign='center'; g.fillStyle='#fff'; g.fillText(label,VW/2+(f.key!=='base'?3:0),3); g.textAlign='left';
  // 보스 체력
  if(S.boss&&S.bossOn&&S.boss.alive){ const b=S.boss, w=120, x0=VW/2-w/2; g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(x0-2,16,w+4,12); px(g,x0,18,w,8,'#3a3438'); px(g,x0,18,Math.round(w*b.hp/b.maxhp),8,b.hp<=b.maxhp/2?'#ff7a3a':'#e5483a'); g.fillStyle='#fff'; g.textAlign='center'; g.fillText(ENEMIES.neo.name+' '+b.hp+'/'+b.maxhp,VW/2,19); g.textAlign='left'; }
  if(S.msgT>0&&S.msg){ const a=Math.min(1,S.msgT/20); g.fillStyle='rgba(0,0,0,'+(0.5*a)+')'; const w=g.measureText(S.msg).width+16; g.fillRect(VW/2-w/2,60,w,14); g.fillStyle='rgba(255,255,255,'+a+')'; g.textAlign='center'; g.fillText(S.msg,VW/2,63); g.textAlign='left'; }
}
function draw(g,S){
  g.imageSmoothingEnabled=false;
  const cam=Math.round(S.camX);
  background(g,S,cam); tiles(g,S,cam); items(g,S,cam); enemies(g,S,cam); hero(g,S,cam); hud(g,S);
}
/* 출전 전 미리보기: 스테이지 첫 화면에 포동이를 세운다 */
function preview(g,S){ draw(g,S); }
root.Render={draw,preview,VW,VH};
})(window);
