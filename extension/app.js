'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {
  page:'welcome', mode:null, courses:[], course:null, lectures:[],
  selected:new Set(), questionCount:5, difficulty:'medium',
  questions:[], answers:[], current:0, history:[], busy:false
};
const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
const MAX_FILES = 12, MAX_FILE_BYTES = 5*1024*1024;
const BACKEND = 'http://127.0.0.1:8787';
const iconArrow = ' →';
const iconStar = ' ✦';

const store = {
  async get(key) {
    if (isExtension) return (await chrome.storage.local.get(key))[key];
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  },
  async set(key,value) {
    if (isExtension) await chrome.storage.local.set({[key]:value});
    else localStorage.setItem(key,JSON.stringify(value));
  }
};
function notice(message, type='error') {
  $('flash').textContent=message;
  $('flash').className='flash '+type;
  $('app-scroll').scrollTop=0;
}
function clearNotice() { $('flash').className='flash hidden'; $('flash').textContent=''; }
function navigate(page) { state.page=page; clearNotice(); render(); $('app-scroll').scrollTop=0; }
function button(label, action, kind='primary', disabled=false) {
  return `<button class="btn btn-${kind}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
}
function heading(kicker, title, description='') {
  return `<div class="page-head"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>`;
}
function tag(value) { return `<span class="tag">${escapeHTML(value)}</span>`; }
function welcome() {
  return `<section class="hero">
    <div class="hero-tag">✦ YOUR AI STUDY COMPANION</div>
    <h1>From lectures<br>to <span>quiz-ready.</span></h1>
    <p>Pick lectures from Google Classroom and generate smart practice quizzes in minutes.</p>
    <div class="hero-art"><div class="sheet back"></div><div class="sheet front"><b>Q.</b><i></i><i></i><i></i><strong>✓</strong></div><span>✦</span></div>
    <div class="hero-foot">NO MANUAL DOWNLOADS · GOOGLE CLASSROOM</div>
  </section>
  <div class="section-label">GET STARTED <span>01 — 03</span></div>
  <div class="step"><b>01</b><div><strong>Connect your Classroom</strong><small>Read-only Google account access</small></div></div>
  <div class="step"><b>02</b><div><strong>Select your lectures</strong><small>Choose only the material you want</small></div></div>
  <div class="step"><b>03</b><div><strong>Generate and practice</strong><small>Instant questions, feedback, and scores</small></div></div>
  ${button('Connect Google Classroom'+iconArrow,'connect')}
  ${button('Explore the interactive demo','demo','outline')}
  <p class="fine-print">Only explicitly selected lecture content is sent to your configured AI backend. The demo uses fictional sample courses.</p>`;
}
function coursesView() {
  const courseCards=state.courses.map((course,i)=>`<button class="course-card" data-action="course" data-id="${escapeHTML(course.id)}"
    data-search="${escapeHTML((course.name+' '+(course.section||'')).toLowerCase())}">
    <span class="course-art color-${i%3}">${escapeHTML(course.name.substring(0,1))}</span>
    <span class="course-main"><strong>${escapeHTML(course.name)}</strong><small>${escapeHTML(course.section||'Google Classroom')} · ${state.mode==='demo'?'Demo':'Course'}</small></span>
    <span class="chevron">›</span></button>`).join('');
  return `${heading(state.mode==='demo'?'DEMO CLASSROOM':'MY CLASSROOM','Choose your <span class="accent">course.</span>','Where are we studying today?')}
    <label class="searchbox"><span>⌕</span><input id="course-search" placeholder="Search your courses..." type="search" aria-label="Search courses"></label>
    <div class="list-heading"><strong>Your subjects</strong>${tag(state.courses.length+' courses')}</div>
    <div class="course-list">${courseCards||'<p class="empty-state">No courses are available for this account.</p>'}</div>
    ${state.mode==='demo'?`<div class="demo-notice"><strong>Demo mode</strong><p>Sample classes and lectures, not your actual Google account.</p>${button('Switch to Google Classroom','connect','outline')}</div>`:''}`;
}
function fileCount(lecture) {
  return (lecture.materials||[]).filter(m=>m.driveFile?.driveFile?.id).length;
}
function lecturesView() {
  const rows=state.lectures.map((lecture,i)=>{
    const selected=state.selected.has(lecture.id);
    return `<label class="lecture-card ${selected?'selected':''}">
      <input class="lecture-check" type="checkbox" data-id="${escapeHTML(lecture.id)}" ${selected?'checked':''}>
      <span class="lecture-info"><span class="lecture-meta">${escapeHTML(lecture.topicName||'Classwork')} · ${fileCount(lecture)} files</span>
        <strong>${escapeHTML(lecture.title)}</strong>
        <small>${escapeHTML((lecture.description||'No description').slice(0,125))}</small></span>
      <span class="check-mark">${selected?'✓':''}</span></label>`;
  }).join('');
  return `<button class="back-btn" data-action="back-courses">‹ All courses</button>
    ${heading('SELECT MATERIAL',escapeHTML(state.course?.name||'Course'),'Select the lectures you want to study.')}
    <div class="list-heading"><strong>Available lectures</strong><button class="text-button" data-action="select-all">${state.selected.size===state.lectures.length&&state.selected.size?'Deselect all':'Select all'}</button></div>
    <div class="lecture-list">${rows||'<p class="empty-state">No published lectures found.</p>'}</div>
    <div class="quiz-config"><div class="config-head"><span class="eyebrow">QUIZ PREFERENCES</span>${tag(state.selected.size+' selected')}</div>
      <label class="field-label">Number of questions</label>
      <div class="segmented">${[5,10,15,20].map(n=>`<button data-action="count" data-count="${n}" class="segment ${state.questionCount===n?'current':''}">${n}</button>`).join('')}</div>
      <label class="field-label">Difficulty</label>
      <div class="segmented">${['easy','medium','hard'].map(level=>`<button data-action="difficulty" data-level="${level}" class="segment ${state.difficulty===level?'current':''}">${level[0].toUpperCase()+level.slice(1)}</button>`).join('')}</div>
      ${button(state.busy?'Generating...':'Generate my quiz'+iconStar,'generate','primary',!state.selected.size||state.busy)}
      <p class="fine-print">${state.mode==='demo'?'Demo questions are fixed authored examples.':'Readable attachments are processed temporarily; no manual download is needed.'}</p>
    </div>`;
}
function quizView() {
  const q=state.questions[state.current];
  if(!q) return '<p class="empty-state">No quiz in progress.</p>';
  const answer=state.answers[state.current];
  const answered=Number.isInteger(answer);
  const percent=Math.round((state.current+1)/state.questions.length*100);
  const options=q.options.map((value,i)=>`<button class="answer-option ${answered?(i===q.answerIndex?'correct':i===answer?'incorrect':'muted'):''}" data-action="answer" data-answer="${i}" ${answered?'disabled':''}>
    <span class="letter">${'ABCD'[i]}</span><span>${escapeHTML(value)}</span><span class="mark">${answered&&i===q.answerIndex?'✓':answered&&i===answer?'×':''}</span></button>`).join('');
  return `<div class="quiz-topline"><button class="back-btn" data-action="back-lectures">‹ Exit practice</button>${tag(state.mode==='demo'?'DEMO':'LIVE QUIZ')}</div>
    <div class="quiz-progress-label"><span>Question ${state.current+1} of ${state.questions.length}</span><strong>${percent}%</strong></div>
    <div class="progress"><div style="width:${percent}%"></div></div>
    <div class="question-card"><span class="eyebrow">QUESTION ${String(state.current+1).padStart(2,'0')}</span>
      <h2>${escapeHTML(q.question)}</h2><small>↳ ${escapeHTML(q.sourceTitle||'Selected lecture')}</small></div>
    <div class="answers-label">CHOOSE ONE ANSWER</div><div class="answer-list">${options}</div>
    ${answered?`<div class="explanation ${answer===q.answerIndex?'good':'bad'}"><strong>${answer===q.answerIndex?'✓ Exactly right!':'Review this concept'}</strong><p>${escapeHTML(q.explanation)}</p></div>`:'<p class="answer-tip">Select an answer to reveal its explanation.</p>'}
    <div class="question-foot"><small>${state.answers.filter(Number.isInteger).length} answered</small>
    ${button(state.current===state.questions.length-1?'See my results →':'Next question →','next','primary',!answered)}</div>`;
}
function resultsView() {
  const correct=state.questions.filter((q,i)=>state.answers[i]===q.answerIndex).length;
  const pct=Math.round(correct/Math.max(1,state.questions.length)*100);
  const cards=state.questions.map((q,i)=>`<details class="review-item"><summary><span class="review-icon ${state.answers[i]===q.answerIndex?'pass':'fail'}">${state.answers[i]===q.answerIndex?'✓':'×'}</span><span>${escapeHTML(q.question)}</span><span>⌄</span></summary>
    <div><p><strong>Your answer:</strong> ${escapeHTML(q.options[state.answers[i]]||'No answer')}</p>
    <p><strong>Correct answer:</strong> ${escapeHTML(q.options[q.answerIndex])}</p><p>${escapeHTML(q.explanation)}</p></div></details>`).join('');
  return `<section class="results-banner"><span class="results-stars">✦ ✧ ✦</span><div class="score-ring" style="--score:${pct}%"><div><strong>${pct}%</strong><small>YOUR SCORE</small></div></div>
    <h1>${pct>=80?'Amazing work!':pct>=50?'Nice progress!':'Keep practicing!'}</h1><p>You got <strong>${correct} out of ${state.questions.length}</strong> right.</p></section>
    <div class="metric-row"><div><b>${correct}</b><small>Correct</small></div><div><b>${state.questions.length-correct}</b><small>Incorrect</small></div><div><b>${state.questions.length}</b><small>Questions</small></div></div>
    <div class="list-heading"><strong>Review your answers</strong>${tag('With explanations')}</div><div class="review-list">${cards}</div>
    ${button('Create another quiz'+iconStar,'back-lectures')}${button('Copy feedback template','feedback','outline')}`;
}
function historyView() {
  const entries=state.history.filter(x=>x&&typeof x.course==='string'&&typeof x.date==='string'
    &&Number.isFinite(x.score)&&Number.isFinite(x.correct)&&Number.isFinite(x.total))
    .map(x=>`<div class="history-card"><span class="history-mark">${Math.max(0,Math.min(100,Math.round(x.score)))}%</span><div><strong>${escapeHTML(x.course)}</strong><small>${escapeHTML(x.date)} · ${Math.round(x.correct)}/${Math.round(x.total)} correct</small></div></div>`).join('');
  return `${heading('MY PROGRESS','Quiz <span class="accent">history.</span>','Your results stay saved in this browser.')}
    ${entries||'<div class="empty-state"><strong>No quizzes yet.</strong><p>Complete a practice quiz to see your results here.</p></div>'}
    ${button('Study a subject'+iconArrow,'home')}`;
}
function settingsView() {
  return `${heading('PREFERENCES','Settings<span class="accent">.</span>','Manage study and account options.')}
    <div class="settings-card"><div class="settings-row"><span>Mode</span>${tag(state.mode==='demo'?'Interactive demo':state.mode==='live'?'Google account':'Not connected')}</div>
    <div class="settings-row"><span>AI service</span><span>Local FastAPI server</span></div>
    <div class="settings-row"><span>Server address</span><code>127.0.0.1:8787</code></div>
    <div class="settings-row"><span>Quiz attempts</span>${tag(state.history.length)}</div></div>
    <div class="settings-card"><h3>Privacy</h3><p>Classroom and Drive access is read-only. Only lecture content you explicitly select is sent to your local service and then Gemini for generating quizzes. Google OAuth tokens are not forwarded to the AI service.</p></div>
    ${button('Connect Google Classroom','connect')}${button('Try demo mode','demo','outline')}
    ${state.mode==='live'?button('Disconnect Google','disconnect','outline'):''}
    ${button('Clear quiz history','clear-history','quiet')}${button('Copy feedback template','feedback','quiet')}`;
}
function render() {
  const views={welcome,courses:coursesView,lectures:lecturesView,quiz:quizView,results:resultsView,history:historyView,settings:settingsView};
  $('screen').innerHTML=(views[state.page]||welcome)();
  document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.nav===(['welcome','courses','lectures','quiz','results'].includes(state.page)?'home':state.page)));
}

async function googleToken(interactive=false) {
  if(!isExtension) throw Error('Google Classroom sign-in works only when installed as a Chrome extension. Try demo mode.');
  if((chrome.runtime.getManifest().oauth2?.client_id||'').includes('REPLACE_WITH_'))
    throw Error('Configure your Chrome extension OAuth client ID in extension/manifest.json first.');
  const result=await chrome.identity.getAuthToken({interactive});
  if(!result?.token) throw Error('Google did not return an OAuth token.');
  return result.token;
}
async function googleFetch(url,token,retried=false) {
  const r=await fetch(url,{headers:{Authorization:'Bearer '+token}});
  if(r.status===401&&!retried&&isExtension){
    await chrome.identity.removeCachedAuthToken({token});
    return googleFetch(url,await googleToken(false),true);
  }
  if(!r.ok){
    let detail={}; try{detail=await r.json();}catch{}
    throw Error(detail.error?.message||`Google API error (${r.status}). Check APIs and permissions.`);
  }
  return r;
}
async function googleJson(url,token) { return (await googleFetch(url,token)).json(); }
async function paged(url,key,token) {
  let next='',items=[],pages=0;
  do{
    const data=await googleJson(url+(next?(url.includes('?')?'&':'?')+'pageToken='+encodeURIComponent(next):''),token);
    items.push(...(data[key]||[])); next=data.nextPageToken||'';
  }while(next&&++pages<50);
  if(next)throw Error('This course has more Classroom pages than can be loaded safely. Narrow your selection or contact support.');
  return items;
}
async function connect() {
  try {
    state.busy=true; render();
    const token=await googleToken(true);
    const classes=await paged('https://classroom.googleapis.com/v1/courses?pageSize=100&courseStates=ACTIVE','courses',token);
    state.courses=classes.filter(c=>c.courseState==='ACTIVE');
    state.mode='live'; state.course=null; state.selected=new Set(); navigate('courses');
  }catch(e){notice(e.message||String(e));}finally{state.busy=false;render();}
}
function enterDemo(){
  state.mode='demo'; state.courses=DEMO_COURSES; state.selected=new Set(); state.course=null; navigate('courses');
}
function asLecture(entry,type){
  return {id:type+':'+entry.id,title:entry.title||type,topicName:type,description:entry.description||entry.text||'',materials:entry.materials||[]};
}
async function openCourse(id) {
  state.course=state.courses.find(c=>c.id===id);
  if(!state.course)return;
  state.selected=new Set();
  if(state.mode==='demo'){state.lectures=DEMO_LECTURES[id]||[];navigate('lectures');return;}
  try {
    state.busy=true;render();
    const token=await googleToken(false),base='https://classroom.googleapis.com/v1/courses/'+encodeURIComponent(id);
    const req=[
      paged(base+'/courseWorkMaterials?pageSize=100','courseWorkMaterial',token),
      paged(base+'/courseWork?pageSize=100','courseWork',token),
      paged(base+'/announcements?pageSize=100','announcements',token)
    ];
    const settled=await Promise.allSettled(req);
    if(settled.every(r=>r.status==='rejected'))throw settled[0].reason;
    state.lectures=settled.flatMap((r,i)=>r.status==='fulfilled'?r.value.map(item=>asLecture(item,['material','assignment','announcement'][i])):[]);
    state.lectures.sort((a,b)=>a.title.localeCompare(b.title));
    navigate('lectures');
    const failed=settled.filter(r=>r.status==='rejected').length;
    if(failed)notice(`${failed} Classroom categories were inaccessible. Showing what is available.`,'warning');
  }catch(e){notice(e.message||String(e));}finally{state.busy=false;render();}
}
function toBase64(buffer){
  const bytes=new Uint8Array(buffer);let raw='';
  for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(raw);
}
async function loadDriveFile(file,token){
  const info=await googleJson('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'?fields=id,name,mimeType,size',token);
  const name=info.name||file.title||'Untitled',mime=info.mimeType||'',id=encodeURIComponent(file.id);
  if(mime==='application/vnd.google-apps.document'||mime==='application/vnd.google-apps.presentation'){
    const data=await googleFetch('https://www.googleapis.com/drive/v3/files/'+id+'/export?mimeType=text%2Fplain',token);
    return {name,mimeType:'text/plain',text:(await data.text()).slice(0,70000)};
  }
  if(mime.startsWith('application/vnd.google-apps.'))return {skipped:name+': unsupported Google Workspace format'};
  const text=mime.startsWith('text/')||mime==='application/json';
  const binary=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(mime)||/\.(pdf|docx|pptx)$/i.test(name);
  if(!text&&!binary)return {skipped:name+': unsupported format'};
  if(Number(info.size||0)>MAX_FILE_BYTES)return {skipped:name+': exceeds 5 MB'};
  const media=await googleFetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',token);
  const bytes=await media.arrayBuffer();
  if(bytes.byteLength>MAX_FILE_BYTES)return {skipped:name+': exceeds 5 MB'};
  return text?{name,mimeType:mime||'text/plain',text:new TextDecoder().decode(bytes).slice(0,70000)}:{name,mimeType:mime||'application/octet-stream',base64:toBase64(bytes)};
}
async function sourceData(lectures){
  const token=await googleToken(false),sources=[],skipped=[];
  let count=0;
  for(const lecture of lectures){
    const source={title:lecture.title,description:lecture.description||'',files:[]};
    for(const material of lecture.materials||[]){
      if(material.driveFile?.driveFile?.id){
        if(count>=MAX_FILES){skipped.push('Maximum 12 readable attachments per quiz.');continue;}
        try{
          const file=await loadDriveFile(material.driveFile.driveFile,token);
          if(file.skipped)skipped.push(file.skipped);
          else {source.files.push(file);count++;}
        }catch(e){skipped.push((material.driveFile.driveFile.title||'Attachment')+': '+e.message);}
      }else if(material.link||material.youtubeVideo)skipped.push(lecture.title+': external link/video not automatically parsed');
    }
    sources.push(source);
  }
  return {sources,skipped};
}
function validateQuizResponse(body, selectedTitles, count) {
  if(!body||!Array.isArray(body.questions)||body.questions.length===0)
    throw Error('The AI server returned an empty or invalid quiz. Please try again.');
  const allowed=new Set(selectedTitles);
  const valid=[];
  const seen=new Set();
  for(const q of body.questions){
    if(!q||typeof q.question!=='string'||q.question.trim().length<12
      ||!Array.isArray(q.options)||q.options.length!==4
      ||q.options.some(x=>typeof x!=='string'||!x.trim())
      ||new Set(q.options.map(x=>x.trim().toLowerCase())).size!==4
      ||!Number.isInteger(q.answerIndex)||q.answerIndex<0||q.answerIndex>3
      ||typeof q.explanation!=='string'||q.explanation.trim().length<15
      ||typeof q.sourceTitle!=='string'||!allowed.has(q.sourceTitle))
      throw Error('The AI server returned a malformed or uncited question. Please generate a new quiz.');
    const id=q.question.trim().toLowerCase().replace(/\s+/g,' ');
    if(seen.has(id))continue;
    seen.add(id);
    valid.push(q);
    if(valid.length===count)break;
  }
  if(!valid.length)throw Error('No usable quiz questions were returned.');
  return valid;
}
async function generate(){
  if(!state.selected.size||state.busy)return;
  const picked=state.lectures.filter(l=>state.selected.has(l.id));
  if(state.mode==='demo'){
    const pool=DEMO_QUESTIONS.concat(typeof DEMO_EXTRA_QUESTIONS==='undefined'?[]:DEMO_EXTRA_QUESTIONS);
    const match=pool.filter(q=>picked.some(l=>l.id===q.lectureId));
    if(!match.length){notice('Select a lecture that includes sample questions.');return;}
    state.questions=match.slice(0,state.questionCount);
    state.answers=Array(state.questions.length).fill(null);state.current=0;
    navigate('quiz');
    if(match.length<state.questionCount)notice(`Demo has ${match.length} authored questions for these lectures.`,'warning');
    return;
  }
  try{
    state.busy=true;render();
    const {sources,skipped}=await sourceData(picked);
    if(!sources.some(s=>s.description.trim().length>150||s.files.some(f=>f.base64||f.text?.trim())))
      throw Error('No readable lecture notes found. Select lectures with Docs, Slides, PDF, DOCX, PPTX or substantial descriptions.');
    const payload=JSON.stringify({sources,question_count:state.questionCount,difficulty:state.difficulty});
    if(new TextEncoder().encode(payload).byteLength>22*1024*1024)
      throw Error('Selected lecture files exceed the 22 MB quiz request limit. Select fewer or smaller attachments.');
    const response=await fetch(BACKEND+'/api/generate',{
      method:'POST',headers:{'Content-Type':'application/json'},body:payload
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(body.detail||`Quiz generation failed (${response.status}).`);
    state.questions=validateQuizResponse(body,picked.map(x=>x.title),state.questionCount);
    state.answers=Array(state.questions.length).fill(null);state.current=0;
    navigate('quiz');
    if(skipped.length)notice(`Skipped ${skipped.length} attachments: ${skipped.slice(0,2).join('; ')}${skipped.length>2?'…':''}`,'warning');
  }catch(e){notice(e instanceof TypeError?'Cannot reach FastAPI at 127.0.0.1:8787. Start it following README.md.':e.message);}
  finally{state.busy=false;render();}
}
async function finish(){
  const correct=state.questions.filter((q,i)=>state.answers[i]===q.answerIndex).length;
  state.history.unshift({course:state.course?.name||'Demo',correct,total:state.questions.length,
    score:Math.round(correct/state.questions.length*100),date:new Date().toLocaleDateString()});
  state.history=state.history.slice(0,30);
  await store.set('quizcrate_history',state.history);navigate('results');
}
async function disconnect(){
  if(isExtension)await chrome.identity.clearAllCachedAuthTokens();
  state.mode=null;state.course=null;state.selected=new Set();state.courses=[];state.lectures=[];navigate('welcome');
}
async function copyFeedback(){
  const feedback='QuizCrate AI feedback\nWhat I liked:\nWhat did not work:\nSuggested improvement:\nBrowser version:\n';
  try{await navigator.clipboard.writeText(feedback);notice('Feedback template copied.','success');}
  catch{notice('Please share what happened and what you expected.','warning');}
}
$('screen').addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');if(!el)return;
  const action=el.dataset.action;if(state.busy&&action!=='home')return;
  try{switch(action){
    case 'connect':await connect();break;
    case 'demo':enterDemo();break;
    case 'course':await openCourse(el.dataset.id);break;
    case 'back-courses':navigate('courses');break;
    case 'back-lectures':navigate('lectures');break;
    case 'home':navigate(state.mode?'courses':'welcome');break;
    case 'select-all':state.selected=state.selected.size===state.lectures.length?new Set():new Set(state.lectures.map(l=>l.id));render();break;
    case 'count':state.questionCount=Number(el.dataset.count);render();break;
    case 'difficulty':state.difficulty=el.dataset.level;render();break;
    case 'generate':await generate();break;
    case 'answer':if(!Number.isInteger(state.answers[state.current])){state.answers[state.current]=Number(el.dataset.answer);render();}break;
    case 'next':if(!Number.isInteger(state.answers[state.current]))break;if(state.current+1<state.questions.length){state.current++;render();}else await finish();break;
    case 'feedback':await copyFeedback();break;
    case 'disconnect':await disconnect();break;
    case 'clear-history':state.history=[];await store.set('quizcrate_history',[]);render();notice('Quiz history cleared.','success');break;
  }}catch(e){notice(e.message||String(e));}
});
$('screen').addEventListener('change',event=>{
  if(!event.target.matches('.lecture-check'))return;
  if(event.target.checked)state.selected.add(event.target.dataset.id);
  else state.selected.delete(event.target.dataset.id);
  render();
});
$('screen').addEventListener('input',event=>{
  if(event.target.id!=='course-search')return;
  const query=event.target.value.toLowerCase();
  document.querySelectorAll('.course-card').forEach(card=>card.hidden=!card.dataset.search.includes(query));
});
$('settings-button').addEventListener('click',()=>navigate('settings'));
document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav==='home'?(state.mode?'courses':'welcome'):btn.dataset.nav)));
(async()=>{const previous=await store.get('quizcrate_history');state.history=Array.isArray(previous)?previous:[];render();})().catch(e=>notice(e.message));
