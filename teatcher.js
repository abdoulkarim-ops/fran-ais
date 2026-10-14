/* ============================================================
   ESPACE PROFESSEUR — module additionnel pour
   « Le Français avec Abdoul Karim »
   ============================================================ */
(function(){
'use strict';

function extendCloud(){
  if(!window.Cloud || Cloud._teacherExtended) return;
  Cloud._teacherExtended = true;
  const db = Cloud.db;
  if(!db) return;
  import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js").then(F=>{
    Cloud.saveCustomLesson = async (id,data)=>{ try{ await F.setDoc(F.doc(db,'customLessons',id),data); return true; }catch(e){ return false; } };
    Cloud.deleteCustomLesson = async (id)=>{ try{ await F.deleteDoc(F.doc(db,'customLessons',id)); return true; }catch(e){ return false; } };
    Cloud.listCustomLessons = async ()=>{ try{ const s=await F.getDocs(F.collection(db,'customLessons')); const out=[]; s.forEach(d=>out.push(d.data())); return out; }catch(e){ return []; } };
    Cloud.saveGroup = async (id,data)=>{ try{ await F.setDoc(F.doc(db,'groups',id),data); return true; }catch(e){ return false; } };
    Cloud.deleteGroup = async (id)=>{ try{ await F.deleteDoc(F.doc(db,'groups',id)); return true; }catch(e){ return false; } };
    Cloud.listGroups = async ()=>{ try{ const s=await F.getDocs(F.collection(db,'groups')); const out=[]; s.forEach(d=>out.push(d.data())); return out; }catch(e){ return []; } };
    loadCustomLessonsIntoApp();
  }).catch(()=>{});
}

async function loadCustomLessonsIntoApp(){
  if(!Cloud.listCustomLessons) return;
  const list = await Cloud.listCustomLessons();
  window.__customLessons = window.__customLessons || {};
  list.forEach(l=>{
    if(!l || !l.id) return;
    window.__customLessons[l.id] = l;
    CONTENT[l.id] = {
      objectif:l.objectif, explication:l.explication, regle:l.regle,
      exemples:l.exemples, retenir:l.retenir, exercices:l.exercices, quiz:l.quiz,
      mini:(l.exercices && l.exercices[0]) || {t:'vf',q:'Cette leçon te semble-t-elle claire ?',a:true,e:''}
    };
    const i = CATALOG.findIndex(c=>c.id===l.id);
    const row = {id:l.id, cat:l.cat, titre:l.titre, classes:l.classes||[]};
    if(i>=0) CATALOG[i]=row; else CATALOG.push(row);
  });
  if(S.screen==='courses'||S.screen==='exos'||S.screen==='teacher') render(true);
}

function computeStats(students){
  const agg={};
  students.forEach(st=>{
    const sc=(st&&st.lessonScores)||{};
    Object.keys(sc).forEach(id=>{ (agg[id]=agg[id]||[]).push(sc[id]); });
  });
  const rows=Object.keys(agg).map(id=>{
    const m=CATALOG.find(l=>l.id===id);
    const vals=agg[id], avg=vals.reduce((s,v)=>s+v,0)/vals.length;
    return {id, titre:m?m.titre:id, avg, n:vals.length};
  });
  rows.sort((a,b)=>a.avg-b.avg);
  const allVals=[].concat(...Object.values(agg));
  const classAvg=allVals.length?allVals.reduce((s,v)=>s+v,0)/allVals.length:null;
  return {rows, classAvg};
}

if(!S.ui.teacherTab) S.ui.teacherTab='eleves';

function vTeacherFull(){
  const list = S.teacherData||[];
  const tabv = S.ui.teacherTab;
  const tabsHTML = `<div class="seg" role="group" aria-label="Espace professeur" style="margin-top:14px">
    ${[['eleves','Élèves'],['stats','Statistiques'],['classes','Classes'],['lecons','Leçons']]
      .map(([v,l])=>`<button data-a="teacherTab" data-v="${v}" aria-pressed="${tabv===v}">${l}</button>`).join('')}
  </div>`;
  let body='';
  if(S.teacherLoading){ body='<p class="note">Chargement…</p>'; }
  else if(tabv==='eleves'){ body=teacherStudentsHTML(list); }
  else if(tabv==='stats'){ body=teacherStatsHTML(list); }
  else if(tabv==='classes'){ body=teacherClassesHTML(list); }
  else if(tabv==='lecons'){ body=teacherLessonsHTML(); }
  return `${brandBar()}<div class="screen" style="padding-top:8px">
    <h1 class="t1">Espace professeur</h1>
    <p class="note" style="margin-top:0">Résultats des élèves inscrits avec une adresse e-mail.</p>
    ${tabsHTML}<div style="margin-top:16px">${body}</div>
    <button class="btn" data-a="refreshTeacher" style="margin-top:14px">Actualiser</button>
  </div>`;
}

function teacherStudentsHTML(list){
  const byClasse={};
  list.forEach(x=>{ const k=(x.classe&&CL.includes(x.classe))?x.classe:'Sans classe'; (byClasse[k]=byClasse[k]||[]).push(x); });
  const order=CL.concat(['Sans classe']);
  const classes=Object.keys(byClasse).sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  if(!classes.length) return '<p class="note">Aucun élève n\'a encore relié son compte à une adresse e-mail.</p>';
  return classes.map(c=>{
    const items=byClasse[c].slice().sort((a,b)=>(a.nom||'').localeCompare(b.nom||'','fr'));
    return `<h2 class="t2">${esc(c)} <span class="muted small">(${items.length})</span></h2>`+items.map(x=>`
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>${esc(((x.prenom||'')+' '+(x.nom||'')).trim()||'(sans nom)')}</b><span class="small muted">${x.points||0} pts</span></div>
        <div class="small muted" style="margin-top:4px">${x.lessons||0} leçon(s) · ${x.quizzes||0} quiz · moyenne ${x.avgQuiz==null?'—':fmt(x.avgQuiz)+'/10'}</div>
      </div>`).join('');
  }).join('');
}

function teacherStatsHTML(list){
  if(!list.length) return '<p class="note">Pas encore de données pour calculer des statistiques.</p>';
  const {rows, classAvg} = computeStats(list);
  const worst = rows.slice(0,5);
  const pts = list.reduce((s,x)=>s+(x.points||0),0)/list.length;
  return `<div class="stats">
    <div class="stat"><b>${list.length}</b><span>Élèves suivis</span></div>
    <div class="stat"><b>${classAvg==null?'—':fmt(classAvg)+'/10'}</b><span>Moyenne générale</span></div>
    <div class="stat"><b>${fmt(pts)}</b><span>Points moyens</span></div>
  </div>
  <h2 class="t2">Leçons les plus difficiles</h2>
  ${worst.length?worst.map(r=>`<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b>${esc(r.titre)}</b><span class="small muted">${fmt(r.avg)}/10</span></div><div class="pbar" style="margin-top:8px"><i style="width:${r.avg*10}%"></i></div><div class="small muted" style="margin-top:4px">${r.n} résultat(s)</div></div>`).join(''):'<p class="note">Pas encore assez de quiz réalisés.</p>'}`;
}

function teacherClassesHTML(list){
  const groups = S.teacherGroups||[];
  const rows = groups.map(g=>{
    const members=(g.members||[]).map(uid=>list.find(x=>x.uid===uid)).filter(Boolean);
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b>${esc(g.name)}</b><span class="small muted">${members.length} élève(s)</span></div>
      <div class="small muted" style="margin:6px 0">${members.map(m=>esc(((m.prenom||'')+' '+(m.nom||'')).trim())).join(', ')||'Aucun élève pour le moment.'}</div>
      <div class="row2"><button class="btn" data-a="editGroup" data-id="${g.id}">Gérer les élèves</button><button class="btn btn-danger" data-a="deleteGroup" data-id="${g.id}">Supprimer</button></div>
    </div>`;
  }).join('');
  return `${rows||'<p class="note">Aucune classe créée pour le moment.</p>'}<div class="stack" style="margin-top:12px"><button class="btn btn-primary" data-a="newGroup">+ Créer une classe</button></div>`;
}

function teacherLessonsHTML(){
  const mine = Object.values(window.__customLessons||{});
  const rows = mine.map(l=>`<div class="card" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><b>${esc(l.titre)}</b><span class="tag">${esc((CAT[l.cat]||{nom:l.cat}).nom)}</span></div>
    <div class="row2" style="margin-top:10px"><button class="btn" data-a="editLesson" data-id="${l.id}">Modifier</button><button class="btn btn-danger" data-a="deleteLesson" data-id="${l.id}">Supprimer</button></div>
  </div>`).join('');
  return `${rows||'<p class="note">Tu n\'as pas encore ajouté de leçon.</p
