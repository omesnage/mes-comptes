import {test,expect,openWith,importer,stored,flush} from './helpers.js';
import {bforbank} from './banques.js';
import os from 'os'; import path from 'path';

test('BforBank : lignes de solde jamais lues comme des opérations, détail carte gardé sans double compte, écart 0 €',async({page})=>{
  const f=await bforbank(path.join(os.tmpdir(),'releve-bforbank.pdf'));
  await openWith(page,null); await importer(page,f);
  await expect(page.locator('.releve').first()).toContainText('Relevé vérifié ✓');
  const r=await page.evaluate(()=>({ctl:reports[0].controle,bank:reports[0].bank,
    ops:S.ops.map(o=>({l:o.label,a:o.amount,c:catOf(o)}))}));
  expect(r.bank).toBe('BforBank');
  expect(r.ctl).toMatchObject({ok:true,ancien:2000,nouveau:3346,ecart:0});
  expect(r.ops.map(o=>o.a).sort((a,b)=>a-b)).toEqual([-320,-300,-94,-52.1,-35,7.1,640,1500]);
  expect(r.ops.some(o=>/SOLDE|TOTAL|DIFFERE|COMPTABILIS/i.test(o.l))).toBe(false);
  const cat=re=>r.ops.find(o=>re.test(o.l)).c;
  expect(cat(/URSSAF/)).toBe('cotisations');
  expect(cat(/CARSAT/)).toBe('retraite');
  expect(cat(/GENERALI/)).toBe('epargne');
  expect(r.ops.find(o=>/CARREFOUR/.test(o.l)).l).toContain('PAIEMENT PAR CARTE CARREFOUR GUERANDE');
});

test('lignes de solde et de total reconnues quelle que soit la formulation ; « solde de tout compte » reste une opération',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>['Votre ancien solde','Votre nouveau solde','Ancien solde','Nouveau solde','Solde au 31/01','Solde créditeur','Solde débiteur','Solde précédent','Solde final',
    'Total des opérations','Total des débits','Total des crédits','Montant comptabilisé le 30/01/2026','Sous-total'].map(estHorsOp));
  expect(r.every(Boolean)).toBe(true);
  expect(await page.evaluate(()=>['VIR EMPLOYEUR SOLDE DE TOUT COMPTE','CB TOTAL ACCESS NANTES','CB TOTALENERGIES','PRLV SEPA SOLDES ZARA'].map(estHorsOp))).toEqual([false,false,false,false]);
});

test('écart égal à une ou deux lignes lues : elles sont nommées',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>{
    const full='Ancien solde 1 000,00\nNouveau solde 950,00';
    const un=controleSoldes({full,ops:[{label:'CB CAFE',amount:-50},{label:'MONTANT REPORTE',amount:120}]});
    const deux=controleSoldes({full,ops:[{label:'CB CAFE',amount:-50},{label:'LIGNE A',amount:1000},{label:'LIGNE B',amount:950}]});
    return [un.ecart,phraseSuspects(un),deux.ecart,phraseSuspects(deux)]});
  expect(r[0]).toBe(120); expect(r[1]).toContain('La ligne « MONTANT REPORTE » a peut-être été lue à tort comme une opération.');
  expect(r[2]).toBe(1950); expect(r[3]).toContain('Les lignes « LIGNE A » et « LIGNE B » ont peut-être été lues à tort comme des opérations.');
});

test('épargne neutre, pension en rentrée perso, cotisations sociales jamais dans les dépenses du foyer',async({page})=>{
  await openWith(page,{onboarded:true,accounts:[{id:'p',name:'Perso',type:'perso',confirmed:true}],ops:[]});
  const r=await page.evaluate(()=>{
    const mk=(id,label,amount)=>({id,date:'2026-01-10',label,amount,merchant:merchantOf(label),acct:'p',src:'pdf'});
    S.ops=[mk('1','PRLV URSSAF PAYS DE LA LOIRE',-300),mk('2','VIR CARSAT RETRAITE',640),mk('3','VIR VERS LIVRET A',-200),mk('4','VIR GENERALI VIE',-100),mk('5','VIR AGIRC ARRCO',210),mk('6','CB CARREFOUR',-50)];
    S.ops.forEach(o=>appliqueAuto(o,'perso')); relink(); AGG={}; RAW={};
    const pe=agg({lvl:'M',y:2026,m:1},'perso'), pr=agg({lvl:'M',y:2026,m:1},'pro');
    return {cats:S.ops.map(catOf),dep:pe.net,inc:pe.inc,paye:pr.provPaid,ca:pr.ca}});
  expect(r.cats).toEqual(['cotisations','retraite','epargne','epargne','retraite','courses']);
  expect(r.dep).toBe(50); expect(r.inc.retraite).toBe(850); expect(r.paye).toBe(300); expect(r.ca).toBe(0);
});

test('Accueil : ce que vous avez dépensé et balance du mois ; objectif par défaut 2 500 €',async({page})=>{
  await openWith(page,null);
  expect(await page.evaluate(()=>netVise())).toBe(2500);
  await page.click('[data-act="demo"]');
  const b=page.locator('.gagne #balance');
  await expect(b).toContainText('Gagné par votre activité');
  await expect(b).toContainText('Ce que vous avez dépensé');
  await expect(b).toContainText('Balance du mois');
  const v=await page.evaluate(()=>{const n=agg(P,'pro').revenuNet,R=aggRaw(P),pe=agg(P,'perso');return signed(n+R.perso.income-pe.net)});
  expect(await b.locator('.ligne.total b').textContent()).toBe(v);
});
