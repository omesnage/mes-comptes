/* ============ Exemple fictif ============ */
function startDemo(){
  backup=S; demo=true; S=blank();
  const now=new Date(); const M=[
   ['CB CARREFOUR MARKET {d} GUERANDE',-62,-38,4,'courses'],['CB BIOCOOP {d} LA BAULE',-41,-18,2,'courses'],['CB LECLERC {d} GUERANDE',-120,-45,2,'courses'],
   ['CB BOULANGERIE DU PORT {d}',-9,-4,5,'resto'],['CB LE COMPTOIR {d} NANTES',-68,-24,2,'resto'],
   ['CB TOTALENERGIES {d} ST NAZAIRE',-78,-52,2,'transport'],['PRLV SEPA SNCF VOYAGEURS',-96,-38,1,'transport'],
   ['PRLV SEPA EDF CLIENTS PARTICULIERS',-94,-94,1,'logement'],['PRLV SEPA LOYER SCI OCEAN',-820,-820,1,'logement'],
   ['CB PHARMACIE DES DUNES {d}',-32,-12,1,'sante'],['VIR CPAM LOIRE ATLANTIQUE REMB',18,38,1,'sante'],
   ['PRLV SEPA FREE MOBILE',-19.99,-19.99,1,'abonnements'],['PRLV SEPA NETFLIX.COM',-13.49,-13.49,1,'abonnements'],['CB ANTHROPIC CLAUDE.AI',-21.6,-21.6,1,'abonnements'],
   ['CB CINEMA PATHE {d} ST NAZAIRE',-24,-12,1,'loisirs'],['CB AMAZON EU {d}',-86,-15,2,'shopping'],['CB ATELIER CERAMIQUE {d}',-55,-35,1,null],
   ['VIR SEPA RECU HONORAIRES CLIENT',2400,3900,2,'revenus'],
   ['ECHEANCE PRET 00012345678',-642.18,-642.18,1,'pret'],
   ['VIR SEPA RECU DE VINTED SAS',12,45,1,'rentrees'],['FRAIS TENUE DE COMPTE',-7.5,-7.5,1,'frais']
  ];
  for(let k=7;k>=0;k--){
    const dt=new Date(now.getFullYear(),now.getMonth()-k,1), y=dt.getFullYear(), m=dt.getMonth()+1;
    for(const [lab,a,b,n,c] of M){ for(let i=0;i<n;i++){
      if(Math.random()<.12) continue;
      const day=1+Math.floor(Math.random()*27), ds=`${pad(day)}/${pad(m)}`;
      let amt=a+(b-a)*Math.random(); if(k===0&&c==='resto') amt*=1.9;
      const label=lab.replace('{d}',ds);
      S.ops.push({id:Math.random().toString(36).slice(2,10),date:`${y}-${pad(m)}-${pad(day)}`,label,amount:+amt.toFixed(2),merchant:merchantOf(label),_c:c});
    }}
  }
  const mk=(k,day)=>{const dt=new Date(now.getFullYear(),now.getMonth()-k,1);return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(day)}`};
  const add=(date,label,amount,x)=>S.ops.push({id:Math.random().toString(36).slice(2,10),date,label,amount,merchant:merchantOf(label),...(x||{})});
  add(mk(1,4),'CB AMAZON PAYMENTS 04/'+mk(1,4).slice(5,7),-89.90,{awaiting:true});
  add(mk(1,19),'REMBOURSEMENT AMAZON EU SARL',89.90);
  add(mk(1,9),'PRLV SEPA PAYPAL EUROPE S.A.R.L. ET CIE S.C.A 1034829 PP.1034.PP ZALANDO',-129,{_c:'shopping'});
  add(mk(0,2),'VIR PAYPAL REMB ZALANDO SE',64.50);
  add(mk(0,1),'CB VINTED 01/'+mk(0,1).slice(5,7),-35,{awaiting:true});
  add(mk(2,8),'CB FNAC 08/'+mk(2,8).slice(5,7)+' NANTES',-149,{awaiting:true,_c:'shopping'});
  S.ops.forEach(o=>{if(o._c&&!/ATELIER|AMAZON/.test(o.merchant))S.rules[o.merchant]=o._c;delete o._c;
    if(!S.rules[o.merchant]){const c=kwSuggest(o.merchant,o.label);if(c)S.sugg[o.merchant]={c,src:'kw'}}});
  S.categories.find(c=>c.id==='courses').budget=380;
  for(let k=5;k>=0;k--){add(mk(k,6),'PRLV SEPA OVH CLOUD',-23.99,{_c:'pro'});if(k%2===0)add(mk(k,14),'CB LDLC 14/'+mk(k,14).slice(5,7),-(80+Math.random()*300),{_c:'pro'})}
  S.ops.forEach(o=>{if(o._c==='pro'){S.rules[o.merchant]='pro';delete o._c}});
  S.ops.forEach(o=>o.acct='Crédit Agricole');
  S.ops.filter(o=>S.rules[o.merchant]==='pro'||/HONORAIRES/.test(o.label)).forEach(o=>o.acct='Qonto pro');
  for(let k=5;k>=0;k--){const d=mk(k,5);add(d,'VIR SEPA EMIS VERS OLIVIER PERSO',-1500,{acct:'Qonto pro'});add(d,'VIR SEPA RECU DE QONTO SAS',1500,{acct:'Crédit Agricole'})}
  S.settings={epargne:9500,taux:25,heures:140,objectif:6};
  S.challenges=[{id:'courses10',month:thisMonth()},{id:'noshop',month:mk(1,1).slice(0,7)}];
  S.ops.sort((a,b)=>a.date<b.date?1:-1);
  P=null; view='synthese'; render();
}
function exitDemo(){ACC='';demo=false;S=backup||blank();backup=null;P=null;openCat=null}

initStore();
