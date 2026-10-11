import {test,expect,openWith,APP,APP_SAL} from './helpers.js';
/* Remboursements de soins : rangés d'office dans Santé et déduits des dépenses de santé (données fictives) */
for(const [nom,url] of [['Mes comptes',APP],['Mon compte',APP_SAL]])
test(`${nom} remboursements sante deduits de la rubrique Sante`,async({page})=>{
  await openWith(page,{onboarded:true},url);
  const r=await page.evaluate(()=>{
    S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}];
    const auto=(l,t,a)=>autoCatOf(l,t,a);
    const reco={cpam:auto('VIR CPAM LOIRE ATLANTIQUE','perso',23),maladie:auto('VIR ASSURANCE MALADIE','perso',50),mut:auto('VIREMENT MUTUELLE GENERALE','perso',30),
      mgen:auto('VIR MGEN','perso',30),rbt:auto('RBT SOINS 0925','perso',12),prenom:auto('VIR ALAN DUPONT','perso',100),
      prime:auto('PRLV MUTUELLE GENERALE','perso',-45),pro:auto('VIR CPAM','pro',20),secuInd:auto('PRLV SECURITE SOCIALE DES INDEPENDANTS','perso',-300)};
    const L=[['CB PHARMACIE DES DUNES',-100],['CB DOCTEUR MARTIN',-60],['VIR CPAM LOIRE ATLANTIQUE',23],['VIR MGEN',30]];
    S.ops=L.map(([l,a],i)=>({id:'o'+i,date:'2026-09-1'+i,label:l,amount:a,merchant:merchantOf(l),acct:'a'}));
    for(const o of S.ops) appliqueAuto(o,'perso');
    classerNouvelles(S.ops);
    save();P={lvl:'M',y:2026,m:9};render();
    const e=agg({lvl:'M',y:2026,m:9},'perso').by.sante;
    return {reco,cats:S.ops.map(o=>catOf(o)),sante:{spent:e.spent,ref:e.ref,net:e.net}};
  });
  expect(r.reco).toMatchObject({cpam:'sante',maladie:'sante',mut:'sante',mgen:'sante',rbt:'sante',prenom:null});
  expect(r.reco.prime).not.toBe('sante');      // la cotisation de la mutuelle reste une dépense à part
  expect(r.reco.pro).not.toBe('sante');
  expect(r.reco.secuInd).not.toBe('sante');
  expect(r.cats).toEqual(['sante','sante','sante','sante']);
  expect(r.sante).toEqual({spent:160,ref:53,net:107});
  await expect(page.locator('#view')).toContainText('après 53 € de remboursements');
  await page.click('nav.tabs [data-tab="bilan"]');
  await expect(page.locator('#view')).toContainText('après 53 € de remboursements');
  await page.click('nav.tabs [data-tab="operations"]');
  await page.locator('[data-op]',{hasText:'CPAM'}).click();
  await expect(page.locator('.fiche')).toContainText('Remboursement, retiré de vos dépenses « Santé »');
});
