/* GlyphDOS application: canvas renderer, tile painter, script editor, glyph lab, IO. */
(function (G) {
'use strict';
const GD=G.GlyphDOS,$=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];
const VIEW_W=60,VIEW_H=25,CELL_W=12,CELL_H=20;
let engine,mode='play',editBoardId='',selectedId=null,layer='ground',paintType='floor',glyphOverride='',
  fg=11,bg=0,paintErase=false,paintSpawn=false,cameraX=0,cameraY=0,mouseDown=false,
  undo=[],redo=[],pixelRows=GD.emptyBitmap(),pixelBrushOn=true,muted=false,audio=null;
const canvas=$('#screen'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

function beep(freq=440,duration=.08){
 if(muted)return;
 try{
   audio=audio||new (window.AudioContext||window.webkitAudioContext)();
   if(audio.state==='suspended')audio.resume();
   const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
   osc.type='square';osc.frequency.setValueAtTime(Math.max(80,Math.min(1600,freq)),now);
   gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.0001,now+Math.max(.01,duration));
   osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+Math.max(.01,duration));
 }catch(_){/* playback is optional */}
}
function writeLog(){
 const box=$('#logEntries');box.replaceChildren();
 for(const text of engine.world.log.slice(-30)) {const div=document.createElement('div');div.textContent=text;box.append(div);}
 box.scrollTop=box.scrollHeight;
}
function status(text){$('#statusLeft').textContent=String(text).slice(0,80).toUpperCase();}
function onMessage(m){writeLog();status(m);refreshStats();draw();}
function init(world){
 engine=new GD.Engine(world,onMessage,beep);editBoardId=engine.player.board;
 cameraX=0;cameraY=0;selectedId=null;undo=[];redo=[];
 syncBoardSelect();syncTargetSelect();syncBrushes();syncSelection();refreshStats();writeLog();draw();
 status('SYSTEM READY — '+engine.world.title);
}
function getShownBoard(){return mode==='play'?engine.board:(GD.getBoard(engine.world,editBoardId)||engine.board);}
function getCamera(board){
 if(mode==='play') {
  return {x:Math.min(Math.max(0,engine.player.x-Math.floor(VIEW_W/2)),Math.max(0,board.width-VIEW_W)),
          y:Math.min(Math.max(0,engine.player.y-Math.floor(VIEW_H/2)),Math.max(0,board.height-VIEW_H))};
 }
 return {x:Math.min(Math.max(0,cameraX),Math.max(0,board.width-VIEW_W)),
         y:Math.min(Math.max(0,cameraY),Math.max(0,board.height-VIEW_H))};
}
function drawGlyph(glyph,color,x,y,world){
 if(glyph===' '||glyph==='')return;
 const match=/^@([a-z0-9_-]{1,20}):(\d{1,4})$/i.exec(glyph||'');
 if(match){
   const rows=world.glyphBanks?.[match[1]]?.[Number(match[2])];
   if(!rows)return;
   ctx.fillStyle=color;
   for(let r=0;r<12;r++)for(let c=0;c<8;c++)if(rows[r][c]==='1'){
      // 1.3 px per bitmap pixel, 1.4 y scale, centered in cell
      ctx.fillRect(Math.floor(x+1+c*1.3),Math.floor(y+2+r*1.35),Math.ceil(1.3),Math.ceil(1.35));
   }
   return;
 }
 ctx.fillStyle=color;
 ctx.font='bold 16px "DejaVu Sans Mono", "Cascadia Mono", Consolas, "Courier New", monospace';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,x+CELL_W/2,y+CELL_H/2+.3,CELL_W);
}
function draw(){
 if(!engine)return;
 const b=getShownBoard();if(!b)return;
 const cam=getCamera(b),p=engine.player,palette=engine.world.palette;
 ctx.fillStyle='#050910';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let vy=0;vy<VIEW_H;vy++)for(let vx=0;vx<VIEW_W;vx++){
   const x=vx+cam.x,y=vy+cam.y,i=GD.cellAt(b,x,y);
   if(i<0)continue;
   const t=b.ground[i];const px=vx*CELL_W,py=vy*CELL_H;
   ctx.fillStyle=palette[t.bg]||GD.DEFAULT_PALETTE[0];ctx.fillRect(px,py,CELL_W,CELL_H);
   drawGlyph(t.glyph,palette[t.fg]||'#ffffff',px,py,engine.world);
   const overlay=b.overlay[i];if(overlay){
     if(overlay.bg!==null&&overlay.bg!==undefined){ctx.fillStyle=palette[overlay.bg]||'#000000';ctx.fillRect(px,py,CELL_W,CELL_H);}
     drawGlyph(overlay.glyph,palette[overlay.fg]||'#ffffff',px,py,engine.world);
   }
 }
 for(const entity of b.entities){
   const vx=entity.x-cam.x,vy=entity.y-cam.y;
   if(vx<0||vy<0||vx>=VIEW_W||vy>=VIEW_H)continue;
   const px=vx*CELL_W,py=vy*CELL_H;
   if(entity.bg!==null&&entity.bg!==undefined){ctx.fillStyle=palette[entity.bg]||palette[0];ctx.fillRect(px,py,CELL_W,CELL_H);}
   drawGlyph(entity.glyph,palette[entity.fg]||'#ffffff',px,py,engine.world);
   if(mode!=='play'&&selectedId===entity.id){ctx.strokeStyle='#fff29a';ctx.lineWidth=2;ctx.strokeRect(px+1,py+1,CELL_W-2,CELL_H-2);}
 }
 if(p.board===b.id){
   const vx=p.x-cam.x,vy=p.y-cam.y;
   if(vx>=0&&vy>=0&&vx<VIEW_W&&vy<VIEW_H){
     const px=vx*CELL_W,py=vy*CELL_H;
     ctx.fillStyle=palette[0];ctx.fillRect(px,py,CELL_W,CELL_H);
     drawGlyph('☺',engine.world.won?'#fff29a':'#ffffff',px,py,engine.world);
     if(mode!=='play'){ctx.strokeStyle='#6ae0da';ctx.strokeRect(px+.5,py+.5,CELL_W-1,CELL_H-1);}
   }
 }
 if(mode!=='play'){
   ctx.strokeStyle='rgba(90,169,177,.12)';ctx.lineWidth=.5;
   for(let x=0;x<=VIEW_W;x++){ctx.beginPath();ctx.moveTo(x*CELL_W+.5,0);ctx.lineTo(x*CELL_W+.5,500);ctx.stroke();}
   for(let y=0;y<=VIEW_H;y++){ctx.beginPath();ctx.moveTo(0,y*CELL_H+.5);ctx.lineTo(720,y*CELL_H+.5);ctx.stroke();}
 }
 $('#boardTitle').textContent=b.name.toUpperCase();$('#resolution').firstChild.textContent=b.width+' × '+b.height+' ';
 $('#statusRight').textContent=(mode==='play'?'PLAYER':'CAM '+String(cam.x).padStart(2,'0')+','+String(cam.y).padStart(2,'0'))+' / X '+String(p.x).padStart(2,'0')+' · Y '+String(p.y).padStart(2,'0');
}
function refreshStats(){
 const p=engine.player;
 $('#hpStat').textContent=p.hp;$('#hpFill').style.width=p.hp+'%';
 $('#hpFill').style.background=p.hp<25?'#ff797f':'#61dfd7';
 $('#ammoStat').textContent=p.ammo;$('#keysStat').textContent=p.keys;
 $('#gemsStat').textContent=p.gems;$('#scoreStat').textContent=String(p.score).padStart(6,'0');
 const station=GD.getBoard(engine.world,'station');
 const objectives=[
  [p.keys>0||(station&&!station.ground.some(t=>t.kind==='door')),'Find the station key'],
  [p.board==='reactor'||engine.world.flags.have_core,'Enter reactor sector'],
  [!!engine.world.flags.reactor_online,'Activate the switch'],
  [!!engine.world.flags.have_core,'Recover power core'],
  [!!engine.world.won,'Reach evacuation gate']];
 const container=$('#objectives');container.replaceChildren();
 for(const [done,label] of objectives){const div=document.createElement('div');div.className=done?'done':'';div.textContent=(done?'☑':'□')+' '+label;container.append(div);}
}
function movePlayer(dx,dy){if(mode!=='play')return;engine.move(dx,dy);draw();refreshStats();writeLog();autosave();}
function setMode(next){
 mode=next;$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
 ['play','edit','glyphs','script','manual'].forEach(id=>$('#pane-'+id).hidden=(id!==mode));
 $('#playerControls').hidden=mode!=='play';
 $('#statGrid').hidden=mode!=='play';
 if(mode==='script'){syncSelection();}
 if(mode==='edit')syncBoardSelect();
 status(mode==='play'?'PLAY MODE':'EDITOR / '+mode.toUpperCase());draw();canvas.focus();
}
function saveHistory(){undo.push(JSON.stringify(engine.world));if(undo.length>25)undo.shift();redo.length=0;}
function restoreHistory(from,to){if(!from.length)return;to.push(JSON.stringify(engine.world));const state=from.pop();
 const lastBoard=editBoardId;engine.world=GD.validateWorld(JSON.parse(state));
 editBoardId=GD.getBoard(engine.world,lastBoard)?lastBoard:engine.player.board;
 selectedId=null;syncBoardSelect();syncTargetSelect();syncSelection();writeLog();refreshStats();draw();autosave();
}
function autosave(){try{const serialized=JSON.stringify(engine.world);if(serialized.length<4000000)localStorage.setItem('glyphdos_autosave_v1',serialized);}catch(_){}}
function selectOptions(el,items,value){
 el.replaceChildren();for(const item of items){const option=document.createElement('option');option.value=String(item.value);option.textContent=item.text;el.append(option);}if(value!==undefined)el.value=String(value);
}
function syncBoardSelect(){
 selectOptions($('#boardSelect'),engine.world.boards.map(b=>({value:b.id,text:b.name})),editBoardId);
 const b=GD.getBoard(engine.world,editBoardId);if(b)$('#boardName').value=b.name;
 $('#cameraX').value=cameraX;$('#cameraY').value=cameraY;
}
function syncTargetSelect(){
 selectOptions($('#targetBoard'),[{value:'',text:'— None —'},...engine.world.boards.map(b=>({value:b.id,text:b.name}))],'');
}
function syncBrushes(){
 const categories=layer==='entities'?GD.OBJECTS:GD.TERRAIN;
 const list=layer==='overlay'?[{value:'text',text:'Text glyph / paint'}]:Object.entries(categories).map(([key,val])=>({value:key,text:val.name}));
 if(!list.some(x=>x.value===paintType))paintType=list[0].value;
 selectOptions($('#paintType'),list,paintType);
 $('#glyphInput').value=glyphOverride;$('#layerSelect').value=layer;
 const opts=engine.world.palette.map((hex,i)=>({value:i,text:String(i).padStart(2,'0')+'  '+hex}));
 selectOptions($('#fgSelect'),opts,fg);selectOptions($('#bgSelect'),opts,bg);$('#paletteColor').value=engine.world.palette[fg];
}
function syncSelection(){
 const b=getShownBoard(),e=b?.entities.find(o=>o.id===selectedId);
 $('#selectionStatus').textContent=e?e.type.toUpperCase()+'  /  ('+e.x+','+e.y+')  /  ID: '+e.id:'NO OBJECT SELECTED';
 $('#entityText').value=e?.text||'';$('#codeInput').value=e?.code||'';
 $('#targetBoard').value=e?.targetBoard||'';$('#targetCoords').value=(e?.targetX??3)+','+(e?.targetY??3);
 $('#saveScriptBtn').disabled=!e;$('#deleteEntityBtn').disabled=!e;
}
function coordFromEvent(ev){
 const rect=canvas.getBoundingClientRect(),sx=(ev.clientX-rect.left)*canvas.width/rect.width,sy=(ev.clientY-rect.top)*canvas.height/rect.height;
 const b=getShownBoard(),cam=getCamera(b);
 return {x:Math.floor(sx/CELL_W)+cam.x,y:Math.floor(sy/CELL_H)+cam.y};
}
function applyPaint(x,y,erase=false,shift=false){
 const b=getShownBoard(),i=GD.cellAt(b,x,y);if(i<0)return;
 if(mode==='script'){const e=GD.entityAt(b,x,y);selectedId=e?.id||null;syncSelection();draw();return;}
 if(mode!=='edit')return;
 if(shift){
  const e=GD.entityAt(b,x,y),t=b.ground[i];
  glyphOverride=e?.glyph||b.overlay[i]?.glyph||t.glyph;
  $('#glyphInput').value=glyphOverride;status('SAMPLED '+glyphOverride);return;
 }
 if(paintSpawn){engine.player.board=b.id;engine.player.x=x;engine.player.y=y;b.spawn={x,y};paintSpawn=false;status('PLAYER SPAWN SET TO '+x+','+y);refreshStats();return;}
 if(layer==='ground'){
  const base=GD.tile(erase?'floor':paintType);
  b.ground[i]={...base,glyph:erase?base.glyph:(GD.safeGlyph(glyphOverride,base.glyph)),fg:erase?base.fg:fg,bg:erase?base.bg:bg};
 } else if(layer==='overlay') {
  b.overlay[i]=erase?null:{glyph:GD.safeGlyph(glyphOverride,'*'),fg,bg:null};
 } else if(layer==='entities'){
  b.entities=b.entities.filter(e=>e.x!==x||e.y!==y);
  if(!erase){const base=GD.object(paintType,x,y,{fg,bg});base.glyph=GD.safeGlyph(glyphOverride,base.glyph);
   if(base.type==='npc')base.code=':touch\nsay Hello, world!\nend';
   if(base.type==='portal')base.text='An unconfigured portal.';
   if(base.type==='switch')base.code=':touch\nset power\nsay Power enabled.\nend';
   b.entities.push(base);selectedId=base.id;
  }else selectedId=null;
 }
 syncSelection();draw();
}
function paintFromMouse(ev){
 if(!mouseDown)return;
 const {x,y}=coordFromEvent(ev);
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 applyPaint(x,y,paintErase,ev.shiftKey);
}
function makeCPGrid(filter=''){
 const grid=$('#cpGrid');grid.replaceChildren();
 let nums=GD.CP437.map((_,i)=>i);
 const q=filter.trim().toLowerCase();
 if(q){const n=q.startsWith('0x')?parseInt(q.slice(2),16):Number(q);if(Number.isInteger(n)&&n>=0&&n<256)nums=[n];else nums=nums.filter(i=>GD.CP437[i].toLowerCase().includes(q));}
 for(const i of nums){const b=document.createElement('button');b.type='button';b.textContent=GD.CP437[i];b.title='CP437 '+i+' / 0x'+i.toString(16).padStart(2,'0').toUpperCase();
   b.addEventListener('click',()=>{glyphOverride=GD.CP437[i];$('#glyphInput').value=glyphOverride;setMode('edit');status('BRUSH GLYPH = CP437 '+i);});grid.append(b);}
}
function pixelButtonRow(){
 const area=$('#pixelEditor');area.replaceChildren();
 for(let y=0;y<12;y++)for(let x=0;x<8;x++){
  const b=document.createElement('button');b.type='button';b.className=pixelRows[y][x]==='1'?'on':'';
  b.title='pixel '+x+','+y;b.dataset.x=x;b.dataset.y=y;
  b.addEventListener('pointerdown',ev=>{ev.preventDefault();pixelBrushOn=pixelRows[y][x]!=='1';flipPixel(x,y,pixelBrushOn);});
  b.addEventListener('pointerenter',ev=>{if(ev.buttons===1)flipPixel(x,y,pixelBrushOn);});
  area.append(b);
 }
}
function flipPixel(x,y,on){const bits=pixelRows[y].split('');bits[x]=on?'1':'0';pixelRows[y]=bits.join('');
 const btn=$(`#pixelEditor button[data-x="${x}"][data-y="${y}"]`);if(btn)btn.classList.toggle('on',on);
}
function bankSlot(){let bank=$('#bankInput').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,20)||'default';
 const slot=Math.max(0,Math.min(4095,Math.trunc(Number($('#slotInput').value)||0)));
 $('#bankInput').value=bank;$('#slotInput').value=slot;return {bank,slot};
}
function download(name,contents,type){const blob=contents instanceof Blob?contents:new Blob([contents],{type});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function filename(){return (engine.world.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'world').slice(0,50);}

// Tabs, global actions
$$('.tab').forEach(t=>t.addEventListener('click',()=>setMode(t.dataset.mode)));
$('#exportBtn').addEventListener('click',()=>{download(filename()+'.glyphworld.json',JSON.stringify(engine.world,null,2),'application/json');status('WORLD EXPORTED');});
$('#importBtn').addEventListener('click',()=>$('#fileInput').click());
$('#fileInput').addEventListener('change',async ev=>{const f=ev.target.files?.[0];if(!f)return;
 try{if(f.size>12000000)throw Error('Maximum world import is 12 MB.');const world=JSON.parse(await f.text());init(world);setMode('play');autosave();status('LOADED '+f.name);}catch(err){alert('Import failed: '+err.message);}finally{ev.target.value='';}
});
$('#resetBtn').addEventListener('click',()=>{if(!confirm('Replace the current world with the original demo? Export any changes first.'))return;init(GD.sampleWorld());autosave();});
$('#screenshotBtn').addEventListener('click',()=>canvas.toBlob(blob=>{if(blob)download(filename()+'-screen.png',blob,'image/png');}));
$('#clearLogBtn').addEventListener('click',()=>{engine.world.log=[];writeLog();draw();});
$('#interactBtn').addEventListener('click',()=>{engine.interact();draw();writeLog();autosave();});
$('#shootBtn').addEventListener('click',()=>{engine.shoot();draw();refreshStats();autosave();});
$('#soundBtn').addEventListener('click',()=>{muted=!muted;$('#soundBtn').textContent=muted?'♪ SOUND OFF':'♪ SOUND ON';if(!muted)beep(500,.09);});
$$('[data-direction]').forEach(b=>b.addEventListener('click',()=>{const d={up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]}[b.dataset.direction];movePlayer(...d);}));
document.addEventListener('keydown',ev=>{
 const active=document.activeElement;
 if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName))return;
 if(ev.ctrlKey&&(ev.key.toLowerCase()==='s')){ev.preventDefault();$('#exportBtn').click();return;}
 if(ev.key==='Tab'){ev.preventDefault();setMode(mode==='play'?'edit':'play');return;}
 if(ev.key==='F1'){ev.preventDefault();setMode('manual');return;}
 if(mode==='edit'&&(ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();restoreHistory(undo,redo);return;}
 if(mode==='edit'&&(ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'){ev.preventDefault();restoreHistory(redo,undo);return;}
 const d={ArrowUp:[0,-1],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowRight:[1,0],w:[0,-1],a:[-1,0],s:[0,1],d:[1,0]}[ev.key];
 if(d){ev.preventDefault();if(mode==='play')movePlayer(...d);else if(mode!=='manual'){
   cameraX=Math.max(0,cameraX+d[0]);cameraY=Math.max(0,cameraY+d[1]);
   $('#cameraX').value=cameraX;$('#cameraY').value=cameraY;draw();
 }return;}
 if(mode==='play'&&ev.key.toLowerCase()==='e'){ev.preventDefault();engine.interact();draw();autosave();return;}
 if(mode==='play'&&ev.code==='Space'){ev.preventDefault();engine.shoot();draw();refreshStats();autosave();return;}
});
canvas.addEventListener('contextmenu',ev=>ev.preventDefault());
canvas.addEventListener('pointerdown',ev=>{
 if(mode==='play'){canvas.focus();return;}
 ev.preventDefault();canvas.setPointerCapture(ev.pointerId);mouseDown=true;paintErase=ev.button===2;
 if(mode==='edit'&&!ev.shiftKey)saveHistory();
 paintFromMouse(ev);autosave();
});
canvas.addEventListener('pointermove',ev=>{if(mouseDown&&mode==='edit'){paintFromMouse(ev);autosave();}});
canvas.addEventListener('pointerup',()=>{mouseDown=false;autosave();});
canvas.addEventListener('pointercancel',()=>{mouseDown=false;});

// Board editor
$('#boardSelect').addEventListener('change',ev=>{editBoardId=ev.target.value;selectedId=null;cameraX=0;cameraY=0;syncBoardSelect();syncSelection();draw();});
$('#newBoardBtn').addEventListener('click',()=>{
 const name=prompt('Name the new board:','Untitled Board');if(name===null)return;
 const size=prompt('Board dimensions (width,height), maximum 200×120:','60,25');if(size===null)return;
 const [w,h]=size.split(/[x,]/i).map(x=>Number(x.trim()));
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<10||h<10||w>200||h>120){alert('Dimensions must be between 10×10 and 200×120.');return;}
 if(engine.world.boards.length>=128||engine.world.boards.reduce((n,b)=>n+b.width*b.height,0)+w*h>500000){alert('World board / cell capacity exceeded.');return;}
 saveHistory();const id='board_'+Date.now().toString(36);const b=GD.createBoard(id,(name||id).slice(0,80),w,h);engine.world.boards.push(b);
 editBoardId=id;cameraX=0;cameraY=0;syncBoardSelect();syncTargetSelect();draw();autosave();
});
$('#layerSelect').addEventListener('change',ev=>{layer=ev.target.value;paintType=layer==='entities'?'npc':layer==='overlay'?'text':'floor';syncBrushes();});
$('#paintType').addEventListener('change',ev=>{paintType=ev.target.value;glyphOverride='';syncBrushes();});
$('#glyphInput').addEventListener('input',ev=>{glyphOverride=ev.target.value;});
$('#resetGlyphBtn').addEventListener('click',()=>{glyphOverride='';syncBrushes();});
$('#fgSelect').addEventListener('change',ev=>{fg=Number(ev.target.value);$('#paletteColor').value=engine.world.palette[fg];});
$('#bgSelect').addEventListener('change',ev=>{bg=Number(ev.target.value);});
$('#paletteColor').addEventListener('change',ev=>{saveHistory();engine.world.palette[fg]=GD.validColor(ev.target.value,engine.world.palette[fg]);syncBrushes();draw();autosave();});
$('#undoBtn').addEventListener('click',()=>restoreHistory(undo,redo));
$('#redoBtn').addEventListener('click',()=>restoreHistory(redo,undo));
$('#eraseBtn').addEventListener('click',()=>{paintErase=true;status('RIGHT-CLICK OR DRAG TO ERASE; ERASER ACTIVE ON NEXT CLICK');
 // Make eraser an explicit one-click tool for touch devices.
 const handler=(ev)=>{const {x,y}=coordFromEvent(ev);saveHistory();applyPaint(x,y,true);autosave();canvas.removeEventListener('pointerdown',handler,true);};
 canvas.addEventListener('pointerdown',handler,{capture:true,once:true});
});
$('#spawnBtn').addEventListener('click',()=>{paintSpawn=true;status('CLICK A PASSABLE TILE TO SET PLAYER SPAWN');});
$('#boardName').addEventListener('change',ev=>{const b=getShownBoard();if(!b)return;saveHistory();b.name=ev.target.value.trim().slice(0,80)||b.id;syncBoardSelect();draw();autosave();});
for(const c of ['X','Y']){$('#camera'+c).addEventListener('change',ev=>{if(c==='X')cameraX=Math.max(0,Number(ev.target.value)||0);else cameraY=Math.max(0,Number(ev.target.value)||0);draw();});}

// Object scripts
$('#saveScriptBtn').addEventListener('click',()=>{
 const b=getShownBoard(),e=b?.entities.find(o=>o.id===selectedId);if(!e)return;
 saveHistory();e.text=$('#entityText').value.slice(0,1000);e.code=$('#codeInput').value.slice(0,8000);e.targetBoard=$('#targetBoard').value;
 const [x,y]=$('#targetCoords').value.split(',').map(s=>Math.trunc(Number(s.trim())));
 e.targetX=Number.isFinite(x)?x:2;e.targetY=Number.isFinite(y)?y:2;
 status('OBJECT SCRIPT SAVED');autosave();
});
$('#deleteEntityBtn').addEventListener('click',()=>{
 const b=getShownBoard();if(!b||!selectedId)return;saveHistory();b.entities=b.entities.filter(o=>o.id!==selectedId);selectedId=null;syncSelection();draw();autosave();
});

// Character map and bitmap lab
$('#cpSearch').addEventListener('input',ev=>makeCPGrid(ev.target.value));
$('#useUnicodeBtn').addEventListener('click',()=>{const glyph=GD.safeGlyph($('#unicodeInput').value,'');if(!glyph){alert('Enter one Unicode character.');return;}
 glyphOverride=glyph;$('#glyphInput').value=glyph;setMode('edit');status('UNICODE GLYPH READY');
});
$('#loadGlyphBtn').addEventListener('click',()=>{const {bank,slot}=bankSlot();pixelRows=(engine.world.glyphBanks[bank]?.[slot]||GD.emptyBitmap()).slice();pixelButtonRow();status('CUSTOM GLYPH LOADED');});
$('#saveGlyphBtn').addEventListener('click',()=>{
 const {bank,slot}=bankSlot();saveHistory();engine.world.glyphBanks[bank]=engine.world.glyphBanks[bank]||{};
 const used=Object.values(engine.world.glyphBanks).reduce((n,b)=>n+Object.keys(b).length,0);
 if(used>=4096&&!engine.world.glyphBanks[bank][slot]){alert('World custom-glyph limit is 4,096.');undo.pop();return;}
 engine.world.glyphBanks[bank][slot]=pixelRows.slice();glyphOverride=GD.bitmapKey(bank,slot);$('#glyphInput').value=glyphOverride;
 autosave();setMode('edit');status('CUSTOM GLYPH SAVED / BRUSH SELECTED');
});
$('#clearGlyphBtn').addEventListener('click',()=>{pixelRows=GD.emptyBitmap();pixelButtonRow();});
$('#glyphToBrushBtn').addEventListener('click',()=>{const {bank,slot}=bankSlot();glyphOverride=GD.bitmapKey(bank,slot);$('#glyphInput').value=glyphOverride;setMode('edit');status('CUSTOM GLYPH SELECTED');});

makeCPGrid();pixelButtonRow();
let initialWorld=GD.sampleWorld();
try{const json=localStorage.getItem('glyphdos_autosave_v1');if(json&&json.length<4000000)initialWorld=GD.validateWorld(JSON.parse(json));}catch(_){/* private browsing or expired save */}
init(initialWorld);setMode('play');
setInterval(()=>{if(mode==='play'&&!document.hidden){engine.tick();refreshStats();draw();if(engine.ticks%55===0)autosave();}},180);
window.GlyphDOSApp={getEngine:()=>engine,setMode,reset:()=>init(GD.sampleWorld())};
})(globalThis);
