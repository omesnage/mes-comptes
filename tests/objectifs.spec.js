import {test,expect,openWith} from './helpers.js';
const nb=s=>s.replace(/\s/g,' ');
const txt=async l=>nb(await l.textContent());

test('démarrage : prix à facturer en direct, valeurs par défaut pour ce qui n’est pas saisi',async({page})=>{
  await openWith(page,'vierge');
  await page.click('[data-onb="1"]');
  // Défaut : 2 000 €, 40 h, 0 % gardé de côté → 2 000 × 12 ÷ 0,9 ÷ (45 × 40 × 0,7) = 21,16 €
  expect(await txt(page.locator('#prixLive'))).toBe('Pour avoir 2 000 € par mois, vous devez vous faire payer au minimum 21 € de l’heure.');
  await page.fill('[data-set="taux"]','25');
  // 26 666,67 ÷ 0,75 ÷ 1 260 = 28,22 €
  expect(await txt(page.locator('#prixLive'))).toBe('Pour avoir 2 000 € par mois, vous devez vous faire payer au minimum 28 € de l’heure.');
  await page.fill('[data-set="netVise"]','3000');
  expect(await txt(page.locator('#prixLive'))).toContain('Pour avoir 3 000 € par mois');
  await page.fill('[data-set="heuresSemaine"]','30');
  // 3 000 × 12 ÷ 0,9 ÷ 0,75 ÷ (45 × 30 × 0,7) = 56,44 €
  expect(await txt(page.locator('#prixLive'))).toContain('au minimum 56 € de l’heure');
  await page.click('.demarrage [data-tab="objectifs"]');
  await expect(page.locator('.titre-page')).toHaveText('Mes objectifs');
});

test('Mes objectifs : objectif, affiner replié, limites avec shopping, sorties, vacances et cadeaux en tête',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]'); await page.click('nav.tabs [data-tab="objectifs"]');
  await expect(page.locator('#objectif h3')).toHaveText('Mon objectif');
  await expect(page.locator('.affiner')).not.toHaveAttribute('open','');
  await expect(page.locator('#prixLive')).toContainText('vous devez vous faire payer au minimum');
  const tete=await page.locator('#limites > .limite-reg .lr-nom').allTextContents();
  expect(tete.map(t=>t.trim())).toEqual(['Vêtements et shopping','Sorties et loisirs','Vacances','Cadeaux']);
  await expect(page.locator('#limites details summary')).toHaveText('Autres rubriques');
  await page.locator('#limites details summary').click();
  const r=page.locator('.limite-reg',{hasText:'Restaurants et cafés'});
  await r.locator('input').fill('250'); await r.locator('select').selectOption('Q'); await r.locator('input').press('Tab');
  expect(await page.evaluate(()=>catById('resto').limite)).toEqual({montant:250,per:'Q'});
  await r.locator('input').fill(''); await r.locator('select').selectOption('M');
  expect(await page.evaluate(()=>catById('resto').limite)).toBeNull();
});

/* Encaissements : 3 000 € sur le compte pro. Prix minimum (sans frais, 0 %) : 21,16 € de l'heure */
const pro=extra=>({schemaVersion:8,onboarded:true,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true}],
  ops:[{id:'c1',date:'2026-06-05',label:'VIR CLIENT',amount:3000,merchant:'CLIENT',acct:'pr'},{id:'c2',date:'2026-06-15',label:'VIR CLIENT',amount:1000,merchant:'CLIENT',acct:'pr'},{id:'f1',date:'2026-06-20',label:'CB CARTOUCHES',amount:-0.01,merchant:'CARTOUCHES',acct:'pr'}],rules:{CLIENT:'revenus',CARTOUCHES:'materiel'},...extra});
test('encaissement : équivalent en heures au prix minimum, puis taux réel après saisie du temps passé',async({page})=>{
  await openWith(page,pro());
  const px=await page.evaluate(()=>heuresPrix());
  expect(px).toBeCloseTo(26666.667/1260,3);
  await page.click('nav.tabs [data-tab="operations"]'); await page.evaluate(()=>{P={lvl:'M',y:2026,m:6};render()});
  const b=page.locator('.op-bloc',{has:page.locator('[data-op="c1"]')});
  await expect(b.locator('.h-eq')).toHaveText(`= environ ${Math.round(3000/px)} h de travail à votre prix`);
  await b.locator('[data-heures]').click();
  await page.fill('#heuresIn','80'); await page.click('[data-heuresok]');
  const r=page.locator('.op-bloc',{has:page.locator('[data-op="c1"]')}).locator('.h-reel');
  await expect(r).toHaveText('Vous avez passé 80 h : ce travail vous a rapporté 38 € de l’heure');
  await expect(r).toHaveClass(/or/);
  expect(await page.evaluate(()=>S.ops.find(o=>o.id==='c1').heures)).toBe(80);
  // Sous le prix minimum : rouge
  await page.locator('.op-bloc',{has:page.locator('[data-op="c2"]')}).locator('[data-heures]').click();
  await page.fill('#heuresIn','100'); await page.press('#heuresIn','Enter');
  await expect(page.locator('.op-bloc',{has:page.locator('[data-op="c2"]')}).locator('.h-reel')).toHaveClass(/rouge/);
  // Dans la sauvegarde
  const json=await page.evaluate(()=>JSON.stringify({data:S}));
  expect(json).toContain('"heures":80');
  // Bilan, partie Activité
  await page.click('nav.tabs [data-tab="bilan"]'); await page.evaluate(()=>{PB={lvl:'M',y:2026,m:6};BU='pro';render()});
  const h=page.locator('.heures-bilan');
  await expect(h).toContainText(`vos encaissements représentent environ ${Math.round(4000/px)} h de travail à votre prix`);
  await expect(h).toContainText('Sur les travaux où vous avez noté votre temps, vous avez gagné en moyenne 22 € de l’heure.');
});

/* Limites : trois couleurs, trois périodes */
function perso(ops,limite){return {schemaVersion:8,onboarded:true,accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true}],
  ops:ops.map(([d,a],i)=>({id:'o'+i,date:d,label:'ZARA',amount:-a,merchant:'ZARA',acct:'pe'})),rules:{ZARA:'shopping'},categories:undefined,_l:limite}}
async function etat(page,ops,limite,m){
  if(!(await page.evaluate(()=>typeof render==='function').catch(()=>false))) await openWith(page,perso([]));
  return page.evaluate(([ops,l,m])=>{S.ops=ops.map(([d,a],i)=>({id:'o'+i,date:d,label:'ZARA',amount:-a,merchant:'ZARA',acct:'pe'}));catById('shopping').limite=l;P={lvl:'M',y:2026,m};render();const e=etatLimite(catById('shopping'),P);return {etat:e.etat,msg:e.msg,dep:e.dep}},[ops,limite,m]);
}
test('limite par mois : dorée, orange au-delà de 80 %, rouge au-delà',async({page})=>{
  expect(await etat(page,[['2026-06-10',150]],{montant:250,per:'M'},6)).toMatchObject({etat:'or',msg:''});
  expect(await etat(page,[['2026-06-10',210]],{montant:250,per:'M'},6)).toMatchObject({etat:'orange',msg:'Attention, vous approchez de votre limite'});
  const r=await etat(page,[['2026-06-10',295]],{montant:250,per:'M'},6);
  expect(r.etat).toBe('rouge'); expect(nb(r.msg)).toBe('Limite dépassée de 45 €');
});
test('limite par trimestre : prorata des mois écoulés',async({page})=>{
  // 2e trimestre, affiché en mai : prorata 2/3 de 600 = 400
  expect((await etat(page,[['2026-04-10',150],['2026-05-10',200]],{montant:600,per:'Q'},5)).etat).toBe('or');
  expect((await etat(page,[['2026-04-10',250],['2026-05-10',200]],{montant:600,per:'Q'},5)).etat).toBe('orange');
  expect((await etat(page,[['2026-04-10',400],['2026-05-10',250]],{montant:600,per:'Q'},5)).etat).toBe('rouge');
});
test('limite par an : prorata, et affichage sur l’Accueil, dans les conseils et dans le Bilan',async({page})=>{
  expect((await etat(page,[['2026-01-10',200],['2026-06-10',200]],{montant:1200,per:'Y'},6)).etat).toBe('or');
  expect((await etat(page,[['2026-01-10',500],['2026-06-10',200]],{montant:1200,per:'Y'},6)).etat).toBe('orange');
  await etat(page,[['2026-01-10',900],['2026-06-10',480]],{montant:1200,per:'Y'},6);
  const b=page.locator('.budgets .budget-an');
  await expect(b).toHaveClass(/rouge/);
  expect(nb(await b.locator('.phrase').textContent())).toBe('Vêtements et shopping : 1 380 € sur 1 200 € cette année');
  expect(nb(await b.locator('.ba-msg').textContent())).toBe('Limite dépassée de 180 €');
  await expect(page.locator('.conseil.ko').first()).toContainText('Limite dépassée pour Vêtements et shopping');
  await page.click('nav.tabs [data-tab="bilan"]');
  await expect(page.locator('.rep-l',{hasText:'Vêtements et shopping'}).locator('.rep-lim.rouge')).toContainText('Limite dépassée de 180');
});
test('sans limite : l’encadré propose d’en fixer, avec un lien vers Mes objectifs',async({page})=>{
  await openWith(page,perso([['2026-06-10',50]]));
  const e=page.locator('.limites-propose');
  await expect(e).toContainText('Fixez-vous des limites pour le shopping, les sorties ou les vacances');
  await e.locator('[data-tab="objectifs"]').click();
  await expect(page.locator('.titre-page')).toHaveText('Mes objectifs');
});
test('vocabulaire : cotisations et impôts à garder de côté, avec le pourcentage réel',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]');
  await expect(page.locator('.ligne-cot span')).toHaveText('Cotisations et impôts à garder de côté (22 %)');
  await expect(page.locator('#view')).not.toContainText('À mettre de côté');
});
test('graphiques : tout est étiqueté, avec une phrase qui dit ce qu’ils montrent',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]'); await page.click('nav.tabs [data-tab="bilan"]');
  for(const lvl of ['M','Q','Y']){
    await page.click(`[data-blvl="${lvl}"]`);
    await expect(page.locator('.repartition h3')).toHaveText(/^Répartition de vos dépenses (de|du) /);
    await expect(page.locator('.repartition > .aide')).toContainText('Chaque barre montre');
    for(const l of await page.locator('.rep-l').all()){expect((await l.locator('.rep-nom').textContent()).trim().length).toBeGreaterThan(0);expect(nb(await l.locator('.rep-val').textContent())).toMatch(/^\d[\d ]* € · \d+ %$/)}
    const ev=page.locator('.evolution');
    await expect(ev.locator('.aide').first()).toContainText('mois par mois');
    for(const c of await ev.locator('.col').all()){expect((await c.locator('.lbl').textContent()).trim()).not.toBe('');expect(nb(await c.locator('.val').textContent())).toMatch(/^(\d[\d ]* €)?$/)}
    expect(await ev.locator('.col .val').evaluateAll(v=>v.filter(x=>x.textContent.trim()).length)).toBeGreaterThan(0);
    await expect(ev.locator('.legende-moy')).toContainText('Ligne pointillée : votre moyenne');
    // Tailles lisibles
    const tailles=await page.locator('.rep-l .rep-nom, .rep-val, .col .val, .col .lbl').evaluateAll(e=>e.map(x=>parseFloat(getComputedStyle(x).fontSize)));
    expect(Math.min(...tailles)).toBeGreaterThanOrEqual(15);
  }
});

test('couleurs d’état : vert tendre quand tout va bien, orange, rouge',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]');
  const c=await page.evaluate(()=>{const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim(),col=s=>{const e=document.querySelector(s);return e&&getComputedStyle(e).backgroundColor||getComputedStyle(e).color};
    const bar=e=>getComputedStyle(document.querySelector(`.budget-an.${e} .barre-an span`)).backgroundColor;
    return {ok:bar('or'),orange:bar('orange'),rouge:bar('rouge'),sal:getComputedStyle(document.querySelector('.salaire')).color,cls:document.querySelector('.salaire').className}});
  expect(c.ok).toBe('rgb(140, 191, 133)');
  expect(c.orange).not.toBe(c.ok); expect(c.rouge).not.toBe(c.ok); expect(c.orange).not.toBe(c.rouge);
  if(c.cls.includes('or')) expect(c.sal).toBe('rgb(74, 122, 70)');
});
