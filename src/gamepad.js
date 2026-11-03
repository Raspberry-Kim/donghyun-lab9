/* 게임패드 — 블루투스·USB 패드를 브라우저 Gamepad API로 읽는다(동현랭 시리즈 공통).
   기준은 닌텐도 배치다. 다이아몬드 네 단추를 '자리'로 키보드와 짝 맞춘다: 오른쪽(A)=X키, 아래(B)=Z키, 위(X)=S키, 왼쪽(Y)=A키.
   브라우저의 표준 배치(mapping "standard")는 자리 기준이다: 0 아래, 1 오른쪽, 2 왼쪽, 3 위, 4 L, 5 R, 8 −, 9 +, 12~15 십자, 왼 스틱은 축 0·1.
   그래서 닌텐도·8BitDo(닌텐도 배열) 패드는 아무 설정 없이 A=X키·B=Z키가 된다.
   드물게 OS·브라우저가 네 단추를 자리 대신 글자 순서(A=0, B=1, X=2, Y=3)로 뒤집어 보고하면 A와 B, X와 Y가 서로 바뀌어 들어온다.
   그때는 −(Select)를 한 번 눌러 바꾼다(다시 누르면 원래대로). 선택은 패드 이름별로 브라우저에 남는다. 첫 누름을 삼키거나 자동으로 맞추는 일은 없다.
   게임 쪽은 start({down(k), up(k), status(t), hint, repeat})로 붙는다. k는 키보드와 같은 이름(x·z·s·a·up·down·left·right·enter·shift)이다. */
var GP=(function(){
  var POS={0:'z',1:'x',2:'a',3:'s'}, SWAPPED={0:'x',1:'z',2:'s',3:'a'}, OTHER={4:'shift',9:'enter',12:'up',13:'down',14:'left',15:'right'};
  var DIR={up:1,down:1,left:1,right:1}, KEY='dh-gamepad-swap';
  var cb=null, held={}, timers={}, repeat=false, seen=false, raf=0, lastSel=false, swap={};
  try{ swap=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ swap={}; }
  try{ localStorage.removeItem('dh-gamepad-right'); }catch(e){} // 이전 판의 첫 누름 자동 맞춤 기록은 버린다
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(swap)); }catch(e){} }
  function name(p){ return ((p&&p.id)||'게임패드').replace(/\s*\(.*$/,'').slice(0,40); }
  function diamond(p){ return swap[p.id]?SWAPPED:POS; }
  function press(k){ if(held[k]) return; held[k]=true; cb.down(k);
    if(repeat&&DIR[k]){ timers[k]=setTimeout(function rp(){ if(!held[k]) return; cb.down(k); timers[k]=setTimeout(rp,90); },280); } }
  function release(k){ if(!held[k]) return; held[k]=false; clearTimeout(timers[k]); if(cb.up) cb.up(k); }
  function pads(){ var g=[]; try{ g=navigator.getGamepads?navigator.getGamepads():[]; }catch(e){} var out=[]; for(var i=0;i<g.length;i++) if(g[i]&&g[i].connected!==false) out.push(g[i]); return out; }
  function say(p){ if(!cb.status) return; cb.status('게임패드 연결됨 · '+name(p)+' · A=X키 · B=Z키'+(swap[p.id]?'(바꿈)':'')+(cb.hint?' · '+cb.hint:'')+' · A·B가 거꾸로면 −'); }
  function poll(){ raf=requestAnimationFrame(poll); var ps=pads();
    if(!ps.length){ if(seen){ seen=false; for(var h in held) release(h); } return; }
    if(!seen){ seen=true; say(ps[0]); }
    var want={}, sel=false, selPad=null;
    ps.forEach(function(p){
      var D=diamond(p);
      for(var i=0;i<p.buttons.length;i++){ var b=p.buttons[i]; if(!(b&&(b.pressed||b.value>0.5))) continue;
        if(i===8){ sel=true; selPad=p; continue; }
        var k=i<=3?D[i]:OTHER[i]; if(k) want[k]=true; }
      var ax=p.axes[0]||0, ay=p.axes[1]||0; if(ax<-0.5) want.left=true; if(ax>0.5) want.right=true; if(ay<-0.5) want.up=true; if(ay>0.5) want.down=true; });
    if(sel&&!lastSel&&selPad){ swap[selPad.id]=!swap[selPad.id]; save(); for(var h2 in held) release(h2); want={};
      if(cb.status) cb.status('게임패드 단추 자리 '+(swap[selPad.id]?'바꿈':'원래대로')+' · A=X키 · B=Z키'+(cb.hint?' · '+cb.hint:'')+' · −로 되돌린다'); }
    lastSel=sel;
    for(var k3 in want) if(!held[k3]) press(k3);
    for(var k4 in held) if(held[k4]&&!want[k4]) release(k4);
  }
  return {
    start:function(o){ cb=o; repeat=!!o.repeat; if(!navigator.getGamepads) return false;
      window.addEventListener('gamepadconnected',function(e){ if(!seen){ seen=true; say(e.gamepad); } });
      window.addEventListener('gamepaddisconnected',function(){ if(cb.status) cb.status('게임패드 연결 끊김'); });
      if(!raf) poll(); return true; },
    swapped:function(id){ return !!swap[id]; }
  };
})();
