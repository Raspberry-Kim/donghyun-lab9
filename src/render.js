/* 동현크 그림: 320×192 화면(16px 타일 20×12). 시차 배경·타일·포동이·적·HUD. 모두 코드로 그린다. */
(function(root){
'use strict';
const {T,ROWS,FORMS,ENEMIES}=root.DATA, SP=root.Sprites;
const VW=320, VH=ROWS*T;
const TILE_COL={
  grass:{top:'#668965',top2:'#a2b98a',body:'#a28a68',body2:'#897457',edge:'#58674d'},
  stone:{top:'#8a9a9b',top2:'#c4ccc0',body:'#6d8088',body2:'#5a6e78',edge:'#3e525e'},
  brick:{top:'#ad7b64',top2:'#d1ab8a',body:'#8c6459',body2:'#76554e',edge:'#4e4244'}
};
/* 색은 그리기 단계에서만 고른다. 저장된 구역·발판·적의 배치는 바꾸지 않는다. */
const ATMOS=[
  {grass:['#86adb3','#e4dfc2','#a5b89d'],stone:['#94a6b1','#dddccf','#99a7aa'],brick:['#b49b8c','#e8d6b7','#ad9b87']},
  {grass:['#c6947b','#efcfab','#b1a082'],stone:['#8e95a9','#d9c9bb','#9796a0'],brick:['#737f91','#c5aca2','#898591']},
  {grass:['#819c98','#d2d9c4','#8eaaa0'],stone:['#667e94','#b8c6ca','#7f96a6'],brick:['#8f757c','#d2b4a2','#9b8c8d']}
];
function atmosphere(S,z){const p=ATMOS[(S.stage-1)%3][z.ground];return {sky:p.slice(0,2),hill:p[2]};}
function zoneAt(S,tx){ let z=S.zones[0]; for(const q of S.zones) if(tx>=q.x) z=q; return z; }
function px(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(x|0,y|0,w,h); }
function background(g,S,cam){
  const zx=Math.floor((cam+160)/T), z=zoneAt(S,zx);
  // 하늘: 구역 색을 부드럽게 섞는다
  const next=S.zones.find(q=>q.x>zx); let mix=0; if(next){ const d=next.x*T-(cam+160); if(d<160) mix=1-d/160; }
  const a=atmosphere(S,z),b=next?atmosphere(S,next):a;
  const sky=lerpPair(a.sky,b.sky,mix), hill=lerpCol(a.hill,b.hill,mix);
  const gr=g.createLinearGradient(0,0,0,VH); gr.addColorStop(0,sky[0]); gr.addColorStop(1,sky[1]); g.fillStyle=gr; g.fillRect(0,0,VW,VH);
  // 구름(느린 시차)
  // 구름의 넓은 밝은 면은 줄이고, 해와 얕은 능선으로 깊이를 둔다.
  g.fillStyle='#eee0b7';g.beginPath();g.arc(260-cam*.025%30,38,10,0,Math.PI*2);g.fill();
  for(let i=0;i<5;i++){ const cx=((i*97+((S.frame*0.08)|0)-cam*0.16)%(VW+80)+VW+80)%(VW+80)-40, cy=24+((i*37)%44); px(g,cx,cy,30,3,'rgba(244,237,216,.45)'); px(g,cx+7,cy-3,17,3,'rgba(244,237,216,.45)'); }
  g.fillStyle=lerpCol(hill,sky[1],.48);
  for(let i=-1;i<6;i++){const bx=i*112+((-cam*.2%112)+112)%112;g.beginPath();g.moveTo(bx-30,VH);g.quadraticCurveTo(bx+30,54+(i%2)*12,bx+100,VH);g.fill();}
  // 먼 언덕(시차 0.4)
  g.fillStyle=hill; const off=-cam*0.4;
  for(let i=-1;i<8;i++){ const bx=i*96+((off%96)+96)%96; g.beginPath(); g.moveTo(bx-20,VH); g.quadraticCurveTo(bx+28,88-(i%2)*18,bx+76,VH); g.fill(); }
  // 구역별 가까운 배경(시차 0.7)
  const off2=-cam*0.7, far=lerpCol(hill,'#405b60',.38), edge=lerpCol(far,'#e1ddc6',.24);
  if(z.ground==='grass'){ for(let i=-1;i<8;i++){
    const bx=i*72+((off2%72)+72)%72, y=118+(i%2)*7;
    px(g,bx+10,y+5,3,40,'#758271');
    px(g,bx+10,y-4,2,21,'#758271');
    const leaf=(x,yy,w,h,col)=>{px(g,x+3,yy,w-6,h,col);px(g,x,yy+3,w,h-6,col);};
    leaf(bx+1,y-12,22,22,far);leaf(bx+3,y-20,17,18,far);
    leaf(bx+2,y-13,14,13,edge);leaf(bx+6,y-20,10,11,edge);
    px(g,bx+4,y-5,5,1,far);px(g,bx+10,y-16,4,1,far);
    px(g,bx+14,y+5,5,1,lerpCol(far,'#344d4d',.16));
  } }
  else if(z.ground==='stone'){ for(let i=-1;i<8;i++){
    const bx=i*64+((off2%64)+64)%64, y=109+(i%2)*9;
    px(g,bx,y,42,160-y,far);px(g,bx-1,y,44,2,edge);
    for(let k=0;k<4;k++)px(g,bx+k*12,y-5,6,5,far);
    px(g,bx+4,y+4,2,44,edge);px(g,bx+35,y+4,2,44,edge);
    for(let k=0;k<2;k++){px(g,bx+12+k*14,y+10,5,12,lerpCol(far,'#344650',.3));px(g,bx+12+k*14,y+9,5,1,edge);}
    px(g,bx,y+28,42,1,edge);
  } }
  else { for(let i=-1;i<8;i++){
    const bx=i*80+((off2%80)+80)%80;
    px(g,bx,122,38,38,far);px(g,bx-1,120,40,2,edge);
    g.fillStyle=far;g.beginPath();g.moveTo(bx,120);g.lineTo(bx+12,110);g.lineTo(bx+12,120);g.lineTo(bx+25,110);g.lineTo(bx+25,120);g.lineTo(bx+38,110);g.lineTo(bx+38,122);g.lineTo(bx,122);g.fill();
    for(let k=0;k<4;k++){px(g,bx+4+k*8,129,5,7,edge);px(g,bx+4+k*8,141,5,7,edge);}
    px(g,bx+46,91,7,69,far);px(g,bx+44,89,11,3,edge);px(g,bx+46,105,7,2,edge);
    const sm=(S.frame/3+i*7)%40;px(g,bx+48-sm*.2,83-sm,8,4,'rgba(105,112,116,'+(.23*(1-sm/40))+')');
  } }
}
function lerpCol(a,b,t){ if(t<=0) return a; const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); const A=p(a),B=p(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
function lerpPair(a,b,t){ return [lerpCol(a[0],b[0],t),lerpCol(a[1],b[1],t)]; }
function tiles(g,S,cam){
  const x0=Math.floor(cam/T), x1=Math.min(S.W-1,x0+21);
  for(let tx=x0;tx<=x1;tx++){ const z=zoneAt(S,tx), c=TILE_COL[z.ground]; const sx=tx*T-cam;
    for(let ty=0;ty<ROWS;ty++){ const t=S.grid[ty][tx]; if(t==='.') continue; const sy=ty*T;
      if(t==='#'){ px(g,sx,sy,T,T,c.body); px(g,sx,sy,T,4,c.top); px(g,sx,sy,T,1,c.top2);px(g,sx,sy+4,T,1,c.edge); if(z.ground==='grass'&&tx%3===1){ px(g,sx+3,sy-2,1,2,c.top); px(g,sx+9,sy-2,2,2,c.top2); } px(g,sx+4,sy+9,3,1,c.body2); px(g,sx+11,sy+12,2,1,c.body2); }
      else if(t==='='){ px(g,sx,sy,T,T,c.body); px(g,sx+2,sy+4,3,1,c.body2); px(g,sx+9,sy+10,4,1,c.body2); if(z.ground==='grass'){px(g,sx,sy+12,T,1,c.body2);if(tx%3===0)px(g,sx+7,sy+2,2,2,c.top2);}else{px(g,sx,sy+7,T,1,c.body2);px(g,sx+((ty&1)?4:12),sy,1,7,c.body2);} }
      else if(t==='B'){ px(g,sx,sy,T,T,c.body2); px(g,sx,sy,15,7,c.top); px(g,sx,sy+8,7,7,c.top); px(g,sx+8,sy+8,7,7,c.top); px(g,sx+1,sy+1,13,1,c.top2);px(g,sx+1,sy+9,5,1,c.top2);px(g,sx+9,sy+9,5,1,c.top2); }
      else if(t==='-'){ px(g,sx,sy,T,4,'#7b735c'); px(g,sx,sy,T,1,'#c7b28c'); px(g,sx+2,sy+4,2,4,'#51594f'); px(g,sx+12,sy+4,2,4,'#51594f'); }
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
  else if(f.key==='bombard'){ /* 동현워 사석포: 등 위의 나무 틀과 던지는 팔, 끝에 돌주머니. 쏘면 팔이 앞으로 넘어간다 */
    const up=h.atkT>6; fr(3,4,8,2,'#7a4a22'); fr(4,6,2,4,'#7a4a22'); fr(8,6,2,4,'#7a4a22');
    if(up){ fr(6,-6,2,10,'#b07a3e'); fr(5,-9,4,4,'#7d7a72'); } else { fr(6,-2,10,2,'#b07a3e'); fr(14,-4,4,4,'#7d7a72'); }
    fr(1,13,3,3,'#7a4a22'); fr(11,13,3,3,'#7a4a22'); }
  else if(f.key==='skirm'){ /* 동현워 산병: 가죽 모자와 초록 망토, 등에 멘 투창 묶음. 던질 때 팔이 앞으로 나가며 창 하나가 손에서 떠난다 */
    fr(12,-1,10,3,'#8fa36a'); fr(13,-3,8,2,'#a9bb80'); fr(2,4,8,8,'#5f7a3a'); fr(3,12,6,2,'#4a6130');
    if(h.atkT>0){ fr(14,6,10,1,'#b07a3e'); fr(23,5,2,2,'#c7c9d1'); } else { fr(4,-6,1,12,'#b07a3e'); fr(6,-7,1,13,'#b07a3e'); fr(3,-8,3,2,'#c7c9d1'); } }
  else if(f.key==='rocket'){ /* 동현전 로켓포: 등에 비스듬히 얹은 붉은 발사대와 로켓 세 발 */
    fr(2,0,10,3,'#9a2620'); fr(3,-2,10,3,'#e5483a'); fr(5,-4,9,3,'#e5483a'); for(let i=0;i<3;i++) fr(12+i,-4+i,2,1,'#f2b705');
    fr(1,4,3,6,'#5d5b53'); fr(3,8,6,2,'#5d5b53'); if(h.cool>50) fr(14,-6,3,3,'rgba(255,122,58,.8)'); }
  else if(f.key==='bship'){ /* 동현전 전함: 몸을 감싼 회청색 선체, 머리 위 함교와 두 개의 포신, 뒤쪽 마스트 */
    fr(0,10,20,6,'#4a6a8a'); fr(0,10,20,1,'#6f8aa8'); fr(1,12,18,1,'#2e4a66'); fr(2,16,16,2,'#2e4a66');
    fr(12,-1,10,3,'#4a6a8a'); fr(14,-4,6,3,'#6f8aa8'); fr(16,-7,2,3,'#2e4a66'); fr(15,-8,4,1,'#e5483a');
    fr(21,0,6,1,'#2e4a66'); fr(21,2,6,1,'#2e4a66'); fr(2,4,1,7,'#2e4a66'); fr(1,3,3,1,'#f6f2e8'); }
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
    else if(e.type==='archer') drawSprite(g,e.fire>0?'archer_shoot':'archer',x-2,e.y,flip);
    else if(e.type==='bombard') drawSprite(g,e.fire>0?'bombard_up':'bombard',x,e.y-6,flip);
    else if(e.type==='recon') drawSprite(g,'recon',x-2,e.y-2,flip);
    else if(e.type==='rocket') drawSprite(g,'rocket',x-2,e.y-2,flip);
    else if(e.type==='heli'){ drawSprite(g,'heli',x,e.y,flip); const ph=(S.frame>>1)&3, w=[22,14,6,14][ph]; px(g,x+12-w/2,e.y-2,w,1,'#231d18'); }
    g.globalAlpha=1;
  }
}
/* 변신 배지: 지금 모습과 같은 배지만 흐리게(점수만) */
const BADGE_ICON={tank:'tank',knight:'ic_knight',copter:'ic_copter',doom:'ic_doom',fly:'ic_fly',bombard:'ic_bombard',skirm:'ic_skirm',rocket:'ic_rocket',bship:'ic_bship'};
function badge(g,S,it,x,y){
  /* 배지는 그 모습이 온 세계의 그림이다: 전차=동현전 전차, 기사=동현워 투구·방패, 헬기=동현콥 꼬리콥터, 둠=동현둠 철모·산탄총, 초파리=동현초 초파리, 사석포=동현워 사석포, 산병=동현워 가죽 모자·투창, 로켓포=동현전 로켓포, 전함=동현전 전함 */
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
  for(const p of S.shots){ const x=p.x-cam;
    if(p.kind==='shell') drawSprite(g,'shell',x,p.y,false);
    else if(p.kind==='arrow'){ px(g,x,p.y,8,1,'#f6f2e8'); px(g,p.vx>0?x+6:x,p.y-1,2,3,'#8d919c'); }
    else if(p.kind==='stone'){ px(g,x+1,p.y,3,5,'#7d7a72'); px(g,x,p.y+1,5,3,'#7d7a72'); px(g,x+1,p.y+1,2,1,'#a3a098'); }
    else if(p.kind==='rocket'){ const fl=p.vx>=0; px(g,x,p.y,6,3,'#e5483a'); px(g,fl?x+5:x,p.y+1,1,1,'#f2b705'); px(g,fl?x-3:x+6,p.y+(S.frame&1),3,2,'rgba(255,122,58,.9)'); }
    else if(p.kind==='bomb'){ px(g,x,p.y,4,4,'#231d18'); px(g,x+1,p.y-1,1,1,(S.frame>>1)&1?'#f2b705':'#ff7a3a'); }
    else if(p.kind==='spit'){ px(g,x,p.y,3,2,'#e07be0'); }
    else if(p.kind==='javelin'){ px(g,x,p.y,8,1,'#b07a3e'); px(g,p.vx>0?x+7:x-1,p.y-1,2,3,'#c7c9d1'); }
    else if(p.kind==='shell2'){ px(g,x,p.y,4,4,'#3a3438'); px(g,x+1,p.y+1,1,1,'#9a978c'); }
    else px(g,x,p.y,3,2,'#f2b705'); }
  for(const f of S.fx){ const x=f.x-cam, k=f.t/24;
    if(f.kind==='pop'){ g.strokeStyle='rgba(255,255,255,'+(1-k)+')'; g.lineWidth=2; g.beginPath(); g.arc(x,f.y,4+k*14,0,7); g.stroke(); }
    else if(f.kind==='boom'){ g.strokeStyle='rgba(255,122,58,'+(1-k)+')'; g.lineWidth=3; g.beginPath(); g.arc(x,f.y,3+k*16,0,7); g.stroke(); g.fillStyle='rgba(242,183,5,'+(0.6-k*0.6)+')'; g.beginPath(); g.arc(x,f.y,2+k*9,0,7); g.fill(); }
    else if(f.kind==='spark'){ for(let i=0;i<4;i++) px(g,x+Math.cos(i*1.57)*k*12,f.y-k*10+Math.sin(i*1.57)*k*6,2,2,'#f2b705'); }
    else { px(g,x-4+k*2,f.y-2-k*6,8-k*4,4,'rgba(255,255,255,'+(0.7-k*0.7)+')'); } }
}
function hud(g,S){
  const h=S.hero, f=root.Engine.form(S);
  g.fillStyle='#2f4147'; g.fillRect(0,0,VW,14);px(g,0,13,VW,1,'#92a39a');
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
/* 출전 전 미리보기: 스테이지 첫 화면에 포동이를 세우고, 코드가 정한 설정을 카드로 띄운다(예제를 바꾸면 바로 바뀐다) */
function preview(g,S,pv){ draw(g,S); if(!pv) return;
  const w=VW-24, h=46, x=12, y=18;
  g.fillStyle='rgba(20,18,30,.72)'; g.fillRect(x,y,w,h); px(g,x,y,w,2,pv.color||'#f6ecd6');
  g.textBaseline='top'; g.textAlign='left';
  g.font='bold 8px Pretendard, sans-serif'; g.fillStyle='#ffe9a8'; g.fillText('미리보기 · '+pv.title,x+8,y+6);
  g.font='8px Pretendard, sans-serif'; g.fillStyle='#fff'; g.fillText(pv.lives,x+8,y+18); g.fillText(pv.form,x+8,y+30);
  if(pv.icon){ try{ const c=SP.make(pv.icon,false); const s=Math.min(2,Math.floor((h-12)/c.height)); g.drawImage(c,x+w-8-c.width*s,y+Math.round((h-c.height*s)/2),c.width*s,c.height*s); }catch(e){} }
}
root.Render={draw,preview,VW,VH,BADGE_ICON};
})(window);
