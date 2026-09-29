import {test,expect,openWith,importer,stored,flush,APP,APP_V1} from './helpers.js';
import {releveColonnes,releveMoinsFin} from './releves.js';
import fs from 'fs';

/* Sauvegarde au format de la version 1 (avant les comptes pro et perso) */
const V1={
  categories:[
    {id:'courses',name:'Courses alimentaires',icon:'shopping-basket',type:'expense',budget:350,fixed:false},
    {id:'pro',name:'Frais professionnels',icon:'briefcase',type:'pro',budget:0,fixed:false},
    {id:'revenus',name:'Revenus',icon:'arrow-down-left',type:'income',budget:0,fixed:false},
    {id:'c_atel',name:'Atelier poterie',icon:'tag',type:'expense',budget:50,fixed:false,custom:true},
    {id:'c_form',name:'Formations',icon:'briefcase',type:'pro',budget:0,fixed:false,custom:true},
    {id:'c_loc',name:'Location saisonnière',icon:'plus-circle',type:'income',budget:0,fixed:false,custom:true}],
  rules:{CARREFOUR:'courses',BIOCOOP:'courses','OVH CLOUD':'pro','HONORAIRES CLIENT':'revenus','ECOLE WEB':'c_form'},
  sugg:{'CLIENT Y':{c:'revenus',src:'kw'}},
  ops:[
    {id:'o1',date:'2026-06-02',label:'CB CARREFOUR 02/06',amount:-54.3,merchant:'CARREFOUR',acct:'Crédit Agricole'},
    {id:'o2',date:'2026-06-03',label:'PRLV OVH CLOUD',amount:-23.99,merchant:'OVH CLOUD',acct:'Qonto pro'},
    {id:'o3',date:'2026-06-05',label:'VIR HONORAIRES CLIENT X',amount:2800,merchant:'HONORAIRES CLIENT',acct:'Qonto pro'},
    {id:'o4',date:'2026-06-06',label:'CB ECOLE WEB',amount:-300,merchant:'ECOLE WEB',acct:'Qonto pro',cat:'c_form'},
    {id:'o5',date:'2026-06-09',label:'CB BIOCOOP',amount:-31,merchant:'BIOCOOP',awaiting:true},
    {id:'o6',date:'2026-06-10',label:'Client Y',amount:900,merchant:'CLIENT Y',src:'rev',cat:'revenus'}],
  incomeSource:'bank',
  settings:{epargne:5000,taux:22,heures:150,objectif:6},
  challenges:[{id:'noresto',month:'2026-06'}],
  readers:[{nom:'Ma banque',detection:'MA BANQUE',ligne:'^(?<date>\\d{2}/\\d{2}) (?<libelle>.+) (?<montant>-?[\\d ]+,\\d{2})$',signe:'moins'}],
  champFutur:{garde:true}
};
function checkMigrated(s){
  expect(s.schemaVersion).toBe(16);
  expect(s.ops).toHaveLength(6);
  expect(s.accounts.map(a=>[a.name,a.type,a.confirmed]).sort()).toEqual([['Compte principal','perso',false],['Crédit Agricole','perso',false],['Qonto pro','pro',false]]);
  const ids=new Set(s.accounts.map(a=>a.id));
  expect(s.ops.filter(o=>o.src!=='rev').every(o=>ids.has(o.acct))).toBe(true);
  const byId=Object.fromEntries(s.accounts.map(a=>[a.id,a.name]));
  expect(Object.fromEntries(s.ops.filter(o=>o.src!=='rev').map(o=>[o.id,byId[o.acct]]))).toEqual({o1:'Crédit Agricole',o2:'Qonto pro',o3:'Qonto pro',o4:'Qonto pro',o5:'Compte principal'});
  const c=Object.fromEntries(s.categories.map(x=>[x.id,x]));
  expect(c.pro).toMatchObject({type:'expense',univers:'pro',name:'Autres frais de l’activité'});
  expect(c.courses.name).toBe('Courses');
  expect(c.energie).toBeUndefined(); expect(c.logement).toMatchObject({univers:'perso',name:'Logement et énergie'});
  expect(c.c_form).toMatchObject({type:'expense',univers:'pro',name:'Formations',custom:true});
  expect(c.c_atel).toMatchObject({type:'expense',univers:'perso',budget:50});
  expect(c.c_loc).toMatchObject({type:'income',univers:'auto'});
  expect(c.courses.budget).toBe(350); expect(c.courses.limite).toEqual({montant:350,per:'M'});
  expect(c.logiciels).toMatchObject({type:'expense',univers:'pro'});
  // Aucun champ perdu
  expect(s.rules).toEqual(V1.rules); expect(s.sugg).toEqual(V1.sugg); expect(s.readers).toEqual(V1.readers);
  expect(s.challenges.map(({key,...c})=>c)).toEqual(V1.challenges); expect(s.challenges.every(c=>c.key)).toBe(true); expect(s.settings).toMatchObject({epargne:5000,taux:22,objectif:6,netVise:2500,heuresSemaine:35}); expect(s.settings.heures).toBeUndefined(); expect(s.champFutur).toEqual({garde:true});
  expect(s.ops.find(o=>o.id==='o5').awaiting).toBe(true);
  expect(s.ops.find(o=>o.id==='o4').cat).toBe('c_form');
}

test('données v1 dans le navigateur : migrées, intactes et réenregistrées',async({page})=>{
  await openWith(page,V1);
  checkMigrated(await page.evaluate(()=>S));
  await flush(page);
  checkMigrated(await stored(page));
  // Les frais pro de l'ancienne version sont bien comptés côté pro
  const pro=await page.evaluate(()=>agg({lvl:'M',y:2026,m:6},'pro'));
  expect(pro.ca).toBe(2800); expect(pro.fraisExpl).toBe(323.99);
});

test('restauration d’une ancienne sauvegarde JSON',async({page},ti)=>{
  await openWith(page,null);
  const f=ti.outputPath('sauvegarde-v1.json');
  fs.writeFileSync(f,JSON.stringify({app:'mes-comptes',version:1,date:'2026-07-01T10:00:00.000Z',data:V1}));
  await page.click('nav.tabs [data-tab="reglages"]');
  await page.setInputFiles('#restorefile',f);
  await expect(page.locator('#view')).toContainText('restaurée');
  checkMigrated(await page.evaluate(()=>S));
  await flush(page);
  checkMigrated(await stored(page));
});

test('une sauvegarde faite après migration se restaure à l’identique',async({page},ti)=>{
  await openWith(page,V1);
  const before=await page.evaluate(()=>JSON.parse(JSON.stringify(S)));
  const json=await page.evaluate(()=>JSON.stringify({app:'mes-comptes',version:1,date:new Date().toISOString(),data:S}));
  const f=ti.outputPath('sauvegarde-v2.json'); fs.writeFileSync(f,json);
  await page.evaluate(()=>{S=blank();S.onboarded=true;render()});
  await page.click('nav.tabs [data-tab="reglages"]');
  await page.setInputFiles('#restorefile',f);
  await expect(page.locator('#view')).toContainText('restaurée');
  expect(await page.evaluate(()=>JSON.parse(JSON.stringify(S)))).toEqual(before);
});

test('vraies données produites par l’ancienne version de l’application',async({page},ti)=>{
  // 1. L'ancienne version importe deux relevés et on classe tout
  await openWith(page,null,APP_V1);
  await importer(page,await releveColonnes(ti.outputPath('ca.pdf')),await releveMoinsFin(ti.outputPath('qonto.pdf')));
  await expect(page.locator('.report')).toHaveCount(2);
  await page.click('nav.tabs [data-tab="valider"]');
  await page.click('[data-act="acceptall"]');
  await page.evaluate(()=>{S.settings.taux=25;S.settings.heures=150;save()});
  await flush(page);
  const v1=await stored(page);
  expect(v1.schemaVersion).toBeUndefined();
  // 2. La nouvelle version ouvre les mêmes données
  await page.goto(APP); await page.waitForSelector('nav.tabs button');
  const s=await page.evaluate(()=>S);
  expect(s.schemaVersion).toBe(16);
  expect(s.ops.length).toBe(v1.ops.length);
  expect(s.rules).toEqual({...v1.rules,'URSSAF|-':'cotisations'});
  expect(s.settings).toMatchObject({taux:25,heuresSemaine:35});
  expect(s.accounts.map(a=>[a.name,a.type]).sort()).toEqual([['Crédit Agricole','perso'],['Qonto','pro']]);
  const r=await page.evaluate(()=>({pro:agg({lvl:'M',y:2026,m:3},'pro'),perso:agg({lvl:'M',y:2026,m:3},'perso')}));
  expect(r.pro.remu).toBe(1500);
  expect(r.perso.inc.remu).toBe(1500);
});

test('heures : l’ancien réglage par défaut (140 h puis 160 h par mois) devient 40 h par semaine',async({page})=>{
  await openWith(page,{...V1,settings:{...V1.settings,heures:140}});
  expect(await page.evaluate(()=>[S.settings.heuresSemaine,S.settings.netVise,+tauxCible().toFixed(2)])).toEqual([40,2500,14.42]);
});

test('v3 → v4 : un nom de rubrique personnalisé est gardé, les noms par défaut sont simplifiés',async({page})=>{
  await openWith(page,{schemaVersion:3,ops:[{id:'1',date:'2026-06-01',label:'CB X',amount:-5,merchant:'X',acct:'a'}],accounts:[{id:'a',name:'A',type:'perso',confirmed:true}],
    categories:[{id:'resto',name:'Mes restos',icon:'utensils',type:'expense',univers:'perso'},{id:'frais',name:'Frais bancaires',icon:'landmark',type:'expense',univers:'auto'}]});
  expect(await page.evaluate(()=>[catById('resto').name,catById('frais').name,S.schemaVersion,S.onboarded])).toEqual(['Mes restos','Banque',16,true]);
});

test('v11 → v12 : « Transports » devient « Voiture et déplacements »',async({page})=>{
  await openWith(page,{schemaVersion:11,onboarded:true,categories:[{id:'transport',name:'Transports',icon:'car',type:'expense',univers:'perso'}]});
  expect(await page.evaluate(()=>catById('transport').name)).toBe('Voiture et déplacements');
});

test('v11 → v12 : un nom de rubrique personnalisé est gardé',async({page})=>{
  await openWith(page,{schemaVersion:11,onboarded:true,categories:[{id:'transport',name:'Ma bagnole',icon:'car',type:'expense',univers:'perso'}]});
  expect(await page.evaluate(()=>catById('transport').name)).toBe('Ma bagnole');
});

test('v12 → v13 : énergie, enfants et matériel fusionnés sans rien perdre ; « Autres » devient « Espèces et divers »',async({page})=>{
  const cat=(id,name,univers,limite)=>({id,name,icon:'tag',type:'expense',univers,limite:limite||null});
  await openWith(page,{schemaVersion:12,onboarded:true,
    accounts:[{id:'a',name:'Mixte',type:'mixte',confirmed:true}],
    categories:[cat('logement','Logement','perso',{montant:600,per:'M'}),cat('energie','Énergie','perso',{montant:100,per:'M'}),cat('enfants','Enfants','perso'),cat('cadeaux','Cadeaux','perso'),
      cat('logiciels','Logiciels et outils','pro'),cat('materiel','Matériel et fournitures','pro'),cat('cotisations','Versements','pro'),cat('impots','Impôts de l’activité','pro'),cat('divers','Autres','perso')],
    rules:{EDF:'energie',CRECHE:'enfants',LDLC:'materiel',CFE:'impots',ADOBE:'logiciels'},sugg:{ENGIE:{c:'energie',src:'kw'}},
    challenges:[{id:'auto',key:'d_1',month:'2026-05',cat:'energie',limite:100,habitude:120}],
    ops:[{id:'1',date:'2026-05-03',label:'PRLV EDF',amount:-90,merchant:'EDF',acct:'a',cat:'energie'},{id:'2',date:'2026-05-04',label:'CB LDLC',amount:-200,merchant:'LDLC',acct:'a'}]});
  const r=await page.evaluate(()=>({ids:S.categories.map(c=>c.id),rules:S.rules,sugg:S.sugg.ENGIE.c,cat:S.ops[0].cat,def:S.challenges[0].cat,lim:catById('logement').limite,
    noms:['logement','cadeaux','logiciels','divers'].map(i=>catById(i).name),typeLDLC:catOf(S.ops[1])}));
  for(const gone of ['energie','enfants','materiel']) expect(r.ids).not.toContain(gone);
  expect(r.rules).toEqual({EDF:'logement',CRECHE:'cadeaux',LDLC:'logiciels',CFE:'impots',ADOBE:'logiciels'});
  expect(r.sugg).toBe('logement'); expect(r.cat).toBe('logement'); expect(r.def).toBe('logement'); expect(r.typeLDLC).toBe('logiciels');
  expect(r.lim).toEqual({montant:700,per:'M'});
  expect(r.noms).toEqual(['Logement et énergie','Cadeaux','Logiciels et matériel','Espèces et divers']);
});

test('v13 → v14 : un prélèvement CESU rangé en cotisations redevient à classer, les vraies cotisations restent',async({page})=>{
  await openWith(page,{schemaVersion:13,onboarded:true,accounts:[{id:'a',name:'Mixte',type:'mixte',confirmed:true}],
    rules:{'URSSAF RHONE ALPES CESU|-':'cotisations','URSSAF PAYS DE LA LOIRE|-':'cotisations'},
    ops:[{id:'1',date:'2026-01-05',label:'PRLV URSSAF RHONE ALPES CESU',amount:-80,merchant:'URSSAF RHONE ALPES CESU',acct:'a'},
         {id:'2',date:'2026-01-06',label:'PRLV URSSAF PAYS DE LA LOIRE',amount:-300,merchant:'URSSAF PAYS DE LA LOIRE',acct:'a'}]});
  expect(await page.evaluate(()=>[catOf(S.ops[0]),catOf(S.ops[1])])).toEqual([null,'cotisations']);
});
