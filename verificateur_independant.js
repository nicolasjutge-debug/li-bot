#!/usr/bin/env node
/* Vérificateur INDÉPENDANT — prompt maître V7 §50-51.
   N'utilise AUCUNE fonction interne du générateur (validateur, familles, hashtags…) : seulement genOnePost() pour obtenir les posts.
   Usage : npm i jsdom && node verificateur_independant.js index.html [séries=7]   (7 séries × 5 simulations × 30 générations = 1 050) */
const {JSDOM}=require('jsdom');const fs=require('fs');
const FILE=process.argv[2]||'index.html',SERIES=+process.argv[3]||7,SIMS=5,GENS=30;
const html=fs.readFileSync(FILE,'utf8');
const TAG=/#[\p{L}\p{N}_-]+/gu,NL='(?<![\\p{L}\\p{N}_])',NR='(?![\\p{L}\\p{N}_])';
const tagsOf=t=>t.match(TAG)||[],body=t=>t.replace(TAG,'').trim(),words=t=>body(t).split(/\s+/).filter(Boolean).length;
const sents=t=>body(t).split(/(?<=[.!?…])\s+/).map(x=>x.trim()).filter(Boolean);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const first3=s=>norm(s).replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean).slice(0,3).join(' ');
const FP=new RegExp(NL+'(?:je|me|moi|mon|ma|mes)'+NR+'|'+NL+'[jm][\'’]','iu');
const NOUS=/(?:nous (?:avons|sommes|étions|avions|allons|utilisons)|dans notre |chez nous|notre (?:réseau|entreprise|classe|lycée|équipe|projet|cours)|nos (?:cours|tests|essais|expériences))/i;
const IMP=[/sur le terrain/i,/\b(?:cas|incidents?|campagnes?|attaques?)\b[^.]{0,40}\b(?:étudié|analysé|observé|rencontré|traité)e?s?\b/i,/quelqu[’']un qui a /i,/\b(?:la semaine dernière|hier|ce week-end|l[’']autre jour|un matin|un soir)\b/i,/\ben (?:classe|cours|stage|entreprise)\b|à l[’']école|au lycée|\b(?:mon|un) (?:prof|professeur|enseignant)\b/i,/\b(?:lors d[’'](?:un|une)|pendant (?:un|une)) (?:atelier|cours|conférence|salon|forum|stage)\b/i,/ces derniers (?:temps|jours)/i,/situation vécue|expérience récente|personne qui a évité|lors d[’']une mission|\b(?:a|ont|avait|semble)\s+l[’']air\b/i];
const EMO=/vertige|impressionnant|m[’']a surpris|m[’']inqui[eè]te|fait réfléchir|étonnant|fascinant|passionnant|effrayant|fait peur|m[’'](?:étonne|impressionne|fascine)|détail qui frappe/i;
const DUR=/quelques (?:secondes|minutes|heures|jours|semaines|mois)|un instant|quelques instants|clin d[’']œil|en un éclair/i;
const BAN_TAGS=['#hackthebox','#opentowork','#analyste','#pentest','#alternance2027','#rennes','#recherchealternance'];
const BAN_CONCL=/^(?:ce que (?:je )?(?:retiens|trouve intéressant)|ce qui m[’']intéresse|cela montre que|cette notion (?:montre|permet de comprendre)|c[’']est un exemple qui montre|c[’']est justement|un bon rappel|à retenir|cela permet de comprendre|c[’']est une notion que|je continuerai|je garderai)/i;
const CF=[['bilan',/^(?:ce que (?:je )?retien|à retenir|en résumé|en bref)/i],['montre',/^(?:cela|ceci|cette notion|ce (?:cas|point|exemple)|c[’']est un exemple)[^.]{0,12}(?:montre|illustre|rappelle|souligne)|^c[’']est justement|^un bon rappel/i],['permet',/^(?:cela|ceci|cette notion) permet de comprendre/i],['futur',/^je (?:continuerai|garderai|vais|compte)/i]];
const cfam=c=>{for(const [n,r] of CF)if(r.test(c))return n;return first3(c).split(' ').slice(0,2).join(' ');};
function fam(h){const h0=h.trim(),s=h0.replace(/^[«"“]\s*/,''),n=(s.match(/[\p{L}\p{N}'’-]+/gu)||[]).length;
 if(/\?\s*[»"”)]*\s*$/.test(s))return 'F';
 if(/^(?:imaginons|supposons|prenons le cas|admettons)/i.test(s)||/^(?:un|une) (?:utilisateur|employé|salarié|internaute|personne|étudiant|élève)[^.]{0,40}\b(?:reçoit|ouvre|clique|télécharge|constate|remarque)/i.test(s))return 'I';
 if(/\b(?:on peut comparer|comparable à|ressemble à|un peu comme|à la manière d|c[’']est comme)/i.test(s))return 'H';
 if(/^(?:derrière|le terme|l[’']expression|le mot|le sigle|sous l[’']appellation)/i.test(s))return 'A';
 if(/^(?:le principal enjeu|l[’']enjeu|le défi|le (?:vrai )?problème|la difficulté|le risque|la question)/i.test(s))return 'G';
 if(/\b(?:ne (?:signifie|veut|suffit|se limite|sont|est) pas|contrairement|au contraire|à l[’']inverse|et non|mais|pourtant|alors que|tandis que)\b/i.test(s))return 'E';
 if(/\b(?:désigne|correspond à|consiste à|signifie)\b|(?<![cC][’'])\best (?:un|une) (?!peu\b)/i.test(s)&&!/\bpeut\b/.test(s))return 'B';
 if(/\b(?:peut|peuvent) (?:avoir|entraîner|provoquer|permettre|conduire|exposer|limiter|réduire|fausser|compliquer)\b|\b(?:entraîne|provoque|expose|conduit à|permet de)\b|^(?:sans|une erreur|un oubli|une mauvaise|une simple|passer à côté)/i.test(s))return 'D';
 return n<=8?'J':'C';}
const CLOSE=[['A','B'],['C','D'],['F','G'],['H','I'],['K','L']],close=(a,b)=>a===b||CLOSE.some(p=>p.includes(a)&&p.includes(b));
const STOP=new Set('dans pour avec sans plus tout tous cette cela comme mais être sont leur leurs elle elles nous vous ainsi aussi alors entre peut peuvent est une des les que qui quoi donc car'.split(' '));
const kw=s=>norm(s).replace(/[^a-z ]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!STOP.has(w)&&!/^(?:imaginons|expliquer|commencer|quelqu|debute|faille|notion|simple|simplement|base|bases|comprendre|partir|vraiment|souvent)$/.test(w));
function check(t,prev){const e=[],ss=sents(t),b=body(t),tg=tagsOf(t),hook=ss[0]||'',concl=ss[ss.length-1]||'';
 const w=words(t);if(w<80||w>150)e.push(['longueur',w+' mots']);if((t.match(/\p{Extended_Pictographic}/gu)||[]).length>1)e.push(['emoji >1','']);
 if(tg.length!==4)e.push(['hashtags',tg.length+' hashtags']);else{
  if(norm(tg.slice(0,3).join(' '))!=='#sti2d #decouverte #cybersecurite')e.push(['hashtags','3 premiers hashtags non standard']);
  if(prev.some(p=>(tagsOf(p)[3]||'').toLowerCase()===tg[3].toLowerCase()))e.push(['4e hashtag répété',tg[3]]);}
 if(tg.some(x=>BAN_TAGS.includes(x.toLowerCase())))e.push(['hashtag interdit',tg.join(' ')]);
 for(const s of ss){const root=/root-?me|sti2d/i.test(s);
  if(!root&&FP.test(s))e.push(['1re personne',s]);
  if(NOUS.test(s))e.push(['nous/notre personnel',s]);
  if(IMP.some(r=>r.test(s)))e.push(['vécu implicite',s]);
  if(EMO.test(s))e.push(['émotion',s]);
  if(DUR.test(s))e.push(['durée vague',s]);if(/\bmission\b/i.test(s))e.push(['mot « mission »',s]);
  if(!root&&(/\d/.test(s.replace(/(?:^|\n)\s*\d+\s*[\/.)]\s*/g,' ').replace(/«[^»]*»|"[^"]*"|“[^”]*”/g,' ').replace(/\b(?:2FA|MFA|IPv[46]|TCP\/IP|HTTP\/\d|802\.\d+|SHA-?\d+|AES-?\d*|(?:32|128) bits)\b/g,''))||/millions?|milliards?|en quelques (?:secondes|minutes|heures)|quelques heures suffisent|amende|%/i.test(s)))e.push(['précision chiffrée',s]);}
 if(/ynov|epitech|tryhackme|portswigger|hackthebox/i.test(b)||(/\binsa\b/i.test(b)&&!/accessibilit|pmr|fauteuil/i.test(b)))e.push(['contexte interdit',b.slice(0,80)]);
 if(/cyberquest/i.test(b)){if(!/apprentissage/i.test(b)||!/\bIA\b/.test(b))e.push(['CyberQuest',"formule « outil/projet d'apprentissage ludique réalisé avec l'aide de l'IA » absente"]);
  if(/gamifi|produit professionnel|solution (?:professionnelle|commerciale)|(?:tout|entièrement|développé) seul|\b(?:bug|quiz|score|défi|mini-défi)\b|session de test|week-end|difficulté|rencontr/i.test(b))e.push(['CyberQuest','expérience/présentation non confirmée']);}
 const hf=fam(hook);prev.forEach(p=>{const ph=sents(p)[0]||'',pf=fam(ph);if(close(hf,pf))e.push(['accroche famille',hf+'~'+pf+' | '+hook.slice(0,70)+'  <=  '+ph.slice(0,70)]);else if(first3(hook)===first3(ph))e.push(['accroche 3 mots',first3(hook)]);});
 if(BAN_CONCL.test(concl.trim()))e.push(['conclusion interdite',concl.slice(0,70)]);
 prev.forEach(p=>{const pc=(sents(p).pop()||'');if(first3(concl)===first3(pc)||cfam(concl)===cfam(pc))e.push(['conclusion répétée',first3(concl)+' | '+cfam(concl)]);});
 const qt=(hook.match(/«\s*([^»]+?)\s*»/)||[])[1],nb=norm(ss.slice(1).join(' ')).replace(/-/g,' ');if(qt&&!norm(qt).replace(/-/g,' ').split(/\s+/).filter(w=>w.length>=3&&!STOP.has(w)).concat(norm(qt).replace(/-/g,' ')).some(x=>nb.includes(x.slice(0,Math.min(x.length,6)))))e.push(['cohérence accroche/corps','terme « '+qt+' » absent du corps']);
 const hk=new Set(qt?[]:kw(hook));if(hk.size&&!kw(ss.slice(1).join(' ')).some(x=>hk.has(x)||[...hk].some(y=>x.startsWith(y.slice(0,5)))))e.push(['cohérence accroche/corps',hook.slice(0,80)]);
 if(new Set(ss.map(norm)).size<ss.length)e.push(['phrase dupliquée','']);
 return {e,hf,concl};}
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,beforeParse(w){w.fetch=()=>Promise.reject(new Error('off'));w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){}}));w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=function(){const f=()=>{};return new Proxy({canvas:this,measureText:()=>({width:0}),createLinearGradient:()=>({addColorStop:f}),createRadialGradient:()=>({addColorStop:f})},{get:(t,k)=>k in t?t[k]:f,set:()=>true});};w.requestAnimationFrame=()=>0;}});
setTimeout(()=>{const w=dom.window;let total=0,ok=0,nul=0;const cnt={},ex={},concl=new Set(),starts=new Set(),hooks=new Set(),fams={},bySeries=[];
 for(let s=0;s<SERIES;s++){let so=0;for(let m=0;m<SIMS;m++){
  const posts=JSON.parse(w.eval("(()=>{acc='simon';topic='';Q.length=0;H.length=0;const r=[];for(let i=0;i<"+GENS+";i++){const x=genOnePost();r.push(x&&x.post?x.post.text:null);}return JSON.stringify(r);})()"));
  posts.forEach((t,i)=>{total++;if(s===0&&m===0&&i<(+process.env.SAMPLE||0))console.log(t+'\n---');if(t==null){nul++;(cnt['génération refusée']=(cnt['génération refusée']||0)+1);return;}
   const prev=posts.slice(Math.max(0,i-3),i).filter(Boolean),r=check(t,prev);concl.add(norm(r.concl));starts.add(first3(r.concl));hooks.add(norm(sents(t)[0]||''));fams[r.hf]=(fams[r.hf]||0)+1;
   if(!r.e.length){ok++;so++;}else{const seen=new Set();r.e.forEach(([k,d])=>{if(seen.has(k))return;seen.add(k);cnt[k]=(cnt[k]||0)+1;(ex[k]=ex[k]||[]).length<2&&ex[k].push(String(d).slice(0,130));});}});}
  bySeries.push(so+'/'+SIMS*GENS);}
 console.log('Séries (conformes/150) :',bySeries.join('  '));
 console.log('TOTAL conformes :',ok+'/'+total,'(refus de génération :',nul+')');
 console.log('Diversité : conclusions distinctes',concl.size,'| débuts de conclusion (3 mots)',starts.size,'| accroches distinctes',hooks.size,'| familles d\'accroche',JSON.stringify(fams));
 Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).forEach(k=>console.log(' ✗',k,cnt[k],'→',(ex[k]||[]).join(' || ')));
 process.exit(0);},1500);
