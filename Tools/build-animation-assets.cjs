// Non-creative pixel conversion and atlas packing using the installed Codixel core.
// All poses are model-generated. No bones, limb rotations or synthesized motion.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const P=require(path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills','codixel','core','pixel.js'));
const root=path.resolve(__dirname,'..');
const normalized=path.resolve(process.argv[2]);
const spec=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const out=path.join(root,'Assets','Characters','swordsman');
fs.mkdirSync(out,{recursive:true});
const width=128,height=112;
const records=[{action:'idle',i:0,file:path.join(normalized,'baseline.png'),duration:1000}];
for(const [action,definition] of Object.entries(spec.actions)){
  const indices=spec.allowKeyposesOnly?[0,2,5,8,11,13]:Array.from({length:14},(_,i)=>i);
  for(let k=0;k<indices.length;k++){const i=indices[k];records.push({action,i,file:path.join(normalized,action,'fullframe',`swordsman-${action}_${String(i).padStart(2,'0')}.png`),duration:definition.duration*((indices[k+1]??14)-i)});}
}
const high=records.map(r=>P.load(r.file));
// Establish one palette from all frames so colors cannot be remapped per pose.
const sample=new P.Buf(256,224*high.length);
high.forEach((frame,i)=>sample.sprite(P.resize(frame,256,224),0,i*224));
const palette=P.quantize(sample,24,{dither:false}).palette;
const pixels=high.map(frame=>P.resize(P.quantize(frame,24,{palette,dither:true}).buf,width,height,{mode:true}));
const atlas=P.pack(pixels,{cols:8,pad:0});
P.save(atlas,path.join(out,'atlas.png'));
const animations={};
records.forEach((r,idx)=>{
  if(!animations[r.action])animations[r.action]={loop:r.action!=='attack',frames:[]};
  const frame={x:(idx%8)*width,y:Math.floor(idx/8)*height,w:width,h:height,duration:r.duration,sourceIndex:r.i};
  animations[r.action].frames.push(frame);
  const frameDir=path.join(out,'frames',r.action);
  fs.mkdirSync(frameDir,{recursive:true});
  P.save(pixels[idx],path.join(frameDir,`${r.action}_${String(r.i).padStart(2,'0')}.png`));
});
animations.attack.hitTime=spec.actions.attack.hitTime??0.28;
for(const [name,def] of Object.entries(animations))def.duration=def.frames.reduce((sum,f)=>sum+f.duration,0);
const metadata={image:'atlas.png',frameWidth:width,frameHeight:height,pivot:{x:64,y:100},facing:'right',palette,animations,
  provenance:{stage:spec.allowKeyposesOnly?'keyposes-only':'complete-14-frames',artwork:'image_gen whole-character pose generation',pixelProcessing:'Codixel shared-palette quantize and mode resize',sourceManifest:path.relative(root,process.argv[3]).replaceAll('\\','/')}};
fs.writeFileSync(path.join(out,'atlas.json'),JSON.stringify(metadata,null,2));
const work=path.join(root,'Art','AnimationWork');
for(const action of ['walk','attack']){
  const ids=records.map((r,i)=>r.action===action?i:-1).filter(i=>i>=0);
  const frames=ids.map(i=>pixels[i]);
  P.save(P.sheet(frames.map((buf,i)=>({buf,label:`${action.toUpperCase()} ${String(records[ids[i]].i).padStart(2,'0')}`,scale:3})),{cols:4,gap:12}),path.join(work,`${action}-pixel-contact.png`));
  // White compositing is required by the 2dimg2motion review contract.
  const white=frames.map(frame=>{const b=new P.Buf(width,height);b.clear([255,255,255]);b.sprite(frame,0,0);return b;});
  // Cumulative rounding preserves total duration at GIF's10ms precision.
  let elapsed=0,lastTick=0;
  const delays=ids.map(i=>{elapsed+=records[i].duration;const tick=Math.round(elapsed/10),delay=(tick-lastTick)*10;lastTick=tick;return delay;});
  fs.writeFileSync(path.join(work,`${action}-preview.gif`),P.gif(white,{delay:delays,scale:3,loop:0}));
}
const report={frameCount:pixels.length,atlasSize:[atlas.w,atlas.h],frameSize:[width,height],paletteSize:palette.length,
  actions:Object.fromEntries(Object.entries(animations).map(([k,v])=>[k,{frames:v.frames.length,duration:v.duration,loop:v.loop,hitTime:v.hitTime}])),
  frameAlphaLevels:[...new Set(pixels.flatMap(f=>[...new Set([...f.px].map(c=>c>>>24))]))].sort((a,b)=>a-b),
  artReview:'Requires contact-sheet and live playback review; counts alone do not prove motion quality.'};
fs.writeFileSync(path.join(work,'atlas-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({atlas:path.join(out,'atlas.png'),...report}));
