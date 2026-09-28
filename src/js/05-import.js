/* ============ Import ============ */
/* Retrouve le compte d'un relevé (par numéro, sinon par banque) ou en crée un nouveau, avec un type supposé */
function resolveAccount(res,fileName){
  const text=res.full||res.raw||'';
  const bank=detectBank(text)||'', no=detectAccountNo(text);
  let a=no&&S.accounts.find(x=>x.no===no);
  if(!a&&bank){const same=S.accounts.filter(x=>x.bank===bank);
    const free=same.filter(x=>!x.no);
    if(no&&free.length===1){a=free[0];a.no=no;stateDirty=true}
    else if(!no&&same.length===1) a=same[0];}
  if(!a&&!bank&&!no&&S.accounts.length===1) a=S.accounts[0];
  if(a) return {a,isNew:false};
  let name=bank||fileName.replace(/\.[a-z]+$/i,'').replace(/[_-]+/g,' ').trim().slice(0,30)||'Compte principal';
  if(S.accounts.some(x=>x.name===name)) name+=no?' ····'+no.slice(-4):' ('+(S.accounts.filter(x=>x.name.startsWith(name)).length+1)+')';
  return {a:addAccount({name,bank,no,type:guessType(bank,res.header||text.slice(0,1500),name)}),isNew:true};
}
async function importFiles(files){
  if(demo) exitDemo();
  for(const f of files){
    const rep={name:f.name,found:0,added:0,dups:0,sample:[],raw:'',error:null,imp:Math.random().toString(36).slice(2,9),acct:'',isNew:false};
    try{
      const res=/\.csv$/i.test(f.name)?parseCSV(await f.text()):await parsePDF(f);
      rep.raw=res.raw; rep.found=res.ops.length; rep.reader=res.reader||'';
      if(res.ops.length){
        const {a,isNew}=resolveAccount(res,f.name); rep.acct=a.id; rep.isNew=isNew&&!a.confirmed;
        const last=res.ops.reduce((m,o)=>o.date>m?o.date:m,'');
        const so=detectSolde(res.full||'',last);
        if(so&&(!a.soldeDate||so.date>=a.soldeDate)){a.solde=so.solde;a.soldeDate=so.date;a.soldeSrc='releve';stateDirty=true}
      }
      const seen=new Set(S.ops.map(o=>o.date+'|'+o.label+'|'+o.amount));
      const atype=(acctById(rep.acct)||{}).type||'perso';
      for(const o of res.ops){
        const k=o.date+'|'+o.label+'|'+o.amount;
        if(seen.has(k)){rep.dups++;continue}
        seen.add(k);
        const op={id:Math.random().toString(36).slice(2,10),date:o.date,label:o.label,amount:o.amount,merchant:merchantOf(o.label),acct:rep.acct,imp:rep.imp};
        S.ops.push(op); rep.added++; rep.sample.push(op); dirtyMonths.add(o.date.slice(0,7));
        const ac=autoCatOf(op.label); if(ac&&!S.rules[op.merchant]){S.rules[op.merchant]=ac;delete S.sugg[op.merchant];stateDirty=true}
        if(!S.rules[op.merchant]&&!S.sugg[op.merchant]){const c=kwSuggest(op.merchant,op.label,atype,op.amount); if(c){S.sugg[op.merchant]={c,src:'kw'};stateDirty=true}}
      }
    }catch(e){rep.error=e&&e.message||'Ce fichier n’a pas pu être lu. Réessayez, ou choisissez un autre relevé.'}
    reports.unshift(rep);
  }
  S.ops.sort((a,b)=>a.date<b.date?1:-1);
  P=null; save(); render();
}
