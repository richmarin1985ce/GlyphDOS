/* Deterministic tick-based game engine. Deliberately not a ZZT-OOP/Robotic compatibility interpreter. */
(function (G) {
  'use strict';
  const GD=G.GlyphDOS;
  class Engine {
    constructor(world,notify=()=>{},sound=()=>{}) {
      this.world=GD.validateWorld(world);this.notify=notify;this.sound=sound;
      this.ticks=0;this.facing={dx:1,dy:0};this.paused=false;
    }
    get player(){return this.world.player;}
    get board(){return GD.getBoard(this.world,this.player.board);}
    log(message){const text=String(message).slice(0,350);this.world.log.push(text);this.world.log=this.world.log.slice(-40);this.notify(text);}
    tile(board,x,y){const i=GD.cellAt(board,x,y);return i<0?null:board.ground[i];}
    isFree(board,x,y,exclude){
      const tile=this.tile(board,x,y);
      if(!tile||GD.TERRAIN[tile.kind]?.solid)return false;
      return !board.entities.some(e=>e!==exclude&&e.x===x&&e.y===y&&['pushblock','npc','enemy','sign','switch'].includes(e.type));
    }
    move(dx,dy){
      if(this.world.won||this.player.hp<=0)return false;
      if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
      this.facing={dx,dy};const b=this.board,p=this.player,x=p.x+dx,y=p.y+dy;
      const tile=this.tile(b,x,y);if(!tile)return false;
      if(tile.kind==='door') {
        if(p.keys<=0){this.log('The door is locked. Find a key.');this.sound(130,.08);return false;}
        p.keys--;b.ground[GD.cellAt(b,x,y)]=GD.tile('floor');this.log('Unlocked the door.');this.sound(550,.08);
      } else if(GD.TERRAIN[tile.kind]?.solid){this.sound(140,.04);return false;}
      const e=GD.entityAt(b,x,y);
      if(e){
        if(e.type==='pushblock') {
          if(!this.isFree(b,x+dx,y+dy,e))return false;
          e.x+=dx;e.y+=dy;this.sound(200,.06);
        } else if(['npc','enemy','sign','switch'].includes(e.type)) {
          if(e.type==='enemy') {this.damage(6,'An enemy struck you.');return false;}
          if(e.type==='sign')this.log(e.text||'The sign is blank.');
          else if(e.type==='switch'&&e.code)this.runScript(e,'touch');
          else if(e.type==='switch'){this.world.flags.reactor_online=true;this.log(e.text||'Switch activated.');}
          else if(!this.runScript(e,'touch'))this.log(e.text||'A robot hums quietly.');
          return false;
        }
      }
      p.x=x;p.y=y;
      if(tile.damage)this.damage(tile.damage,'The terrain burns!');
      if(e)this.touchPickup(e,b);
      if(tile.kind==='conveyor')this.conveyorMove(b,x,y);
      return true;
    }
    conveyorMove(b,x,y){
      // One step, no recursion. A conveyor cannot force a portal or entity collision.
      const x2=x+1,y2=y;
      if(this.player.board===b.id&&this.isFree(b,x2,y2)&&!GD.entityAt(b,x2,y2))this.player.x=x2;
    }
    touchPickup(e,b){
      const p=this.player;
      const take=()=>{const idx=b.entities.findIndex(o=>o.id===e.id);if(idx!==-1)b.entities.splice(idx,1);};
      switch(e.type){
        case 'key':p.keys++;p.score+=25;this.log('Picked up a key.');take();break;
        case 'gem':p.gems++;p.score+=100;this.log('Gem collected! +100 score.');take();break;
        case 'ammo':p.ammo+=5;this.log('Collected 5 ammo.');take();break;
        case 'torch':p.torches++;this.log('Picked up a torch.');take();break;
        case 'health':p.hp=Math.min(100,p.hp+25);this.log('Medkit: +25 health.');take();break;
        case 'core':p.inventory.core=(p.inventory.core||0)+1;this.world.flags.have_core=true;this.log('Recovered the power core!');take();break;
        case 'portal':this.teleport(e.targetBoard,e.targetX,e.targetY);break;
        case 'exit':if(!this.runScript(e,'touch')){
          if(this.world.flags.reactor_online&&this.world.flags.have_core)this.win();
          else this.log('The exit remains sealed.');
        }break;
        default:break;
      }
      this.sound(700,.06);
    }
    interact(){
      const {dx,dy}=this.facing,b=this.board,e=GD.entityAt(b,this.player.x+dx,this.player.y+dy);
      if(!e){this.log('There is nothing to interact with.');return;}
      if(e.type==='sign')this.log(e.text||'A blank sign.');
      else if(e.type==='npc'||e.type==='switch'||e.type==='exit') {
        if(!this.runScript(e,'touch'))this.log(e.text||'...');
      } else this.log(e.text||'You examine the '+(GD.OBJECTS[e.type]?.name||e.type)+'.');
    }
    damage(amount,message='Damage taken.'){
      this.player.hp=Math.max(0,this.player.hp-Math.max(0,amount));this.log(message+' (-'+amount+' HP)');this.sound(120,.12);
      if(this.player.hp<=0)this.log('GAME OVER. In Editor mode, use Reset Demo or import a saved world.');
    }
    teleport(id,x,y){
      const board=GD.getBoard(this.world,id);if(!board){this.log('Portal target not configured.');return false;}
      x=Number.isInteger(x)?x:board.spawn.x;y=Number.isInteger(y)?y:board.spawn.y;
      if(!this.isFree(board,x,y)){x=board.spawn.x;y=board.spawn.y;}
      this.player.board=id;this.player.x=x;this.player.y=y;
      this.log('ENTERING: '+board.name);this.sound(400,.13);return true;
    }
    win(){this.world.won=true;this.player.score+=1000;this.log('★ VICTORY! WORLD COMPLETED. ★');this.sound(900,.3);}
    shoot(){
      if(this.world.won||this.player.hp<=0)return;
      if(this.player.ammo<1){this.log('Out of ammo.');return;}
      this.player.ammo--;this.sound(840,.035);
      const b=this.board,dx=this.facing.dx,dy=this.facing.dy;
      for(let n=1;n<=10;n++){
        const x=this.player.x+dx*n,y=this.player.y+dy*n,t=this.tile(b,x,y);
        if(!t||GD.TERRAIN[t.kind]?.solid)break;
        const e=GD.entityAt(b,x,y);
        if(!e)continue;
        if(e.type==='enemy'){
          e.state.hp=(Number(e.state.hp)||1)-1;
          if(e.state.hp<=0){b.entities=b.entities.filter(o=>o!==e);this.player.score+=50;this.log('Enemy destroyed. +50 points.');}
          else this.log('Enemy hit.');return;
        }
        if(this.runScript(e,'shot'))return;
        if(['pushblock','npc','sign','switch'].includes(e.type))return;
      }
    }
    tick(){
      if(this.paused||this.world.won||this.player.hp<=0)return;
      this.ticks++;
      const b=this.board;
      // Iterate a snapshot so scripts can change entities or boards without invalidating iteration.
      for(const e of [...b.entities]){
        if(e.type==='npc'&&e.code.includes(':tick'))this.runScript(e,'tick');
        if(e.type!=='enemy'||this.player.board!==b.id)continue;
        const speed=Math.max(2,Math.min(15,Number(e.state.speed)||5));
        if(this.ticks%speed!==0)continue;
        const dx=this.player.x-e.x,dy=this.player.y-e.y;
        if(Math.abs(dx)+Math.abs(dy)>10)continue;
        const dirs=Math.abs(dx)>=Math.abs(dy)?[[Math.sign(dx),0],[0,Math.sign(dy)]]:[[0,Math.sign(dy)],[Math.sign(dx),0]];
        for(const [sx,sy] of dirs){
          if(sx===0&&sy===0)continue;
          if(e.x+sx===this.player.x&&e.y+sy===this.player.y){this.damage(4,'The enemy attacks!');break;}
          if(this.isFree(b,e.x+sx,e.y+sy,e)){e.x+=sx;e.y+=sy;break;}
        }
      }
    }
    runScript(entity,event){
      if(!entity||!entity.code)return false;
      const lines=entity.code.replace(/\r/g,'').split('\n').slice(0,800);
      const labels={};for(let i=0;i<lines.length;i++){
        const ln=lines[i].trim();if(/^:[a-z0-9_-]+$/i.test(ln)) labels[ln.slice(1).toLowerCase()]=i;
      }
      const entry=labels[String(event).toLowerCase()];if(entry===undefined)return false;
      entity.state=entity.state||{};
      if(event==='tick'&&entity.state.wait>0){entity.state.wait--;return true;}
      let pc=entry+1,executed=0;
      while(pc<lines.length&&executed++<100){
        const line=lines[pc++].trim();
        if(!line||line.startsWith(';')||line.startsWith('//'))continue;
        if(line.startsWith(':'))break; // stop at the next event label, unless goto was used
        const [command,...args]=line.split(/\s+/);const op=command.toLowerCase();
        const rest=line.slice(command.length).trim();
        switch(op){
          case 'say':this.log(rest);break;
          case 'set':if(/^[a-z0-9_-]{1,64}$/i.test(args[0]||''))this.world.flags[args[0]]=true;break;
          case 'clear':if(/^[a-z0-9_-]{1,64}$/i.test(args[0]||''))this.world.flags[args[0]]=false;break;
          case 'give':this.modifyStat(args[0],Number(args[1])||1);break;
          case 'take':this.modifyStat(args[0],-(Number(args[1])||1));break;
          case 'counter':if(/^[a-z0-9_-]{1,64}$/i.test(args[0]||''))this.world.counters[args[0]]=(Number(this.world.counters[args[0]])||0)+(Number(args[1])||1);break;
          case 'goto':if(labels[String(args[0]).toLowerCase()]!==undefined)pc=labels[String(args[0]).toLowerCase()]+1;break;
          case 'if':{
            let ok=false;const kind=(args[0]||'').toLowerCase();
            if(kind==='flag')ok=!!this.world.flags[args[1]];
            else if(kind==='notflag')ok=!this.world.flags[args[1]];
            else if(kind==='has')ok=(Number(this.player[args[1]])||Number(this.player.inventory[args[1]])||0)>=(Number(args[2])||1);
            else if(kind==='counter')ok=(Number(this.world.counters[args[1]])||0)>=(Number(args[2])||0);
            const idx=args.findIndex(a=>a.toLowerCase()==='goto');
            if(ok&&idx>=0&&labels[String(args[idx+1]).toLowerCase()]!==undefined)pc=labels[String(args[idx+1]).toLowerCase()]+1;
            break;
          }
          case 'teleport':this.teleport(args[0],Number(args[1]),Number(args[2]));break;
          case 'move':{
            const dd={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[String(args[0]).toLowerCase()];
            if(dd&&this.isFree(this.board,entity.x+dd[0],entity.y+dd[1],entity)) {entity.x+=dd[0];entity.y+=dd[1];}break;
          }
          case 'wait':entity.state.wait=Math.max(0,Math.min(100,Number(args[0])||1));return true;
          case 'play':this.sound(Math.max(80,Math.min(1600,Number(args[0])||440)),Math.max(.01,Math.min(.5,Number(args[1])||.08)));break;
          case 'damage':this.damage(Math.max(0,Math.min(100,Number(args[0])||1)),'Scripted damage.');break;
          case 'heal':this.player.hp=Math.min(100,this.player.hp+Math.max(0,Math.min(100,Number(args[0])||1)));break;
          case 'win':this.win();return true;
          case 'end':return true;
          default:this.log('Script command not recognized: '+op);return true;
        }
        if(this.player.hp<=0||this.world.won)return true;
      }
      if(executed>=100)this.log('Script stopped: 100-instruction safety limit.');
      return true;
    }
    modifyStat(name,amount){
      if(!Number.isFinite(amount))return;
      if(['hp','ammo','torches','gems','keys','score'].includes(name)) {
        this.player[name]=Math.max(0,Math.min(name==='hp'?100:999999,this.player[name]+amount));
      } else if(/^[a-z0-9_-]{1,64}$/i.test(name||'')) {
        this.player.inventory[name]=Math.max(0,Math.min(999999,(Number(this.player.inventory[name])||0)+amount));
      }
    }
  }
  GD.Engine=Engine;
})(globalThis);
