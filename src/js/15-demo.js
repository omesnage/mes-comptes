/* ============ Exemple fictif ============ */
/* Douze mois complets jusqu'au mois dernier, un compte perso et un compte pro. Données fixes (tirage à graine).
   Mois affiché : au-dessus de l'objectif, restaurants qui dérapent, défi réussi, remboursement d'achat, frais kilométriques,
   opérations à vérifier. Mois précédent : sous l'objectif. */
function demoData(){
  let seed=42; const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
  const vary=(a,p)=>+(a*(1-p+2*p*rnd())).toFixed(2);
  const now=new Date(), ym=k=>{const d=new Date(now.getFullYear(),now.getMonth()-1-k,1);return [d.getFullYear(),d.getMonth()+1]};
  const date=(k,day)=>{const [y,m]=ym(k);return `${y}-${pad(m)}-${pad(Math.min(day,new Date(y,m,0).getDate()))}`};
  const ops=[], cats={}, st=blank();
  const pe=addAccountTo(st,{name:'Crédit Agricole',bank:'Crédit Agricole',type:'perso',confirmed:true});
  const pr=addAccountTo(st,{name:'Qonto',bank:'Qonto',type:'pro',confirmed:true});
  const add=(k,day,label,amount,cat,acct,x)=>{
    if(SAL&&acct===pr.id) return null;
    if(SAL&&label==='VIR SEPA RECU DE QONTO'){label='VIR SALAIRE ATELIER MARTIN';cat='salaire';amount=amount+300}
    const o={id:'d'+ops.length,date:date(k,day),label,amount:+amount.toFixed(2),merchant:merchantOf(label),acct:acct||pe.id,...(x||{})};ops.push(o);if(cat&&!cats[o.merchant])cats[o.merchant]=cat;return o};
  /* Encaissements mensuels, du plus ancien (k=11) au mois affiché (k=0) : un creux, un record, un mois faible juste avant */
  const CA=[3800,4600,2900,5100,1900,4200,7400,3300,5200,3600,2400,4300];
  const CLIENTS=['ATELIER NORD','STUDIO MAREE','LIBRAIRIE DES QUAIS','CABINET ROLLAND'];
  for(let k=11;k>=0;k--){
    const ca=CA[11-k], n=ca>4000?3:2;
    for(let i=0;i<n;i++) add(k,4+i*9,'VIR SEPA RECU '+CLIENTS[(k+i)%4],ca/n,'revenus',pr.id);
    add(k,6,'PRLV SEPA SECURITE SOCIALE DES INDEPENDANTS',-Math.round((k<11?CA[10-k]:3500)*.212),'cotisations',pr.id);
    add(k,3,'PRLV SEPA OVH CLOUD',-23.99,'logiciels',pr.id);
    add(k,8,'PRLV SEPA ADOBE SYSTEMS',-71.99,'logiciels',pr.id);
    add(k,27,'FRAIS TENUE DE COMPTE QONTO',-11,'frais',pr.id);
    if(k%3===1) add(k,15,'CB LDLC',-vary(260,.4),'logiciels',pr.id);
    if(k===8) add(k,14,'PRLV SEPA DGFIP CFE',-356,'impots',pr.id);
    const remu=ca<3000?1400:2000;
    add(k,1,'VIR SEPA EMIS VERS O MARTIN PERSO',-remu,null,pr.id);
    add(k,2,'VIR SEPA RECU DE QONTO',remu,null,pe.id);
    /* Foyer */
    add(k,5,'PRLV SEPA LOYER SCI OCEAN',-820,'logement');
    add(k,11,'PRLV SEPA EDF CLIENTS PARTICULIERS',-vary(k>2&&k<8?118:78,.08),'logement');
    add(k,7,'PRLV SEPA FREE MOBILE',-19.99,'abonnements');
    add(k,9,'PRLV SEPA NETFLIX.COM',-13.49,'abonnements');
    add(k,13,'PRLV SEPA SPOTIFY',k>=3?-10.99:-12.99,'abonnements');
    const courses=k===0?[60,55,70,48]:[vary(92,.2),vary(86,.2),vary(96,.2),vary(72,.25)];
    courses.forEach((a,i)=>add(k,3+i*7,['CB CARREFOUR MARKET GUERANDE','CB BIOCOOP LA BAULE','CB LECLERC GUERANDE','CB CARREFOUR MARKET GUERANDE'][i],-a,'courses'));
    const resto=k===0?[88,74,69,52]:[vary(46,.3),vary(38,.3),vary(18,.3)];
    resto.forEach((a,i)=>add(k,6+i*6,['CB LE COMPTOIR DU PORT','CB CREPERIE DU MARCHE','CB BOULANGERIE DU PORT','CB LA TABLE DE MARIE'][i],-a,'resto'));
    add(k,16,'CB TOTALENERGIES ST NAZAIRE',-vary(62,.2),'transport');
    add(k,30,'CB BOULANGERIE DU PORT',-vary(9,.3),'resto');
    if(k%2===0) add(k,19,'CB PHARMACIE DES DUNES',-vary(24,.4),'sante');
    if(k%2===0) add(k,24,'VIR CPAM LOIRE ATLANTIQUE',vary(16,.3),'sante');
    add(k,20,'CB CINEMA PATHE ST NAZAIRE',-vary(26,.3),'loisirs');
    if(k!==1) add(k,22,'CB AMAZON EU',-vary(58,.5),'shopping');
    if(k%3===0) add(k,26,'VIR SEPA RECU LEBONCOIN',vary(45,.4),'rentrees');
    if(k<=2) add(k,17,'CB ATELIER CERAMIQUE',-vary(45,.2),null);
  }
  add(3,12,'CB CASTORAMA ST NAZAIRE',-139.9,'maison');
  add(5,14,'CB CLINIQUE VETERINAIRE',-68,'animaux');
  add(2,18,'CB LIBRAIRIE CADEAUX DU PORT',-42,'cadeaux');
  add(7,9,'CB AIRBNB',-386,'voyages');
  /* Location d'été : la limite vacances de l'année est dépassée */
  add(1,3,'CB LOCATION VACANCES ILE DE RE',-2400,'voyages');
  /* Un mois de sorties bien rempli : proche de la limite */
  add(0,12,'CB FNAC SPECTACLES',-72,'loisirs');
  add(0,18,'CB LE BARBU SAINT NAZAIRE',-32,'loisirs');
  /* Remboursement d'achat : commandé le mois dernier, remboursé ce mois-ci. Un autre retour attend depuis 2 mois. */
  add(1,9,'CB ZALANDO',-129,'shopping',pe.id,{awaiting:true});
  add(0,14,'VIR ZALANDO REMBOURSEMENT',129,null);
  add(2,10,'CB AMAZON PAYMENTS',-89.9,null,pe.id,{awaiting:true});
  st.ops=ops.sort((a,b)=>a.date<b.date?1:-1);
  st.rules=cats;
  if(SAL){ st.accounts=st.accounts.filter(a=>a.id!==pr.id); for(const m in cats) if(!st.categories.some(c=>c.id===cats[m])) delete cats[m] }
  /* Limites réalistes : vacances dépassées (location d'été), sorties proches de la limite, shopping et cadeaux dans les clous */
  const li={shopping:[1200,'Y'],loisirs:[150,'M'],voyages:[2500,'Y'],cadeaux:[500,'Y']}; for(const id in li) st.categories.find(c=>c.id===id).limite={montant:li[id][0],per:li[id][1]};
  const pa=st.accounts.find(a=>a.id===pr.id); if(pa){pa.solde=3200; pa.soldeDate=date(11,1).slice(0,8)+'01'}
  st.settings={...SET0,epargne:7000,taux:22,heuresSemaine:40,netVise:2500,objectif:6,assiette:'ca'};
  const mk=k=>date(k,1).slice(0,7);
  /* Défi du mois dernier sur les courses (réussi) ; celui du mois en cours sera proposé */
  st.challenges=[{id:'auto',month:mk(0),cat:'courses',limite:265,habitude:350}].map(c=>({...c,key:newId('d_')}));
  st.onboarded=true; st.since=Date.now(); st.lastBackup=Date.now();
  return st;
}
function addAccountTo(st,x){const a={id:newId('a_'),name:x.name,bank:x.bank||'',no:'',type:x.type,confirmed:!!x.confirmed,solde:null,soldeDate:''};st.accounts.push(a);return a}
function startDemo(){backup=S; demo=true; S=demoData(); P=null; PB=null; view='accueil'; FICHE=null; render(); window.scrollTo({top:0})}
function exitDemo(){PB=null;demo=false;S=backup||blank();if(!backup)S.onboarded=true;backup=null;P=null;openCat=null;FICHE=null;view='accueil'}

