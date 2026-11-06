import { ManagementGame, JOBS, CREW } from './management-core.mjs';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'mossfang-management-v2', SELECT_KEY = 'mossfang-selected-v2';
const FACILITIES = { rest:{x:.12,name:'숙소'}, education:{x:.32,name:'교육 마당'}, arena:{x:.51,name:'경기장'}, show:{x:.71,name:'공연장'}, market:{x:.89,name:'거래소'} };
const LABELS = { martial:'무예 교육', performance:'예능 교육', rest:'휴식', arena:'경기 출전', show:'공연 출연' };
const DETAILS = { martial:'교육 완료 시 무예와 판매 가치가 올라갑니다.',performance:'교육 완료 시 예능과 판매 가치가 올라갑니다.',rest:'숙소에서 컨디션을 40 회복합니다.',arena:'초급 경기를 마치면 숙련도와 실적에 따른 상금을 받습니다.',show:'공연을 마치면 흥행 수입과 활동 실적을 얻습니다.' };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = $('game-canvas'); canvas.width=1536; canvas.height=512;
const ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height, GROUND=430.08;
let stored,selectedId;
try{stored=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');selectedId=Number(localStorage.getItem(SELECT_KEY));}catch{stored=null;}
let actionView='education';
let game=new ManagementGame(stored),activeFacility='',ready=false,background,atlas,sprites,variants=[];
let lastFrame=performance.now(),lastUi=0,lastSave=0,visualTime=0,toastUntil=0,rosterSignature='',logSignature='',lastEventId=0,saleIntent=null;
const positions=new Map(),rosterNodes=new Map(),feedback=[];
const text=(id,value)=>{const el=$(id);if(el.textContent!==String(value))el.textContent=String(value);};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const gold=v=>Math.floor(Number(v)||0).toLocaleString('ko-KR');
const selected=()=>game.state.roster.find(m=>m.id===selectedId);
const aptitude=(m,kind)=>Number(m.aptitude?.[kind])||1;
const remaining=job=>Math.max(0,job.duration-job.elapsed);
const progress=job=>job?clamp(job.elapsed/job.duration*100,0,100):0;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');toastUntil=performance.now()+3400;}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(game.getSave()));localStorage.setItem(SELECT_KEY,String(selectedId||''));text('save-status','자동 저장됨');}catch{text('save-status','저장 공간 없음 · 이번 플레이만 유지');}}
function applyResult(result){if(result?.message)toast(result.message);save();updateUI();return result?.ok;}
function ensureSelection(){if(!game.state.roster.some(m=>m.id===selectedId))selectedId=game.state.roster[0]?.id??null;}
function pickMember(id){selectedId=id;activeFacility='';save();updateUI();}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Image unavailable: '+src));image.src=src;});}
function makeVariant(image,style){const surface=document.createElement('canvas');surface.width=image.width;surface.height=image.height;const painter=surface.getContext('2d');painter.drawImage(image,0,0);const pixels=painter.getImageData(0,0,surface.width,surface.height),colors=[[.72,1.08,1.10],[.97,.94,.55],[.88,.72,1.13]][style];for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(r>g*1.55&&r>b*1.38&&g<115&&r>42){const light=r*.63+g*.26+b*.11;pixels.data[i]=Math.round(light*colors[0]);pixels.data[i+1]=Math.round(light*colors[1]);pixels.data[i+2]=Math.round(light*colors[2]);}}painter.putImageData(pixels,0,0);return surface;}
async function loadAssets(){ready=false;$('asset-message').hidden=false;$('asset-message').classList.remove('error');$('asset-message').innerHTML='<span class="loading-mark" aria-hidden="true">✦</span><p>거점을 준비하고 있습니다…</p>';try{const response=await fetch('../Assets/Characters/swordsman/atlas.json',{cache:'no-store'});if(!response.ok)throw new Error('Character metadata unavailable');atlas=await response.json();for(const action of ['idle','walk','attack'])if(!atlas.animations?.[action]?.frames?.length)throw new Error('Missing character action: '+action);[background,sprites]=await Promise.all([loadImage('../Assets/Environments/goblin-camp.png'),loadImage('../Assets/Characters/swordsman/'+(atlas.image||'atlas.png'))]);variants=[sprites,makeVariant(sprites,0),makeVariant(sprites,1),makeVariant(sprites,2)];ready=true;$('asset-message').hidden=true;}catch(error){console.error('Camp assets failed to load',error);$('asset-message').classList.add('error');$('asset-message').innerHTML='<span class="loading-mark" aria-hidden="true">✦</span><p>거점 그림을 불러오지 못했습니다.<br>로컬 서버 연결을 확인해 주세요.</p><button type="button" class="quiet-button" id="retry-assets">다시 불러오기</button>';$('retry-assets').onclick=loadAssets;}updateUI();}
function frameFor(action,elapsed){const animation=atlas.animations[action]||atlas.animations.idle,total=animation.frames.reduce((sum,f)=>sum+(f.duration||80),0)/1000;let time=((elapsed%total)+total)%total;for(const frame of animation.frames){time-=(frame.duration||80)/1000;if(time<0)return frame.frame||frame;}const last=animation.frames.at(-1);return last.frame||last;}
function drawSprite(m,x,y,action,time,flip=false){const f=frameFor(action,time),scale=1.20,pivot=atlas.pivot||{x:64,y:100};ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;if(m.condition<25)ctx.globalAlpha=.75;ctx.drawImage(variants[(m.id-1)%variants.length],f.x,f.y,f.w||atlas.frameWidth,f.h||atlas.frameHeight,-pivot.x*scale,-pivot.y*scale,(f.w||atlas.frameWidth)*scale,(f.h||atlas.frameHeight)*scale);ctx.restore();}
function facilityFor(m){return ['martial','performance'].includes(m.job?.type)?'education':m.job?.type==='arena'?'arena':m.job?.type==='show'?'show':'rest';}
function drawScene(dt){ctx.clearRect(0,0,W,H);if(!ready){ctx.fillStyle='#364b38';ctx.fillRect(0,0,W,H);return;}ctx.imageSmoothingEnabled=false;const sourceY=background.height*.28,sourceHeight=background.width/3;ctx.drawImage(background,0,sourceY,background.width,sourceHeight,0,0,W,H);const counts={rest:0,education:0,arena:0,show:0};for(const m of [...game.state.roster].sort((a,b)=>a.id-b.id)){const facility=facilityFor(m),index=counts[facility]++;const goal=(facility==='show'?.69:FACILITIES[facility].x)*W+(facility==='show'?index%3:index%3-.5)*60;const y=(facility==='show'?318.72:GROUND)+Math.floor(index/3)*8;let pos=positions.get(m.id);if(!pos){pos={x:goal,y,facing:false};positions.set(m.id,pos);}if(pos.facility!==facility&&(facility==='show'||pos.facility==='show')){pos.x=goal;pos.y=y;}pos.facility=facility;const distance=goal-pos.x,moving=!reducedMotion&&Math.abs(distance)>2;if(reducedMotion)pos.x=goal;else{pos.x+=clamp(distance,-130*dt,130*dt);if(moving)pos.facing=distance<0;}pos.y=y;ctx.save();ctx.fillStyle='#182b2270';ctx.beginPath();ctx.ellipse(pos.x,y+1,29,6,0,0,Math.PI*2);ctx.fill();if(m.id===selectedId){ctx.strokeStyle='#dfd2ae';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(pos.x,y+1,34,8,0,0,Math.PI*2);ctx.stroke();}ctx.restore();const clock=visualTime+m.id*.25,attacking=m.job&&['martial','arena'].includes(m.job.type)&&!reducedMotion,action=moving?'walk':attacking&&clock%1.5<.77?'attack':'idle';drawSprite(m,pos.x,y,action,moving?visualTime:clock%1.5,moving&&pos.facing);ctx.font='13px "Malgun Gothic",sans-serif';const nameWidth=ctx.measureText(m.name).width;ctx.fillStyle=m.id===selectedId?'#29402be8':'#23382bbb';ctx.fillRect(pos.x-Math.max(27,nameWidth/2+8),y+11,Math.max(54,nameWidth+16),21);ctx.fillStyle=m.id===selectedId?'#eee4ba':'#c8d1b4';ctx.textAlign='center';ctx.fillText(m.name,pos.x,y+27);if(m.job){ctx.fillStyle='#203124e0';ctx.fillRect(pos.x-29,y-94,58,4);ctx.fillStyle=m.job.type==='rest'?'#abc993':'#ddbe73';ctx.fillRect(pos.x-29,y-94,58*progress(m.job)/100,4);}}for(const [id]of positions)if(!game.state.roster.some(m=>m.id===id))positions.delete(id);if(activeFacility){const f=FACILITIES[activeFacility];ctx.strokeStyle='#e3d493b0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(f.x*W,activeFacility==='show'?325:GROUND+7,76,12,0,0,Math.PI*2);ctx.stroke();}for(let i=feedback.length-1;i>=0;i--){const f=feedback[i];f.age+=dt;if(f.age>1.6){feedback.splice(i,1);continue;}ctx.save();ctx.globalAlpha=Math.max(0,1-f.age/1.6);ctx.fillStyle='#e8c77a';ctx.font='bold 19px "Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y-110-(reducedMotion?0:f.age*25));ctx.restore();}}
function buildRoster(){const signature=game.state.roster.map(m=>m.id).join(',');if(signature===rosterSignature)return;rosterSignature=signature;rosterNodes.clear();const nodes=game.state.roster.map(m=>{const button=document.createElement('button');button.type='button';button.className='roster-member';button.dataset.memberId=m.id;button.dataset.variant='0';const portrait=document.createElement('span');portrait.className='roster-portrait';const image=document.createElement('img');image.src='../Art/Source/swordsman-simple-master.png';image.alt='';image.style.filter='none';portrait.append(image);const copy=document.createElement('span');copy.className='roster-copy';const name=document.createElement('strong'),detail=document.createElement('small');copy.append(name,detail);const dot=document.createElement('i');dot.className='roster-status-dot';dot.setAttribute('aria-hidden','true');const bar=document.createElement('i');bar.className='roster-progress';bar.setAttribute('aria-hidden','true');button.append(portrait,copy,dot,bar);button.onclick=()=>pickMember(m.id);rosterNodes.set(m.id,{button,name,detail,bar});return button;});$('roster-list').replaceChildren(...nodes);}
function updateRoster(){
  buildRoster();
  for(const m of game.state.roster){
    const node=rosterNodes.get(m.id), detail=m.job?`${LABELS[m.job.type]} · ${Math.ceil(remaining(m.job))}초`:'대기 중';
    node.name.textContent=m.name; node.detail.textContent=detail;
    node.button.classList.toggle('selected',m.id===selectedId);
    node.button.classList.toggle('busy',!!m.job);
    node.button.setAttribute('aria-pressed',String(m.id===selectedId));
    node.button.setAttribute('aria-label',`${m.name} 선택 · ${detail}`);
    node.bar.style.width=`${progress(m.job)}%`;
  }
  $('roster-empty').hidden=game.state.roster.length>0;
}
function jobHint(m,type){
  const spec=JOBS[type],check=game.canStartJob(m.id,type);
  if(!check.ok&&!m.job){
    if(type==='rest'&&m.condition>=100)return '컨디션 충분';
    if(m.condition<spec.minCondition)return '휴식 필요';
    if(spec.minSkill&&m[spec.skill]<spec.minSkill)return `${spec.skill==='martial'?'무예':'예능'} ${spec.minSkill} 필요`;
    if(game.state.gold<spec.cost)return '골드 부족';
    if(spec.kind==='training'&&m[type]>=100)return '최대 숙련';
    if(spec.kind==='training')return '교육 자리 없음';
    return '시설 사용 중';
  }
  if(type==='rest')return '무료 · 컨디션 +40';
  if(spec.kind==='training')return `${spec.cost} G · ${spec.duration}초`;
  return `${type==='arena'?'상금':'수입'} ${game.activityReward(m.id,type)} G · ${spec.duration}초`;
}
function updateSelected(){
  const m=selected();
  $('member-content').hidden=!m; $('member-empty').hidden=!!m;
  if(!m)return;
  text('member-name',m.name);
  text('member-origin',m.origin||'새로 확보한 모험가');
  const high=aptitude(m,'martial')>=aptitude(m,'performance')?'무예':'예능';
  text('member-talent',`${high} 적성`);
  $('member-portrait').style.filter='none'; $('member-portrait').alt=`${m.name}의 초상화`;
  text('member-wins',m.wins||0); text('member-shows',m.shows||0);
  text('sell-value',`${gold(game.salePrice(m.id))} G`);
  text('martial-value',m.martial); text('performance-value',m.performance);
  text('condition-value',Math.round(m.condition));
  $('condition-value').classList.toggle('low',m.condition<25);
  text('martial-aptitude',`무예 적성 ×${aptitude(m,'martial').toFixed(1)}`);
  text('performance-aptitude',`예능 적성 ×${aptitude(m,'performance').toFixed(1)}`);
  $('schedule-box').hidden=!m.job; $('action-picker').hidden=!!m.job;
  if(m.job){
    text('schedule-label',LABELS[m.job.type]);
    text('schedule-time',`${Math.ceil(remaining(m.job))}초 남음`);
  }
  $('job-progress-fill').style.width=`${progress(m.job)}%`;
  $('job-progress').setAttribute('aria-valuenow',String(Math.round(progress(m.job))));
  const groups={education:['martial','performance'],activity:['arena','show'],rest:['rest']};
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===actionView)));
  document.querySelectorAll('[data-view-panel]').forEach(panel=>panel.hidden=panel.dataset.viewPanel!==actionView);
  for(const type of ['martial','performance','arena','show','rest']){
    const check=game.canStartJob(m.id,type),button=$(`action-${type}`);
    button.disabled=!check.ok||!ready; button.title=check.ok?DETAILS[type]:check.message;
    text(`hint-${type}`,jobHint(m,type));
  }
  $('sell-button').disabled=!!m.job||!ready;
  const checks=groups[actionView].map(type=>game.canStartJob(m.id,type));
  let explanation='';
  if(checks.every(check=>!check.ok)&&!m.job){
    explanation=m.condition<25?'컨디션이 낮습니다. 휴식을 선택하세요.':checks[0].message;
    if(explanation.startsWith('교육 자리가'))explanation='교육 자리가 없습니다. 다른 활동을 선택하세요.';
  }
  text('action-explanation',explanation);
}

function updateOperations(){
  const s=game.state,e=s.expedition,check=game.canDispatch();
  text('operations-summary',e?`원정 ${Math.ceil(remaining(e))}초 남음`:'고블린 일행 대기 중');
  text('expedition-label',e?'고블린 일행 원정 중':'안개 숲길');
  text('expedition-time',e?`${Math.ceil(remaining(e))}초 남음`:'18초');
  $('expedition-fill').style.width=`${progress(e)}%`;
  $('dispatch-button').disabled=!check.ok||!ready;
  text('dispatch-text',e?'파견 중':'일행 파견'); text('dispatch-sub',e?'귀환 대기':'새 인원 1명');
  text('dispatch-hint',e?'거점의 교육과 활동은 계속됩니다.':check.ok?'무료 · 고블린 일행 3명만 출발':check.message);
  const tc=game.trainingCost(),cc=game.capacityCost();
  text('training-value',`${game.trainingUsed()} / ${s.trainingSlots}`);
  text('capacity-summary',`${s.capacity}명`);
  text('training-cost',s.trainingSlots>=3?'최대 확장':`${gold(tc)} G`);
  text('capacity-cost',s.capacity>=14?'최대 확장':`${gold(cc)} G`);
  $('expand-training').disabled=s.trainingSlots>=3||s.gold<tc;
  $('expand-capacity').disabled=s.capacity>=14||s.gold<cc;
}
function updateEvents(){const events=game.events||[],recent=events.map(e=>e.text||'').filter(Boolean).slice(-5).reverse(),signature=recent.join('|');if(!recent.length){const restored=Object.values(game.state.stats).some(value=>value>0)||game.state.roster.some(m=>m.job)||!!game.state.expedition;const emptyMessage=restored?'저장된 거점 상태를 불러왔습니다. 다음 배치를 이어가세요.':'오늘의 첫 교육을 기다립니다.';if($('event-log').textContent!==emptyMessage){const li=document.createElement('li');li.className='log-empty';li.textContent=emptyMessage;$('event-log').replaceChildren(li);}}if(signature!==logSignature&&recent.length){logSignature=signature;$('event-log').replaceChildren(...recent.map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));}for(const event of events){if(event.id<=lastEventId)continue;lastEventId=event.id;const pos=positions.get(event.memberId);if(pos&&event.type==='job-complete')feedback.push({x:pos.x,y:pos.y,text:event.reward?`+${event.reward} G`:event.gain?`숙련 +${event.gain}`:'회복',age:0});}}

function updateUI(){
  ensureSelection(); const s=game.state,stats=s.stats;
  text('gold-value',gold(s.gold)); text('population-value',s.roster.length);
  text('capacity-value',` / ${s.capacity}`); text('roster-count',`${s.roster.length}명`);
  $('pause-button').setAttribute('aria-pressed',String(game.paused));
  $('pause-button').setAttribute('aria-label',game.paused?'계속 진행':'일시 정지');
  const pauseMarkup=game.paused?'▶ <span>재개</span>':'Ⅱ <span>정지</span>';
  if($('pause-button').innerHTML!==pauseMarkup)$('pause-button').innerHTML=pauseMarkup;
  text('speed-button',`${game.speed}×`);
  $('speed-button').setAttribute('aria-label',`재생 속도 ${game.speed===1?2:1}배로 변경`);
  updateRoster(); updateSelected(); updateOperations(); updateEvents();
  const m=selected();
  Object.assign($('game-status').dataset,{gold:s.gold.toFixed(2),roster:String(s.roster.length),capacity:String(s.capacity),trainingSlots:String(s.trainingSlots),trained:String(stats.trained||0),arenaWins:String(stats.arenaWins||0),performances:String(stats.performances||0),sold:String(stats.sold||0),captured:String(stats.captured||0),expedition:s.expedition?'active':'idle',selected:String(selectedId||''),selectedJob:m?.job?.type||'idle',selectedMartial:String(m?.martial||0),selectedPerformance:String(m?.performance||0),selectedCondition:String(m?.condition||0),selectedValue:String(m?game.salePrice(m.id):0),assetsReady:String(ready),paused:String(game.paused),speed:String(game.speed)});
  $('game-status').textContent=`인원 ${s.roster.length} · 골드 ${Math.floor(s.gold)}`;
}
for(const crew of CREW){const card=document.createElement('div');card.className='crew-member';const emblem=document.createElement('span');emblem.className='crew-emblem';emblem.setAttribute('aria-hidden','true');emblem.innerHTML='<svg viewBox="0 0 32 32"><path d="m2 5 11 5 3-5 3 5 11-5-4 17-10 8L6 22Z" fill="currentColor"/><path d="m8 14 6 2-4 4zm16 0-6 2 4 4z" fill="#293c29"/></svg>';const name=document.createElement('strong');name.textContent=crew.name;const role=document.createElement('small');role.textContent=crew.role;card.append(emblem,name,role);$('crew-list').append(card);}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{actionView=button.dataset.view;updateSelected();});
$('open-dispatch').onclick=()=>{$('camp-menu').open=true;$('dispatch-button').focus();};
$('cancel-job').title='사용한 비용과 컨디션은 돌아오지 않습니다.';
document.querySelectorAll('[data-job]').forEach(button=>button.onclick=()=>{const m=selected();if(m)applyResult(game.startJob(m.id,button.dataset.job));});
$('cancel-job').onclick=()=>{const m=selected();if(m)applyResult(game.cancelJob(m.id));};
$('dispatch-button').onclick=()=>applyResult(game.dispatch());
$('expand-capacity').onclick=()=>applyResult(game.expandCapacity());
$('expand-training').onclick=()=>applyResult(game.expandTraining());
$('pause-button').onclick=()=>{game.setPaused(!game.paused);updateUI();};
$('speed-button').onclick=()=>{game.setSpeed(game.speed===1?2:1);updateUI();};
$('sell-button').onclick=()=>{const m=selected();if(!m||m.job)return;saleIntent={id:m.id,price:game.salePrice(m.id)};text('sale-name',m.name);text('sale-price',`${gold(saleIntent.price)} G`);$('sale-dialog').returnValue='';$('sale-dialog').showModal();};
$('sale-dialog').addEventListener('close',()=>{if($('sale-dialog').returnValue==='sell'&&saleIntent){const result=game.sell(saleIntent.id,saleIntent.price);saleIntent=null;applyResult(result);}else saleIntent=null;});
$('reset-button').onclick=()=>{$('reset-dialog').returnValue='';$('reset-dialog').showModal();};
$('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue!=='reset')return;game=new ManagementGame();selectedId=game.state.roster[0]?.id??null;lastEventId=0;rosterSignature='';logSignature='';positions.clear();feedback.length=0;activeFacility='';actionView='education';$('event-log').innerHTML='<li class="log-empty">오늘의 첫 교육을 기다립니다.</li>';save();updateUI();toast('새로운 거점을 시작합니다.');});
canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*W,y=(event.clientY-rect.top)/rect.height*H;let nearest=null,distance=Infinity;for(const[id,pos]of positions){const d=Math.hypot(pos.x-x,pos.y-45-y);if(d<65&&d<distance){nearest=id;distance=d;}}if(nearest!==null)pickMember(nearest);});
document.addEventListener('keydown',event=>{if(event.code!=='Space'||/INPUT|SELECT|BUTTON|TEXTAREA/.test(event.target.tagName)||$('sale-dialog').open||$('reset-dialog').open)return;event.preventDefault();game.setPaused(!game.paused);updateUI();});
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();save();});window.addEventListener('pagehide',save);
function loop(stamp){const raw=Math.min(Math.max(0,(stamp-lastFrame)/1000),.1);lastFrame=stamp;const dt=document.hidden?0:raw;if(ready)game.tick(dt);const visualDt=game.paused?0:dt*game.speed;visualTime+=visualDt;drawScene(visualDt);if(stamp-lastUi>100){updateUI();lastUi=stamp;}if(stamp-lastSave>1500){save();lastSave=stamp;}if(stamp>toastUntil)$('toast').classList.remove('show');requestAnimationFrame(loop);}
ensureSelection();lastEventId=Math.max(0,...(game.events||[]).map(e=>e.id||0));updateUI();loadAssets();requestAnimationFrame(loop);
