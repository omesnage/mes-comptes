import {test,expect,openWith,APP,APP_SAL} from './helpers.js';
/* Relevé manquant signalé, et dépenses en camembert : les deux versions (données fictives) */
const ARGENT=[['SAL',2000,'rentrees','06'],['LIDL',-420,'courses','03'],['RESTO',-180,'resto','05'],['ESSENCE',-90,'transport','07'],['PHARMA',-45,'sante','09'],['LOYER',-800,'logement','02']];
const donnees=async(page,mois)=>page.evaluate(([L,mois])=>{
  S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}];
  let id=0;const ops=[];for(const m of mois) for(const [l,a,cat,d] of L) ops.push({id:'o'+(id++),date:m+'-'+d,label:l,amount:a,merchant:l,acct:'a',cat});
  S.ops=ops;save();P={lvl:'M',y:2026,m:9};render();
},[ARGENT,mois]);
for(const [nom,url] of [['Mes comptes',APP],['Mon compte',APP_SAL]]){
  test(`${nom} un mois sauté est signalé en haut, avec un bouton vers Importer`,async({page})=>{
    await openWith(page,{onboarded:true},url);
    await donnees(page,['2026-09','2026-07','2026-06']);                  // août manque
    for(const tab of ['accueil','bilan','operations']){
      await page.click(`nav.tabs [data-tab="${tab}"]`);
      await expect(page.locator('.manque'),tab).toContainText('Il manque un relevé : août 2026');
    }
    await page.click('.manque [data-tab="importer"]');
    await expect(page.locator('.etat-releves')).toContainText('Relevé manquant : août 2026');   // Importer : l'état à ce jour
    await expect(page.locator('.etat-releves')).toContainText('Au ');
    await donnees(page,['2026-09','2026-08','2026-07']);                  // plus rien ne manque
    await page.click('nav.tabs [data-tab="accueil"]');
    await expect(page.locator('.manque')).toHaveCount(0);
  });
  test(`${nom} le relevé du mois dernier pas encore ajouté est signalé`,async({page})=>{
    await openWith(page,{onboarded:true},url);
    const d=new Date(), cle=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0');
    const avantDernier=cle(new Date(d.getFullYear(),d.getMonth()-2,1)), dernier=new Date(d.getFullYear(),d.getMonth()-1,1);
    await page.evaluate(([L,m])=>{S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}];S.ops=L.map(([l,a,cat,j],i)=>({id:'r'+i,date:m+'-'+j,label:l,amount:a,merchant:l,acct:'a',cat}));save();P=null;render()},[ARGENT,avantDernier]);
    await page.click('nav.tabs [data-tab="accueil"]');
    await expect(page.locator('.manque')).toContainText('n’est pas encore ajouté');
    await expect(page.locator('.manque')).toContainText(String(dernier.getFullYear()));
  });
  test(`${nom} icône camembert en haut : noms et sommes à côté des parts, période au choix`,async({page})=>{
    await openWith(page,{onboarded:true},url);
    await donnees(page,['2026-09','2026-08','2026-07']);
    await expect(page.locator('#camBtn')).toBeVisible();                                 // avec les trois autres icônes
    await page.click('#camBtn');
    const p=page.locator('#camPage');
    await expect(p).toContainText('Septembre 2026');
    const textes=await p.locator('svg text').evaluateAll(l=>l.map(e=>e.textContent));
    expect(textes.some(t=>/Logement/.test(t))).toBe(true);                               // le nom
    expect(textes.some(t=>/800\s€/.test(t))).toBe(true);                                  // et la somme, côte à côte
    expect(textes.filter(t=>/\s€/.test(t)).length).toBeGreaterThanOrEqual(5);              // au moins les cinq plus grosses rubriques
    const taille=await page.evaluate(()=>{const s=document.querySelector('#camPage svg'),k=s.getBoundingClientRect().width/s.viewBox.baseVal.width;return Math.min(...[...s.querySelectorAll('text')].map(t=>parseFloat(getComputedStyle(t).fontSize)*k))});
    expect(taille).toBeGreaterThanOrEqual(15);
    await expect(p.locator('.rep-total')).toContainText('1 535 €');                       // un mois
    await p.locator('[data-clvl="Q"]').click();
    await expect(p.locator('.rep-total')).toContainText('4 605 €');                       // un trimestre : trois mois
    await p.locator('[data-clvl="Y"]').click();
    await expect(p.locator('.mois h2')).toContainText('2026');
    await p.locator('[data-clvl="M"]').click();
    await p.locator('[data-cshift="-1"]').click();
    await expect(p.locator('.mois h2')).toContainText('Août 2026');
    await page.click('[data-act="closecam"]');
    await expect(page.locator('#camPage')).toHaveCount(0);
    await page.click('nav.tabs [data-tab="bilan"]');
    await page.click('.repartition [data-act="camembert"]');                              // la petite icône du Bilan ouvre la même page
    await expect(page.locator('#camPage .camembert > svg')).toBeVisible();
  });
}

for(const [nom,url] of [['Mes comptes',APP],['Mon compte',APP_SAL]])
test(`${nom} camembert : toucher une rubrique montre ses operations, pour la periode seulement`,async({page})=>{
  await openWith(page,{onboarded:true},url);
  const CATS=['courses','resto','transport','sante','logement','loisirs','shopping','cadeaux','voyages','dons'];
  await page.evaluate(C=>{
    S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}]; let id=0; const ops=[];
    for(const [m,k] of [['2026-09',1],['2026-08',2]]) C.forEach((c,i)=>ops.push({id:'o'+(id++),date:m+'-1'+(i%9),label:'ACHAT '+c.toUpperCase()+' '+m,amount:-(500-i*40)*k,merchant:'ACHAT '+c.toUpperCase()+' '+m,acct:'a',cat:c}));
    S.ops=ops;save();P={lvl:'M',y:2026,m:9};render();
  },CATS);
  await page.click('#camBtn');
  const p=page.locator('#camPage');
  await p.locator('.cam-l[data-camcat="courses"]').click();
  await expect(p.locator('.cam-ops')).toContainText('ACHAT COURSES 2026-09');       // le mois montré
  await expect(p.locator('.cam-ops')).not.toContainText('2026-08');                   // pas les autres mois
  await p.locator('[data-clvl="Q"]').click();                                         // la période change : la liste se referme ou s'élargit
  await expect(p.locator('.cam-ops')).toContainText('2026-08');
  await expect(p.locator('.cam-ops')).toContainText('2026-09');
  await p.locator('.cam-l[data-camautres]').click();                                  // « Autres rubriques » : la liste des rubriques regroupées
  await expect(p.locator('.cam-l2').first()).toBeVisible();
  await p.locator('[data-clvl="M"]').click();                                        // la rubrique reste ouverte, avec le mois seulement
  await expect(p.locator('.cam-ops')).not.toContainText('2026-08');
  await p.locator('[data-camvoir="courses"]').click();                                 // vers Mes opérations, filtré sur la rubrique et le mois
  await expect(page.locator('#camPage')).toHaveCount(0);
  await expect(page.locator('nav.tabs [data-tab="operations"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('#filtreCat')).toHaveValue('courses');
  const n=await page.evaluate(()=>[...document.querySelectorAll('#view [data-op]')].map(b=>b.textContent));
  expect(n.length).toBe(1); expect(n[0]).toContain('ACHAT COURSES');
});

for(const [nom,url] of [['Mes comptes',APP],['Mon compte',APP_SAL]])
test(`${nom} camembert : changer la rubrique d'une operation depuis la page, qui se met a jour`,async({page})=>{
  await openWith(page,{onboarded:true},url);
  await page.evaluate(()=>{
    S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}];
    S.ops=[['LIDL',-400,'courses'],['RESTO',-200,'resto'],['SORTIE',-100,'loisirs']].map(([l,a,cat],i)=>({id:'o'+i,date:'2026-09-1'+i,label:'ACHAT '+l,amount:a,merchant:'ACHAT '+l,acct:'a',cat}));
    save();P={lvl:'M',y:2026,m:9};render();
  });
  await page.click('#camBtn');
  const p=page.locator('#camPage');
  await p.locator('.cam-l[data-camcat="courses"]').click();
  await p.locator('.cam-ops [data-op]').first().click();
  await expect(page.locator('.fiche')).toBeVisible();                                   // la fiche s'ouvre par-dessus le camembert
  await page.selectOption('#ficheCat','loisirs');
  await page.check('input[name="portee"][value="une"]');
  await page.click('[data-act="savefiche"]');
  await expect(page.locator('.fiche')).toHaveCount(0);
  await expect(page.locator('#camPage')).toBeVisible();                                  // on reste dans le camembert
  expect(await page.evaluate(()=>catOf(S.ops[0]))).toBe('loisirs');
  await expect(p.locator('.cam-leg')).not.toContainText('Courses');                       // la rubrique vidée disparaît
  await expect(p.locator('.cam-leg')).toContainText('500 €');                             // loisirs : 400 + 100
  await expect(p.locator('.rep-total')).toContainText('700 €');                           // le total ne change pas
});

test('icone camembert toujours visible : sans operation, la page explique et renvoie vers Importer',async({page})=>{
  await openWith(page,{onboarded:true});
  await expect(page.locator('#camBtn')).toBeVisible();
  await page.click('#camBtn');
  await expect(page.locator('#camPage')).toContainText('une fois vos relevés ajoutés');
  await page.click('[data-act="camimporter"]');
  await expect(page.locator('#camPage')).toHaveCount(0);
  await expect(page.locator('nav.tabs [data-tab="importer"]')).toHaveAttribute('aria-current','true');
  await donnees(page,['2026-09']);
  await page.evaluate(()=>{P={lvl:'M',y:2025,m:1};render()});
  await page.click('#camBtn');
  await expect(page.locator('#camPage')).toContainText('Aucune dépense sur cette période');
});
