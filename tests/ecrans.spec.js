import {test,expect,openWith} from './helpers.js';
const TABS=['synthese','economies','objectifs','operations','remb','valider','regles','importer'];

/* 3 ans d'historique, environ 5 000 opérations sur trois comptes */
function histoire(){
  const acc=[{id:'pe',name:'Banque perso',type:'perso',confirmed:true},{id:'pr',name:'Qonto',type:'pro',confirmed:true,solde:8000,soldeDate:'2024-01-01'},{id:'ep',name:'Livret',type:'perso',confirmed:true}];
  const M=[['CB CARREFOUR','CARREFOUR','pe',-60,35],['CB BOULANGERIE DU PORT','BOULANGERIE DU PORT','pe',-8,50],['CB RESTAURANT LE QUAI','RESTAURANT LE QUAI','pe',-45,12],
    ['CB TOTALENERGIES','TOTALENERGIES','pe',-70,6],['PRLV EDF','EDF','pe',-95,1],['PRLV NETFLIX','NETFLIX','pe',-13.49,1],['CB AMAZON','AMAZON','pe',-40,10],
    ['VIR HONORAIRES CLIENT','HONORAIRES CLIENT','pr',1500,6],['PRLV URSSAF','URSSAF','pr',-500,1],['CB ADOBE','ADOBE','pr',-60,1],['CB LDLC','LDLC','pr',-120,1],['CB MAGASIN INCONNU','MAGASIN INCONNU','pe',-25,10]];
  const ops=[]; let n=0;
  for(let k=0;k<36;k++){const y=2023+Math.floor(k/12), m=k%12+1, mm=String(m).padStart(2,'0');
    for(const [l,mer,a,amt,cnt] of M) for(let i=0;i<cnt;i++){const d=String(1+(i*7+k)%27).padStart(2,'0');ops.push({id:'x'+(n++),date:`${y}-${mm}-${d}`,label:l,amount:+(amt*(0.7+((i*13+k*7)%10)/16)).toFixed(2),merchant:mer,acct:a})}
    ops.push({id:'x'+(n++),date:`${y}-${mm}-05`,label:'VIR SEPA VERS PERSO',amount:-2000,merchant:'PERSO',acct:'pr'});
    ops.push({id:'x'+(n++),date:`${y}-${mm}-06`,label:'VIR SEPA RECU QONTO',amount:2000,merchant:'QONTO',acct:'pe'});
    ops.push({id:'x'+(n++),date:`${y}-${mm}-10`,label:'VIREMENT VERS LIVRET',amount:-200,merchant:'LIVRET',acct:'pe'});
    ops.push({id:'x'+(n++),date:`${y}-${mm}-10`,label:'VIREMENT RECU COMPTE',amount:200,merchant:'COMPTE',acct:'ep'});
  }
  ops.sort((a,b)=>a.date<b.date?1:-1);
  return {schemaVersion:3,accounts:acc,ops,settings:{taux:22,epargne:12000},
    rules:{CARREFOUR:'courses','BOULANGERIE DU PORT':'resto','RESTAURANT LE QUAI':'resto',TOTALENERGIES:'transport',EDF:'logement',NETFLIX:'abonnements',AMAZON:'shopping','HONORAIRES CLIENT':'revenus',URSSAF:'cotisations',ADOBE:'logiciels',LDLC:'materiel'}};
}

test('5 000 opérations sur 3 ans : chaque écran s’affiche en moins d’une demi-seconde',async({page})=>{
  const h=histoire(); expect(h.ops.length).toBeGreaterThan(4800);
  await openWith(page,h);
  const res=await page.evaluate(TABS=>{const out=[];
    for(const U of ['all','pro','perso']) for(const t of TABS) for(const lvl of ['M','Y']){
      UNIV=U;view=t;P={...defaultPeriod(),lvl};openCat=null;const t0=performance.now();render();out.push([U,t,lvl,Math.round(performance.now()-t0)])}
    return out},TABS);
  const slow=res.filter(r=>r[3]>500);
  console.log('Plus lent :',res.sort((a,b)=>b[3]-a[3]).slice(0,4).map(r=>r.join(' ')+' ms').join(' | '));
  expect(slow).toEqual([]);
  // Les virements pro → perso de chaque mois sont bien reconnus
  const remu=await page.evaluate(()=>agg({lvl:'Y',y:2025,m:1},'pro').remu);
  expect(remu).toBe(24000);
});

test('tous les écrans de la démo s’affichent sans erreur, dans les trois univers',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  for(const U of ['all','pro','perso']){
    await page.evaluate(U=>{UNIV=U;render()},U);
    for(const t of TABS){
      await page.click(`nav.tabs [data-tab="${t}"]`);
      await expect(page.locator('#view')).not.toBeEmpty();
    }
  }
  await page.click('nav.tabs [data-tab="synthese"]');
  await page.click('[data-univ="all"]');
  await page.click('[data-lvl="Y"]');
  await page.click('[data-act="review"]');
  await expect(page.locator('#review')).toBeVisible();
});

test('la démo ne touche pas aux données enregistrées',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  await page.waitForTimeout(900);
  expect(await page.evaluate(()=>localStorage.getItem('mes-comptes-v1'))).toBeNull();
});

test('hors de claude.ai, aucune trace de Claude dans « À valider »',async({page})=>{
  await openWith(page,histoire());
  await page.click('nav.tabs [data-tab="valider"]');
  await expect(page.locator('#view')).not.toContainText('Demander à Claude');
});

test('aucun défilement horizontal en largeur mobile, sur tous les écrans et univers',async({page})=>{
  await page.setViewportSize({width:400,height:900});
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  for(const U of ['all','pro','perso']) for(const t of TABS){
    await page.evaluate(([U,t])=>{UNIV=U;view=t;render()},[U,t]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${U} ${t}`).toBeLessThanOrEqual(400);
  }
});
