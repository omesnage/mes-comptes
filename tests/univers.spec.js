import {test,expect,openWith,importer} from './helpers.js';
import {releveColonnes,releveMoinsFin} from './releves.js';
const MARS={lvl:'M',y:2026,m:3};
const r2=x=>Math.round(x*100)/100;

test('deux comptes : virement pro → perso reconnu comme rémunération, calculs pro, perso et vue d’ensemble',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await releveColonnes(ti.outputPath('ca.pdf')),await releveMoinsFin(ti.outputPath('qonto.pdf')));
  await expect(page.locator('.releve')).toHaveCount(2);
  await page.evaluate(()=>{S.settings.taux=25;S.accounts.forEach(a=>a.confirmed=true);pendingGroups().forEach(g=>{const s=S.sugg[g.m];if(s)setRule(g.m,s.c)});render()});
  const r=await page.evaluate(p=>{render();const f=u=>{const a=agg(p,u);return {income:a.income,net:a.net,ca:a.ca,fraisExpl:a.fraisExpl,provPaid:a.provPaid,resultat:a.resultat,provision:a.provision,revenuNet:a.revenuNet,remu:a.remu,inc:a.inc}};
    return {pro:f('pro'),perso:f('perso'),all:f('all'),internes:Object.keys(INTERNAL).length,treso:tresoPro(),du:resteAProvisionner()}},MARS);
  expect(r.internes).toBe(2);
  // Pro
  expect(r2(r.pro.ca)).toBe(3650);
  expect(r2(r.pro.provPaid)).toBe(612);
  expect(r2(r.pro.fraisExpl)).toBe(373.89);
  expect(r2(r.pro.resultat)).toBe(3276.11);
  expect(r2(r.pro.provision)).toBe(912.5);
  expect(r2(r.pro.revenuNet)).toBe(2363.61);
  expect(r.pro.remu).toBe(1500);
  // Perso : la rémunération est la rentrée principale ; le remboursement CPAM est déduit de Santé
  expect(r.perso.income).toBe(1500);
  expect(r.perso.inc).toEqual({remu:1500});
  // Le remboursement CPAM (23 €) dépasse la dépense Santé (12,30 €) : la rubrique reste à 0 €
  expect(r2(r.perso.net)).toBe(139.2);
  // Vue d'ensemble : les virements entre comptes ne sont ni une dépense ni une rentrée
  expect(r.all.income).toBe(3650);
  expect(r2(r.all.net)).toBe(r2(985.89+139.2));
  // Trésorerie : solde lu sur le relevé, provision de l'année moins ce qui est payé
  expect(r.treso.t).toBe(5000);
  expect(r2(r.du.du)).toBe(300.5);
});

test('un seul compte mélangé : la rubrique décide du côté pro ou perso',async({page})=>{
  const ops=[
    {id:'1',date:'2026-05-03',label:'VIR HONORAIRES CLIENT X',amount:3000,merchant:'CLIENT X',acct:'a1'},
    {id:'2',date:'2026-05-05',label:'CB CARREFOUR',amount:-120,merchant:'CARREFOUR',acct:'a1'},
    {id:'3',date:'2026-05-06',label:'PRLV ADOBE',amount:-60,merchant:'ADOBE',acct:'a1'},
    {id:'4',date:'2026-05-07',label:'CB MAGASIN INCONNU',amount:-40,merchant:'MAGASIN INCONNU',acct:'a1'},
    {id:'5',date:'2026-05-08',label:'VIR CAF',amount:200,merchant:'CAF',acct:'a1'},
    {id:'6',date:'2026-05-09',label:'PRLV URSSAF',amount:-450,merchant:'URSSAF',acct:'a1'}];
  await openWith(page,{schemaVersion:4,accounts:[{id:'a1',name:'Banque',type:'mixte',confirmed:true}],ops,
    rules:{'CLIENT X':'revenus',CARREFOUR:'courses',ADOBE:'logiciels',CAF:'rentrees',URSSAF:'cotisations'},settings:{taux:20}});
  const r=await page.evaluate(()=>{const p={lvl:'M',y:2026,m:5};return {pro:agg(p,'pro'),perso:agg(p,'perso')}});
  expect(r.pro.ca).toBe(3000);
  expect(Object.keys(r.pro.by).sort()).toEqual(['cotisations','logiciels']);
  expect(r.pro.fraisExpl).toBe(60);
  expect(r.pro.provision).toBe(600);
  expect(r.pro.revenuNet).toBe(2340);
  expect(Object.keys(r.perso.by).sort()).toEqual(['_pending','courses']);
  expect(r.perso.income).toBe(200);
});

test('rubrique marquée pro sur un compte perso : comptée côté pro',async({page})=>{
  await openWith(page,{schemaVersion:4,accounts:[{id:'p',name:'Perso',type:'perso',confirmed:true}],
    ops:[{id:'1',date:'2026-05-03',label:'PRLV OVH',amount:-30,merchant:'OVH',acct:'p'},{id:'2',date:'2026-05-04',label:'CB SNCF',amount:-80,merchant:'SNCF',acct:'p'}],
    rules:{OVH:'logiciels',SNCF:'transport'}});
  const r=await page.evaluate(()=>{const p={lvl:'M',y:2026,m:5};return [Object.keys(agg(p,'pro').by),Object.keys(agg(p,'perso').by)]});
  expect(r).toEqual([['logiciels'],['transport']]);
});
