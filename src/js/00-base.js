/* ============ Données de base ============ */
const SCHEMA=3;
const SET0={epargne:0,taux:0,heures:160,netVise:2000,objectif:6,assiette:'ca'};
/* univers : 'perso', 'pro' ou 'auto' (suit le type du compte) */
const CATS0=[
 ['courses','Courses alimentaires','shopping-basket','expense','perso'],
 ['resto','Restaurants & cafés','utensils','expense','perso'],
 ['transport','Transport & carburant','car','expense','auto'],
 ['logement','Logement & énergie','house','expense','perso'],
 ['sante','Santé','heart-pulse','expense','perso'],
 ['abonnements','Abonnements & téléphonie','smartphone','expense','auto'],
 ['loisirs','Loisirs & culture','ticket','expense','perso'],
 ['shopping','Shopping','shopping-bag','expense','perso'],
 ['frais','Frais bancaires','landmark','expense','auto'],
 ['pret','Remboursement de prêt','key-round','expense','auto'],
 ['logiciels','Logiciels & outils','app-window','expense','pro'],
 ['materiel','Matériel & fournitures','monitor','expense','pro'],
 ['deplacements','Déplacements professionnels','plane','expense','pro'],
 ['soustraitance','Sous-traitance','handshake','expense','pro'],
 ['comptable','Comptable & juridique','scale','expense','pro'],
 ['cotisations','Cotisations sociales','shield-check','expense','pro'],
 ['impots','Impôts sur l’activité','receipt','expense','pro'],
 ['pro','Autres frais professionnels','briefcase','expense','pro'],
 ['remb','Remboursements','rotate-ccw','expense','auto'],
 ['rentrees','Rentrées d’argent','hand-coins','income','perso'],
 ['revenus','Revenus','arrow-down-left','income','auto'],
 ['remu','Rémunération (pro vers perso)','arrow-left-right','remu','auto'],
 ['interne','Virements internes','repeat','transfer','auto'],
 ['divers','Divers','circle-dashed','expense','auto']
].map(([id,name,icon,type,univers])=>({id,name,icon,type,univers,budget:0,fixed:false}));
/* Rubriques qui correspondent au paiement de la provision (cotisations, impôts) */
const PROV_CATS=new Set(['cotisations','impots']);
const typeOf=id=>(S.categories.find(c=>c.id===id)||{}).type||'expense';
const LOAN_RE=/\b(ECH(EANCE)?|REMB(OURSEMENT)?|PRLV|PRELEVEMENT)?\s*(SEPA\s*)?(DE\s*)?(PRET|CREDIT IMMO|PRET IMMO)\b|\b(COFIDIS|CETELEM|SOFINCO|FRANFINANCE|FLOA|ONEY)\b/;
CATS0.forEach(c=>{if(['logement','pret','abonnements','frais'].includes(c.id))c.fixed=true});
function autoCatOf(label){const b=brandOf(label);if(b&&b[2])return b[2];if(LOAN_RE.test(norm(label)))return 'pret';return null}

/* Mots-clés toujours professionnels, quel que soit le compte */
const KW_PRO=[
 [/URSSAF|CIPAV|CARMF|CARPIMKO|CAVEC|CARCDSF|CAVP|\bSSI\b|SECURITE SOCIALE DES INDEPENDANTS/,'cotisations'],
 [/DGFIP|IMPOTS?\b|TRESOR PUBLIC|FINANCES PUBLIQUES|\bCFE\b/,'impots'],
 [/EXPERT COMPTABLE|COMPTABILITE|PENNYLANE|\bINDY\b|TIIME|LEGALSTART|LEGALPLACE|INFOGREFFE|GREFFE/,'comptable']
];
/* Mots-clés professionnels seulement sur un compte pro */
const KW_PROACC=[
 [/OVH|ADOBE|CANVA|NOTION|SLACK|GOOGLE WORKSPACE|GSUITE|MICROSOFT|SQUARESPACE|\bWIX\b|SHOPIFY|DROPBOX|ANTHROPIC|CLAUDE|OPENAI|FIGMA|\bZOOM\b|CALENDLY|MAILCHIMP|BREVO|GANDI|IONOS/,'logiciels'],
 [/LDLC|MATERIEL NET|BOULANGER|BUREAU VALLEE|OFFICE DEPOT|APPLE STORE|RAJA|MANUTAN/,'materiel'],
 [/SNCF|OUIGO|AIR FRANCE|EASYJET|RYANAIR|HOTEL|BOOKING|AIRBNB|IBIS|NOVOTEL/,'deplacements']
];
const KW=[
 [/TOTALENERGIES|EDF|ENGIE|VEOLIA|SAUR|LOYER|SYNDIC|FONCIA|NEXITY|GRDF|EAU DE/,'logement'],
 [/CARREFOUR|LECLERC|INTERMARCHE|LIDL|AUCHAN|SUPER U|HYPER U|MONOPRIX|FRANPRIX|BIOCOOP|CASINO|ALDI|NETTO|SPAR|PICARD|GRAND FRAIS|PRIMEUR|BOUCHERIE|FROMAGER|NATURALIA|LA VIE CLAIRE/,'courses'],
 [/RESTAU|BRASSERIE|CAFE|BISTRO|BOULANGERIE|PATISS|MCDO|MC DONALD|BURGER|KFC|SUSHI|PIZZ|CREPERIE|UBER EATS|DELIVEROO|STARBUCKS|TRAITEUR/,'resto'],
 [/TOTAL|ESSO|SHELL|AVIA|STATION|SNCF|OUIGO|RATP|UBER|BOLT|BLABLACAR|AUTOROUTE|VINCI|APRR|SANEF|ASF|PARKING|INDIGO|AIR FRANCE|EASYJET|RYANAIR|PEAGE|LIME/,'transport'],
 [/PHARMA|DOCTEUR|MEDECIN|DENTISTE|KINE|OPTIC|LABO|HOPITAL|CLINIQUE|CPAM|MUTUELLE|AMELI|DOCTOLIB/,'sante'],
 [/FREE MOBILE|FREE|ORANGE|SFR|BOUYGUES|SOSH|NETFLIX|SPOTIFY|DEEZER|DISNEY|CANAL|APPLE|ITUNES|GOOGLE|ADOBE|MICROSOFT|AMAZON PRIME|PRIME VIDEO|ANTHROPIC|CLAUDE|OPENAI|SQUARESPACE|DROPBOX/,'abonnements'],
 [/CINEMA|PATHE|GAUMONT|UGC|THEATRE|MUSEE|CONCERT|LIBRAIRIE|CULTURA|STEAM|PLAYSTATION|BILLET/,'loisirs'],
 [/AMAZON|FNAC|DARTY|DECATHLON|IKEA|ZARA|UNIQLO|SEPHORA|LEROY MERLIN|CASTORAMA|BRICO|ACTION|GIFI|ETSY|VINTED|ZALANDO|H&M/,'shopping'],
 [/FRAIS|COTIS|COMMISSION|AGIOS|INTERETS DEB/,'frais'],
 [/SALAIRE|PAIE|HONORAIRES|CAF|FRANCE TRAVAIL|POLE EMPLOI/,'revenus'],
 [/RETRAIT ESPECES/,'divers']
];

const BRANDS=[
 [/\bCARREFOUR\b/,'CARREFOUR','courses'],
 [/\b(SUPER U|HYPER U|U EXPRESS|MARCHE U|SYSTEME U|MAGASINS U)\b/,'SUPER U','courses'],
 [/\bLECLERC\b/,'LECLERC','courses'],
 [/\bINTERMARCHE\b/,'INTERMARCHE','courses'],
 [/\bLIDL\b/,'LIDL','courses'],
 [/\bAUCHAN\b/,'AUCHAN','courses'],
 [/\bMONOPRIX\b/,'MONOPRIX','courses'],
 [/\bFRANPRIX\b/,'FRANPRIX','courses'],
 [/\bBIOCOOP\b/,'BIOCOOP','courses'],
 [/\bALDI\b/,'ALDI','courses'],
 [/\bNETTO\b/,'NETTO','courses'],
 [/\bPICARD\b/,'PICARD','courses'],
 [/\bGRAND FRAIS\b/,'GRAND FRAIS','courses'],
 [/\b(GEANT CASINO|CASINO SHOP|PETIT CASINO|SUPERMARCHE CASINO)\b/,'CASINO','courses'],
 [/\bSPAR\b/,'SPAR','courses'],
 [/\bNATURALIA\b/,'NATURALIA','courses'],
 [/\bLA VIE CLAIRE\b/,'LA VIE CLAIRE','courses'],
 [/\bCOCCINELLE\b/,'COCCINELLE','courses'],
 [/\b(AMAZON|AMZN)\b/,'AMAZON',null],
 [/\bZALANDO\b/,'ZALANDO',null],[/\bVINTED\b/,'VINTED',null],[/\bSHEIN\b/,'SHEIN',null],[/\bTEMU\b/,'TEMU',null],
 [/\bCDISCOUNT\b/,'CDISCOUNT',null],[/\bFNAC\b/,'FNAC',null],[/\bDARTY\b/,'DARTY',null],[/\bDECATHLON\b/,'DECATHLON',null],
 [/\bIKEA\b/,'IKEA',null],[/\bETSY\b/,'ETSY',null],[/\bALIEXPRESS\b/,'ALIEXPRESS',null],[/\bASOS\b/,'ASOS',null],
 [/\bLA REDOUTE\b/,'LA REDOUTE',null],[/\bVEEPEE\b/,'VEEPEE',null],[/\bBACK ?MARKET\b/,'BACK MARKET',null],
 [/\bLEBONCOIN\b/,'LEBONCOIN',null],[/\bSEPHORA\b/,'SEPHORA',null],[/\bAPPLE\b/,'APPLE',null],
 [/\bSNCF\b/,'SNCF',null]
];
function brandOf(label){const s=norm(label);return BRANDS.find(b=>b[0].test(s))||null}

let S=blank(), demo=false, backup=null;
let view='synthese', P=null, openCat=null, q='';
let UNIV='all', OPACC='';
const reports=[];
const HAS_CLAUDE=!!(window.claude&&window.claude.use);

function blank(){return{schemaVersion:SCHEMA,game:{seenLevel:null,backups:0,cagnotte:{nom:'',montant:0}},accounts:[],categories:CATS0.map(c=>({...c})),rules:{},sugg:{},ops:[],incomeSource:'bank',settings:{...SET0},challenges:[],readers:[]}}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const fmt0=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const eur=n=>fmt.format(n), eur0=n=>fmt0.format(n);
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const catById=id=>S.categories.find(c=>c.id===id);
const newId=p=>p+Math.random().toString(36).slice(2,10);

/* ============ Comptes ============ */
const ACCT_TYPES={perso:'Personnel',pro:'Professionnel',mixte:'Pro et perso mélangés'};
const acctById=id=>S.accounts.find(a=>a.id===id);
const acctOf=o=>o.acct||'';
const acctName=id=>(acctById(id)||{}).name||'Compte principal';
const acctType=o=>(acctById(o.acct)||{}).type||'perso';
function addAccount(x){const a={id:newId('a_'),name:x.name||'Compte principal',bank:x.bank||'',no:x.no||'',type:x.type||'perso',confirmed:!!x.confirmed,solde:null,soldeDate:''};S.accounts.push(a);stateDirty=true;return a}
const PRO_HINT=/\b(SASU?|SARL|EURL|SELARL|SELAS|SCP|SCM|ENTREPRISE INDIVIDUELLE|MICRO[- ]?ENTREPRENEUR|MICRO[- ]?ENTREPRISE|AUTO[- ]?ENTREPRENEUR|COMPTE PROFESSIONNEL|COMPTE PRO|CPTE PRO|CONVENTION PRO|OFFRE PRO|ESPACE PRO|EI)\b/;
function guessType(bank,headerText,name){
  if(['Qonto','Shine'].includes(bank)) return 'pro';
  if(PRO_HINT.test(norm(headerText||''))) return 'pro';
  if(/\bPRO\b|PROFESSIONNEL/.test(norm(name||''))) return 'pro';
  return 'perso';
}
/* Univers d'une opération : la rubrique décide si elle est marquée pro ou perso, sinon le type du compte.
   Sur un compte mélangé, une rentrée non marquée est pro (encaissement de l’activité), une dépense est perso. */
function univOf(o,c){
  if(o.src==='rev') return 'pro';
  const k=c&&c!=='_pending'?catById(c):null;
  if(k&&(k.univers==='pro'||k.univers==='perso')) return k.univers;
  const t=acctType(o);
  if(t==='mixte') return o.amount>0&&k&&k.type==='income'?'pro':'perso';
  return t==='pro'?'pro':'perso';
}
const hasPro=()=>S.accounts.some(a=>a.type==='pro');

let LINK={}, LINKED={}, BYID={}, INTERNAL={}, BYMONTH={};
function catOf(o){
  if(o.cat) return o.cat;
  if(INTERNAL[o.id]) return 'interne';
  if(o.amount>0&&LINK[o.id]){const p=BYID[LINK[o.id]];const c=p&&(p.cat||S.rules[p.merchant+'|-']||S.rules[p.merchant]);if(c)return c}
  const dir=S.rules[o.merchant+(o.amount>0?'|+':'|-')]; if(dir) return dir;
  const r=S.rules[o.merchant]; if(!r) return null;
  if(o.amount<0&&typeOf(r)==='income') return null;
  return r;
}
const REFUND_RE=/\b(REMBOURSEMENT|REMBT|REMB|RBT|AVOIR|ANNULATION|ANNUL|RETOUR|REFUND)\b/;
const ruleName=k=>k.endsWith('|-')?k.slice(0,-2)+' (dépenses)':k.endsWith('|+')?k.slice(0,-2)+' (rentrées)':k;
const dfmt=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(2,4);
function detectInternal(){
  INTERNAL={};
  const TR=/\b(VIR|VIREMENT|VIRT|TRANSFERT|TRANSFER|VERSEMENT)\b/;
  const cand=S.ops.filter(o=>o.src!=='rev'&&!o.cat&&TR.test(norm(o.label)));
  if(new Set(cand.map(acctOf)).size<2) return;
  const cr=cand.filter(o=>o.amount>0);
  for(const d of cand.filter(o=>o.amount<0)){
    const t=new Date(d.date);
    const m=cr.find(c=>!INTERNAL[c.id]&&acctOf(c)!==acctOf(d)&&Math.abs(c.amount+d.amount)<0.005&&Math.abs(new Date(c.date)-t)<=4*864e5);
    if(m){INTERNAL[d.id]=m.id;INTERNAL[m.id]=d.id}
  }
}
/* Sens d'un virement interne : +1 si c'est une rémunération (pro vers perso), −1 pour un apport (perso vers pro), 0 sinon */
function remuDir(debit,credit){
  const a=acctType(debit), b=acctType(credit);
  if(a==='pro'&&b!=='pro') return 1;
  if(a!=='pro'&&b==='pro') return -1;
  return 0;
}
function relink(){
  detectInternal();
  LINK={};LINKED={};BYID={};BYMONTH={};
  const debits={};
  for(const o of S.ops){BYID[o.id]=o; (BYMONTH[o.date.slice(0,7)]||(BYMONTH[o.date.slice(0,7)]=[])).push(o); if(o.src!=='rev'&&o.amount<0)(debits[o.merchant]||(debits[o.merchant]=[])).push(o)}
  const credits=S.ops.filter(o=>o.src!=='rev'&&o.amount>0&&debits[o.merchant]).sort((a,b)=>a.date<b.date?-1:1);
  for(const r of credits){
    const rc=r.cat||S.rules[r.merchant]; if(rc&&['income','transfer','remu'].includes(typeOf(rc))) continue;
    const rt=new Date(r.date);
    const cand=debits[r.merchant].filter(p=>!LINKED[p.id]&&p.date<=r.date&&(rt-new Date(p.date))<=120*864e5&&-p.amount>=r.amount-0.01);
    if(!cand.length) continue;
    const score=p=>(Math.abs(-p.amount-r.amount)<0.01?0:1000)+(p.awaiting?0:500)+(rt-new Date(p.date))/864e5;
    cand.sort((x,y)=>score(x)-score(y));
    LINK[r.id]=cand[0].id; LINKED[cand[0].id]=r.id;
  }
}
function isRefund(o){
  if(o.amount<=0||o.src==='rev') return false;
  if(LINK[o.id]) return true;
  const c=catOf(o); if(c&&['income','transfer','remu'].includes(typeOf(c))) return false;
  return (c&&c!=='_pending')||REFUND_RE.test(norm(o.label));
}
function waitingReturns(){return S.ops.filter(o=>o.awaiting&&!LINKED[o.id]).sort((a,b)=>a.date<b.date?-1:1)}
function opExtra(o){
  if(INTERNAL[o.id]&&!o.cat){const x=BYID[INTERNAL[o.id]];if(!x)return 'Virement interne, ni dépense ni rentrée';
    const [d,c]=o.amount<0?[o,x]:[x,o];const r=remuDir(d,c);
    if(r>0) return o.amount<0?`Rémunération versée vers ${acctName(x.acct)}, ni dépense ni rentrée dans la vue d’ensemble`:`Rémunération reçue de ${acctName(x.acct)}`;
    if(r<0) return o.amount<0?`Apport vers ${acctName(x.acct)}, votre compte pro`:`Apport reçu de ${acctName(x.acct)}, votre compte perso`;
    return `Virement interne ${o.amount<0?'vers':'depuis'} ${acctName(x.acct)}, ni dépense ni rentrée`}
  if(o.amount>0&&LINK[o.id]){const p=BYID[LINK[o.id]];return `Remboursement de l’achat du ${dfmt(p.date)}, ${eur(-p.amount)}`}
  if(o.amount<0&&LINKED[o.id]){const r=BYID[LINKED[o.id]];return `Remboursé le ${dfmt(r.date)}, ${eur(r.amount)} ✅`}
  if(o.awaiting){const d=Math.max(0,Math.round((Date.now()-new Date(o.date))/864e5));return `Retour signalé, remboursement attendu depuis ${d} jour${d>1?'s':''}${d>30?' ⚠️':''}`}
  if(isRefund(o)){const c=catById(catOf(o));return c?`Remboursement, déduit de ${c.name}`:'Remboursement'}
  return '';
}
