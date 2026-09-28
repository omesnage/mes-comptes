import {test,expect,openWith} from './helpers.js';
/* Un compte pro : chiffre d'affaires et frais au choix pour chaque mois de 2026 */
function etat(mois,extra={}){
  const ops=[]; let n=0;
  for(const [m,ca,frais] of mois){const mm=String(m).padStart(2,'0');
    if(ca) ops.push({id:'c'+n++,date:`2026-${mm}-10`,label:'VIR CLIENT',amount:ca,merchant:'CLIENT',acct:'pr'});
    if(frais) ops.push({id:'f'+n++,date:`2026-${mm}-28`,label:'CB LOGICIEL',amount:-frais,merchant:'LOGICIEL',acct:'pr'});}
  return {schemaVersion:3,accounts:[{id:'pr',name:'Qonto',type:'pro',confirmed:true}],ops,rules:{CLIENT:'revenus',LOGICIEL:'logiciels'},settings:{taux:20,heures:160,netVise:2000,...extra}};
}
const P=(m)=>({lvl:'M',y:2026,m});

test('revenu net, taux horaire réel et cible',async({page})=>{
  await openWith(page,etat([[1,3000,200],[2,2500,500],[3,2000,0]]));
  const x=await page.evaluate(()=>{const f=p=>{const a=activite(p);return [a.net,a.taux,a.cible,a.manque,a.ok,a.lisse,a.tauxLisse]};return [f({lvl:'M',y:2026,m:1}),f({lvl:'M',y:2026,m:3}),f({lvl:'Q',y:2026,m:1})]});
  // Janvier : 3000 − 200 − 20 % × 3000 = 2200 € nets, 13,75 €/h
  expect(x[0].slice(0,5)).toEqual([2200,13.75,12.5,0,true]);
  // Mars : 2000 − 400 = 1600 € nets, 10 €/h, il manque 400 € ; moyenne lissée (2200+1500+1600)/3
  expect(x[1].slice(0,5)).toEqual([1600,10,12.5,400,false]);
  expect(x[1][5]).toBeCloseTo(1766.67,2);
  // Trimestre : moyenne par mois
  expect(x[2][0]).toBeCloseTo(1766.67,2);
});

test('assiette sur le résultat',async({page})=>{
  await openWith(page,etat([[1,3000,1000]],{assiette:'resultat'}));
  expect(await page.evaluate(()=>activite({lvl:'M',y:2026,m:1}).net)).toBe(1600);
});

test('alerte rouge sous l’objectif : taux, manque et pistes chiffrées',async({page})=>{
  await openWith(page,etat([[1,3000,200],[2,2500,500],[3,2000,100]]));
  await page.click('[data-univ="pro"]');
  const a=page.locator('.alerte.crit');
  await expect(a).toContainText('Ce mois-ci, votre travail vous a rapporté 9,38 € de l’heure, pour 12,50 € visés.');
  await expect(a).toContainText('Il manque 500 € pour atteindre 2 000 € nets');
  await expect(a).toContainText('Augmenter vos tarifs d’environ 32 %, soit 625 € de chiffre d’affaires en plus par mois.');
  await expect(a).toContainText('Ou travailler 120 h par mois au lieu de 160 h');
  await expect(a).toContainText('Ou réduire vos frais pro, qui s’élèvent à 100 € par mois.');
  await expect(a).toContainText('Sur les 3 derniers mois, en moyenne');
  // Même alerte dans la vue d'ensemble, absente côté perso
  await page.click('[data-univ="all"]');
  await expect(page.locator('.alerte.crit')).toHaveCount(1);
  await page.click('[data-univ="perso"]');
  await expect(page.locator('.alerte')).toHaveCount(0);
});

test('message doré quand l’objectif est atteint, et il réagit aux réglages',async({page})=>{
  await openWith(page,etat([[1,3000,200]]));
  await page.click('[data-univ="pro"]');
  await expect(page.locator('.alerte.good')).toContainText('13,75 € de l’heure');
  await expect(page.locator('.alerte.good')).toContainText('Objectif de 2 000 € nets atteint, avec 200 € d’avance.');
  // Le taux cible se recalcule en direct dans les réglages
  await page.click('nav.tabs [data-tab="regles"]');
  await expect(page.locator('#cibleLive')).toHaveText('12,50 €');
  await page.fill('[data-set="netVise"]','2400');
  await expect(page.locator('#cibleLive')).toHaveText('15,00 €');
  await page.fill('[data-set="heures"]','120');
  await expect(page.locator('#cibleLive')).toHaveText('20,00 €');
  await page.locator('[data-set="heures"]').blur();
  await page.click('nav.tabs [data-tab="synthese"]');
  await expect(page.locator('.alerte.crit')).toContainText('18,33 € de l’heure');
});

test('revenu net négatif : message clair',async({page})=>{
  await openWith(page,etat([[1,500,900]]));
  await page.click('[data-univ="pro"]');
  await expect(page.locator('.alerte.crit')).toContainText('votre travail ne vous a rien rapporté : le revenu net est de −500 €');
});

test('graphique sur 12 mois : les mois sous le taux visé sont en rouge',async({page})=>{
  await openWith(page,etat([[1,3000,200],[2,2500,500],[3,2000,0],[4,4000,100]]));
  await page.click('[data-univ="pro"]');
  const svg=page.locator('svg[aria-label="Taux horaire réel sur douze mois"]');
  await expect(svg.locator('rect.bas')).toHaveCount(2);
  await expect(svg.locator('rect.haut')).toHaveCount(2);
});

test('le vrai prix des dépenses utilise le taux horaire réel',async({page})=>{
  const e=etat([[1,3000,200],[2,3000,200],[3,3000,200]]);
  e.accounts.push({id:'pe',name:'Perso',type:'perso',confirmed:true});
  e.ops.push({id:'z',date:'2026-03-15',label:'CB FNAC',amount:-275,merchant:'FNAC',acct:'pe'}); e.rules.FNAC='shopping';
  await openWith(page,e);
  await page.click('nav.tabs [data-tab="economies"]');
  // 2200 € nets / 160 h = 13,75 €/h ; 275 € = 20 h
  await expect(page.locator('#view')).toContainText('vous rapporte réellement 13,75 €');
  await expect(page.locator('.row',{hasText:'FNAC'})).toContainText('20 h');
});

test('mois en cours incomplet : signalé',async({page})=>{
  await openWith(page,etat([[1,3000,200],[2,1000,0]]));
  await page.click('[data-univ="pro"]');
  await expect(page.locator('.alerte')).toContainText('votre dernier relevé s’arrête au 10');
});
