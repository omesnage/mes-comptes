/* ============ Données de base ============ */
/* Version salariés : rien de ce qui concerne une activité indépendante (le build remplace false par true) */
const SAL=/*@SAL*/false;
const SCHEMA=16;
const SET0={epargne:0,taux:0,heuresSemaine:40,netVise:2500,objectif:6,assiette:'ca',semNonTrav:7,epRetraite:10,nonFacture:30,hJour:7};
/* univers : 'perso', 'pro' ou 'auto' (suit le type du compte) */
const CATS0=[
 ['logement','Logement et énergie','house','expense','perso',1],
 ['courses','Courses','shopping-basket','expense','perso'],
 ['resto','Restaurants et cafés','utensils','expense','perso'],
 ['transport','Voiture et déplacements','car','expense','perso'],
 ['abonnements','Abonnements et téléphone','smartphone','expense','auto',1],
 ['sante','Santé','heart-pulse','expense','perso'],
 ['mutuelle','Mutuelle','shield-plus','expense','perso',1],
 ['loisirs','Sorties et loisirs','ticket','expense','perso'],
 ['shopping','Vêtements et shopping','shirt','expense','perso'],
 ['enligne','Achats en ligne','shopping-cart','expense','perso'],
 ['maison','Maison et équipement','sofa','expense','perso'],
 ['animaux','Animaux','paw-print','expense','perso'],
 ['cadeaux','Cadeaux','gift','expense','perso'],
 ['dons','Dons et associations','hand-heart','expense','perso'],
 ['voyages','Vacances et séjours','luggage','expense','perso'],
 ['frais','Banque','landmark','expense','auto',1],
 ['impotsfoyer','Impôts et taxes du foyer','receipt','expense','perso',1],
 ['pret','Remboursement d’emprunt','banknote','expense','perso',1],
 ['divers','Espèces et divers','circle-dashed','expense','auto'],
 ['logiciels','Logiciels et matériel','app-window','expense','pro'],
 ['deplacements','Déplacements de l’activité','train-front','expense','pro'],
 ['communication','Communication','megaphone','expense','pro'],
 ['compta','Comptabilité','calculator','expense','pro'],
 ['mutuellepro','Mutuelle et prévoyance','shield-plus','expense','pro',1],
 ['soustraitance','Sous-traitance','handshake','expense','pro'],
 ['cotisations','Charges sociales','piggy-bank','expense','pro'],
 ['impots','Taxes, TVA et impôts','receipt-text','expense','pro'],
 ['empruntpro','Remboursement d’emprunt de l’activité','banknote','expense','pro',1],
 ['pro','Autres frais de l’activité','briefcase','expense','pro'],
 ['remb','Remboursements','rotate-ccw','expense','auto'],
 ['salaire','Salaire','wallet','income','perso'],
 ['rentrees','Autres rentrées','hand-coins','income','perso'],
 ['retraite','Retraite et pensions','armchair','income','perso'],
 ['revenus','Revenus et encaissements','arrow-down-left','income','auto'],
 ['remu','Votre rémunération','arrow-left-right','remu','auto'],
 ['epargne','Épargne et placements','vault','transfer','auto'],
 ['interne','Virements entre vos comptes','repeat','transfer','auto']
].filter(([id,,,,univers])=>SAL?univers!=='pro'&&!['revenus','remu'].includes(id):id!=='salaire').map(([id,name,icon,type,univers,fixed])=>({id,name,icon,type,univers,limite:null,fixed:!!fixed}));
/* Anciens noms par défaut, remplacés par les nouveaux lors de la migration (un nom personnalisé est gardé) */
const OLD_NAMES={courses:'Courses alimentaires',resto:'Restaurants & cafés',transport:'Transport & carburant',logement:'Logement & énergie',sante:'Santé',abonnements:'Abonnements & téléphonie',loisirs:'Loisirs & culture',shopping:'Shopping',frais:'Frais bancaires',pret:'Remboursement de prêt',logiciels:'Logiciels & outils',materiel:'Matériel & fournitures',deplacements:'Déplacements professionnels',soustraitance:'Sous-traitance',cotisations:'Cotisations sociales',impots:'Impôts sur l’activité',pro:'Autres frais professionnels',remb:'Remboursements',rentrees:'Rentrées d’argent',revenus:'Revenus',remu:'Rémunération (pro vers perso)',interne:'Virements internes',divers:'Divers'};
/* Rubriques qui correspondent au paiement de la provision (cotisations, impôts) */
/* Rubriques fusionnées au schéma 13 : ancienne → celle qui l'absorbe */
const FUSIONS_V13={energie:'logement',enfants:'cadeaux',materiel:'logiciels'};
const PROV_CATS=new Set(['cotisations','impots']);
const typeOf=id=>(S.categories.find(c=>c.id===id)||{}).type||'expense';
/* Remboursement d'emprunt : reconnu sans rien demander */
const LOAN_RE=/\b(ECHEANCES? (DE )?PRETS?|ECH\.? PRETS?|REMBOURSEMENTS? (DE )?PRETS?|REMB PRET|PRETS? IMMO(BILIER)?|CREDITS? IMMO(BILIER)?)\b|\b(COFIDIS|CETELEM|SOFINCO|FRANFINANCE|FLOA|ONEY)\b/;
/* Cotisations sociales : toujours une cotisation déjà payée (jamais une dépense perso).
   Les caisses de retraite des indépendants prélèvent des cotisations et versent des pensions. */
const COTIS_RE=/\bURS{2}AF\b|\bSSI\b|SECURITE SOCIALE DES INDEPENDANTS/;
/* Chèque emploi service : les prélèvements de la caisse sociale portant ce mot sont une dépense du foyer (aide à domicile), pas des cotisations */
const CESU_RE=/\bCESU\b|CHEQUE EMPLOI|PAJEMPLOI/;
const CAISSES_RE=/\b(CIPAV|CARMF|CARPIMKO|CAVEC|CARCDSF|CAVP|IRCEC)\b/;
/* Épargne et placements : ni une dépense ni une rentrée, dans un sens comme dans l'autre */
const EPARGNE_RE=/\b(GENERALI VIE|ASSURANCES? ?VIE|PLACEMENTS?|LIVRETS?|LDDS?|LEP|PEA|PER|PERP|PERIN|PLAN (D )?EPARGNE|EPARGNE|COMPTE A TERME|LINXEA|YOMONI|NALO|SPIRICA|SURAVENIR)\b/;
/* Retraite et pensions : une rentrée personnelle, jamais un revenu de l'activité */
const RETRAITE_RE=/\b(RETRAITES?|CARSAT|CNAV|IRCEC|AGIRC|ARRCO|CAISSE D.?ASSURANCE RETRAITE|PENSIONS?|CIPAV|CARMF|CARPIMKO|CAVEC)\b/;
function autoCatOf(label,atype,amount){
  const t=norm(label||'');
  if(LOAN_RE.test(t))return atype==='pro'?'empruntpro':'pret';
  if(/\bRETRAITS?\b|\bDAB\b|\bGAB\b/.test(t))return 'divers';
  if(!SAL&&COTIS_RE.test(t)&&!CESU_RE.test(t))return 'cotisations';
  if(!SAL&&CAISSES_RE.test(t)&&amount<0)return 'cotisations';
  if(EPARGNE_RE.test(t.replace(/CAISSE D.?EPARGNE/g,'')))return 'epargne';
  if(SAL&&amount>0&&/\bSALAIRE\b|\bPAIE\b/.test(t))return 'salaire';
  if(RETRAITE_RE.test(t)&&amount>0)return 'retraite';
  const b=brandOf(label);if(b&&b[2])return b[2];return null}
/* Rubriques reconnues d'office qui dépendent du sens (rentrée ou dépense) */
const AUTO_SENS=new Set(['retraite','cotisations','salaire']);
/* Pose la règle reconnue d'office, sauf si une règle existe déjà pour ce marchand. Renvoie true si elle a été posée. */
function appliqueAuto(o,atype){
  const c=autoCatOf(o.label,atype,o.amount); if(!c) return false;
  const dk=o.merchant+(o.amount>0?'|+':'|-'); if(S.rules[o.merchant]||S.rules[dk]) return false;
  S.rules[AUTO_SENS.has(c)?dk:o.merchant]=c; delete S.sugg[o.merchant]; return true;
}

/* Mots-clés toujours professionnels, quel que soit le compte */
const KW_PRO=[
 [/\bURS{2}AF\b|CIPAV|CARMF|CARPIMKO|CAVEC|CARCDSF|CAVP|IRCEC|\bSSI\b|SECURITE SOCIALE DES INDEPENDANTS/,'cotisations'],
 [/EXPERT.?COMPTA|COMPTABILITE|PENNYLANE|\bINDY\b|TIIME|LEGALSTART|LEGALPLACE/,'compta'],
 [/INFOGREFFE|GREFFE|AVOCAT|NOTAIRE/,'pro']
];
/* Mots-clés professionnels seulement sur un compte pro */
const KW_PROACC=[
 [/MUTUELLE|PREVOYANCE/,'mutuellepro'],
 [/OVH|ADOBE|CANVA|NOTION|SLACK|GOOGLE WORKSPACE|GSUITE|MICROSOFT|SQUARESPACE|\bWIX\b|SHOPIFY|DROPBOX|ANTHROPIC|CLAUDE|OPENAI|FIGMA|\bZOOM\b|CALENDLY|MAILCHIMP|BREVO|GANDI|IONOS/,'logiciels'],
 [/LDLC|MATERIEL NET|BOULANGER|BUREAU VALLEE|OFFICE DEPOT|APPLE STORE|RAJA|MANUTAN/,'logiciels'],
 [/SNCF|OUIGO|AIR FRANCE|EASYJET|RYANAIR|HOTEL|BOOKING|AIRBNB|IBIS|NOVOTEL/,'deplacements']
];
const KW=[
 [/PRLV.*TOTALENERGIES|\bEDF\b|ENGIE|VEOLIA|SAUR|GRDF|EAU DE|EKWATEUR|ENERCOOP|OHM ENERGIE|MINT ENERGIE/,'logement'],
 [/LOYER|SYNDIC|FONCIA|NEXITY|ASSURANCE HABITATION/,'logement'],
 [/DGFIP|IMPOTS?\b|TRESOR PUBLIC|FINANCES PUBLIQUES|TAXE FONCIERE|TAXE HABITATION/,'impotsfoyer'],
 [/IKEA|LEROY MERLIN|CASTORAMA|BRICO|MAISONS DU MONDE|CONFORAMA|DARTY|BUT\b|GIFI|ACTION\b/,'maison'],
 [/JOUE CLUB|KING JOUET/,'cadeaux'],
 [/VETERINAIRE|\bVETO\b|ANIMALERIE|MAXI ZOO|ZOOPLUS|CROQUETTES/,'animaux'],
 [/BOOKING|AIRBNB|HOTEL|EASYJET|RYANAIR|AIR FRANCE|VOLOTEA|TRANSAVIA|CLUB MED|VACANCES/,'voyages'],
 [/CARREFOUR|LECLERC|INTERMARCHE|LIDL|AUCHAN|SUPER U|HYPER U|MONOPRIX|FRANPRIX|BIOCOOP|CASINO|ALDI|NETTO|SPAR|PICARD|GRAND FRAIS|PRIMEUR|BOUCHERIE|FROMAGER|NATURALIA|LA VIE CLAIRE/,'courses'],
 [/RESTAU|BRASSERIE|CAFE|BISTRO|BOULANGERIE|PATISS|MCDO|MC DONALD|BURGER|KFC|SUSHI|PIZZ|CREPERIE|UBER EATS|DELIVEROO|STARBUCKS|TRAITEUR/,'resto'],
 [/TOTAL|ESSO|SHELL|AVIA|STATION|SNCF|OUIGO|RATP|UBER|BOLT|BLABLACAR|AUTOROUTE|VINCI|APRR|SANEF|ASF|PARKING|INDIGO|PEAGE|LIME/,'transport'],
 [/PHARMA|DOCTEUR|MEDECIN|DENTISTE|KINE|OPTIC|LABO|HOPITAL|CLINIQUE|CPAM|AMELI|DOCTOLIB/,'sante'],
 [/MUTUELLE|PREVOYANCE/,'mutuelle'],
 [/FREE MOBILE|FREE|ORANGE|SFR|BOUYGUES|SOSH|NETFLIX|SPOTIFY|DEEZER|DISNEY|CANAL|APPLE|ITUNES|GOOGLE|ADOBE|MICROSOFT|AMAZON PRIME|PRIME VIDEO|ANTHROPIC|CLAUDE|OPENAI|SQUARESPACE|DROPBOX/,'abonnements'],
 [/CINEMA|PATHE|GAUMONT|UGC|THEATRE|MUSEE|CONCERT|LIBRAIRIE|CULTURA|STEAM|PLAYSTATION|BILLET/,'loisirs'],
 [/AMAZON|FNAC|CDISCOUNT|ALIEXPRESS|TEMU|EBAY|ETSY|VINTED|LEBONCOIN|VEEPEE|RAKUTEN|MANOMANO|BACKMARKET/,'enligne'],
 [/DECATHLON|ZARA|UNIQLO|SEPHORA|ETSY|VINTED|ZALANDO|H&M|KIABI|CELIO|JULES/,'shopping'],
 [/FRAIS TENUE|COTIS(ATION)? (CARTE|CB)|COMMISSION|AGIOS|INTERETS DEB|FRAIS BANCAIRES/,'frais'],
 [/SALAIRE|\bPAIE\b|HONORAIRES|\bCAF\b|FRANCE TRAVAIL|POLE EMPLOI/,'revenus'],
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
let view='accueil', P=null, openCat=null, q='', FICHE=null, ONB=0;
let UNIV='all', OPACC='';
const reports=[];
const HAS_CLAUDE=!!(window.claude&&window.claude.use);

function blank(){return{schemaVersion:SCHEMA,onboarded:false,accounts:[],categories:CATS0.map(c=>({...c})),rules:{},sugg:{},auto:{},ops:[],incomeSource:'bank',settings:{...SET0},challenges:[],readers:[]}}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const fmt0=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const eur=n=>fmt.format(n), eur0=n=>fmt0.format(n), signed=n=>(n<0?'−':'')+fmt0.format(Math.abs(n));
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const catById=id=>S.categories.find(c=>c.id===id);
const newId=p=>p+Math.random().toString(36).slice(2,10);

/* ============ Comptes ============ */
const ACCT_TYPES={perso:'Personnel',pro:'Professionnel',mixte:'Je n’ai pas de compte pro : ce compte sert à tout'};
const acctById=id=>S.accounts.find(a=>a.id===id);
const acctOf=o=>o.acct||'';
const acctName=id=>(acctById(id)||{}).name||'Compte principal';
const acctType=o=>(acctById(o.acct)||{}).type||'perso';
function addAccount(x){const a={id:newId('a_'),name:x.name||'Compte principal',bank:x.bank||'',no:x.no||'',type:SAL?'perso':x.type||'perso',confirmed:SAL||!!x.confirmed,solde:null,soldeDate:''};S.accounts.push(a);stateDirty=true;return a}
/* Seulement des mentions explicites d'un compte professionnel : une forme juridique seule (SARL, SAS…) figure aussi dans le nom des commerçants des premières lignes du relevé */
const PRO_HINT=/\b(MICRO[- ]?ENTREPRENEUR|MICRO[- ]?ENTREPRISE|AUTO[- ]?ENTREPRENEUR|ENTREPRISE INDIVIDUELLE|COMPTE PROFESSIONNEL|COMPTE PRO|CPTE PRO|CONVENTION PRO|OFFRE PRO|ESPACE PRO)\b/;
function guessType(bank,headerText,name){
  if(SAL) return 'perso';
  if(S.settings&&S.settings.compteUnique===true) return 'mixte';
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

let LINK={}, LINKED={}, BYID={}, INTERNAL={}, BYMONTH={}, REFMOIS={};
function catOf(o){
  if(o.cat) return o.cat;
  if(INTERNAL[o.id]) return 'interne';
  if(o.amount>0&&LINK[o.id]){const p=BYID[LINK[o.id]];const c=p&&(p.cat||S.rules[p.merchant+'|-']||S.rules[p.merchant]);if(c)return c}
  const dk=o.merchant+(o.amount>0?'|+':'|-'), dir=S.rules[dk]; if(dir) return dir;
  const r=S.rules[o.merchant];
  if(!r){ const au=S.auto&&(S.auto[dk]||S.auto[o.merchant]); return au&&!(o.amount<0&&typeOf(au.c)==='income')?au.c:null }
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
  /* Remboursements rattachés à un achat d'un autre mois : comptés dans le mois de l'achat */
  REFMOIS={};
  for(const rid in LINK){const r=BYID[rid], p=BYID[LINK[rid]], k=p.date.slice(0,7); if(k!==r.date.slice(0,7))(REFMOIS[k]||(REFMOIS[k]=[])).push(r)}
}
function isRefund(o){
  if(o.amount<=0||o.src==='rev') return false;
  if(LINK[o.id]) return true;
  const c=catOf(o); if(c&&['income','transfer','remu'].includes(typeOf(c))) return false;
  return (c&&c!=='_pending')||REFUND_RE.test(norm(o.label));
}
function waitingReturns(){return S.ops.filter(o=>o.awaiting&&!LINKED[o.id]).sort((a,b)=>a.date<b.date?-1:1)}
function opExtra(o){
  if(INTERNAL[o.id]&&!o.cat){const x=BYID[INTERNAL[o.id]];if(!x)return 'Virement entre vos comptes';
    const [d,c]=o.amount<0?[o,x]:[x,o];const r=remuDir(d,c);
    if(r>0) return o.amount<0?`Votre rémunération, versée sur ${acctName(x.acct)}`:`Votre rémunération, reçue de ${acctName(x.acct)}`;
    if(r<0) return o.amount<0?`Apport vers ${acctName(x.acct)}, votre compte pro`:`Apport reçu de ${acctName(x.acct)}, votre compte perso`;
    return `Virement ${o.amount<0?'vers':'depuis'} ${acctName(x.acct)}, entre vos comptes`}
  if(o.amount>0&&LINK[o.id]){const p=BYID[LINK[o.id]];return `Remboursement de votre achat du ${p.date.slice(8,10)}/${p.date.slice(5,7)}${p.date.slice(0,7)!==o.date.slice(0,7)?`, compté en ${MOIS[+p.date.slice(5,7)-1]}`:''}`}
  if(o.amount<0&&LINKED[o.id]){const r=BYID[LINKED[o.id]];return `Remboursé le ${r.date.slice(8,10)}/${r.date.slice(5,7)}`}
  if(o.awaiting){const d=Math.max(0,Math.round((Date.now()-new Date(o.date))/864e5));return `Retour signalé : remboursement attendu depuis ${d} jour${d>1?'s':''}`}
  if(isRefund(o)){const c=catById(catOf(o));return !c||c.id==='remb'?'Remboursement reçu, sans rubrique précise':`Remboursement, retiré de vos dépenses « ${c.name} »`}
  return '';
}
