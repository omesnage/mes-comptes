import {test,expect,openWith} from './helpers.js';
async function demo(page,k=0){await openWith(page,null);await page.click('[data-act="demo"]');if(k)await page.evaluate(k=>{P=shift(defaultPeriod(),-k);render()},k)}

test('démo, mois affiché : gagné au-dessus de l’objectif, mon activité, où part l’argent, défi, conseils',async({page})=>{
  await demo(page);
  const g=page.locator('.gagne');
  await expect(g.locator('h3')).toContainText('Ce que vous avez gagné');
  await expect(g.locator('.etiquette.ok')).toContainText('de plus que votre objectif de 2 000 €');
  await expect(g.locator('.salaire')).toContainText('Votre vrai salaire :');
  await expect(g.locator('.salaire')).toContainText('nets de l’heure');
  await expect(g.locator('.salaire')).toHaveClass(/or/);
  await expect(g.locator('.sal-sous')).toHaveText('congés et retraite déjà déduits, sur une base de 40 h par semaine');
  await expect(page.locator('#activite .ligne')).toHaveText([/Encaissé/,/Frais de l’activité/,/À mettre de côté/,/Il vous reste/]);
  const net=await page.evaluate(()=>agg(P,'pro').revenuNet);
  await expect(g.locator('.grand-chiffre')).toHaveText(new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(net));
  await expect(page.locator('.argent .phrase')).toContainText('dépensés côté perso');
  const resto=page.locator('.rub[data-cat="resto"]');
  await expect(resto).toHaveClass(/derape/);
  await expect(resto.locator('.rub-mention')).toContainText('% par rapport à d’habitude');
  await expect(page.locator('.rub.derape')).toHaveCount(1);
  // Les montants sont triés du plus cher au moins cher
  const m=await page.locator('.rub .rub-amt').allTextContents(); const v=m.map(x=>+x.replace(/[^\d]/g,''));
  expect(v).toEqual([...v].sort((a,b)=>b-a));
  await expect(page.locator('.conseil')).toHaveCount(2);
  await expect(page.locator('.conseil').first()).toContainText('de côté ce mois-ci');
});

test('démo, mois précédent : sous l’objectif, en rouge',async({page})=>{
  await demo(page,1);
  await expect(page.locator('.gagne .etiquette.ko')).toContainText('Il manque');
  await expect(page.locator('.gagne .etiquette.ko')).toContainText('pour atteindre votre objectif de 2 000 €');
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
const der=(page,m,budget)=>page.evaluate(([m,b])=>{if(b)catById('resto').budget=b;render();const p={lvl:'M',y:2026,m};const n=agg(p,'perso').by.resto.net;return derapage('resto',n,p)},[m,budget]);
test('règle du dérapage',async({page})=>{
  await openWith(page,etat([100,100,100,130,100,126,200]));
  expect(await der(page,2)).toBeNull();                 // un seul mois d'historique
  expect(await der(page,4)).toBeNull();                 // +30 % mais seulement +30 € (il faut plus de 30 €)
  expect(await der(page,6)).toBeNull();                 // +15 %
  expect((await der(page,7)).txt).toBe('+69 % par rapport à d’habitude');
  expect((await der(page,4,100)).txt.replace(/\s/g,' ')).toBe('30 € au-dessus de votre budget');
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
