import {test,expect,openWith} from './helpers.js';
test('démo : 12 mois, deux comptes, alertes des trois niveaux sur le mois affiché',async({page})=>{
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  const r=await page.evaluate(()=>{
    const months=new Set(S.ops.map(o=>o.date.slice(0,7)));
    const al=U=>computeAlerts(U).map(a=>a.id.split(':')[0]+':'+a.level);
    const byMonth=k=>{P=shift(defaultPeriod(),-k);render();return [...new Set(['all','pro','perso'].flatMap(al))]};
    const d=defaultPeriod(); const out={months:months.size,types:S.accounts.map(a=>a.type),m0:byMonth(0),partiel:moisPartiel(d)};
    out.prev=[...new Set([1,2,3,4,5,6,7,8,9,10,11].flatMap(byMonth))];
    out.urssaf=S.ops.filter(o=>catOf(o)==='cotisations').length; out.impots=S.ops.filter(o=>catOf(o)==='impots').length;
    out.remu=Object.keys(INTERNAL).length/2;
    return out});
  expect(r.months).toBe(12);
  expect(r.types).toEqual(['perso','pro']);
  expect(r.partiel).toBeNull();
  expect(r.urssaf).toBe(12); expect(r.impots).toBe(1); expect(r.remu).toBe(12);
  for(const lvl of ['crit','warn','good']) expect(r.m0.some(x=>x.endsWith(':'+lvl)),lvl).toBe(true);
  expect(r.m0).toEqual(expect.arrayContaining(['revenu:crit','matelas:warn','ca-baisse:warn','non-classees:warn','retours:warn','budget:warn','hausse:warn','baisse:good','defi:good']));
  expect(r.prev).toEqual(expect.arrayContaining(['revenu:crit','revenu-ok:good','abo-hausse:warn','abo-nouveau:warn','record:good','gros-mois:good']));
});
test('démo : identique d’une ouverture à l’autre',async({page})=>{
  await openWith(page,null);
  const a=await page.evaluate(()=>JSON.stringify(demoData().ops.map(o=>[o.date,o.label,o.amount])));
  const b=await page.evaluate(()=>JSON.stringify(demoData().ops.map(o=>[o.date,o.label,o.amount])));
  expect(a).toBe(b);
});
