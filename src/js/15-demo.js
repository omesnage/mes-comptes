/* ============ Exemple fictif ============ */
/* Douze mois complets, jusqu'au mois dernier : un compte perso, un compte pro, des revenus irréguliers.
   Les données sont fixes (tirage pseudo-aléatoire à graine) pour que les alertes soient toujours les mêmes :
   le mois affiché montre des alertes des trois niveaux, les mois précédents montrent les autres. */
function demoData(){
  let seed=42; const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
  const vary=(a,p)=>+(a*(1-p+2*p*rnd())).toFixed(2);
  const now=new Date(), ym=k=>{const d=new Date(now.getFullYear(),now.getMonth()-1-k,1);return [d.getFullYear(),d.getMonth()+1]};
  const date=(k,day)=>{const [y,m]=ym(k);return `${y}-${pad(m)}-${pad(Math.min(day,new Date(y,m,0).getDate()))}`};
  const ops=[], cats={}, st=blank();
  const pe=addAccountTo(st,{name:'Crédit Agricole',bank:'Crédit Agricole',type:'perso',confirmed:true});
  const pr=addAccountTo(st,{name:'Qonto',bank:'Qonto',type:'pro',confirmed:true});
  const add=(k,day,label,amount,cat,acct,x)=>{const o={id:'d'+ops.length,date:date(k,day),label,amount:+amount.toFixed(2),merchant:merchantOf(label),acct:acct||pe.id,...(x||{})};ops.push(o);if(cat&&!cats[o.merchant])cats[o.merchant]=cat;return o};
  /* Chiffre d'affaires mensuel, du plus ancien (k=11) au mois affiché (k=0) : un creux, un record, puis trois mois de baisse */
  const CA=[3800,4600,2900,5100,1900,4200,7400,3300,5200,4300,3600,2400];
  const CLIENTS=['ATELIER NORD','STUDIO MAREE','LIBRAIRIE DES QUAIS','CABINET ROLLAND'];
  for(let k=11;k>=0;k--){
    const ca=CA[11-k], n=ca>4000?3:2;
    for(let i=0;i<n;i++) add(k,4+i*9,'VIR SEPA RECU '+CLIENTS[(k+i)%4],ca/n,'revenus',pr.id);
    const caPrev=k<11?CA[10-k]:3500;
    add(k,6,'PRLV SEPA URSSAF',-Math.round(caPrev*.212),'cotisations',pr.id);
    add(k,3,'PRLV SEPA OVH CLOUD',-23.99,'logiciels',pr.id);
    add(k,8,'PRLV SEPA ADOBE SYSTEMS',-71.99,'logiciels',pr.id);
    add(k,10,'PRLV SEPA INDY COMPTABILITE',-24,'comptable',pr.id);
    add(k,27,'FRAIS TENUE DE COMPTE QONTO',-11,'frais',pr.id);
    if(k<=5) add(k,12,'PRLV SEPA CANVA',-11.99,'logiciels',pr.id);
    if(k%3===1) add(k,15,'CB LDLC',-vary(260,.4),'materiel',pr.id);
    if(k%4===2) add(k,18,'CB SNCF VOYAGEURS',-vary(95,.3),'deplacements',pr.id);
    if(k===8) add(k,14,'PRLV SEPA DGFIP CFE',-356,'impots',pr.id);
    /* Rémunération : virement du compte pro vers le compte perso */
    const remu=ca<3000?1400:2000;
    add(k,1,'VIR SEPA EMIS VERS O MARTIN PERSO',-remu,null,pr.id);
    add(k,2,'VIR SEPA RECU DE QONTO',remu,null,pe.id);
    /* Budget du foyer */
    add(k,5,'PRLV SEPA LOYER SCI OCEAN',-820,'logement');
    add(k,11,'PRLV SEPA EDF CLIENTS PARTICULIERS',-vary(k>2&&k<8?118:78,.08),'logement');
    add(k,7,'PRLV SEPA FREE MOBILE',-19.99,'abonnements');
    add(k,9,'PRLV SEPA NETFLIX.COM',-13.49,'abonnements');
    add(k,13,'PRLV SEPA SPOTIFY',k>=3?-10.99:-12.99,'abonnements');
    const courses=k===0?[118,96,121,94]:[vary(90,.25),vary(85,.25),vary(95,.25),vary(70,.3)];
    courses.forEach((a,i)=>add(k,3+i*7,['CB CARREFOUR MARKET GUERANDE','CB BIOCOOP LA BAULE','CB LECLERC GUERANDE','CB CARREFOUR MARKET GUERANDE'][i],-a,'courses'));
    if(k===0) add(k,21,'CB LE COMPTOIR DU PORT',-34,'resto');
    else [0,1,2].forEach(i=>add(k,6+i*8,['CB LE COMPTOIR DU PORT','CB CREPERIE DU MARCHE','CB BOULANGERIE DU PORT'][i],-vary(i===2?18:52,.3),'resto'));
    add(k,16,'CB TOTALENERGIES ST NAZAIRE',-vary(62,.2),'transport');
    add(k,31,'CB BOULANGERIE DU PORT',-vary(9,.3),'resto');
    if(k%2===0) add(k,19,'CB PHARMACIE DES DUNES',-vary(24,.4),'sante');
    if(k%2===0) add(k,24,'VIR CPAM LOIRE ATLANTIQUE',vary(16,.3),'sante');
    add(k,20,k===0?'CB FNAC SPECTACLES':'CB CINEMA PATHE ST NAZAIRE',-(k===0?186:vary(26,.3)),'loisirs');
    if(k!==1) add(k,22,'CB AMAZON EU',-vary(58,.5),'shopping');
    if(k%3===0) add(k,26,'VIR SEPA RECU LEBONCOIN',vary(45,.4),'rentrees');
    if(k<=2) add(k,17,'CB ATELIER CERAMIQUE',-vary(45,.2),null);
  }
  /* Retours : un remboursé (il y a 4 mois), un en attente depuis plus de 30 jours (il y a 2 mois) */
  add(4,9,'CB ZALANDO',-129,'shopping',pe.id,{awaiting:true});
  add(4,23,'VIR ZALANDO REMBOURSEMENT',129,null);
  add(2,10,'CB AMAZON PAYMENTS',-89.9,null,pe.id,{awaiting:true});
  st.ops=ops.sort((a,b)=>a.date<b.date?1:-1);
  st.rules=cats;
  st.categories.find(c=>c.id==='courses').budget=380;
  st.categories.find(c=>c.id==='loisirs').budget=0;
  const pa=st.accounts.find(a=>a.id===pr.id); pa.solde=3200; pa.soldeDate=date(11,1).slice(0,8)+'01';
  st.settings={...SET0,epargne:7000,taux:22,heures:160,netVise:2000,objectif:6,assiette:'ca'};
  const mk=k=>date(k,1).slice(0,7);
  const lundi=k=>mondayOf(date(k,8)), tm=thisMonth(), key=()=>newId('d_');
  st.challenges=[
    {id:'noshop',month:mk(1)},{id:'p-taux',month:mk(1)},{id:'h-enligne',week:lundi(1)},{id:'courses10',month:mk(2)},
    {id:'s-budget3',month:mk(3)},{id:'noresto',month:mk(4)},{id:'s-seuil3',month:mk(5)},{id:'h-resto',week:lundi(6)},
    {id:'lisse',month:tm},{id:'p-encaisser',month:tm,montant:4000},{id:'h-courses',week:mondayOf(todayStr())},
    ...(+tm.slice(5,7)===9?[{id:'sa-rentree',month:tm}]:[])
  ].map(c=>({...c,key:key()}));
  st.game={seenLevel:'demo',backups:2,cagnotte:{nom:'Voyage au Japon',montant:3000}};
  st.since=Date.now(); st.lastBackup=Date.now();
  return st;
}
function addAccountTo(st,x){const a={id:newId('a_'),name:x.name,bank:x.bank||'',no:'',type:x.type,confirmed:!!x.confirmed,solde:null,soldeDate:''};st.accounts.push(a);return a}
function startDemo(){
  backup=S; demo=true; S=demoData();
  P=null; view='synthese'; UNIV='all'; render();
}
function exitDemo(){OPACC='';demo=false;S=backup||blank();backup=null;P=null;openCat=null}

initStore();
