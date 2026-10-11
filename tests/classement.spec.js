import {test,expect,openWith,APP_SAL} from './helpers.js';
import {LIGNES,texteCollage} from './releves-fictifs.js';

/* Relevé fictif de 99 opérations, importé par copier-coller (même chemin de classement qu'un relevé PDF) */
const etat=rules=>({schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],rules:rules||{}});
const importe=(page,texte)=>page.evaluate(t=>{COLLE={texte:t,acct:'a',signe:'dep',apercu:null};ajouterColle();render()},texte);

test('relevé de 99 opérations : 5 questions au plus, au moins 90 % des opérations et 85 % des montants classés, aucune perte',async({page})=>{
  await openWith(page,etat());
  await importe(page,texteCollage());
  const r=await page.evaluate(()=>{
    const ops=S.ops, ab=o=>Math.abs(o.amount), tot=ops.reduce((s,o)=>s+ab(o),0), cl=ops.filter(o=>catOf(o)), sure=cl.filter(o=>sourceAuto(o)!=='d');
    return {n:ops.length,somme:+ops.reduce((s,o)=>s+o.amount,0).toFixed(2),questions:pendingGroups().length,
      pctOps:cl.length/ops.length*100,pctMontants:cl.reduce((s,o)=>s+ab(o),0)/tot*100,sureOps:sure.length/ops.length*100}});
  expect(r.n).toBe(LIGNES.length);
  expect(r.somme).toBeCloseTo(+LIGNES.reduce((s,l)=>s+l[2],0).toFixed(2),2);
  expect(r.questions).toBeLessThanOrEqual(5);
  expect(r.pctOps).toBeGreaterThanOrEqual(90);
  expect(r.pctMontants).toBeGreaterThanOrEqual(85);
  expect(r.sureOps).toBeGreaterThanOrEqual(75);
});

test('ce qui est classé sans question est juste : au moins 95 % des rubriques sûres correspondent à ce qu’on attend',async({page})=>{
  await openWith(page,etat());
  await importe(page,texteCollage());
  const truth={}; for(const [j,l,m,t] of LIGNES) truth[String(j).padStart(2,'0')+'|'+l+'|'+m]=t;
  const r=await page.evaluate(truth=>{let ok=0,bad=[];for(const o of S.ops){const t=truth[o.date.slice(8,10)+'|'+o.label+'|'+o.amount];if(!t)continue;const c=catOf(o);if(c&&sourceAuto(o)!=='d'){if(c===t)ok++;else bad.push(o.merchant+' : '+c+' au lieu de '+t)}}return {ok,bad}},truth);
  expect(r.bad).toEqual([]);
  expect(r.ok).toBeGreaterThan(60);
});

test('une règle apprise l’emporte toujours sur le dictionnaire',async({page})=>{
  await openWith(page,etat({'SUPER U':'resto'}));
  await importe(page,texteCollage());
  const r=await page.evaluate(()=>S.ops.filter(o=>/SUPER U/.test(o.label)&&o.amount<0&&!/RETRAIT/.test(o.label)).map(catOf));
  expect(r.length).toBeGreaterThan(4); expect(new Set(r)).toEqual(new Set(['resto']));
});

test('cas connus : jamais de question pour espèces, virements entre ses comptes, cotisations, retraites, épargne, remboursements',async({page})=>{
  await openWith(page,etat());
  const texte=[
    '05/01/2026 RETRAIT AU DISTRIBUTEUR SUPER U LA BAULE 050126 124817 -60,00 €',
    '06/01/2026 VIREMENT INSTANTANE MARIE DUPONT Avec BforBank -1000,00 €',
    '07/01/2026 VIREMENT FR7612345000010123456789012 Avec BforBank -800,00 €',
    '08/01/2026 PRELEVEMENT URSSAF PAYS DE LA LOIRE REF 12345 -300,00 €',
    '09/01/2026 VIREMENT CARSAT PAYS LOIRE PREST TI RETRAITE +900,00 €',
    '10/01/2026 PRELEVEMENT GENERALI VIE SA FR22ZZZ102628 -500,00 €',
    '11/01/2026 PAIEMENT PAR CARTE WEB VEEPEE FRSAINT DENIS -120,00 €',
    '12/01/2026 AVOIR SUR PAIEMENT CARTE WEB VEEPEE +120,00 €',
    '13/01/2026 VIREMENT LIVRET A -200,00 €'].join('\n');
  await importe(page,texte);
  const r=await page.evaluate(()=>({q:pendingGroups().map(g=>g.m),cats:S.ops.slice().sort((a,b)=>a.date<b.date?-1:1).map(catOf)}));
  expect(r.q).toEqual([]);
  expect(r.cats).toEqual(['divers','interne','interne','cotisations','retraite','epargne','enligne','enligne','epargne']);
});

test('libellés nettoyés : type d’opération, dates, numéros, ville et pays retirés ; rubrique du dictionnaire',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>[
    'PAIEMENT PAR CARTE PHARM CHAILLOU FR44LA TURBAL 261225 000000 8195 133653',
    'PAIEMENT PAR CARTE UEP*DAC SUPER U FRLA TURBALLE 190126 113600 8195 704339',
    'PAIEMENT PAR CARTE WEB AXEPTA LPO FRROCHEFORT 291225 161956 8195 422723',
    'PAIEMENT PAR CARTE WEB CHANGE.ORG US12345 010226 000000 8195 999999',
    'PAIEMENT PAR CARTE WEB APPLE.COM/BILL IE0805540003 050126 000000 8195 591031 0,99 EUR',
    'PAIEMENT PAR CARTE LECLERC STATION FRGUERANDE 090126 124526 8195 454101',
    'PRELEVEMENT SFR SFR Prlvt SEPA 99-176AU9-01 003835139690 FR44ZZZ332801',
    'PAIEMENT PAR CARTE PHIE LA ROTONDE FRPARIS 090126 000000 8195 798650',
    'PAIEMENT PAR CARTE ATELIER DES SAVEURS FRLA BAULE 090126 000000 8195 111111'].map(l=>[libelleNet(l),(dicoSuggest(l,-10)||{}).c||null]));
  expect(r).toEqual([['PHARM CHAILLOU','sante'],['SUPER U','courses'],['AXEPTA LPO','dons'],['CHANGE ORG','dons'],['APPLE COM BILL','abonnements'],['LECLERC STATION','transport'],['SFR SFR PRLVT','abonnements'],['PHIE LA ROTONDE','sante'],['ATELIER DES SAVEURS',null]]);
});

test('parcs, zoos et sorties sont rangés en loisirs, et « Maxi Zoo » reste en animaux',async({page})=>{
  await openWith(page,etat());
  const r=await page.evaluate(()=>['PAIEMENT PAR CARTE BEAUVAL NATURE FRST AIGNAN 090926 000000 8195 111111','PAIEMENT PAR CARTE ZOOPARC DE BEAUVAL FRST AIGNAN 090926 000000 8195 111111','PAIEMENT PAR CARTE VULCANIA FRST OURS 090926 000000 8195 111111','PAIEMENT PAR CARTE PARC AVENTURE FRLYON 090926 000000 8195 111111','PAIEMENT PAR CARTE MAXI ZOO FRNANTES 090926 000000 8195 111111'].map(l=>(dicoSuggest(l,-30)||{}).c||null));
  expect(r).toEqual(['loisirs','loisirs','loisirs','loisirs','animaux']);
});

test('Reclasser mes suppositions : une supposition « Divers » passe en loisirs, une règle de l’utilisateur ne bouge pas',async({page})=>{
  await openWith(page,etat({'BEAUVAL NATURE|-':'shopping'}));
  const r=await page.evaluate(()=>{
    S.ops=[{id:'1',date:'2026-09-09',label:'PAIEMENT PAR CARTE VULCANIA FRST OURS',amount:-40,merchant:'VULCANIA',acct:'a'},
           {id:'2',date:'2026-09-09',label:'PAIEMENT PAR CARTE BEAUVAL NATURE FRST AIGNAN',amount:-60,merchant:'BEAUVAL NATURE',acct:'a'}];
    S.auto={'VULCANIA|-':{c:'divers',q:'d'}};
    const n=reclasserDevinees(); return {n,a:catOf(S.ops[0]),b:catOf(S.ops[1])}});
  expect(r).toEqual({n:1,a:'loisirs',b:'shopping'});
});

test('libellé avec « CARTE » collé au nom (« CARTEZOO PARC BEAUVA ») : reconnu, et Reclasser range aussi les opérations à vérifier',async({page})=>{
  await openWith(page,etat());
  const r=await page.evaluate(()=>{
    const l='PAIEMENT PAR CARTEZOO PARC BEAUVA FRST AIGNAN 15546553 260426 000000 8195 281099';
    S.ops=[{id:'1',date:'2026-04-26',label:l,amount:-11.45,merchant:merchantOf(l),acct:'a'}];
    S.auto={}; const avant=catOf(S.ops[0]), n=reclasserDevinees(); return {d:(dicoSuggest(l,-11.45)||{}).c,avant,n,apres:catOf(S.ops[0])}});
  expect(r).toEqual({d:'loisirs',avant:null,n:1,apres:'loisirs'});
});

test('le dictionnaire ne prend pas un prénom pour une enseigne : un virement n’est comparé qu’aux rubriques qui ont du sens',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>[dicoSuggest('VIREMENT PAUL DUPONT',-50),dicoSuggest('VIREMENT LOYER JANVIER',-700),dicoSuggest('VIREMENT MARC BARBIER',150),dicoSuggest('PAIEMENT PAR CARTE PAUL FRPARIS',-4.9)].map(x=>x&&x.c));
  expect(r).toEqual([null,'logement',null,'resto']);
});

test('classé automatiquement : la mention se voit, une correction crée une règle, « Tout valider » enregistre les suppositions',async({page})=>{
  await openWith(page,etat());
  await importe(page,texteCollage());
  await page.evaluate(()=>{view='operations';render()});
  const dev=page.locator('.devinees');
  await expect(dev).toBeVisible();
  await expect(dev.locator('summary')).toContainText('Classé automatiquement');
  const n=await page.evaluate(()=>devinees().length);
  expect(n).toBeGreaterThan(5);
  await page.evaluate(()=>{const o=S.ops.find(o=>sourceAuto(o)==='d');window.__m=o.merchant});
  await page.fill('#search','');
  const txt=await page.evaluate(()=>{const o=S.ops.find(o=>sourceAuto(o)==='d');return opLine(o,true)});
  expect(txt).toContain('classé automatiquement');
  await dev.locator('summary').click();
  await dev.locator('select[data-devsel]').first().selectOption('cadeaux');
  expect(await page.evaluate(()=>devinees().length)).toBe(n-1);
  await page.locator('.devinees').locator('[data-act="valdev"]').click();
  const r=await page.evaluate(()=>({d:devinees().length,rules:Object.keys(S.rules).length}));
  expect(r.d).toBe(0); expect(r.rules).toBeGreaterThan(n-1);
});

test('questions : une carte à la fois avec progression, « Je ne sais pas », « Tout valider », « Terminer plus tard »',async({page})=>{
  await openWith(page,etat());
  await importe(page,texteCollage());
  await page.evaluate(()=>{S.sugg={};for(const g of pendingGroups()) S.sugg[g.m.replace(/\|[+-]$/,'')]={c:'shopping',src:'kw'};render();view='operations';render()});
  const total=await page.evaluate(()=>pendingGroups().length);
  expect(total).toBeGreaterThan(0); expect(total).toBeLessThanOrEqual(5);
  await expect(page.locator('.verifier .question')).toHaveCount(1);
  await expect(page.locator('.verifier')).toContainText(`Question 1 sur ${total}`);
  await expect(page.locator('.wiz-barre')).toBeVisible();
  await page.click('[data-act="wizlater"]');
  await expect(page.locator('.verifier .question')).toHaveCount(0);
  await expect(page.locator('.verifier')).toContainText('en attente');
  await page.click('[data-act="wizresume"]');
  await page.locator('.verifier .question [data-idk]').click();
  expect(await page.evaluate(()=>pendingGroups().length)).toBe(total-1);
  if(total>2){ await page.click('[data-act="validall"]'); expect(await page.evaluate(()=>pendingGroups().length)).toBe(0) }
});

test('Accueil : « Vos dépenses sont classées à X % » et les marchands à classer, avec un bouton',async({page})=>{
  await openWith(page,etat());
  await importe(page,texteCollage());
  await page.evaluate(()=>{P=null;view='accueil';render()});
  const b=page.locator('.classement');
  await expect(b).toContainText(/Vos dépenses sont classées à \d+ %/);
  await expect(b).toContainText('marchand');
  await expect(b).toContainText('minute');
  await b.locator('button',{hasText:'Classer maintenant'}).click();
  await expect(page.locator('.verifier')).toBeVisible();
});

test('mode d’emploi : le premier mois est un peu long, ensuite l’essentiel du travail est fait',async({page})=>{
  await openWith(page,{onboarded:true});
  await page.click('nav.tabs [data-tab="importer"]');
  const t=await page.locator('.note-box').nth(1).textContent();
  expect(t).toContain('premier mois est un peu long');
  expect(t).toContain('90 %');
});

test('mode d’emploi dans l’application : lien dans l’en-tête, sur l’Accueil, dans Importer et dans Réglages ; contenu complet',async({page})=>{
  await openWith(page,{onboarded:true});
  await expect(page.locator('header .lien',{hasText:'Mode d’emploi'})).toBeVisible();
  await page.click('header [data-tab="aide"]');
  const t=await page.locator('.aide-page').textContent();
  for(const mot of ['Ouvrir Mes comptes','Ajouter vos relevés','premier mois est un peu long','90 %','Sauvegarder dans mon dossier Cloud','Restaurer une sauvegarde','de préférence dans un Cloud','Refaites la même chose quand vous changez de nouveau d’appareil','garder le même appareil','badge « Netlify »','touchez-le : il disparaît','adresse du lien']) expect(t).toContain(mot);
  await page.click('.aide-page [data-tab="accueil"]');
  await expect(page.locator('.lien-aide')).toBeVisible();
  await page.click('.lien-aide [data-tab="aide"]');
  await expect(page.locator('.aide-page')).toBeVisible();
  await page.click('nav.tabs [data-tab="importer"]');
  await page.click('button:has-text("Voir le mode d’emploi")');
  await expect(page.locator('.aide-page')).toBeVisible();
  await page.click('nav.tabs [data-tab="reglages"]');
  await page.click('.lien-aide-carte');
  await expect(page.locator('.aide-page h2')).toHaveText('Mode d’emploi');
});

test('mode d’emploi : accessible aussi avant la fin de la présentation, et dans la version salariés',async({page})=>{
  await openWith(page,'vierge');
  await page.click('header [data-tab="aide"]');
  await expect(page.locator('.aide-page h2')).toHaveText('Mode d’emploi');
  await openWith(page,{onboarded:true},APP_SAL);
  await page.click('header [data-tab="aide"]');
  await expect(page.locator('.aide-page')).toContainText('Ouvrir Mon compte');
  expect(await page.locator('.aide-page').textContent()).not.toMatch(/activité|client|professionnel|tableau|objectif/);
});
