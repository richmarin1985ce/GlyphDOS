const assert=require('node:assert/strict');
require('../src/charset.js');require('../src/data.js');require('../src/engine.js');
const GD=globalThis.GlyphDOS;
assert.equal(GD.CP437.length,256);
assert.equal(GD.CP437[219],'█');
assert.equal(GD.CP437[3],'♥');
assert.equal(GD.safeGlyph('漢'),'漢');
assert.equal(GD.safeGlyph('@demo:4095'),'@demo:4095');
const world=GD.sampleWorld();
const engine=new GD.Engine(world);
assert.equal(engine.board.id,'station');
assert.equal(engine.player.x,5);
assert.equal(engine.world.boards.length,2);
assert.equal(engine.board.ground.length,60*25);
assert.equal(engine.world.boards[1].overlay.length,60*25);
let b=engine.board;
// Walk from (5,5) to the key (11,8), collecting the key.
for(let i=0;i<6;i++)assert.equal(engine.move(1,0),true);
for(let i=0;i<3;i++)assert.equal(engine.move(0,1),true);
assert.equal(engine.player.keys,1);
// Approach door from the west at x28, y12; pass via unlocking.
engine.player.x=27;engine.player.y=12;
assert.equal(b.ground[12*60+28].kind,'door');assert.equal(engine.move(1,0),true);
assert.equal(b.ground[12*60+28].kind,'floor');assert.equal(engine.player.keys,0);
// Teleport through the portal: player enters the reactor board.
engine.player.x=52;engine.player.y=12;assert.equal(engine.move(1,0),true);
assert.equal(engine.board.id,'reactor');
// Trigger the switch from an adjacent tile.
engine.player.x=27;engine.player.y=8;
engine.move(1,0);assert.equal(engine.world.flags.reactor_online,true);
// Collect core and finish through the exit's scripted gate.
engine.player.x=45;engine.player.y=16;engine.move(1,0);
assert.equal(engine.world.flags.have_core,true);
engine.player.x=51;engine.player.y=20;engine.move(1,0);
assert.equal(engine.world.won,true);
// Script VM stops loops, never executes code as JS.
const unit=GD.object('npc',2,2,{code:':touch\ngoto loop\n:loop\ngoto loop'});
engine.world.won=false;engine.runScript(unit,'touch');
assert.ok(engine.world.log.at(-1).includes('safety limit'));
// Validate save/load round-trip and reject oversized board / malformed world.
const restored=GD.validateWorld(JSON.parse(JSON.stringify(engine.world)));
assert.equal(restored.boards.length,2);
assert.equal(restored.flags.have_core,true);
assert.throws(()=>GD.validateWorld({...world,format:'bad'}));
assert.throws(()=>GD.validateWorld({...world,boards:[{width:400,height:400,ground:[]}]}));
// Bitmap bank preserved without executable content.
restored.glyphBanks.default['42']=GD.emptyBitmap();
const again=GD.validateWorld(restored);
assert.equal(again.glyphBanks.default['42'].length,12);
console.log('GlyphDOS smoke tests: PASS — CP437, movement, keys, doors, portals, scripts, win, import/export, glyphs.');
