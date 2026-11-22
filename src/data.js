/* All data objects are JSON: no executable world content is ever evaluated. */
(function (G) {
  'use strict';
  const GD = G.GlyphDOS;
  const TERRAIN = {
    floor:    {name:'Floor',       glyph:'·', fg:8, bg:0, solid:false},
    wall:     {name:'Wall',        glyph:'█', fg:8, bg:0, solid:true},
    brick:    {name:'Brick',       glyph:'▓', fg:5, bg:0, solid:true},
    metal:    {name:'Metal',       glyph:'▒', fg:7, bg:0, solid:true},
    grass:    {name:'Grass',       glyph:'♣', fg:2, bg:0, solid:false},
    water:    {name:'Water',       glyph:'≈', fg:9, bg:1, solid:true},
    sand:     {name:'Sand',        glyph:'░', fg:14,bg:0, solid:false},
    lava:     {name:'Lava',        glyph:'≈', fg:12,bg:4, solid:false, damage:2},
    door:     {name:'Locked Door', glyph:'╬', fg:14,bg:4, solid:true},
    glass:    {name:'Glass',       glyph:'▫', fg:11,bg:1, solid:true},
    carpet:   {name:'Carpet',      glyph:'▪', fg:5, bg:0, solid:false},
    ice:      {name:'Ice',         glyph:'◇', fg:11,bg:1, solid:false},
    conveyor: {name:'Conveyor',    glyph:'»', fg:10,bg:0, solid:false}
  };
  const OBJECTS = {
    key:       {name:'Key',        glyph:'⚿', fg:14,bg:0},
    gem:       {name:'Gem',        glyph:'♦', fg:13,bg:0},
    health:    {name:'Medkit',     glyph:'✚', fg:10,bg:0},
    ammo:      {name:'Ammo',       glyph:'•', fg:15,bg:0},
    torch:     {name:'Torch',      glyph:'¡', fg:14,bg:0},
    core:      {name:'Power Core', glyph:'◉', fg:11,bg:0},
    npc:       {name:'Robot',      glyph:'☻', fg:10,bg:0},
    sign:      {name:'Sign',       glyph:'¶', fg:14,bg:0},
    switch:    {name:'Switch',     glyph:'◙', fg:9, bg:0},
    enemy:     {name:'Enemy',      glyph:'♠', fg:12,bg:0},
    pushblock: {name:'Push Block', glyph:'■', fg:6, bg:0},
    portal:    {name:'Portal',     glyph:'↕', fg:13,bg:0},
    exit:      {name:'Exit',       glyph:'Ω', fg:14,bg:0}
  };
  GD.TERRAIN = TERRAIN;
  GD.OBJECTS = OBJECTS;
  GD.tile = (kind='floor', changes={}) => {
    const def = TERRAIN[kind] || TERRAIN.floor;
    return {kind: TERRAIN[kind] ? kind : 'floor', glyph:def.glyph, fg:def.fg, bg:def.bg, ...changes};
  };
  GD.object = (kind='npc', x=1, y=1, changes={}) => {
    const def = OBJECTS[kind] || OBJECTS.npc;
    return {id:'obj_'+Math.random().toString(36).slice(2,10), type:OBJECTS[kind]?kind:'npc', x, y,
      glyph:def.glyph, fg:def.fg, bg:def.bg, code:'', text:'', targetBoard:'', targetX:2, targetY:2,
      state:{}, ...changes};
  };
  GD.createBoard = (id='board', name='New Board', width=60, height=25) => {
    width=Math.max(10,Math.min(200,Math.floor(width)));
    height=Math.max(10,Math.min(120,Math.floor(height)));
    const ground = Array.from({length:width*height}, () => GD.tile('floor'));
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      if(x===0||y===0||x===width-1||y===height-1) ground[y*width+x]=GD.tile('wall');
    }
    return {id,name,width,height,ground,overlay:Array(width*height).fill(null),entities:[],spawn:{x:3,y:3}};
  };
  GD.cellAt=(board,x,y)=> x<0||y<0||x>=board.width||y>=board.height ? -1 : y*board.width+x;
  GD.getBoard=(world,id)=>world.boards.find(b=>b.id===id);
  GD.entityAt=(board,x,y)=>board.entities.find(o=>o.x===x&&o.y===y);
  GD.createWorld = () => ({format:'glyphdos-world',version:1,title:'Untitled World',author:'',
    tickMs:180, palette:GD.DEFAULT_PALETTE.slice(), glyphBanks:{default:{}},
    flags:{}, counters:{}, won:false,
    player:{board:'board0',x:3,y:3,hp:100,ammo:12,torches:0,gems:0,keys:0,score:0,inventory:{}},
    boards:[GD.createBoard('board0','Board One')], log:[]});

  function put(board,x,y,kind,changes={}) {
    const i=GD.cellAt(board,x,y); if(i>=0) board.ground[i]=GD.tile(kind,changes);
  }
  function wallLine(board,x1,y1,x2,y2,kind='wall') {
    const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));
    for(let i=0;i<=steps;i++) put(board,Math.round(x1+(x2-x1)*i/Math.max(1,steps)),Math.round(y1+(y2-y1)*i/Math.max(1,steps)),kind);
  }
  function label(board,x,y,text,color=11) {
    [...text].forEach((glyph,i)=> {const idx=GD.cellAt(board,x+i,y);if(idx>=0)board.overlay[idx]={glyph,fg:color,bg:null};});
  }
  function add(board,kind,x,y,changes={}) {board.entities.push(GD.object(kind,x,y,changes));}

  GD.sampleWorld = () => {
    const w=GD.createWorld();
    w.title='THE QUIET TERMINAL'; w.author='GlyphDOS demo';
    w.player={board:'station',x:5,y:5,hp:100,ammo:12,torches:1,gems:0,keys:0,score:0,inventory:{}};
    w.boards=[];
    const b=GD.createBoard('station','01 / Terminal Approach',60,25);
    b.spawn={x:5,y:5};
    for(let y=2;y<23;y++) for(let x=2;x<58;x++) {
      if ((x+y*7)%29===0) put(b,x,y,'metal');
    }
    wallLine(b,28,3,28,21,'brick'); put(b,28,12,'door');
    wallLine(b,3,20,21,20,'metal'); wallLine(b,21,17,21,20,'metal');
    wallLine(b,31,5,55,5,'metal');
    for(let x=34;x<45;x++) put(b,x,18,'water');
    for(let x=34;x<45;x++) put(b,x,19,'water');
    label(b,5,2,'S T A T I O N   A U R O R A',11);
    label(b,34,3,'REACTOR ACCESS →',14);
    label(b,5,22,'PICK UP KEY  ⚿    OPEN DOOR  ╬',10);
    label(b,35,22,'FIND POWER CORE  ◉',13);
    add(b,'key',11,8);
    add(b,'gem',15,6); add(b,'ammo',9,17);
    add(b,'sign',7,12,{text:'The station was evacuated. A key opens the partition. The reactor is east.'});
    add(b,'npc',17,14,{text:'', code:':touch\nsay ACCESS NODE: The reactor core is missing. Get the key, pass through the door, then enter the eastern portal.\nend'});
    add(b,'portal',53,12,{targetBoard:'reactor',targetX:5,targetY:5,text:'Reactor sector'});
    w.boards.push(b);

    const r=GD.createBoard('reactor','02 / Reactor Chamber',60,25); r.spawn={x:5,y:5};
    label(r,5,2,'R E A C T O R   C H A M B E R',11);
    label(r,7,22,'POWER THE SWITCH, RETRIEVE THE CORE, EXIT.',14);
    wallLine(r,20,3,20,18,'metal'); put(r,20,10,'floor');
    wallLine(r,38,6,38,22,'brick'); put(r,38,14,'floor');
    for(let y=6;y<=10;y++) for(let x=25;x<=30;x++) put(r,x,y,'carpet');
    for(let x=41;x<54;x++) put(r,x,7,'lava');
    for(let x=41;x<54;x++) put(r,x,8,'lava');
    for(let x=40;x<53;x++) put(r,x,9,'sand');
    add(r,'switch',28,8,{text:'REACTOR SWITCH: power routed.',code:':touch\nset reactor_online\nsay POWER RESTORED. Find the core to the southeast, then reach the exit.\nplay 523 0.12\nend'});
    add(r,'core',46,16); add(r,'health',12,16); add(r,'gem',31,15);
    add(r,'enemy',34,16,{state:{speed:4}}); add(r,'enemy',47,18,{state:{speed:5}});
    add(r,'exit',52,20,{text:'Evacuation gate',code:':touch\nif flag reactor_online goto checkcore\nsay The exit has no power. Locate the switch.\nend\n:checkcore\nif flag have_core goto victory\nsay Evacuation requires the recovered power core.\nend\n:victory\nsay MISSION COMPLETE! The Quiet Terminal is safe.\nwin\nend'});
    add(r,'portal',6,20,{targetBoard:'station',targetX:51,targetY:12,text:'Return to terminal'});
    w.boards.push(r);
    w.log=['Welcome to GlyphDOS. Collect the key (⚿), pass the locked door, and enter the reactor.'];
    return w;
  };

  GD.validateWorld = (raw) => {
    if(!raw||raw.format!=='glyphdos-world'||raw.version!==1||!Array.isArray(raw.boards)||!raw.boards.length||raw.boards.length>128) throw Error('Unsupported world format or board count.');
    const w={...GD.createWorld(),...raw};
    w.title=String(w.title||'Untitled').slice(0,120); w.author=String(w.author||'').slice(0,120);
    w.tickMs=Math.max(70,Math.min(1000,Number(w.tickMs)||180));
    w.flags=Object.fromEntries(Object.entries(w.flags||{}).slice(0,2048).filter(([k,v])=>/^[a-z0-9_-]{1,64}$/i.test(k)).map(([k,v])=>[k,Boolean(v)]));
    w.counters=Object.fromEntries(Object.entries(w.counters||{}).slice(0,2048).filter(([k])=>/^[a-z0-9_-]{1,64}$/i.test(k)).map(([k,v])=>[k,Math.max(-999999,Math.min(999999,Number(v)||0))]));
    w.palette=Array.isArray(w.palette)?w.palette.slice(0,16).map((c,i)=>GD.validColor(c,GD.DEFAULT_PALETTE[i])):GD.DEFAULT_PALETTE.slice();
    while(w.palette.length<16)w.palette.push(GD.DEFAULT_PALETTE[w.palette.length]);
    let glyphs=0; const banks={};
    for(const [id,entries] of Object.entries(w.glyphBanks||{}).slice(0,32)) {
      if(!/^[a-z0-9_-]{1,20}$/i.test(id)||typeof entries!=='object'||!entries) continue;
      const clean={};
      for(const [n,rows] of Object.entries(entries)) {
        const slot=Number(n); if(glyphs>=4096||!Number.isInteger(slot)||slot<0||slot>4095)continue;
        if(Array.isArray(rows)&&rows.length===12&&rows.every(row=>typeof row==='string'&&/^[01]{8}$/.test(row))){clean[slot]=rows.slice();glyphs++;}
      }
      banks[id]=clean;
    }
    w.glyphBanks=banks.default?banks:{default:{},...banks};
    const ids=new Set();let sumCells=0;
    w.boards=w.boards.map((board,i)=>{
      if(!board||!Number.isInteger(board.width)||!Number.isInteger(board.height)||board.width<10||board.width>200||board.height<10||board.height>120)throw Error('Board sizes must be between 10×10 and 200×120.');
      sumCells+=board.width*board.height; if(sumCells>500000)throw Error('World exceeds 500,000 cells.');
      const size=board.width*board.height;
      if(!Array.isArray(board.ground)||board.ground.length!==size)throw Error('A board has invalid terrain dimensions.');
      const id=/^[a-z0-9_-]{1,40}$/i.test(board.id||'')?board.id:'board'+i;
      if(ids.has(id))throw Error('Duplicate board IDs.');ids.add(id);
      const cleanTile=t=>{
        const kind=GD.TERRAIN[t?.kind]?t.kind:'floor';const base=GD.tile(kind);
        return {...base,glyph:GD.safeGlyph(t?.glyph,base.glyph),fg:Number.isInteger(t?.fg)?Math.max(0,Math.min(15,t.fg)):base.fg,bg:Number.isInteger(t?.bg)?Math.max(0,Math.min(15,t.bg)):base.bg};
      };
      const entities=Array.isArray(board.entities)?board.entities.slice(0,4000):[];
      return {id,name:String(board.name||id).slice(0,80),width:board.width,height:board.height,
        ground:board.ground.map(cleanTile),
        overlay:Array.from({length:size},(_,idx)=>{const x=board.overlay?.[idx];return x&&typeof x==='object'?{glyph:GD.safeGlyph(x.glyph,' '),fg:Number.isInteger(x.fg)?Math.max(0,Math.min(15,x.fg)):15,bg:Number.isInteger(x.bg)&&x.bg>=0&&x.bg<16?x.bg:null}:null;}),
        spawn:{x:Math.max(1,Math.min(board.width-2,Number(board.spawn?.x)||3)),y:Math.max(1,Math.min(board.height-2,Number(board.spawn?.y)||3))},
        entities:entities.filter(e=>e&&GD.OBJECTS[e.type]&&Number.isInteger(e.x)&&Number.isInteger(e.y)&&e.x>=0&&e.y>=0&&e.x<board.width&&e.y<board.height).map((e,n)=>{
          const base=GD.object(e.type,e.x,e.y);
          return {...base,id:String(e.id||'entity_'+n).slice(0,64),glyph:GD.safeGlyph(e.glyph,base.glyph),fg:Number.isInteger(e.fg)?Math.max(0,Math.min(15,e.fg)):base.fg,bg:Number.isInteger(e.bg)?Math.max(0,Math.min(15,e.bg)):base.bg,code:String(e.code||'').slice(0,8000),text:String(e.text||'').slice(0,1000),targetBoard:String(e.targetBoard||'').slice(0,40),targetX:Math.trunc(Number(e.targetX)||2),targetY:Math.trunc(Number(e.targetY)||2),state:{...e.state}};})};
    });
    w.player={...GD.createWorld().player,...w.player};
    if(!ids.has(w.player.board)) w.player.board=w.boards[0].id;
    const b=GD.getBoard(w,w.player.board);
    w.player.x=Math.max(1,Math.min(b.width-2,Number(w.player.x)||3));
    w.player.y=Math.max(1,Math.min(b.height-2,Number(w.player.y)||3));
    for(const key of ['hp','ammo','torches','gems','keys','score'])w.player[key]=Math.max(0,Math.min(999999,Math.trunc(Number(w.player[key])||0)));
    w.player.inventory=(w.player.inventory&&typeof w.player.inventory==='object')?w.player.inventory:{};
    w.log=Array.isArray(w.log)?w.log.slice(-40).map(t=>String(t).slice(0,350)):[];
    w.won=Boolean(w.won);
    return w;
  };
})(globalThis);
