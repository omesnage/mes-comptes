import {test,expect,openWith} from './helpers.js';
test('recherche dans Mes opérations : marchand ou somme (« 45,80 », « 45.8 », « 45 € »)',async({page})=>{
  await openWith(page,{schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],rules:{}});
  const r=await page.evaluate(()=>{
    S.ops=[['1','ZOO PARC BEAUVA',-45.8],['2','BOULANGERIE',-45],['3','LIDL',-145.8],['4','CAFE',-4.58]].map(([id,l,a])=>({id,date:'2026-04-20',label:l,amount:a,merchant:l,acct:'a'}));save();render();aller('operations');
    const out={};for(const t of ['45,80','45.8','45 €','45','zoo','4,58','loisirs']){q=t;out[t]=[...vOps().matchAll(/data-op="(\d)"/g)].map(m=>m[1]).join('')} return out});
  expect(r).toEqual({'45':'12','45,80':'1','45.8':'1','45 €':'12','zoo':'1','4,58':'4',loisirs:''});
});
