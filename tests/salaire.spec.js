import {test,expect,openWith} from './helpers.js';
const n=s=>s.replace(/\s/g,' ');
/* Compte pro seul : un encaissement et des frais par mois, 22 % mis de côté sur l'encaissé */
function etat(mois,extra={}){
  const ops=[]; let i=0;
  for(const [ym,ca,fr] of mois){ops.push({id:'c'+i++,date:ym+'-05',label:'VIR CLIENT',amount:ca,merchant:'CLIENT',acct:'pr'});
    if(fr)ops.push({id:'f'+i++,date:ym+'-28',label:'CB LOGICIEL',amount:-fr,merchant:'LOGICIEL',acct:'pr'})}
  return {schemaVersion:5,onboarded:true,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true}],ops,rules:{CLIENT:'revenus',LOGICIEL:'logiciels'},settings:{taux:22,...extra}};
}

test('cascade de l’exemple : 17,66 → 15,28 → 13,75',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>{const c=calcSalaire(17.66*heures(),heures(),45/52,.1);return [c.brut,c.conges,c.vrai].map(x=>+x.toFixed(2))});
  expect(r).toEqual([17.66,15.28,13.75]);
});

/* Valeurs de l'exemple : 30 % non facturé, 7 semaines de congés, 10 % d'épargne et retraite, 40 h par semaine.
   Encaissé 4 599,75 € et frais 419,20 € par mois. Pour arriver exactement à 17,66 €, la part mise de côté doit être de 24,34 % :
   avec 25 %, on obtient 17,48 € (voir le test suivant). */
const valeurs=async(page,sel)=>(await page.locator(sel+' .cas-v').allTextContents()).map(t=>t.replace(/\s/g,' '));
test('cascade de l’exemple : 37,91 → 26,54 → 24,12 → 17,66 → 15,28 → 13,75',async({page})=>{
  await openWith(page,etat([['2026-06',4599.75,419.20]],{taux:24.34}));
  await page.evaluate(()=>{S.ops.push({id:'z',date:'2026-06-29',label:'X',amount:0,merchant:'X',acct:'pr',cat:'pro'});render()});
  await expect(page.locator('.gagne .salaire')).toHaveText('Votre vrai salaire : 13,75 € nets de l’heure'.replace(' €',' €'));
  await page.click('[data-modal="cascade"]');
  expect(await valeurs(page,'.fenetre')).toEqual(['37,91 €','26,54 €','24,12 €','17,66 €','15,28 €','13,75 €','13,75 €']);
  await expect(page.locator('.fenetre .cascade > .phrase').first()).toHaveText('Sur vos 40 h par semaine, environ 28 h sont facturées à vos clients. Le reste sert à trouver des clients et à faire tourner l’activité.');
  const l=(await page.locator('.fenetre .cas-l').allTextContents());
  expect(l[0]).toBe('Ce que vos clients vous paient par heure facturée');
  expect(l[1]).toBe('Moins le temps non facturé (prospection, communication, devis, administratif… 30 %)');
  expect(l[2]).toContain('Moins les frais de fonctionnement');
  expect(l[2]).toContain('remboursements d’emprunt de l’activité compris');
  expect(l[3]).toBe('Moins les cotisations sociales et impôts (la somme mise de côté, 24 %)');
  expect(l[4]).toBe('Moins vos congés (7 semaines par an sans revenu)');
  expect(l[5]).toBe('Moins l’épargne et la retraite à constituer vous-même (10 %)');
  expect(l[6]).toBe('Votre vrai salaire net de l’heure');
  await expect(page.locator('.fenetre')).toContainText('Vous, vous devez les financer vous-même.');
  await expect(page.locator('.fenetre')).not.toContainText('Calculé sur');
  await expect(page.locator('.fenetre .cas-s').first()).toContainText('encaissés ce mois-ci');
  // Même cascade dans le Bilan, partie Activité
  await page.click('.fenetre .fermer');
  await page.click('nav.tabs [data-tab="bilan"]'); await page.click('[data-bu="pro"]');
  expect(await valeurs(page,'.salaire-bilan')).toEqual(['37,91 €','26,54 €','24,12 €','17,66 €','15,28 €','13,75 €','13,75 €']);
});
test('avec 25 % mis de côté : 37,91 → 26,54 → 24,12 → 17,48 → 15,13 → 13,62',async({page})=>{
  await openWith(page,etat([['2026-06',4599.75,419.20]],{taux:25}));
  const r=await page.evaluate(()=>{const c=cascade({lvl:'M',y:2026,m:6});return [c.a,c.b,c.c,c.d,c.e,c.f].map(x=>+x.toFixed(2))});
  expect(r).toEqual([37.91,26.54,24.12,17.48,15.13,13.62]);
});
test('a = b ÷ (1 − part non facturée), et le résultat final ne dépend pas de cette part',async({page})=>{
  await openWith(page,etat([['2026-06',4000,300]]));
  const r=await page.evaluate(()=>[0,.1,.3,.5,.8].map(nf=>{S.settings.nonFacture=nf*100;render();const c=cascade({lvl:'M',y:2026,m:6});return {nf,a:c.a,b:c.b,f:c.f}}));
  for(const x of r) expect(x.a).toBeCloseTo(x.b/(1-x.nf),9);
  for(const x of r) expect(x.f).toBeCloseTo(r[0].f,9);
});
test('part à mettre de côté non réglée : alerte rouge et bouton « Régler maintenant », qui disparaît une fois réglée',async({page})=>{
  await openWith(page,etat([['2026-06',3000,200]],{taux:0}));
  const a=page.locator('.gagne .alerte-taux');
  await expect(a).toContainText('Vous n’avez pas indiqué la part à mettre de côté pour vos cotisations et impôts : ce chiffre est trop optimiste.');
  await page.click('[data-modal="cascade"]'); await expect(page.locator('.fenetre .alerte-taux')).toHaveCount(1);
  await page.click('.fenetre .alerte-taux [data-ancre="taux-champ"]');
  await expect(page.locator('.titre-page')).toHaveText('Réglages');
  await expect(page.locator('#taux-champ input')).toBeFocused();
  await expect(page.locator('#taux-champ + .sous-champ')).toHaveText('Souvent entre 25 et 45 % selon votre statut. En cas de doute, renseignez-vous auprès de votre centre de formalités ou d’un conseiller.');
  await page.fill('#taux-champ input','30'); await page.locator('#taux-champ input').blur();
  await page.click('nav.tabs [data-tab="accueil"]');
  await expect(page.locator('.alerte-taux')).toHaveCount(0);
  await page.click('nav.tabs [data-tab="bilan"]'); await page.click('[data-bu="pro"]');
  await expect(page.locator('.alerte-taux')).toHaveCount(0);
  await page.evaluate(()=>{S.settings.taux=0;render()});
  await expect(page.locator('.salaire-bilan .alerte-taux')).toHaveCount(1);
});
test('sous le taux visé : rouge, avec ce qu’il manque de l’heure',async({page})=>{
  await openWith(page,etat([['2026-06',2600,400]]));
  const s=await page.evaluate(()=>vraiSalaire({lvl:'M',y:2026,m:6}));
  await expect(page.locator('.gagne .salaire')).toHaveClass(/rouge/);
  await expect(page.locator('.gagne .sal-manque')).toHaveText(n(`Il vous manque ${(11.5385-s.vrai).toFixed(2).replace('.',',')} € de l’heure pour atteindre votre objectif`).replace(' € de',' € de'));
});

test('vue Année : pas de correction des congés si les 12 mois ont des relevés, correction s’il en manque',async({page})=>{
  const douze=Array.from({length:12},(_,i)=>[`2025-${String(i+1).padStart(2,'0')}`,3000,200]);
  await openWith(page,etat(douze));
  let r=await page.evaluate(()=>{const s=vraiSalaire({lvl:'Y',y:2025,m:1}),m=vraiSalaire({lvl:'M',y:2025,m:3}),q=vraiSalaire({lvl:'Q',y:2025,m:3});return {corr:s.corr,inclus:s.congesInclus,vrai:s.vrai,brut:s.brut,mc:m.corr,qc:q.corr}});
  expect(r.corr).toBe(1); expect(r.inclus).toBe(true); expect(r.vrai).toBeCloseTo(r.brut*.9,6);
  expect(r.mc).toBeCloseTo(45/52,9); expect(r.qc).toBeCloseTo(45/52,9);
  await page.evaluate(()=>{S.ops=S.ops.filter(o=>!o.date.startsWith('2025-08'));render()});
  r=await page.evaluate(()=>vraiSalaire({lvl:'Y',y:2025,m:1}).corr);
  expect(r).toBeCloseTo(45/52,9);
});

test('prix minimum : les deux modes de calcul de la somme mise de côté',async({page})=>{
  const douze=Array.from({length:12},(_,i)=>[`2025-${String(i+1).padStart(2,'0')}`,3000,400]);
  await openWith(page,etat(douze));
  let j=await page.evaluate(()=>justePrix());
  // En poche : 2 000 × 12 ÷ 0,9 = 26 666,67 ; frais 4 800 ; (26 666,67 + 4 800) ÷ 0,78 = 40 341,88 ; 45 × 40 × 0,7 = 1 260 h
  expect(j.poche).toBeCloseTo(26666.67,1); expect(j.fraisAn).toBeCloseTo(4800,6); expect(j.hFact).toBe(1260);
  expect(j.enc).toBeCloseTo(40341.88,1); expect(j.heure).toBeCloseTo(32.0174,3); expect(j.jour).toBeCloseTo(224.12,1);
  expect(j.moyen).toBeCloseTo(36000/1260,6);
  await page.evaluate(()=>{S.settings.assiette='resultat'});
  j=await page.evaluate(()=>justePrix());
  expect(j.enc).toBeCloseTo(26666.67/0.78+4800,1); expect(j.heure).toBeCloseTo((26666.67/0.78+4800)/1260,3);
  // Aucun calcul absurde
  expect(await page.evaluate(()=>calcPrix({vise:2000,epargne:1,fraisAn:0,taux:.2,assiette:'ca',semaines:45,hSem:40,nonFacture:.3,hParJour:7}))).toBeNull();
  expect(await page.evaluate(()=>calcPrix({vise:2000,epargne:.1,fraisAn:0,taux:.2,assiette:'ca',semaines:0,hSem:40,nonFacture:.3,hParJour:7}))).toBeNull();
});

test('Bilan, Activité : vrai salaire et juste prix, en rouge sous le minimum ; réglages modifiables dans « Comment c’est calculé ? »',async({page})=>{
  const douze=Array.from({length:12},(_,i)=>[`2025-${String(i+1).padStart(2,'0')}`,3000,400]);
  await openWith(page,etat(douze));
  await page.click('nav.tabs [data-tab="bilan"]'); await page.click('[data-bu="pro"]');
  await expect(page.locator('.salaire-bilan .salaire')).toContainText('Votre vrai salaire :');
  const jp=page.locator('.juste-prix');
  await expect(jp).toContainText(n('Pour gagner vraiment 2 000 € nets par mois, vous devez facturer au minimum 32 € de l’heure, soit 224 € par jour.'));
  await expect(jp.locator('.phrase.rouge')).toContainText(n('Aujourd’hui, vous facturez en moyenne l’équivalent de 29 € de l’heure.'));
  await page.click('[data-modal="prix"]');
  await expect(page.locator('.fenetre')).toContainText('45 semaines travaillées');
  await expect(page.locator('.fenetre')).toContainText('Il vous reste 1 260 heures à facturer par an.'.replace(' 260',' 260'));
  await page.fill('.fenetre [data-set="nonFacture"]','20'); await page.locator('.fenetre [data-set="nonFacture"]').blur();
  await expect(page.locator('.fenetre')).toContainText('1 440 heures');
  // Le prix moyen et le minimum dépendent des mêmes heures : c'est l'objectif qui fait basculer
  await page.fill('.fenetre [data-set="netVise"]','1500'); await page.locator('.fenetre [data-set="netVise"]').blur();
  await page.click('.fenetre .btn');
  await expect(jp.locator('.phrase.or')).toContainText('vous facturez en moyenne');
});

test('encaissé nul ou négatif : une phrase claire, pas de salaire absurde',async({page})=>{
  await openWith(page,etat([['2026-06',0.0001,500]]));
  await page.evaluate(()=>{S.ops=S.ops.filter(o=>o.amount<0);render()});
  await expect(page.locator('.gagne .salaire')).toHaveText('Votre activité ne vous a rien laissé en poche sur cette période : pas de salaire de l’heure à calculer.');
  await expect(page.locator('[data-modal="cascade"]')).toHaveCount(0);
  expect(await page.evaluate(()=>vraiSalaire({lvl:'M',y:2026,m:6}).rien)).toBe(true);
});
