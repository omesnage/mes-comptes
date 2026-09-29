import {test,expect,openWith} from './helpers.js';
const nb=s=>s.replace(/\s/g,' ');
const perso=(ops,rules,extra={})=>({schemaVersion:7,onboarded:true,accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true}],
  ops:ops.map(([date,amount,merchant],i)=>({id:'o'+i,date,label:merchant,amount,merchant,acct:'pe'})),rules,...extra});

/* Défi : mois calendaires relatifs à aujourd'hui */
function mois(k){const d=new Date();const x=new Date(d.getFullYear(),d.getMonth()-k,1);return {ym:x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'),nom:['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][x.getMonth()]}}
function etatDefi(depPrev,defi){
  const ops=[]; for(const k of [4,3,2]) ops.push([mois(k).ym+'-10',-200,'RESTO']);
  ops.push([mois(1).ym+'-10',-depPrev,'RESTO'],[mois(1).ym+'-28',-5,'CARREFOUR']);
  return perso(ops,{RESTO:'resto',CARREFOUR:'courses'},{challenges:defi?[{id:'auto',key:'k1',month:mois(1).ym,cat:'resto',limite:150,habitude:200}]:[]});
}
test('défi réussi : bloc du mois précédent, montants seulement',async({page})=>{
  await openWith(page,etatDefi(130,true));
  const b=page.locator('.defi').first();
  await expect(b.locator('h3')).toHaveText(`Défi ${/^[aeiou]/.test(mois(1).nom)?'d’':'de '}${mois(1).nom}`);
  await expect(b.locator('.d-res.ok')).toHaveText('Réussi ✓');
  await expect(b.locator('.phrase')).toHaveText(nb('Restaurants et cafés : vous vous étiez fixé 150 € maximum, vous avez dépensé 130 €. 20 € de marge.').replace(/ €/g,' €'));
  expect((await page.locator('.defi').allTextContents()).join(' ')).not.toContain('%');
});
test('défi raté : « Pas tout à fait », avec le trop dépensé',async({page})=>{
  await openWith(page,etatDefi(175,true));
  const b=page.locator('.defi').first();
  await expect(b.locator('.d-res.presque')).toHaveText('Pas tout à fait');
  await expect(b.locator('.phrase')).toHaveText(nb('Restaurants et cafés : vous vous étiez fixé 150 € maximum, vous avez dépensé 175 €, soit 25 € de trop.').replace(/ €/g,' €'));
});
test('défi du mois en cours : limite = dépense du mois dernier × 0,75 arrondie à la dizaine, mois correct, barre après acceptation',async({page})=>{
  await openWith(page,etatDefi(200,false));
  const b=page.locator('.defi');
  await expect(b).toHaveCount(1);
  await expect(b.locator('h3')).toHaveText(`Défi pour ${mois(0).nom}`);
  await expect(b.locator('.phrase')).toHaveText(nb('Restaurants et cafés : ne pas dépasser 150 € ce mois-ci. En '+mois(1).nom+', vous avez dépensé 200 €.').replace(/ €/g,' €'));
  await page.click('[data-defiok]');
  await expect(b.locator('.d-prog')).toHaveText('0 € dépensés sur 150 €');
  await expect(b.locator('.barre-defi')).toHaveCount(1);
  expect(await page.evaluate(m=>S.challenges.find(c=>c.month===m)?.limite,mois(0).ym)).toBe(150);
  expect((await page.locator('.defi').allTextContents()).join(' ')).not.toContain('%');
  // Arrondi à la dizaine : 233 × 0,75 = 174,75 → 170
  expect(await page.evaluate(()=>dizaine(233*.75))).toBe(170);
});

test('remboursement rattaché à un achat : compté dans le mois de l’achat',async({page})=>{
  await openWith(page,perso([['2026-06-20',-100,'ZALANDO'],['2026-06-25',-40,'ZALANDO'],['2026-07-05',100,'ZALANDO'],['2026-07-10',-30,'CARREFOUR']],{ZALANDO:'shopping',CARREFOUR:'courses'}));
  const r=await page.evaluate(()=>{const j=agg({lvl:'M',y:2026,m:6},'perso'),k=agg({lvl:'M',y:2026,m:7},'perso');return {juin:j.by.shopping?.net,juillet:k.by.shopping?.net||0,totJuil:k.net,an:agg({lvl:'Y',y:2026,m:1},'perso').by.shopping.net}});
  expect(r).toEqual({juin:40,juillet:0,totJuil:30,an:40});
  await page.click('nav.tabs [data-tab="operations"]'); await page.evaluate(()=>{P={lvl:'M',y:2026,m:7};render()});
  await expect(page.locator('.op',{hasText:'+100'})).toContainText('compté en juin');
});

test('jamais de montant négatif : la rubrique reste à 0 €, le surplus apparaît en petit',async({page})=>{
  await openWith(page,perso([['2026-06-05',-20,'PHARMACIE'],['2026-06-12',50,'CPAM'],['2026-06-28',-60,'CARREFOUR']],{PHARMACIE:'sante',CPAM:'sante',CARREFOUR:'courses'}));
  const r=await page.evaluate(()=>{const a=agg({lvl:'M',y:2026,m:6},'perso');return {sante:a.by.sante.net,surplus:a.by.sante.surplus,total:a.net}});
  expect(r).toEqual({sante:0,surplus:30,total:60});
  const s=page.locator('.rub[data-cat="sante"]');
  await expect(s.locator('.rub-amt')).toHaveText('0 €');
  await expect(s.locator('.rub-sous')).toHaveText('dont 50 € de remboursements');
  for(const t of await page.locator('.rub-amt').allTextContents()) expect(t).not.toContain('−');
  await page.click('nav.tabs [data-tab="bilan"]');
  for(const t of await page.locator('.rep-val').allTextContents()) expect(t).not.toContain('−');
  await expect(page.locator('.repartition')).not.toContainText('plus de remboursements que de dépenses');
  await expect(page.locator('.rep-l',{hasText:'Santé'})).toContainText('dont 50 € de remboursements');
});

test('migration : plus aucune trace des frais remboursés ni de la voiture',async({page})=>{
  await openWith(page,{schemaVersion:6,onboarded:true,
    accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true},{id:'pr',name:'Pro',type:'pro',confirmed:true}],
    categories:[{id:'transport',name:'Voiture et transports',icon:'car',type:'expense',univers:'auto'},{id:'fraisrembourses',name:'Frais remboursés par l’activité',icon:'car-front',type:'expense',univers:'pro'},{id:'loisirs',name:'Loisirs',icon:'ticket',type:'expense',univers:'perso'},{id:'voyages',name:'Voyages',icon:'luggage',type:'expense',univers:'perso'}],
    rules:{'IK MAI':'fraisrembourses',CARREFOUR:'courses'},sugg:{'TOTAL':{c:'fraisrembourses',src:'kw'}},virements:{'MARTIN':'ndf'},
    ops:[{id:'1',date:'2026-05-03',label:'IK MAI',amount:120,merchant:'IK MAI',acct:'pe'},{id:'2',date:'2026-05-05',label:'TOTAL',amount:-60,merchant:'TOTAL',acct:'pe',cat:'fraisrembourses'},
      {id:'3',date:'2026-05-20',label:'VIR SEPA EMIS INDEMNITES KM',amount:-140,merchant:'INDEMNITES KM',acct:'pr'},{id:'4',date:'2026-05-21',label:'VIR SEPA RECU DE QONTO',amount:140,merchant:'QONTO',acct:'pe'}]});
  const s=await page.evaluate(()=>({v:S.schemaVersion,cat:S.categories.some(c=>c.id==='fraisrembourses'),rules:S.rules,sugg:S.sugg,vir:S.virements,op2:S.ops.find(o=>o.id==='2').cat,
    t:catById('transport'),l:catById('loisirs').name,vo:catById('voyages').name,remu:agg({lvl:'M',y:2026,m:5},'pro').remu}));
  expect(s.v).toBe(11); expect(s.cat).toBe(false); expect(s.rules).toEqual({CARREFOUR:'courses'}); expect(s.sugg).toEqual({});
  expect(s.vir).toBeUndefined(); expect(s.op2).toBeUndefined();
  expect(s.t).toMatchObject({name:'Transports',univers:'perso'}); expect(s.l).toBe('Sorties et loisirs'); expect(s.vo).toBe('Vacances et séjours');
  expect(s.remu).toBe(140);
  const h=(await import('fs')).readFileSync(new URL('../dist/mes-comptes.html',import.meta.url),'utf8');
  expect(h.match(/INDEMNITES|NOTE DE FRAIS|virKind|Voiture et transports(?![’'])/g)?.filter(x=>x!=='Voiture et transports')||[]).toEqual([]);
});
