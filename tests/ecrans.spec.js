import {test,expect,openWith} from './helpers.js';
const VUES=['accueil','bilan','operations','importer','objectifs','reglages'];

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
  await page.click('nav.tabs [data-tab="bilan"]'); await f('bilan');
  await page.click('[data-blvl="Y"]'); if(await page.locator('[data-btout]').count()) await page.click('[data-btout]'); await f('bilan annee');
  await page.locator('.rep-l').first().click(); await f('fiche rubrique'); await page.click('.fiche .fermer');
  await page.click('[data-bu="pro"]'); await f('bilan activite');
  await page.click('[data-modal="prix"]'); await f('comment c’est calculé'); await page.click('.fenetre .fermer');
  await page.click('nav.tabs [data-tab="accueil"]'); await page.click('[data-modal="cascade"]'); await f('d’où vient ce chiffre'); await page.click('.fenetre .fermer');
  await page.evaluate(()=>{S.settings.taux=0;render()}); await f('accueil sans taux'); await page.evaluate(()=>{S.settings.taux=22;render()});
  await page.click('nav.tabs [data-tab="operations"]'); await f('operations');
  await page.locator('[data-heures]').first().click(); await f('saisie des heures'); await page.fill('#heuresIn','60'); await page.click('[data-heuresok]'); await f('heures notées');
  await page.locator('.ops .op').first().click(); await expect(page.locator('.fiche')).toBeVisible(); await f('fiche');
  await page.click('.fiche .fermer');
  await page.click('nav.tabs [data-tab="importer"]'); await f('importer');
  await page.click('[data-act="coller"]'); await page.fill('#colleTxt','03/03/2026 CARREFOUR MARKET -45,20 €\n04/03/2026 CLIENT +300,00 €'); await page.click('[data-act="collelire"]'); await f('coller'); await page.click('[data-act="collefin"]');
  await page.click('nav.tabs [data-tab="objectifs"]'); await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await f('objectifs');
  await page.click('nav.tabs [data-tab="reglages"]'); await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await f('reglages');
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
  const INTERDITS=/URSSAF|comptable|charges sociales|charges globales|provision|trésorerie|matelas|lissé|point mort|taux horaire/i;
  await parcours(page,async nom=>{
    const t=await page.evaluate(()=>{const c=document.body.cloneNode(true);c.querySelectorAll('.op-m,.q-t,.q-s,.f-m,.fiche .aide,.pv,textarea,script,style,#review,.regle>span:first-child').forEach(e=>e.remove());
      return c.innerText});
    const m=t.match(INTERDITS); expect(m&&m[0],nom).toBeFalsy();
  });
});

test('aucun défilement horizontal en largeur mobile',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await parcours(page,async nom=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth),nom).toBeLessThanOrEqual(360)});
});

test('six onglets en bas de l’écran sur mobile, dont Réglages ; plus d’engrenage',async({page})=>{
  await page.setViewportSize({width:390,height:800});
  await openWith(page,null); await page.click('[data-act="demo"]');
  await expect(page.locator('nav.tabs button')).toHaveText([/Accueil/,/Bilan/,/Mes opérations/,/Importer/,/Mes objectifs/,/Réglages/]);
  await expect(page.locator('#gear')).toHaveCount(0);
  const b=await page.locator('nav.tabs').boundingBox(); expect(b.y+b.height).toBeGreaterThan(790);
  await page.click('nav.tabs [data-tab="reglages"]'); await expect(page.locator('.titre-page')).toHaveText('Réglages');
});

test('la démo ne touche pas aux données enregistrées',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  await page.waitForTimeout(900);
  expect(await page.evaluate(()=>(JSON.parse(localStorage.getItem('mes-comptes-v1')||'{}').ops||[]).length)).toBe(0);
});

test('aucune trace de Jost, Bodoni, URSSAF ni comptable dans le fichier livré ; police Plus Jakarta Sans',async({page})=>{
  const fs=await import('fs'); const h=fs.readFileSync(new URL('../dist/mes-comptes.html',import.meta.url),'utf8');
  expect(h.match(/jost|bodoni|urssaf|comptable/gi)).toBeNull();
  expect(h).toContain('family=Plus+Jakarta+Sans:wght@300;400;500');
  await openWith(page,null); await page.click('[data-act="demo"]');
  const r=await page.evaluate(()=>{const f=e=>getComputedStyle(document.querySelector(e));return {body:f('body').fontFamily,bw:f('body').fontWeight,big:f('.grand-chiffre').fontWeight,bigNum:f('.grand-chiffre').fontVariantNumeric,h3:f('.carte h3').fontWeight,sal:f('.salaire').fontWeight}});
  expect(r.body).toContain('Plus Jakarta Sans'); expect(r.bw).toBe('400'); expect(r.big).toBe('300'); expect(r.bigNum).toContain('tabular-nums');
  expect(r.h3).toBe('500'); expect(r.sal).toBe('500');
  // Jamais de graisse 300 sous 24 px
  const fins=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.offsetParent&&getComputedStyle(e).fontWeight==='300'&&parseFloat(getComputedStyle(e).fontSize)<24&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>e.className));
  expect(fins).toEqual([]);
});
test('aucun texte ne déborde de son cadre, sur mobile et sur ordinateur',async({page})=>{
  for(const w of [360,1280]){
    await page.setViewportSize({width:w,height:900});
    await openWith(page,null); await page.click('[data-act="demo"]');
    for(const v of ['accueil','bilan','operations','importer','reglages']){
      await page.evaluate(v=>{view=v;BU=v==='bilan'?'pro':'perso';render();document.querySelectorAll('details').forEach(d=>d.open=true)},v);
      const d=await page.evaluate(()=>[...document.querySelectorAll('#view *')].filter(e=>e.offsetParent&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='visible'&&!e.closest('.barres')&&e.tagName!=='SELECT').map(e=>e.tagName+'.'+e.className).slice(0,5));
      expect(d,`${w} ${v}`).toEqual([]);
    }
  }
});
