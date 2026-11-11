(key) => {
  const c=document.createElement('canvas'), g=c.getContext('2d'), shots=[], failures=[];
  c.width=key==='cr'||key==='mon'?320:Engine.W;
  c.height=key==='cr'||key==='mon'?192:Engine.H;
  const stable=s=>JSON.stringify(s,(k,v)=>k==='cam'?undefined:v);
  const shot=(name,s)=>{
    s.msgT=0;s.frame=120;
    const before=stable(s);
    const draw=()=>key==='cr'||key==='mon'?Render.draw(g,s):Render.render(g,s,120);
    draw();const a=c.toDataURL();draw();
    if(a!==c.toDataURL())failures.push(name+': repeated image differs');
    if(before!==stable(s))failures.push(name+': state mutated');
    shots.push({name,image:a});
  };
  if(key==='cr'){
    for(let stage=1;stage<=3;stage++){
      const base=Engine.newGame({stage,lives:3,seed:42});
      for(let z=0;z<base.zones.length;z++){
        const s=Engine.newGame({stage,lives:3,seed:42});
        s.camX=Math.max(0,s.zones[z].x*16);s.hero.x=s.camX+56;
        s.hero.y=Engine.groundY(s,Math.floor(s.hero.x/16))-16;
        shot(`stage-${stage}-zone-${z}`,s);
      }
    }
  }else if(key==='mon'){
    for(const [id,m] of Object.entries(DATA.MAPS)){
      const s=Engine.newGame({startMap:1,seed:42});
      s.map=id;s.hero.x=Math.floor(m.grid[0].length/2)*16;
      s.hero.y=Math.floor(m.grid.length/2)*16;
      s.hero.tx=s.hero.x/16;s.hero.ty=s.hero.y/16;
      shot('map-'+id,s);
    }
    const s=Engine.newGame({startMap:1,seed:42});
    Engine.startBattle(s,{kind:'wild',foes:[Engine.makeMon('lion',5)]});
    s.battle.phase='menu';s.battle.text='포동이는 무엇을 할까?';
    shot('battle',s);
  }else if(key==='q'){
    for(let mode=1;mode<=5;mode++){
      const s=Engine.newGame({mode,level:5,lives:3,seed:42});
      for(let y=0;y<Engine.GH;y++)for(let x=0;x<Engine.GW;x++){
        if(x<14)s.cells[y*Engine.GW+x]=1;
        else if(y>37)s.cells[y*Engine.GW+x]=2;
      }
      s.pct=42.3;s.player={x:14,y:28};
      shot('mode-'+mode,s);
    }
  }else{
    for(const stage of [1,10,20])for(let shape=0;shape<3;shape++){
      const s=Engine.newGame({speed:1,stage,seed:42});
      s.phase='fall';if(s.piece){s.piece.shape=shape;s.piece.y=2;}
      shot(`stage-${stage}-shape-${shape}`,s);
    }
  }
  const faces={};
  if(key==='cr'||key==='mon'){
    for(const name of (key==='cr'?['P_idle','P_run1','P_run2','P_jump','P_attack','P_hurt']:Object.keys(Sprites.SPR).filter(n=>!n.startsWith('t_'))))
      faces[name]=Sprites.make(name,false).toDataURL();
  }else if(key==='doc'){
    faces.podong=JSON.stringify([Sprites.PODONG_ROWS,Sprites.PODONG_PAL]);
    faces.virusShapes=JSON.stringify(Sprites.VIRUS);
  }
  return {key,shots,faces,failures};
}
