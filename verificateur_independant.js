// Vérificateur indépendant (Prompt Maître V7.2 §20) — lance la génération réelle de la page dans Chromium puis contrôle chaque post avec ses propres règles.
// Usage : NODE_PATH=$(npm root -g) node verificateur_independant.js /chemin/index_v72_final_fix6.html 7   (7 séries × 5 × 30 = 1 050 générations)
// Vérificateur INDÉPENDANT (V7.2 §20) : aucune fonction de validation de la page n'est appelée — seule la génération l'est.
const { chromium } = require('playwright'); const fs=require('fs');
const [,,FILE,SERIES='7',OUT='/tmp/campaign.json']=process.argv;
const asc=s=>s.normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const lk=s=>asc(s).replace(/-/g,' ');
const split=t=>({tags:(t.match(/#[\p{L}\p{N}_]+/gu)||[]),body:t.replace(/#[\p{L}\p{N}_]+/gu,'').trim()});
const sents=b=>b.split(/(?<=[.!?…])\s+|\n+/).map(x=>x.trim()).filter(Boolean);
const STOP=new Set('avec dans pour plus mais comme cette cela dont tout tous sont etre sans entre leur leurs vers chez donc aussi ainsi alors encore meme ou est les des une que qui par sur'.split(' '));
const stems=s=>[...new Set(asc(s).split(/[^a-z0-9]+/).filter(w=>w.length>=5&&!STOP.has(w)).map(w=>w.slice(0,5)))];
const jac=(a,b)=>{const A=new Set(a),B=new Set(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>B.has(x)&&i++);return i/(A.size+B.size-i)};
const fam=h=>{const s=asc(h).trim();
  if(/\?/.test(h))return'F'; if(/^(imaginons|supposons|prenons|imaginez)/.test(s))return'I';
  if(/^(on peut comparer|cela ressemble|c'est un peu comme|comme un |comme une )|un peu comme/.test(s))return'H';
  if(/^(derriere|le terme|le mot|l'expression|sous l'appellation|un terme|une expression|ce terme)/.test(s))return'A';
  if(/\b(designe|correspond a|consiste a|signifie|veut dire)\b|\best une? notion\b/.test(s))return'B';
  if(/^(la difficulte|le defi|l'enjeu|le principal enjeu|le vrai enjeu)/.test(s))return'G';
  if(/\bne (se limite|signifie|veut) pas\b|\bpourtant\b|\bplutot que\b|\bcontrairement\b|\bau contraire\b|\ba l'inverse\b|\balors que\b|^ce n'est pas|^le probleme n'est pas/.test(s))return'E';
  if(/^(sans |une mauvaise|mal comprise|passer a cote)|\bpeut (conduire|compliquer|entrainer|fausser)\b|\bpermet de\b/.test(s))return'D';
  if(/^(je|j'|mon|ma|mes)\b/.test(s))return'K'; if((s.match(/[a-z0-9]+/g)||[]).length<=9)return'J'; return'C';};
const CLOSE=[['A','B'],['C','D'],['F','G'],['K','L'],['H','I']];
const close=(a,b)=>a===b||CLOSE.some(p=>p.includes(a)&&p.includes(b));
const cfunc=c=>{const s=asc(c);
  if(/\?\s*$/.test(c.trim()))return'question';
  const T=[['limite',/toutefois|en revanche|ne (suffit|garantit|couvre|remplace|protege) (pas|jamais)|reste une limite|ne couvre qu|aucune notion ne protege|n'est pas suffisant/],['distinction',/distinguer|confondre|difference entre|frontieres|se distingue|ne se confond/],['consequence',/par consequent|d'ou |peut conduire|peut fausser|peut brouiller|deviennent plus difficiles|mal comprise|mauvais (choix|reflexes)|mauvaise comprehension/],['ouverture',/pour aller plus loin|prochaine etape|d'autres (aspects|notions)|reste a |quelles autres notions|une question reste ouverte|sources? officielles?|guides? publics?/],['rappel',/principe de base|regle de base|rappel|le principe vaut/],['lien',/se relie|est liee? a|va de pair|croise d'autres/],['pedagogique',/pour (un )?debutant|pour debuter|vocabulaire|definitions? claires?|point d'entree|s'aborde par etapes/],['perspective',/plus largement|au-dela|contexte plus large|selon le contexte/],['synthese',/en resume|en somme|pour resumer|au fond|se comprend d'abord/]];
  const f=T.find(x=>x[1].test(s));return f?f[0]:'autre';};
const WATCH=[['retenir',/^(ce que je retiens|a retenir|un bon rappel)/],['montre',/^(cela montre|cette notion montre|c'est un exemple qui montre|ca montre)/],['interet',/^(ce que je trouve|ce qui m'interesse)/],['comprendre',/^(cela permet de comprendre|cette notion permet de comprendre|c'est une notion que)/],['justement',/^c'est justement/],['continuer',/^(je continuerai|je garderai)/]];
const wfam=c=>{const s=asc(c).trim();const f=WATCH.find(x=>x[1].test(s));return f?f[0]:null};
const FIRST=/(?<![a-z])(je|j'|me|m'|moi|mon|ma|mes)(?![a-z])/;
const IMPL=/sur le terrain|lors d'une mission|\bmissions?\b|plusieurs cas|quelques cas|\bcas (etudies|rencontres|analyses|observes)|situation vecue|experience recente|ces derniers temps|l'autre jour|\bhier\b|ce week-end|la semaine derniere|quelqu'un qui a |une personne qui a |en creusant|\bon (a|en a) (compris|vu|constate|decouvert|remarque|teste|profite)|j'ai |corrige depuis|visiblement/;
const EMO=/vertige|impressionn|surpris|surprenant|etonn|inquiet|fait reflechir|fascin|passionn|angoiss|effray|fait peur|qui frappe|satisfaction|remet les idees|qui surprend|convaincant|incroyable|dingue/;
const VAGUE=/\bquelques? (secondes?|minutes?|heures?|jours?|semaines?|mois|instants?)\b|\bun instant\b|\bun (court|long) moment\b|en un clin d'oeil|\bplusieurs (jours|semaines|mois|annees)\b|\bdes (annees|milliards|millions)\b|depuis des annees|\bavec le temps\b|\bau fil (?:de|du|des)\b|apres quelques|en un instant|apres un instant/;
const CQ=/gamifi|produit professionnel|realisation professionnelle|\bbugs?\b|\bscores?\b|\bquiz\b|session de test|prochaine etape|mini-defi|week-end/;
const BANTAG=['#hackthebox','#opentowork','#analyste','#pentest','#alternance2027','#rennes','#recherchealternance'];
(async()=>{
  const br=await chromium.launch(); const page=await (await br.newContext()).newPage();
  await page.goto('file://'+FILE); await page.waitForTimeout(500);
  const html=fs.readFileSync(FILE,'utf-8'); const ROWTAGS=new Set([...html.matchAll(/\['[^']+','(#[^']+)','[^']+'\]/g)].map(m=>m[1].toLowerCase()));
  ['#informatique','#sécuritéinformatique','#réseau','#python','#programmation','#rgpd','#donnéespersonnelles'].forEach(t=>ROWTAGS.add(t));
  const res={badConcl:{},badHook:{},famPairs:{},durs:{},files:FILE,series:[],reasons:{},warns:{},examples:[],nullGen:0,total:0,ok:0,src:{}};
  for(let s=0;s<+SERIES;s++){ let sOk=0,sTot=0;
    for(let sim=0;sim<5;sim++){
      const posts=await page.evaluate(()=>{acc='simon';topic='';H.length=0;Q.length=0;const o=[];for(let i=0;i<30;i++){const r=genOnePost();o.push(r&&r.post?{ok:true,text:r.post.text,theme:r.post.topic,src:r.post.sgSrc}:{ok:false})}return o});
      const prev=[];
      for(const p of posts){ sTot++; res.total++;
        if(!p.ok){res.nullGen++;res.reasons['génération bloquée (impasse)']=(res.reasons['génération bloquée (impasse)']||0)+1;continue}
        res.src[p.src]=(res.src[p.src]||0)+1;
        const {tags,body}=split(p.text),S=sents(body),A=asc(body),errs=[],warns=[];
        const wc=body.split(/\s+/).filter(Boolean).length;
        if(wc<80||wc>150)errs.push(`longueur ${wc} mots`);
        if(tags.length!==4)errs.push(`${tags.length} hashtags`);
        else{const t4=tags[3].toLowerCase(); if(BANTAG.some(b=>tags.map(x=>x.toLowerCase()).includes(b)))errs.push('hashtag interdit'); if(!ROWTAGS.has(t4))errs.push('4e hashtag hors liste thématique '+tags[3]); if(prev.slice(-3).some(q=>q.tags[3]&&q.tags[3].toLowerCase()===t4))errs.push('4e hashtag répété '+tags[3]);
          if(tags.slice(0,3).join(' ')!=='#STI2D #Découverte #Cybersécurité')warns.push('socle de hashtags modifié');}
        if((p.text.match(/\p{Extended_Pictographic}/gu)||[]).length>1)errs.push('plus d’un emoji');
        const noQ=A.replace(/«[^»]*»|"[^"]*"/g,' ');
        if(FIRST.test(noQ)){ if(/javascript|python|html|arduino|cyberquest|accessibilite|pmr|root-?me/.test(A))warns.push('première personne (contexte confirmé)'); else errs.push('première personne sans contexte confirmé'); }
        if(/(?<![a-z])(nous|notre|nos)(?![a-z])/.test(noQ))warns.push('nous/notre/nos à relire');
        if(IMPL.test(noQ))errs.push('vécu implicite');
        if(EMO.test(A))errs.push('émotion');
        if(VAGUE.test(A)){errs.push('durée vague');const m=A.match(VAGUE)[0];res.durs[m+' | '+(p.theme||'')]=(res.durs[m+' | '+(p.theme||'')]||0)+1}
        const D=A.replace(/(^|\n)\s*\d+\s*[\/.)]/g,' ').replace(/«[^»]*»|"[^"]*"/g,' ').replace(/\b(2fa|mfa|sti2d|ipv[46]|tcp\/ip|http\/\d|802\.\d+|sha-?\d+|aes-?\d*|root-?me|ipv)\b/g,' ').replace(/\b(\d+)\s*%?/g,'#NUM#');
        if(/#NUM#/.test(D)&&!/root-?me/.test(A))errs.push('chiffre dans le texte');
        if(/cyberquest/.test(A)&&CQ.test(A))errs.push('CyberQuest : élément non confirmé');
        const hook=S[0]||'',concl=S[S.length-1]||'',mid=S.slice(1,-1).join(' ');
        const th=asc(p.theme||'');
        const hs=stems(hook),rs=new Set(stems(S.slice(1).join(' ')));
        if(hs.length>=2&&!hs.some(w=>rs.has(w))&&!(th&&lk(hook).includes(lk(th))&&lk(S.slice(1).join(' ')).includes(lk(th)))){errs.push('accroche sans lien avec le corps');res.badHook[hook.slice(0,110)]=(res.badHook[hook.slice(0,110)]||0)+1}
        const cs=stems(concl),bs=new Set(stems(S.slice(0,-1).join(' ')));
        if(cs.length>=2&&!/\b(?:cette|cet|ce|ces) (?:definition|notion|presentation|approche|explication|distinction|regle|mesure|etape|principe|concept|terme|mecanisme|protocole|outil|methode|demarche|precaution|habitude|difference|comparaison|analogie|limite)s?\b/.test(asc(concl))&&!cs.some(w=>bs.has(w))&&!(th&&lk(concl).includes(lk(th))&&lk(S.slice(0,-1).join(' ')).includes(lk(th)))){errs.push('conclusion sans lien avec le corps');const k=concl.replace(p.theme||'@@','T').slice(0,120);res.badConcl[k]=(res.badConcl[k]||0)+1}
        const hf=fam(hook),cf=cfunc(concl),w3=asc(concl).split(/\s+/).slice(0,3).join(' ');
        for(const q of prev.slice(-3)){
          if(close(hf,q.hf)){warns.push('accroche : famille proche d’un des 3 précédents de la file');const k=hf+'~'+q.hf+' : '+hook.slice(0,70)+'  <=>  '+q.hook;res.famPairs[k]=(res.famPairs[k]||0)+1}
          else if(jac(hs,q.hs)>=.6)warns.push('accroche proche sémantiquement d’un des 3 précédents');
          if(w3===q.w3)warns.push('conclusion : mêmes 3 premiers mots qu’un des 3 précédents');
          if(jac(cs,q.cs)>=.6)warns.push('conclusion proche sémantiquement d’un des 3 précédents');
          if(wfam(concl)&&wfam(concl)===q.wf)warns.push('conclusion : structure surveillée répétée');
          if(cf!=='autre'&&cf===q.cf)warns.push('conclusion : même fonction que l’un des 3 derniers');
        }
        [...new Set(errs)].forEach(e=>res.reasons[e.replace(/\d+ (mots|hashtags)/,'N $1')]=(res.reasons[e.replace(/\d+ (mots|hashtags)/,'N $1')]||0)+1);
        [...new Set(warns)].forEach(w=>res.warns[w]=(res.warns[w]||0)+1);
        if(errs.length){ if(res.examples.length<14)res.examples.push({errs:[...new Set(errs)],theme:p.theme,src:p.src,text:p.text.slice(0,520)}); }
        else{res.ok++;sOk++}
        prev.push({hook:hook.slice(0,70),hf,hs,cs,cf,w3,wf:wfam(concl),tags});
      }
    }
    res.series.push(`${sOk}/${sTot}`);
  }
  fs.writeFileSync(OUT,JSON.stringify(res,null,1));
  console.log('SÉRIES :',res.series.join('  ')); console.log(`TOTAL conformes : ${res.ok}/${res.total}  (impasses : ${res.nullGen})`); console.log('sources :',JSON.stringify(res.src));
  console.log('ÉCHECS par motif :',JSON.stringify(res.reasons,null,0)); console.log('DURÉES :',JSON.stringify(res.durs));console.log('CONCL sans lien :',JSON.stringify(res.badConcl,null,0));console.log('ACCROCHES sans lien :',JSON.stringify(res.badHook,null,0));console.log('FAMILLES :',JSON.stringify(Object.entries(res.famPairs).slice(0,14),null,0));console.log('AVERTISSEMENTS :',JSON.stringify(res.warns,null,0));
  await br.close();
})();
