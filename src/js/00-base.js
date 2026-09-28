/* ============ Données de base ============ */
const SET0={epargne:0,taux:0,heures:140,objectif:6};
const CATS0=[
 ['courses','Courses alimentaires','shopping-basket'],
 ['resto','Restaurants & cafés','utensils'],
 ['transport','Transport & carburant','car'],
 ['logement','Logement & énergie','house'],
 ['sante','Santé','heart-pulse'],
 ['abonnements','Abonnements & téléphonie','smartphone'],
 ['loisirs','Loisirs & culture','ticket'],
 ['shopping','Shopping','shopping-bag'],
 ['frais','Frais bancaires','landmark'],
 ['pret','Remboursement de prêt','key-round'],
 ['pro','Frais professionnels','briefcase','pro'],
 ['remb','Remboursements','rotate-ccw'],
 ['rentrees','Rentrées d’argent','hand-coins','income'],
 ['revenus','Revenus','arrow-down-left','income'],
 ['interne','Virements internes','repeat','transfer'],
 ['divers','Divers','circle-dashed']
].map(([id,name,icon,type])=>({id,name,icon,type:type||'expense',budget:0,fixed:false}));
const typeOf=id=>(S.categories.find(c=>c.id===id)||{}).type||'expense';
const LOAN_RE=/\b(ECH(EANCE)?|REMB(OURSEMENT)?|PRLV|PRELEVEMENT)?\s*(SEPA\s*)?(DE\s*)?(PRET|CREDIT IMMO|PRET IMMO)\b|\b(COFIDIS|CETELEM|SOFINCO|FRANFINANCE|FLOA|ONEY)\b/;
CATS0.forEach(c=>{if(['logement','pret','abonnements','frais'].includes(c.id))c.fixed=true});
function autoCatOf(label){const b=brandOf(label);if(b&&b[2])return b[2];if(LOAN_RE.test(norm(label)))return 'pret';return null}

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
const reports=[];

function blank(){return{categories:CATS0.map(c=>({...c})),rules:{},sugg:{},ops:[],incomeSource:'bank',settings:{...SET0},challenges:[],readers:[]}}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const fmt0=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const eur=n=>fmt.format(n), eur0=n=>fmt0.format(n);
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const catById=id=>S.categories.find(c=>c.id===id);
let LINK={}, LINKED={}, BYID={}, INTERNAL={};
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
function relink(){
  detectInternal();
  LINK={};LINKED={};BYID={};
  const debits={};
  for(const o of S.ops){BYID[o.id]=o; if(o.src!=='rev'&&o.amount<0)(debits[o.merchant]||(debits[o.merchant]=[])).push(o)}
  const credits=S.ops.filter(o=>o.src!=='rev'&&o.amount>0&&debits[o.merchant]).sort((a,b)=>a.date<b.date?-1:1);
  for(const r of credits){
    const rc=r.cat||S.rules[r.merchant]; if(rc&&['income','transfer'].includes(typeOf(rc))) continue;
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
  const c=catOf(o); if(c&&['income','transfer'].includes(typeOf(c))) return false;
  return (c&&c!=='_pending')||REFUND_RE.test(norm(o.label));
}
function waitingReturns(){return S.ops.filter(o=>o.awaiting&&!LINKED[o.id]).sort((a,b)=>a.date<b.date?-1:1)}
function opExtra(o){
  if(INTERNAL[o.id]&&!o.cat){const x=BYID[INTERNAL[o.id]];return `Virement interne détecté ${o.amount<0?'vers':'depuis'} ${x?acctOf(x):'un autre compte'}, ni dépense ni rentrée`}
  if(o.amount>0&&LINK[o.id]){const p=BYID[LINK[o.id]];return `Remboursement de l’achat du ${dfmt(p.date)}, ${eur(-p.amount)}`}
  if(o.amount<0&&LINKED[o.id]){const r=BYID[LINKED[o.id]];return `Remboursé le ${dfmt(r.date)}, ${eur(r.amount)} ✅`}
  if(o.awaiting){const d=Math.max(0,Math.round((Date.now()-new Date(o.date))/864e5));return `Retour signalé, remboursement attendu depuis ${d} jour${d>1?'s':''}${d>30?' ⚠️':''}`}
  if(isRefund(o)){const c=catById(catOf(o));return c?`Remboursement, déduit de ${c.name}`:'Remboursement'}
  return '';
}

