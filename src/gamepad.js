/* 게임패드 — 블루투스·USB 패드를 브라우저 Gamepad API로 읽는다(동현랭 시리즈 공통).
   닌텐도 배치 기준으로 키보드와 짝을 맞춘다: A(오른쪽)=X키, B(아래)=Z키, X(위)=S키, Y(왼쪽)=A키.
   표준 배치 번호: 0 아래, 1 오른쪽, 2 왼쪽, 3 위, 4 L, 5 R, 6 ZL, 7 ZR, 8 −, 9 +, 12~15 십자. 왼 스틱은 축 0·1.
   일부 브라우저는 A·B를 자리 대신 글자로 뒤집어 보고하므로 −(Select)를 누르면 A·B를 맞바꾸고 브라우저에 기억한다.
   게임 쪽은 start({down(k), up(k), status(t), hint, repeat})로 붙는다. k는 키보드와 같은 이름(x·z·s·a·up·down·left·right·enter·shift)이다. */
var GP=(function(){
  var BTN={0:'z',1:'x',2:'a',3:'s',4:'shift',9:'enter',12:'up',13:'down',14:'left',15:'right'};
  var DIR={up:1,down:1,left:1,right:1};
  var cb=null, held={}, timers={}, repeat=false, swap=false, seen=false, raf=0, lastSel=false;
  try{ swap=localStorage.getItem('dh-gamepad-swap')==='1'; }catch(e){}
  function tok(i){ var k=BTN[i]; if(swap&&(k==='x'||k==='z')) k=(k==='x')?'z':'x'; return k||null; }
  function press(k){ if(held[k]) return; held[k]=true; cb.down(k);
    if(repeat&&DIR[k]){ timers[k]=setTimeout(function rp(){ if(!held[k]) return; cb.down(k); timers[k]=setTimeout(rp,90); },280); } }
  function release(k){ if(!held[k]) return; held[k]=false; clearTimeout(timers[k]); if(cb.up) cb.up(k); }
  function pads(){ var g=[]; try{ g=navigator.getGamepads?navigator.getGamepads():[]; }catch(e){} var out=[]; for(var i=0;i<g.length;i++) if(g[i]&&g[i].connected!==false) out.push(g[i]); return out; }
  function say(p){ var id=((p&&p.id)||'게임패드').replace(/\s*\(.*$/,'').slice(0,40); if(cb.status) cb.status('게임패드 연결됨 · '+id+(cb.hint?' · '+cb.hint:'')); }
  function poll(){ raf=requestAnimationFrame(poll); var ps=pads();
    if(!ps.length){ if(seen){ seen=false; for(var h in held) release(h); } return; }
    if(!seen){ seen=true; say(ps[0]); }
    var want={}, sel=false;
    ps.forEach(function(p){
      for(var i=0;i<p.buttons.length;i++){ var b=p.buttons[i]; if(!(b&&(b.pressed||b.value>0.5))) continue; if(i===8){ sel=true; continue; } var k=tok(i); if(k) want[k]=true; }
      var ax=p.axes[0]||0, ay=p.axes[1]||0; if(ax<-0.5) want.left=true; if(ax>0.5) want.right=true; if(ay<-0.5) want.up=true; if(ay>0.5) want.down=true; });
    if(sel&&!lastSel){ swap=!swap; try{ localStorage.setItem('dh-gamepad-swap',swap?'1':'0'); }catch(e){} if(cb.status) cb.status(swap?'게임패드 A·B 맞바꿈(−로 되돌린다)':'게임패드 A·B 원래대로'); }
    lastSel=sel;
    for(var k in want) if(!held[k]) press(k);
    for(var k2 in held) if(held[k2]&&!want[k2]) release(k2);
  }
  return {
    start:function(o){ cb=o; repeat=!!o.repeat; if(!navigator.getGamepads) return false;
      window.addEventListener('gamepadconnected',function(e){ if(!seen){ seen=true; say(e.gamepad); } });
      window.addEventListener('gamepaddisconnected',function(){ if(cb.status) cb.status('게임패드 연결 끊김'); });
      if(!raf) poll(); return true; },
    swapped:function(){ return swap; }
  };
})();
