import {test,expect,openWith} from './helpers.js';
const nb=s=>s.replace(/\s/g,' ');
function mois(k){const d=new Date();const x=new Date(d.getFullYear(),d.getMonth()-k,1);return {ym:x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'),nom:['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][x.getMonth()]}}
const etat=(ops,rules,extra={})=>({schemaVersion:10,onboarded:true,accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true}],
  ops:ops.map(([date,amount,merchant],i)=>({id:'o'+i,date,label:merchant,amount,merchant,acct:'pe'})),rules,...extra});

test('défis : les 3 plus grosses dépenses du mois dernier, vacances laissées de côté ; le choix fixe la limite',async({page})=>{
  const m=mois(1).ym;
  await openWith(page,etat([[m+'-03',-420,'CARREFOUR'],[m+'-05',-260,'RESTO'],[m+'-08',-130,'ZARA'],[m+'-09',-90,'CINEMA'],[m+'-12',-1500,'AIRBNB'],[m+'-20',-20,'PHARMA']],
    {CARREFOUR:'courses',RESTO:'resto',ZARA:'shopping',CINEMA:'loisirs',AIRBNB:'voyages',PHARMA:'sante'}));
  const b=page.locator('.defi');
  await expect(b.locator('.defi-choix')).toHaveCount(3);
  const t=(await b.locator('.defi-choix .phrase').allTextContents()).map(nb);
  expect(t[0]).toBe(nb(`Courses : ne pas dépasser 320 € ce mois-ci. En ${mois(1).nom}, vous avez dépensé 420 €.`));
  expect(t[1]).toContain('Restaurants et cafés : ne pas dépasser 200 €');
  expect(t[2]).toContain('Vêtements et shopping : ne pas dépasser 100 €');
  expect(t.join(' ')).not.toContain('Vacances');
  await b.locator('.defi-choix').nth(1).locator('[data-defiok]').click();
  expect(await page.evaluate(ym=>S.challenges.find(c=>c.month===ym),mois(0).ym)).toMatchObject({cat:'resto',limite:200,habitude:260});
  await expect(page.locator('.defi .d-prog')).toHaveText(nb('0 € dépensés sur 200 €'));
});

test('trophées : un par défi réussi, paliers, et bouton sur l’Accueil',async({page})=>{
  const ops=[], ch=[];
  for(const k of [4,3,2,1]){ops.push([mois(k).ym+'-10',-100,'RESTO'],[mois(k).ym+'-28',-5,'CARREFOUR']);ch.push({id:'auto',key:'k'+k,month:mois(k).ym,cat:'resto',limite:k===3?90:150,habitude:200})}
  await openWith(page,etat(ops,{RESTO:'resto',CARREFOUR:'courses'},{challenges:ch}));
  await expect(page.locator('.trophee-gagne')).toHaveText(/Trophée gagné ! Vous en avez 3\./);
  await page.click('.trophee-gagne');
  const t=page.locator('#trophees');
  await expect(t.locator('.phrase')).toHaveText(nb('3 défis réussis : trophée d’argent. 300 € dépensés en moins au total.'));
  await expect(t.locator('.aide')).toHaveText('Encore 3 défis réussis pour le trophée d’or.');
  await expect(t.locator('li')).toHaveCount(3);
});

test('sans défi réussi : explication des trophées ; « Vacances » devient « Vacances et séjours »',async({page})=>{
  await openWith(page,{schemaVersion:10,onboarded:true,categories:[{id:'voyages',name:'Vacances',icon:'luggage',type:'expense',univers:'perso'}]});
  await page.click('nav.tabs [data-tab="objectifs"]');
  await expect(page.locator('#trophees .aide')).toContainText('chaque défi réussi vous rapporte un trophée');
  expect(await page.evaluate(()=>catById('voyages').name)).toBe('Vacances et séjours');
});

test('« À vérifier » : un marchand avec achats et rentrées donne deux questions, montants sans signe mêlé',async({page})=>{
  await openWith(page,etat([['2026-01-05',-20,'AMAZON'],['2026-01-06',-30,'AMAZON'],['2026-01-07',8.32,'AMAZON'],['2026-01-08',599,'AMAZON']],{}));
  await page.click('nav.tabs [data-tab="operations"]');
  const g=await page.evaluate(()=>pendingGroups().map(x=>[x.n,x.credit,Math.round(x.total*100)/100]));
  expect(g).toEqual([[2,true,607.32],[2,false,-50]]);
  await expect(page.locator('.verifier .question')).toHaveCount(1);
  await expect(page.locator('.verifier')).toContainText('Question 1 sur 2');
  const s=nb(await page.locator('.verifier .question .q-s').textContent());
  expect(s).toContain(nb('2 rentrées, 607,32 € au total'));
  await page.locator('.verifier .question .choix-btn',{hasText:'Je ne sais pas'}).click();
  await expect(page.locator('.verifier')).toContainText('Question 2 sur 2');
  expect(nb(await page.locator('.verifier .question .q-s').textContent())).toContain(nb('2 dépenses, 50,00 € au total'));
});

test('fiche : « toutes les opérations » d’un marchand qui a achats et rentrées ne change que celles du même sens',async({page})=>{
  await openWith(page,etat([['2026-01-05',-20,'AMAZON'],['2026-01-06',-30,'AMAZON'],['2026-01-08',599,'AMAZON']],{AMAZON:'shopping'}));
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:1};FICHE='o2';render()});
  await page.selectOption('#ficheCat','remb');
  await page.click('[data-act="savefiche"]');
  expect(await page.evaluate(()=>S.ops.map(o=>catOf(o)))).toEqual(expect.arrayContaining(['shopping','shopping','remb']));
  expect(await page.evaluate(()=>S.rules)).toEqual({AMAZON:'shopping','AMAZON|+':'remb'});
});
