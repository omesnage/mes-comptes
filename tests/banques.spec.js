import {test,expect,openWith,importer} from './helpers.js';
import {BANQUES,ATTENDU} from './banques.js';
for(const [nom,fab] of Object.entries(BANQUES))
test(`lecteur intégré ou générique : ${nom}, lu et vérifié par les soldes`,async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await fab(ti.outputPath('releve.pdf')));
  await expect(page.locator('.releve')).toContainText('6 opérations ajoutées');
  const r=await page.evaluate(()=>({ops:S.ops.map(o=>o.amount).sort((a,b)=>a-b),ctl:reports[0].controle,dates:[...new Set(S.ops.map(o=>o.date.slice(0,7)))]}));
  expect(r.ops).toEqual(ATTENDU);
  expect(r.ctl&&r.ctl.ok).toBe(true);
  expect(r.dates).toEqual(['2026-03']);
  await expect(page.locator('.releve')).toContainText('Relevé vérifié ✓');
});
