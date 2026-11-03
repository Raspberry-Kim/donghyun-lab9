/* 동현크 앱: 동현랭 편집기 → 출전 규약(목숨·변신·스테이지) → 키보드 플랫폼 액션. 동현전·동현워와 같은 키 배치. */
(function(){
const HINT0='<span><kbd>X</kbd>점프</span><span><kbd>Z</kbd>공격</span><span><kbd>A</kbd>설명</span><span><kbd>↵</kbd>메뉴</span>';
const $=s=>document.querySelector(s), E=window.Engine, R=window.Render, {FORMS,ENEMIES,STAGES}=window.DATA;
const canvas=$('#board'), g=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- 화면 전환·소리·탭 ---------- */
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',String(dark));};
const SND=DHSFX('donghyuncr:sound');
function sndUI(){ const b=$('#sound'); b.setAttribute('aria-pressed',String(SND.on)); b.classList.toggle('muted',!SND.on); b.title=SND.on?'효과음 끄기 (M)':'효과음 켜기 (M)'; }
$('#sound').onclick=()=>{ SND.set(!SND.on); sndUI(); }; sndUI();
document.addEventListener('keydown',e=>{ if(e.code!=='KeyM'||e.metaKey||e.ctrlKey||e.altKey) return; const el=document.activeElement; if(el&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT'||el.tagName==='SELECT')) return; SND.set(!SND.on); sndUI(); });
let tab='play';
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  tab=b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x=>{const on=x.dataset.tab===tab;x.classList.toggle('active',on);on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current');});
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+tab);
  if(tab==='play') fit();
});
$('.brand').onclick=e=>{e.preventDefault();document.querySelector('[data-tab=play]').click();scrollTo({top:0,behavior:'smooth'});};

/* ---------- 규칙 탭 표 ---------- */
$('#form-grid').innerHTML=FORMS.map(f=>`<article><h4>${f.id} · ${f.name}<small>${f.from}</small></h4><p>${f.desc}</p><p class="stat">체력 ${f.hp} · 속도 ${Math.round(f.speed*100)}% · 점프 ${Math.round(f.jump*100)}%</p></article>`).join('');
$('#enemy-table').innerHTML='<thead><tr><th>적</th><th>출신</th><th>밟기</th><th>맞을 횟수</th><th>습성</th></tr></thead><tbody>'+Object.values(ENEMIES).map(d=>`<tr><td>${d.name}</td><td>${d.from}</td><td>${d.stomp?'된다':'안 된다'}</td><td>${d.hits}</td><td>${d.desc}</td></tr>`).join('')+'</tbody>';

/* ---------- 동현랭 편집기(동현랭 시리즈와 같은 모양) ---------- */
for(const ex of examples){const o=document.createElement('option');o.value=ex.id;o.textContent=ex.title;$('#example').append(o);}
const DH_TOKEN=/(ㅋㅋ.*$)|(나는 동현이냐\?|동현이구나)|(오겡끼데스까)|(신중동역|신중동|뭉치)|(뿡뿡뿡|뿡뿡|포동이)|(꽥꽥)|(동+현아)|(동+현)|(도오*옹)|(ㅠ+)|(뚱띠|또치)/g;
const DH_CLS=[null,'t-cmt','t-frame','t-halt','t-ctl','t-out','t-in','t-assign','t-var','t-num','t-minus','t-op'];
function dhLine(line){let html='',last=0;line.replace(DH_TOKEN,(m,...gr)=>{const idx=gr[gr.length-2];html+=esc(line.slice(last,idx));const k=gr.slice(0,11).findIndex(x=>x!==undefined)+1;html+=`<span class="${DH_CLS[k]}">${esc(m)}</span>`;last=idx+m.length;return m;});return html+esc(line.slice(last));}
const code=$('#code'), area=document.createElement('div'), hl=document.createElement('div');
area.className='code-area'; hl.id='hl'; hl.setAttribute('aria-hidden','true'); code.parentNode.insertBefore(area,code); area.append(hl,code);
function hlSync(){hl.scrollTop=code.scrollTop;hl.scrollLeft=code.scrollLeft;}
function hlMetrics(){const cs=getComputedStyle(code);for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','fontFamily','fontSize','lineHeight','tabSize','letterSpacing'])hl.style[p]=cs[p];}
function highlight(){hlMetrics();hl.innerHTML=code.value.split('\n').map(l=>`<span class="ln">${dhLine(l)||' '}</span>`).join('')+'<span class="ln"> </span>';hlSync();}
code.addEventListener('scroll',()=>{hlSync();$('#lines').scrollTop=code.scrollTop;});addEventListener('resize',()=>{highlight();fit();});
function indent(){
  const text=code.value,lines=text.split('\n'),lead=l=>l.length-l.replace(/^[ \t]+/,'').length;
  const next=lines.map(l=>{const b=l.slice(lead(l));if(!b)return '';if(b.startsWith('ㅋㅋ'))return '   '+b;const s=b.split('~')[0].replace(/ㅋㅋ.*$/,'').trim();return (s==='나는 동현이냐?'||s==='동현이구나'?'':'  ')+b;});
  const {selectionStart:a,selectionEnd:b,selectionDirection:dir,scrollTop:y,scrollLeft:x}=code;
  const moved=p=>{let o=0,n=0;for(let i=0;i<lines.length;i++){const L=lines[i].length;if(p<=o+L){const c=p-o,ol=lead(lines[i]),nl=lead(next[i]);return n+Math.min(next[i].length,c<ol?nl:c-ol+nl);}o+=L+1;n+=next[i].length+1;}return n;};
  const value=next.join('\n'),na=moved(a),nb=moved(b);if(value===text&&na===a&&nb===b)return;if(value!==text)code.value=value;code.setSelectionRange(na,nb,dir);code.scrollTop=y;code.scrollLeft=x;
}
function codeChanged(e){if(!e?.isComposing)indent();const n=code.value.split('\n').length;$('#line-count').textContent=n+'줄';$('#lines').textContent=Array.from({length:n},(_,i)=>i+1).join('\n');highlight();autoPreview();}
code.addEventListener('compositionend',()=>codeChanged());
function codeLead(){const a=code.selectionStart,v=code.value,ls=v.lastIndexOf('\n',a-1)+1,le=v.indexOf('\n',ls);return {a,ls,lead:/^[ \t]*/.exec(v.slice(ls,le<0?v.length:le))[0].length};}
document.addEventListener('selectionchange',()=>{if(document.activeElement!==code||code.selectionStart!==code.selectionEnd)return;const {a,ls,lead}=codeLead();if(a-ls<lead)code.setSelectionRange(ls+lead,ls+lead);});
code.addEventListener('beforeinput',e=>{const {a,ls,lead}=codeLead();if(a!==code.selectionEnd)return;if(e.inputType==='deleteContentBackward'&&ls>0&&a>ls&&a-ls<=lead){e.preventDefault();code.setRangeText('',ls-1,a,'end');codeChanged();}});
code.oninput=codeChanged;
code.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();sortie();}});
function selectExample(){const ex=examples.find(e=>e.id===$('#example').value);code.value=ex.code;$('#example-note').textContent=ex.note;codeChanged();}
$('#example').onchange=selectExample;
$('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code.value+'\n'],{type:'text/plain;charset=utf-8'}));a.download='sortie.dh';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#open').onchange=async e=>{const f=e.target.files[0];if(!f)return;code.value=(await f.text()).replace(/\r/g,'').replace(/\n$/,'');codeChanged();e.target.value='';};
$('#run').onclick=()=>sortie();

/* ---------- 출전 규약: 1 목숨 · 2 시작 변신(한 가지) · 3 스테이지 · 6 출전 ---------- */
const DEFAULT={lives:3,forms:[],stage:1};
let cfg={...DEFAULT,forms:[]};
function parseSortie(out){
  const tok=out.split(/\s+/).filter(Boolean).map(Number), c={...DEFAULT,forms:[]}, err=[];
  let go=false;
  const rule={1:['목숨','lives',v=>Number.isInteger(v)&&v>=0&&v<=99,'0(무적)~99'],2:['변신','form',v=>Number.isInteger(v)&&v>=1&&v<=FORMS.length-1,'1~'+(FORMS.length-1)],3:['스테이지','stage',v=>Number.isInteger(v)&&v>=1&&v<=STAGES.length,'1~'+STAGES.length]};
  for(let i=0;i<tok.length;i++){
    const n=tok[i];
    if(go){ err.push(`출전 명령 6 뒤에 ${tok.length-i}개의 정수가 더 나왔다. 6은 마지막에 출력하자.`); break; }
    if(n===6){ go=true; continue; }
    const r=rule[n];
    if(!r){ err.push(`${i+1}번째 정수 ${n}은 출전 명령이 아니다. 명령은 1 목숨 · 2 변신 · 3 스테이지 · 6 출전이다.`); break; }
    if(i+1>=tok.length){ err.push(`명령 ${n}(${r[0]}) 뒤에 값이 없다.`); break; }
    const v=tok[++i];
    if(!r[2](v)){ err.push(`${r[0]} 값 ${v}은 쓸 수 없다. ${r[3]}만 된다.`); break; }
    if(n===2){ if(c.forms.length&&c.forms[0]!==v){ err.push('시작 변신은 한 가지만 고른다. 한 번 변신하면 되돌릴 수 없다.'); break; } c.forms=[v]; }
    else c[r[1]]=v;
  }
  return {c,go,err};
}
const formList=c=>c.forms.length?FORMS[c.forms[0]].name+'(처음부터)':'포동이(배지를 주우면 변신)';
function sortieCard(c){
  $('#sortie-card').innerHTML=[['목숨',c.lives===0?'무적 · 무한':String(c.lives)],['시작 모습',formList(c)],['스테이지',`${c.stage} · ${STAGES[c.stage-1].name} → ${STAGES.length}까지 이어서`],['조작','X 점프 · Z 공격']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('#stamp-forms').innerHTML=`${c.forms.length?FORMS[c.forms[0]].name:'포동이'} <span>시작 모습</span>`;
}
function result(text,kind){ const r=$('#result'); r.textContent=text; r.dataset.kind=kind||''; }
function status(t,kind){ const s=$('#status'); s.textContent=t; s.dataset.kind=kind||''; }
let previewT=0;
function autoPreview(){ clearTimeout(previewT); previewT=setTimeout(()=>{ if(S) return; try{ const r=Donghyun.run(code.value,{maxSteps:300000}); const p=parseSortie(r.output); if(!p.err.length){ cfg=p.c; sortieCard(cfg); preview(cfg); } }catch(e){} },250); }
function sortie(){
  if(S) return;
  let out;
  try{ const r=Donghyun.run(code.value,{maxSteps:300000}); out=r.output; }
  catch(e){ result(`동현랭 오류${e.line?` (${e.line}줄)`:''}: ${e.message}`,'error'); status('동현랭 오류','error'); return; }
  const p=parseSortie(out);
  if(p.err.length){ result('출전 규약 오류: '+p.err[0],'error'); status('출전 규약 오류','error'); return; }
  cfg=p.c; sortieCard(cfg); preview(cfg);
  if(!p.go){ result(`설정을 읽었다(목숨 ${cfg.lives===0?'무적':cfg.lives} · 시작 모습 ${formList(cfg)} · 스테이지 ${cfg.stage}). 출전 명령 6을 마지막에 출력하면 나선다.`); status('설정만 읽음'); return; }
  startGame(cfg);
}

/* ---------- 상태·화면 ---------- */
let S=null, previewS=null, mode='setup', paused=false, menu=null;
const keys={left:false,right:false,jump:false,jumpPressed:false,attack:false,attackPressed:false,swap:false};
function preview(c){ previewS=E.newGame({stage:c.stage,lives:c.lives,forms:c.forms,seed:1}); previewS.hero.inv=0; $('#day').textContent=`스테이지 ${c.stage} · ${STAGES[c.stage-1].name}`; $('#tile-info').textContent=STAGES[c.stage-1].note; fit(); }
function fit(){
  const st=canvas.parentElement, w=st.clientWidth; if(!w) return;
  const maxH=Math.max(240,innerHeight-230), byH=maxH*canvas.width/canvas.height;
  canvas.style.width=Math.min(w,byH)+'px'; canvas.style.margin='0 auto';
}
let last=0, acc=0; const STEP=1000/60;
function frame(now){
  if(S&&S.status==='play'&&!paused){
    if(!last) last=now; acc=Math.min(acc+(now-last),100); last=now;
    while(acc>=STEP){ E.step(S,keys); keys.jumpPressed=false; keys.attackPressed=false; keys.swap=false; acc-=STEP; events(); }
  } else { last=now; acc=0; }
  if(S&&S.status!=='play'&&$('#result-card').hidden){ if(mode==='over') resultCard(S.status==='win'); else if(mode==='clear') clearCard(); }
  const s=S||previewS;
  if(s){ R.draw(g,s); if(S&&paused&&menu) drawPauseDim(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function drawPauseDim(){ g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,canvas.width,canvas.height); }

/* ---------- 사건 → 소리·기록 ---------- */
const SNDMAP={jump:'jump',jump2:'jump2',stomp:'stomp',bone:'bone',heart:'heartup',hurt:'hurt',die:'die',swap:'swap',ping:'ping',zone:'zone',cannon:'cannon',punch:'swish',win:'win',over:'lose',respawn:'pop'};
function events(){
  for(const ev of S.events){
    if(ev.t==='atk'){ SND.play(ev.kind==='shell'?'shot':ev.kind==='shotgun'?'shotgun':ev.kind==='charge'?'charge':'paw'); }
    else if(ev.t==='hit'){ SND.play(ev.how==='stomp'?'stomp':'thud'); }
    else if(ev.t==='kill'){ SND.play('pop'); log(`${ENEMIES[ev.type].name}을(를) 쓰러뜨렸다.`); }
    else if(ev.t==='horse'){ SND.move('horse',0.6); }
    else if(ev.t==='boss'){ SND.play('zone'); log(`${ENEMIES.neo.name}(${ENEMIES.neo.from}) 등장. 열두 번 쳐야 부서진다. 싸움터 왼쪽으로는 돌아갈 수 없다.`); }
    else if(ev.t==='bosskill'){ log('신형전차를 부쉈다. 깃발이 섰다.'); }
    else if(SNDMAP[ev.t]) SND.play(SNDMAP[ev.t]);
    if(ev.t==='hurt') log(`${hurtBy(ev.by)}에 맞았다. 체력 ${S.hero.hp}.`);
    if(ev.t==='die'){ log(ev.by==='fall'?'구덩이에 빠졌다.':`${hurtBy(ev.by)}에 쓰러졌다.`); }
    if(ev.t==='respawn') log(`다시 시작. 남은 목숨 ${S.lives===Infinity?'∞':S.lives}.`);
    if(ev.t==='zone') log(S.msg);
    if(ev.t==='swap') log(`${ev.form.name}(${ev.form.from})으로 변신. 되돌릴 수 없다.`);
    if(ev.t==='win'){ if(S.stage<STAGES.length) stageClear(); else finish(true); }
    if(ev.t==='over') finish(false);
  }
  S.events.length=0; hud();
}
const hurtBy=b=>({spike:'가시',punch:'슈슈의 글러브',shell:'포탄',lion:'라이언',shushu:'슈슈',inf:'보병',tank:'전차',pike:'창병',knight:'기사',neo:'신형전차'})[b]||b;
function log(html){ const li=document.createElement('li'); li.innerHTML=esc(html); const l=$('#log'); l.prepend(li); while(l.children.length>40) l.lastChild.remove(); }
function hud(){
  const h=S.hero, f=E.form(S);
  $('#form-card').innerHTML=`<div class="form-now" style="--fc:${f.color}"><b>${f.name}</b><small>${f.from}</small><p>${f.desc}</p></div><div class="form-list"><small>${S.formI>0?'변신은 한 번뿐 · 되돌릴 수 없다. 남은 배지는 300점.':'변신 배지(전·기·헬·둠·초)를 주우면 그 모습으로 끝까지 간다. 한 번뿐이니 골라서 줍자.'}</small></div>`;
  $('#info-card').innerHTML=[['스테이지',`${S.stage} / ${STAGES.length}`],['체력',`${h.hp} / ${h.maxhp}`],['목숨',S.lives===Infinity?'무적 · 무한':String(S.lives)],['뼈다귀',String(S.bones)],['점수',S.score.toLocaleString('ko-KR')],['시간',Math.floor(S.time/60)+'초']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('#turn-badge').textContent=zoneName(); $('#turn-badge').className='';
}
function zoneName(){ let z=S.zones[0]; for(const q of S.zones) if(S.hero.x>=q.x*16) z=q; return `${z.name} · 목숨 ${S.lives===Infinity?'∞':S.lives}`; }

/* ---------- 시작·종료 ---------- */
function liveUI(){ $('#setup-panel').hidden=true; $('#hud').hidden=false; $('#board-wrap').classList.add('live'); $('#touchpad').classList.add('on'); fit(); $('#board-wrap').focus({preventScroll:true}); }
function startGame(c){
  S=E.newGame({stage:c.stage,lives:c.lives,forms:c.forms}); mode='play'; paused=false; closeMenu(); $('#result-card').hidden=true;
  liveUI(); $('#board-wrap').scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'});
  $('#log').innerHTML=''; log(`스테이지 ${c.stage} · ${STAGES[c.stage-1].name} · 출전. 목숨 ${c.lives===0?'무적':c.lives}.${c.forms.length?` 처음부터 ${FORMS[c.forms[0]].name}.`:''}`);
  $('#day').textContent=`스테이지 ${c.stage} · ${STAGES[c.stage-1].name}`; $('#tile-info').textContent=STAGES[c.stage-1].note;
  $('#hint').innerHTML=HINT0; status('진행 중'); hud();
}
/* 스테이지를 깨면 다음 스테이지로 이어 간다: 점수와 변신한 모습은 그대로, 목숨은 출전 설정값으로 다시 채운다 */
function stageClear(){
  mode='clear'; status('스테이지 '+S.stage+' 클리어'); keys.left=keys.right=keys.jump=keys.attack=false;
  log(`스테이지 ${S.stage} 클리어. 점수 ${S.score.toLocaleString('ko-KR')}. 다음은 스테이지 ${S.stage+1} · ${STAGES[S.stage].name}.`);
  $('#hint').innerHTML='<span><kbd>X</kbd><kbd>↵</kbd>다음 스테이지로</span>';
}
function clearCard(){
  const bones=S.items.filter(i=>i.type==='bone').length, next=STAGES[S.stage];
  $('#result-card').innerHTML=`<div><h3 class="win">스테이지 ${S.stage} 클리어</h3><div class="rc-grid"><div><span>점수</span><strong>${S.score.toLocaleString('ko-KR')}</strong></div><div><span>뼈다귀</span><strong>${S.bones} / ${bones}</strong></div><div><span>시간</span><strong>${Math.floor(S.time/60)}초</strong></div><div><span>모습</span><strong>${E.form(S).name}</strong></div></div><p>다음은 스테이지 ${next.id} · ${next.name}. 점수와 모습은 그대로, 목숨은 ${cfg.lives===0?'무적':cfg.lives}으로 다시 채운다. X 또는 Enter.</p><button id="rc-next">다음 스테이지로</button></div>`; $('#rc-next').onclick=nextStage;
  $('#result-card').hidden=false;
}
function nextStage(){
  if(!S||mode!=='clear') return;
  const carry={score:S.score,formId:S.formI>0?S.forms[S.formI]:0}, stage=S.stage+1;
  S=E.newGame({stage,lives:cfg.lives,forms:[],carry}); mode='play'; paused=false; closeMenu(); $('#result-card').hidden=true; last=0;
  log(`스테이지 ${stage} · ${STAGES[stage-1].name} · 출발. 목숨 ${cfg.lives===0?'무적':cfg.lives}${carry.formId?` · ${FORMS[carry.formId].name} 그대로`:''}.`);
  $('#day').textContent=`스테이지 ${stage} · ${STAGES[stage-1].name}`; $('#tile-info').textContent=STAGES[stage-1].note;
  $('#hint').innerHTML=HINT0; status('진행 중'); hud(); $('#board-wrap').focus({preventScroll:true});
}
function backToSetup(){
  S=null; mode='setup'; paused=false; closeMenu(); $('#result-card').hidden=true;
  $('#setup-panel').hidden=false; $('#hud').hidden=true; $('#board-wrap').classList.remove('live'); $('#touchpad').classList.remove('on');
  preview(cfg); status('출전 준비'); result('다시 나서려면 코드를 고치거나 그대로 출전을 누르자.'); $('#hint').innerHTML=HINT0; renderSlotList();
}
function finish(win){
  mode='over'; status(win?'모든 스테이지 완료':'모든 목숨을 잃음',win?'':'error'); keys.left=keys.right=keys.jump=keys.attack=false;
  log(win?`마지막 깃발 도착. 스테이지 ${STAGES.length}까지 모두 깼다. 점수 ${S.score.toLocaleString('ko-KR')}.`:'모든 목숨을 잃었다.'); $('#hint').innerHTML='<span><kbd>X</kbd><kbd>↵</kbd>출전 준비로</span>';
}
function resultCard(win){
  const bones=S.items.filter(i=>i.type==='bone').length;
  $('#result-card').innerHTML=`<div><h3 class="${win?'win':'lose'}">${win?'모든 스테이지를 깼다':'다시 해 보자'}</h3><div class="rc-grid"><div><span>점수</span><strong>${S.score.toLocaleString('ko-KR')}</strong></div><div><span>뼈다귀</span><strong>${S.bones} / ${bones}</strong></div><div><span>시간</span><strong>${Math.floor(S.time/60)}초</strong></div><div><span>남은 목숨</span><strong>${S.lives===Infinity?'∞':S.lives}</strong></div></div><p>X 또는 Enter로 출전 준비로 돌아간다.</p><button id="rc-back">출전 준비로</button></div>`; $('#rc-back').onclick=backToSetup;
  $('#result-card').hidden=false;
}
$('#concede').onclick=()=>{ if(!S||mode==='over') return; confirmMenu('포기하고 출전 준비로 돌아갈까?',[['포기한다',backToSetup],['계속 간다',()=>{}]]); };

/* ---------- 메뉴(일시정지): 항목 {label,note,off,fn}, 뒤로 가기 onCancel ---------- */
function openMenu(title,items,onCancel){ paused=true; menu={title,items:items.map(it=>Array.isArray(it)?{label:it[0],fn:it[1]}:it),onCancel}; menu.i=Math.max(0,menu.items.findIndex(it=>!it.off)); drawMenu(); keys.left=keys.right=keys.jump=keys.attack=false; }
function drawMenu(){ const m=$('#menu'); if(!menu){ m.hidden=true; return; } m.hidden=false; m.className='game-menu center'; m.innerHTML=(menu.title?`<h4>${esc(menu.title)}</h4>`:'')+menu.items.map((it,i)=>`<div class="mi ${i===menu.i?'sel':''} ${it.off?'off':''}" role="menuitem" data-i="${i}"><span>${esc(it.label)}</span>${it.note?`<small>${esc(it.note)}</small>`:''}</div>`).join(''); m.querySelectorAll('.mi').forEach(el=>el.onclick=()=>{menu.i=+el.dataset.i;pick();}); m.querySelector('.sel')?.scrollIntoView({block:'nearest'}); }
function closeMenu(){ menu=null; $('#menu').hidden=true; paused=false; last=0; }
function cancelMenu(){ const c=menu&&menu.onCancel; closeMenu(); if(c) c(); }
function pick(){ const it=menu.items[menu.i]; if(!it||it.off) return; closeMenu(); it.fn(); }
function confirmMenu(q,opts,back){ openMenu(q,opts.map(([label,fn])=>({label,fn})),back); }
function mainMenu(){ openMenu('잠시 멈춤',[['계속 간다',()=>{}],['변신 설명',()=>{ const f=E.form(S); openMenu(`${f.name} · ${f.from}: ${f.desc}`,[['닫기',()=>{}]],mainMenu); }],['저장',saveMenu],['불러오기',loadMenu],['포기하고 출전 준비로',()=>confirmMenu('포기하고 출전 준비로 돌아갈까?',[['포기한다',backToSetup],['계속 간다',()=>{}]],mainMenu)]]); }

/* ---------- 저장·불러오기: 동현전·동현워와 같은 브라우저 칸 3개 + .dhsave 파일 ---------- */
const SAVE_FORMAT='donghyuncr-save', SAVE_VERSION=1, SLOT_KEY=n=>'donghyuncr:slot'+n, SLOTS=3;
function snapshot(){
  const state=JSON.parse(JSON.stringify(S,(k,v)=>k==='events'?[]:(v===Infinity?'inf':v)));
  const logs=[...$('#log').children].reverse().map(li=>li.textContent);
  const z=zoneName().split(' · ')[0];
  return {format:SAVE_FORMAT,version:SAVE_VERSION,savedAt:new Date().toISOString(),summary:{stage:S.stage,stageName:STAGES[S.stage-1].name,zone:z,lives:S.lives===Infinity?'∞':S.lives,score:S.score,form:E.form(S).name},state,logs};
}
function restore(data){
  if(!data||data.format!==SAVE_FORMAT) throw new Error('동현크 저장 파일이 아니다.');
  if(data.version!==SAVE_VERSION) throw new Error('지원하지 않는 저장 형식 버전이다('+data.version+').');
  const st=data.state, def=STAGES[(st?.stage|0)-1];
  if(!def||st.W!==def.W||!Array.isArray(st.grid)||st.grid.length!==E.ROWS||st.grid.some(r=>!Array.isArray(r)||r.length!==def.W)) throw new Error('스테이지 정보가 맞지 않는다.');
  if(!Array.isArray(st.forms)||!st.forms.length||st.forms.some(f=>!FORMS[f])||!(st.formI>=0&&st.formI<st.forms.length)) throw new Error('변신 정보가 맞지 않는다.');
  if(!Array.isArray(st.enemies)||st.enemies.some(e=>!ENEMIES[e.type])) throw new Error('적 정보가 맞지 않는다.');
  if(st.lives==='inf') st.lives=Infinity; else if(!(Number.isInteger(st.lives)&&st.lives>=1&&st.lives<=99)) throw new Error('목숨 정보가 맞지 않는다.');
  if(!st.hero||!(st.hero.x>=0&&st.hero.x<=def.W*16)) throw new Error('포동이 위치가 맞지 않는다.');
  if(st.status!=='play') throw new Error('이미 끝난 판이다.');
  st.events=[]; st.shots=st.shots||[]; st.fx=st.fx||[]; st.msgT=0; st.rng=Math.random; st.def=def; st.arena=def.arena||null; st.boss=st.enemies.find(e=>e.boss)||null; st.bossOn=!!st.bossOn&&!!(st.boss&&st.boss.alive);
  closeMenu(); $('#result-card').hidden=true;
  S=st; mode='play'; cfg={lives:S.lives===Infinity?0:S.lives,forms:S.forms.slice(1),stage:S.stage};
  liveUI(); $('#day').textContent=`스테이지 ${S.stage} · ${STAGES[S.stage-1].name}`;
  const l=$('#log'); l.innerHTML=''; for(const t of (data.logs||[]).slice(-39)) log(String(t).replace(/<[^>]*>/g,''));
  log('저장한 판을 불러왔다.'); $('#hint').innerHTML=HINT0; status('진행 중'); hud();
}
function readSlot(n){ try{ const t=localStorage.getItem(SLOT_KEY(n)); return t?JSON.parse(t):null; }catch(e){ return null; } }
function slotNote(d){ if(!d) return '비어 있음'; const t=new Date(d.savedAt); const pad=v=>String(v).padStart(2,'0'); return `${d.summary.zone} · 목숨 ${d.summary.lives} · ${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`; }
function toast(t){ log(t); status(t); }
function saveToSlot(n){ try{ localStorage.setItem(SLOT_KEY(n),JSON.stringify(snapshot())); toast(`브라우저 칸 ${n}에 저장했다.`); renderSlotList(); } catch(e){ toast('브라우저 저장에 실패했다. 파일로 내려받아 저장하자.'); } }
function deleteSlot(n){ try{ localStorage.removeItem(SLOT_KEY(n)); }catch(e){} renderSlotList(); }
function saveToFile(){ const d=snapshot(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'})); a.download=`donghyuncr-stage${d.summary.stage}-${d.summary.score}.dhsave`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('저장 파일을 내려받았다.'); }
function saveMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),fn:()=>{ if(d) confirmMenu(`칸 ${n}에 덮어쓸까?`,[['덮어쓴다',()=>saveToSlot(n)],['그만둔다',()=>{}]],saveMenu); else saveToSlot(n); }}); }
  items.push({label:'파일로 내려받기',note:'.dhsave',fn:saveToFile});
  items.push({label:'브라우저 칸 지우기',note:'',off:!Array.from({length:SLOTS},(_,i)=>readSlot(i+1)).some(Boolean),fn:deleteMenu});
  openMenu('저장',items,mainMenu);
}
function deleteMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu(`칸 ${n}${n===2?'를':'을'} 지울까? 되돌릴 수 없다.`,[['지운다',()=>{ deleteSlot(n); toast(`브라우저 칸 ${n}${n===2?'를':'을'} 지웠다.`); }],['그만둔다',()=>{}]],deleteMenu)}); }
  openMenu('지울 칸',items,saveMenu);
}
function loadFrom(d){ try{ restore(d); }catch(e){ const msg='불러오기 실패: '+e.message; if(S){ toast(msg); } else { result(msg,'error'); status('불러오기 실패','error'); } } }
function loadMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu('지금 판을 버리고 불러올까?',[['불러온다',()=>loadFrom(readSlot(n))],['그만둔다',()=>{}]],loadMenu)}); }
  items.push({label:'파일에서 불러오기',note:'.dhsave',fn:()=>$('#load-file').click()});
  openMenu('불러오기',items,mainMenu);
}
$('#load-file').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; try{ loadFrom(JSON.parse(await f.text())); }catch(err){ loadFrom(null); } };
$('#load-file-setup').onchange=$('#load-file').onchange;
document.querySelector('.load-head label').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('#load-file-setup').click(); } });
function renderSlotList(){
  const box=$('#slot-list'); box.innerHTML='';
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); const b=document.createElement('button'); b.className='slot-btn'; b.disabled=!d;
    b.innerHTML=`<b>칸 ${n}</b><span>${esc(slotNote(d))}</span>${d?`<small>${esc(d.summary.stageName)} · ${esc(d.summary.form)} · ${Number(d.summary.score).toLocaleString('ko-KR')}점</small>`:''}`;
    b.onclick=()=>loadFrom(readSlot(n));
    const row=document.createElement('div'); row.className='slot-row'; row.append(b);
    if(d){ const x=document.createElement('button'); x.className='slot-del'; x.type='button'; x.textContent='지우기'; x.setAttribute('aria-label',`칸 ${n} 지우기`);
      let t=0; x.onclick=()=>{ if(!x.classList.contains('armed')){ x.classList.add('armed'); x.textContent='정말 지운다'; t=setTimeout(()=>{ x.classList.remove('armed'); x.textContent='지우기'; },4000); return; } clearTimeout(t); deleteSlot(n); status(`브라우저 칸 ${n}${n===2?'를':'을'} 지웠다.`); };
      row.append(x); }
    box.append(row); }
}

/* ---------- 키보드: 동현전·동현워와 같은 배치 ---------- */
const KEYMAP={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyX:'x',KeyZ:'z',KeyS:'s',KeyA:'a',Enter:'enter',NumpadEnter:'enter',Space:'x'};
function keyOf(e){ return KEYMAP[e.code]||({x:'x',z:'z',s:'s',a:'a',X:'x',Z:'z',S:'s',A:'a',Enter:'enter',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key]||null; }
document.addEventListener('keydown',e=>{
  if(!S||tab!=='play') return;
  const el=document.activeElement; if(el&&(el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.tagName==='INPUT')) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const k=keyOf(e); if(!k) return; e.preventDefault(); if(e.repeat&&k!=='left'&&k!=='right') return; keyDown(k);
});
document.addEventListener('keyup',e=>{ const k=keyOf(e); if(!k) return; keyUp(k); });
GP.start({hint:'A 점프 · B 공격 · Y 설명 · + 메뉴',status:t=>status(t),
  down(k){ if(!S||tab!=='play') return; keyDown(k); }, up(k){ if(!S) return; keyUp(k); }});
function keyDown(k){
  if(!S) return;
  if(mode==='over'){ if(k==='x'||k==='enter'||k==='z') backToSetup(); return; }
  if(mode==='clear'){ if(k==='x'||k==='enter') nextStage(); return; }
  if(menu){ if(k==='up'||k==='down'){ const n=menu.items.length; menu.i=(menu.i+(k==='up'?-1:1)+n)%n; drawMenu(); } else if(k==='x'||k==='enter'){ pick(); } else if(k==='z'){ cancelMenu(); } return; }
  if(k==='left') keys.left=true; else if(k==='right') keys.right=true;
  else if(k==='x'||k==='up'){ keys.jump=true; keys.jumpPressed=true; }
  else if(k==='z'){ keys.attack=true; keys.attackPressed=true; }
  else if(k==='a'){ const f=E.form(S); S.msg=`${f.name}: ${f.desc}`; S.msgT=160; }
  else if(k==='enter') mainMenu();
}
function keyUp(k){ if(k==='left') keys.left=false; else if(k==='right') keys.right=false; else if(k==='x'||k==='up') keys.jump=false; else if(k==='z') keys.attack=false; }
document.querySelectorAll('#touchpad [data-key]').forEach(b=>{
  const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',x:'x',z:'z',s:'s',a:'a',Enter:'enter'}[b.dataset.key];
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keyDown(m);});
  const up=e=>{e.preventDefault();keyUp(m);}; b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up); b.addEventListener('lostpointercapture',up);
});
addEventListener('blur',()=>{ keys.left=keys.right=keys.jump=keys.attack=false; });

/* ---------- 시험용 연결 ---------- */
window.render_game_to_text=()=>JSON.stringify(S?{mode,paused,stage:S.stage,status:S.status,lives:S.lives,score:S.score,bones:S.bones,form:E.form(S).key,forms:S.forms,
  hero:{x:Math.round(S.hero.x),y:Math.round(S.hero.y),hp:S.hero.hp,state:S.hero.state,dead:S.hero.dead,win:S.hero.win},cam:Math.round(S.camX),
  enemies:S.enemies.filter(e=>e.alive).map(e=>({t:e.type,x:Math.round(e.x),y:Math.round(e.y),hp:e.hp}))}:{mode:'setup',cfg});
window.__donghyuncr={get state(){return S;},snapshot,restore,readSlot,saveToSlot,keyDown,keyUp,keys,get mode(){return mode;},start:()=>startGame(cfg),nextStage,step:(n=1)=>{for(let i=0;i<n;i++){if(S.status!=='play')break;E.step(S,keys);keys.jumpPressed=false;keys.attackPressed=false;keys.swap=false;events();}}};
selectExample(); sortieCard(cfg); preview(cfg); renderSlotList();
})();
