import {test,expect,openWith} from './helpers.js';
const VUES=['accueil','operations','importer','reglages'];

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
  return {schemaVersion:4,onboarded:true,accounts:acc,ops,settings:{taux:22,epargne:12000},virements:{PERSO:'remu'},
    rules:{CARREFOUR:'courses','BOULANGERIE DU PORT':'resto','RESTAURANT LE QUAI':'resto',TOTALENERGIES:'transport',EDF:'energie',NETFLIX:'abonnements',AMAZON:'shopping','HONORAIRES CLIENT':'revenus',URSSAF:'cotisations',ADOBE:'logiciels',LDLC:'materiel'}};
}

test('5 000 opérations sur 3 ans : chaque écran s’affiche en moins d’une demi-seconde',async({page})=>{
  const h=histoire(); expect(h.ops.length).toBeGreaterThan(4800);
  await openWith(page,h);
  const res=await page.evaluate(VUES=>{const out=[];
    for(const v of VUES) for(const k of [0,5,20]){view=v;P=shift(defaultPeriod(),-k);openCat=null;const t0=performance.now();render();out.push([v,k,Math.round(performance.now()-t0)])}
    return out},VUES);
  console.log('Plus lent :',res.sort((a,b)=>b[2]-a[2]).slice(0,3).map(r=>r.join(' ')+' ms').join(' | '));
  expect(res.filter(r=>r[2]>500)).toEqual([]);
  expect(await page.evaluate(()=>agg({lvl:'Y',y:2025,m:1},'pro').remu)).toBe(24000);
});

/* Parcourt tous les écrans de la démo : accueil sur plusieurs mois, opérations avec une fiche ouverte, importer, réglages, démarrage */
async function parcours(page,f){
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  for(const k of [0,1]){await page.evaluate(k=>{view='accueil';P=shift(defaultPeriod(),-k);openCat='resto';render()},k);await f('accueil '+k)}
  await page.click('nav.tabs [data-tab="operations"]'); await f('operations');
  await page.locator('.ops .op').first().click(); await expect(page.locator('.fiche')).toBeVisible(); await f('fiche');
  await page.click('.fiche .fermer');
  await page.click('nav.tabs [data-tab="importer"]'); await f('importer');
  await page.click('#gear'); await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await f('reglages');
  await page.evaluate(()=>{S.onboarded=false;demo=false;ONB=1;render()}); await f('demarrage');
}

test('lisibilité : aucun texte sous 15 px, zones à toucher d’au moins 44 px',async({page})=>{
  for(const w of [390,1280]){
    await page.setViewportSize({width:w,height:900});
    await parcours(page,async nom=>{
      const r=await page.evaluate(()=>{
        const petits=[],bas=[];
        for(const el of document.querySelectorAll('body *')){
          if(!el.offsetParent&&getComputedStyle(el).position!=='fixed') continue;
          if(el.closest('svg')||el.closest('#review')) continue;
          const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
          if(own&&parseFloat(getComputedStyle(el).fontSize)<15) petits.push(el.tagName+'.'+el.className+' '+getComputedStyle(el).fontSize+' «'+el.textContent.trim().slice(0,30)+'»');
          if(el.matches('button,summary,label.btn,.gros-bouton,input:not([type=radio]):not([type=file]),select')){const b=el.getBoundingClientRect();if(b.width&&b.height<43.5)bas.push(el.tagName+'.'+el.className+' '+Math.round(b.height)+' «'+el.textContent.trim().slice(0,30)+'»')}
        }
        return {petits:[...new Set(petits)].slice(0,8),bas:[...new Set(bas)].slice(0,8)}});
      expect(r.petits,`${w} ${nom} : textes trop petits`).toEqual([]);
      expect(r.bas,`${w} ${nom} : zones trop petites`).toEqual([]);
    });
  }
});

test('texte courant : 18 px sur mobile, 17 px sur ordinateur ; grand chiffre de 52 à 64 px ; titres à 22 px',async({page})=>{
  for(const [w,base] of [[390,18],[1280,17]]){
    await page.setViewportSize({width:w,height:900});
    await openWith(page,null); await page.click('[data-act="demo"]');
    const r=await page.evaluate(()=>({body:getComputedStyle(document.body).fontSize,big:getComputedStyle(document.querySelector('.grand-chiffre')).fontSize,h3:getComputedStyle(document.querySelector('.carte h3')).fontSize,lh:getComputedStyle(document.body).lineHeight}));
    expect(parseFloat(r.body)).toBe(base);
    expect(parseFloat(r.big)).toBeGreaterThanOrEqual(52); expect(parseFloat(r.big)).toBeLessThanOrEqual(64);
    expect(parseFloat(r.h3)).toBe(22);
    expect(parseFloat(r.lh)/parseFloat(r.body)).toBeCloseTo(1.5,1);
  }
});

test('aucun mot technique à l’écran',async({page})=>{
  const INTERDITS=/URSSAF|cotisation|charges sociales|charges globales|provision|trésorerie|matelas|lissé|point mort|taux horaire/i;
  await parcours(page,async nom=>{
    const t=await page.evaluate(()=>{const c=document.body.cloneNode(true);c.querySelectorAll('.op-m,.q-t,.q-s,.f-m,.fiche .aide,.pv,textarea,script,style,#review,.regle>span:first-child').forEach(e=>e.remove());return c.innerText});
    const m=t.match(INTERDITS); expect(m&&m[0],nom).toBeFalsy();
  });
});

test('aucun défilement horizontal en largeur mobile',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await parcours(page,async nom=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth),nom).toBeLessThanOrEqual(360)});
});

test('trois onglets, en bas de l’écran sur mobile ; réglages derrière l’engrenage',async({page})=>{
  await page.setViewportSize({width:390,height:800});
  await openWith(page,null); await page.click('[data-act="demo"]');
  await expect(page.locator('nav.tabs button')).toHaveText([/Accueil/,/Mes opérations/,/Importer/]);
  const b=await page.locator('nav.tabs').boundingBox(); expect(b.y+b.height).toBeGreaterThan(790);
  await page.click('#gear'); await expect(page.locator('.titre-page')).toHaveText('Réglages');
});

test('la démo ne touche pas aux données enregistrées',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  await page.waitForTimeout(900);
  expect(await page.evaluate(()=>(JSON.parse(localStorage.getItem('mes-comptes-v1')||'{}').ops||[]).length)).toBe(0);
});
