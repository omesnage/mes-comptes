import {test,expect,openWith} from './helpers.js';
async function demo(page,k=0){await openWith(page,null);await page.click('[data-act="demo"]');if(k)await page.evaluate(k=>{P=shift(defaultPeriod(),-k);render()},k)}

test('démo, mois affiché : gagné au-dessus de l’objectif, mon activité, où part l’argent, défi, conseils',async({page})=>{
  await demo(page);
  const g=page.locator('.gagne');
  await expect(g.locator('h3')).toContainText('Ce que vous avez gagné');
  await expect(g.locator('.etiquette.ok')).toContainText('de plus que votre objectif de 2 500 €');
  await expect(g.locator('.salaire')).toContainText('Votre vrai salaire :');
  await expect(g.locator('.salaire')).toContainText('nets de l’heure');
  await expect(g.locator('.salaire')).toHaveClass(/or/);
  await expect(g.locator('.sal-sous')).toHaveText('congés et retraite déjà déduits, sur une base de 40 h par semaine');
  await expect(page.locator('#activite .ligne')).toHaveText([/Encaissé/,/Frais de l’activité/,/Cotisations et impôts à garder de côté \(22 %\)/,/Il vous reste/]);
  await expect(page.locator('#activite .sous-ligne')).toHaveText('Cet argent n’est pas à vous : il servira à payer vos cotisations sociales et vos impôts.');
  const net=await page.evaluate(()=>agg(P,'pro').revenuNet);
  await expect(g.locator('.grand-chiffre')).toHaveText(new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(net));
  await expect(page.locator('.argent .phrase')).toContainText('dépensés côté perso');
  const resto=page.locator('.rub[data-cat="resto"]');
  await expect(resto).toHaveClass(/derape/);
  await expect(resto.locator('.rub-mention')).toContainText('% par rapport à d’habitude');
  expect(await page.locator('.rub.derape').count()).toBeGreaterThanOrEqual(1);
  // Les montants sont triés du plus cher au moins cher
  const m=await page.locator('.rub .rub-amt').allTextContents(); const v=m.map(x=>+x.replace(/[^\d]/g,''));
  expect(v).toEqual([...v].sort((a,b)=>b-a));
  await expect(page.locator('.conseil')).toHaveCount(2);
  // Limite vacances dépassée (location d'été) : elle passe avant les autres conseils
  await expect(page.locator('.conseil.ko')).toHaveCount(1);
  await expect(page.locator('.conseil').first()).toContainText('Limite dépassée pour Vacances et séjours');
  // Limites réalistes : vacances en rouge, sorties en orange, shopping et cadeaux en doré
  const etats=await page.locator('.budgets .budget-an').evaluateAll(l=>l.map(e=>e.querySelector('.phrase').textContent.split(' :')[0]+':'+['or','orange','rouge'].find(c=>e.classList.contains(c))));
  expect(etats.sort()).toEqual(['Cadeaux:or','Sorties et loisirs:orange','Vacances et séjours:rouge','Vêtements et shopping:or']);
});

test('démo, mois précédent : sous l’objectif, en rouge',async({page})=>{
  await demo(page,1);
  await expect(page.locator('.gagne .etiquette.ko')).toContainText('Il manque');
  await expect(page.locator('.gagne .etiquette.ko')).toContainText('pour atteindre votre objectif de 2 500 €');
  await expect(page.locator('.gagne .salaire')).toHaveClass(/rouge/);
  await expect(page.locator('.gagne .sal-manque')).toContainText('de l’heure pour atteindre votre objectif');
});

test('toucher une rubrique ouvre ses opérations du mois',async({page})=>{
  await demo(page);
  await page.click('.rub[data-cat="courses"]');
  await expect(page.locator('.rub-ops .op')).toHaveCount(4);
});

/* Dérapage : moyenne des 3 mois précédents avec données, +25 % ET +30 €, au moins 2 mois d'historique, ou le budget s'il existe */
function etat(montants,budget){
  const ops=montants.map((a,i)=>({id:'r'+i,date:`2026-0${i+1}-10`,label:'RESTO',amount:-a,merchant:'RESTO',acct:'pe'}));
  return {schemaVersion:4,onboarded:true,accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true}],ops,rules:{RESTO:'resto'},categories:undefined,...(budget?{_budget:budget}:{})};
}
const der=(page,m,budget)=>page.evaluate(([m,b])=>{if(b)catById('resto').limite={montant:b,per:'M'};render();const p={lvl:'M',y:2026,m};const n=agg(p,'perso').by.resto.net;return derapage('resto',n,p)},[m,budget]);
test('règle du dérapage',async({page})=>{
  await openWith(page,etat([100,100,100,130,100,126,200]));
  expect(await der(page,2)).toBeNull();                 // un seul mois d'historique
  expect(await der(page,4)).toBeNull();                 // +30 % mais seulement +30 € (il faut plus de 30 €)
  expect(await der(page,6)).toBeNull();                 // +15 %
  expect((await der(page,7)).txt).toBe('+69 % par rapport à d’habitude');
  expect((await der(page,4,100)).txt.replace(/\s/g,' ')).toBe('30 € au-dessus de votre limite');
});

test('mois incomplet signalé',async({page})=>{
  await openWith(page,{schemaVersion:4,onboarded:true,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true}],ops:[{id:'1',date:'2026-08-12',label:'CLIENT',amount:3000,merchant:'CLIENT',acct:'pr'}],rules:{CLIENT:'revenus'}});
  await expect(page.locator('.gagne')).toContainText('Votre dernier relevé s’arrête au 12 août.');
});

test('l’année en revue est proposée en décembre et en janvier',async({page})=>{
  await demo(page);
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:1};render()});
  await expect(page.locator('.revue')).toContainText('Votre année 2025 en revue');
  await page.click('.revue'); await expect(page.locator('#review')).toContainText('Vous avez encaissé');
  await page.click('#review .close');
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:5};render()});
  await expect(page.locator('.revue')).toHaveCount(0);
});

test('Accueil : Mois, Trimestre, Année ; les chiffres sont la somme des mois et les flèches avancent d’une période',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  const seg=page.locator('.seg [data-alvl]');
  await expect(seg).toHaveText(['Mois','Trimestre','Année']);
  const r=await page.evaluate(()=>{
    const s=x=>{const p={...P,lvl:x};return agg(p,'perso').net};
    const m=[0,1,2].map(i=>agg(shift({...P,lvl:'M'},-i),'perso').net);
    return {p:P.m,y:P.y,q:s('Q'),y2:s('Y')}});
  await page.click('[data-alvl="Q"]');
  await expect(page.locator('.mois h2')).toContainText('trimestre');
  const q=await page.evaluate(()=>agg({...P,lvl:'Q'},'perso').net);
  await expect(page.locator('.carte.argent .phrase')).toContainText(String(Math.round(q)).replace(/\B(?=(\d{3})+(?!\d))/g,' ').slice(0,1));
  const avant=await page.locator('.mois h2').textContent();
  await page.click('[data-ashift="-1"]');
  expect(await page.locator('.mois h2').textContent()).not.toBe(avant);
  await page.click('[data-alvl="Y"]');
  await expect(page.locator('.mois h2')).toHaveText(/^\d{4}$/);
  await expect(page.locator('.balance')).toContainText('Balance de l’année');
  await page.click('[data-alvl="M"]');
  await expect(page.locator('.balance')).toContainText('Balance du mois');
  expect(r.q).toBeGreaterThan(0);
});
