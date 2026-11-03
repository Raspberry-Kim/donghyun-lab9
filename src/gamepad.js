/* 게임패드 — 블루투스·USB 패드를 브라우저 Gamepad API로 읽는다(동현랭 시리즈 공통).
   기준은 닌텐도 배치다. 다이아몬드 네 단추의 '자리'로 키보드와 짝을 맞춘다: 오른쪽(A)=X키, 아래(B)=Z키, 위(X)=S키, 왼쪽(Y)=A키.
   표준 배치 번호는 0 아래, 1 오른쪽, 2 왼쪽, 3 위, 4 L, 5 R, 6 ZL, 7 ZR, 8 −, 9 +, 12~15 십자, 왼 스틱은 축 0·1이지만,
   브라우저·OS에 따라 닌텐도·8BitDo 패드의 네 단추를 자리 대신 글자(A=0, B=1, X=2, Y=3)로 뒤집어 보고하는 일이 있다.
   그래서 처음 보는 패드는 오른쪽 단추(A)를 한 번 눌러 자리를 맞춘다(그 한 번은 게임에 전하지 않는다). 결과는 패드 이름별로 브라우저에 남고, −(Select)를 누르면 다시 맞춘다.
   게임 쪽은 start({down(k), up(k), status(t), hint, repeat})로 붙는다. k는 키보드와 같은 이름(x·z·s·a·up·down·left·right·enter·shift)이다. */
var GP=(function(){
  var STD={0:'z',1:'x',2:'a',3:'s'}, OTHER={4:'shift',9:'enter',12:'up',13:'down',14:'left',15:'right'};
  var DIR={up:1,down:1,left:1,right:1}, KEY='dh-gamepad-right';
  var cb=null, held={}, timers={}, repeat=false, seen=false, raf=0, lastSel=false, cal={}, need=null, lastNeedId='';
  try{ cal=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ cal={}; }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(cal)); }catch(e){} }
  function name(p){ return ((p&&p.id)||'게임패드').replace(/\s*\(.*$/,'').slice(0,40); }
  /* 패드별 다이아몬드 표: 오른쪽 단추로 보고된 번호 r를 X키로 두고, 표준 표에서 r 자리에 있던 글자를 1번으로 보낸다 */
  function diamond(p){ var r=cal[p.id]; if(r==null||r===1) return STD; if(r===0) return {0:'x',1:'z',2:'s',3:'a'}; var m={0:'z',1:'x',2:'a',3:'s'}; m[1]=STD[r]; m[r]='x'; return m; }
  function press(k){ if(held[k]) return; held[k]=true; cb.down(k);
    if(repeat&&DIR[k]){ timers[k]=setTimeout(function rp(){ if(!held[k]) return; cb.down(k); timers[k]=setTimeout(rp,90); },280); } }
  function release(k){ if(!held[k]) return; held[k]=false; clearTimeout(timers[k]); if(cb.up) cb.up(k); }
  function pads(){ var g=[]; try{ g=navigator.getGamepads?navigator.getGamepads():[]; }catch(e){} var out=[]; for(var i=0;i<g.length;i++) if(g[i]&&g[i].connected!==false) out.push(g[i]); return out; }
  function say(p){ if(!cb.status) return; if(cal[p.id]==null) cb.status('게임패드 연결됨 · '+name(p)+' · 자리를 맞추려고 오른쪽 단추(A)를 한 번 누른다'); else cb.status('게임패드 연결됨 · '+name(p)+(cb.hint?' · '+cb.hint:'')); }
  function poll(){ raf=requestAnimationFrame(poll); var ps=pads();
    if(!ps.length){ if(seen){ seen=false; for(var h in held) release(h); } return; }
    if(!seen){ seen=true; say(ps[0]); lastNeedId=ps[0].id; }
    var want={}, sel=false, selPad=null;
    ps.forEach(function(p){
      var D=diamond(p), fresh=cal[p.id]==null;
      if(fresh&&p.id!==lastNeedId){ lastNeedId=p.id; say(p); }
      for(var i=0;i<p.buttons.length;i++){ var b=p.buttons[i]; if(!(b&&(b.pressed||b.value>0.5))) continue;
        if(i===8){ sel=true; selPad=p; continue; }
        if(i<=3){ if(fresh){ if(need!==p.id+':'+i){ need=p.id+':'+i; cal[p.id]=i; save(); if(cb.status) cb.status('게임패드 자리 맞춤 · 오른쪽 단추=X키'+(cb.hint?' · '+cb.hint:'')+' · −로 다시 맞춘다'); } continue; } if(need===p.id+':'+i) continue; var k=D[i]; if(k) want[k]=true; continue; }
        var k2=OTHER[i]; if(k2) want[k2]=true; }
      var ax=p.axes[0]||0, ay=p.axes[1]||0; if(ax<-0.5) want.left=true; if(ax>0.5) want.right=true; if(ay<-0.5) want.up=true; if(ay>0.5) want.down=true; });
    if(!ps.some(function(p){ return need&&need.indexOf(p.id+':')===0&&p.buttons.some(function(b,i){ return i<=3&&b&&(b.pressed||b.value>0.5); }); })) need=null;
    if(sel&&!lastSel&&selPad){ delete cal[selPad.id]; save(); lastNeedId=''; for(var h2 in held) release(h2); }
    lastSel=sel;
    for(var k3 in want) if(!held[k3]) press(k3);
    for(var k4 in held) if(held[k4]&&!want[k4]) release(k4);
  }
  return {
    start:function(o){ cb=o; repeat=!!o.repeat; if(!navigator.getGamepads) return false;
      window.addEventListener('gamepadconnected',function(e){ if(!seen){ seen=true; say(e.gamepad); } });
      window.addEventListener('gamepaddisconnected',function(){ if(cb.status) cb.status('게임패드 연결 끊김'); });
      if(!raf) poll(); return true; },
    calibrated:function(id){ return cal[id]; }
  };
})();
