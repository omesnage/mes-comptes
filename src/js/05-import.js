/* ============ Import ============ */
async function importFiles(files){
  if(demo) exitDemo();
  for(const f of files){
    const rep={name:f.name,found:0,added:0,dups:0,sample:[],raw:'',error:null,imp:Math.random().toString(36).slice(2,9),acct:''};
    try{
      const res=/\.csv$/i.test(f.name)?parseCSV(await f.text()):await parsePDF(f);
      rep.raw=res.raw; rep.found=res.ops.length; rep.reader=res.reader||'';
      rep.acct=detectBank(res.full||res.raw)||(accounts().length===1?accounts()[0]:f.name.replace(/\.[a-z]+$/i,'').replace(/[_-]+/g,' ').slice(0,30));
      const seen=new Set(S.ops.map(o=>o.date+'|'+o.label+'|'+o.amount));
      for(const o of res.ops){
        const k=o.date+'|'+o.label+'|'+o.amount;
        if(seen.has(k)){rep.dups++;continue}
        seen.add(k);
        const op={id:Math.random().toString(36).slice(2,10),date:o.date,label:o.label,amount:o.amount,merchant:merchantOf(o.label),acct:rep.acct,imp:rep.imp};
        S.ops.push(op); rep.added++; rep.sample.push(op); dirtyMonths.add(o.date.slice(0,7));
        const ac=autoCatOf(op.label); if(ac&&!S.rules[op.merchant]){S.rules[op.merchant]=ac;delete S.sugg[op.merchant];stateDirty=true}
        if(!S.rules[op.merchant]&&!S.sugg[op.merchant]){const c=kwSuggest(op.merchant,op.label)||(op.amount>0&&!REFUND_RE.test(norm(op.label))?'rentrees':null); if(c){S.sugg[op.merchant]={c,src:'kw'};stateDirty=true}}
      }
    }catch(e){rep.error=e.message||String(e)}
    reports.unshift(rep);
  }
  S.ops.sort((a,b)=>a.date<b.date?1:-1);
  P=null; save(); render();
}

