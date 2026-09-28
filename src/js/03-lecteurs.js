/* ============ Lecteurs personnalisés ============ */
const MOIS_N={JANV:1,JAN:1,FEVR:2,FEV:2,MARS:3,MAR:3,AVR:4,MAI:5,JUIN:6,JUIL:7,AOUT:8,SEPT:9,SEP:9,OCT:10,NOV:11,DEC:12};
function parseDateAny(s,Y){
  s=norm(String(s||'')).trim(); let m;
  if(m=s.match(/^(\d{1,2})[\/.\- ](\d{1,2})(?:[\/.\- ](\d{2,4}))?$/)){const y=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):Y;return `${y}-${pad(m[2])}-${pad(m[1])}`}
  if(m=s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/)) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if(m=s.match(/^(\d{1,2})\s+([A-Z]{3,9})\.?(?:\s+(\d{2,4}))?$/)){const k=m[2];const mo=MOIS_N[k]||MOIS_N[k.slice(0,4)]||MOIS_N[k.slice(0,3)];if(!mo)return null;const y=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):Y;return `${y}-${pad(mo)}-${pad(m[1])}`}
  return null;
}
function compileReader(r){
  if(!r||typeof r!=='object') throw new Error('Le lecteur doit être un objet JSON.');
  if(!r.nom||!r.ligne) throw new Error('Il manque « nom » ou « ligne ».');
  const line=new RegExp(r.ligne,'i'); const det=r.detection?new RegExp(r.detection,'i'):null;
  const g=line.source; if(!/\(\?<date>/.test(g)||!/\(\?<libelle>/.test(g)||!(/\(\?<montant>/.test(g)||/\(\?<debit>/.test(g)||/\(\?<credit>/.test(g))) throw new Error('L’expression « ligne » doit contenir les groupes date, libelle, et montant ou debit/credit.');
  return {r,line,det};
}
function readWith(c,texts,Y){
  const ops=[];
  for(const t of texts){
    const m=c.line.exec(t); if(!m||!m.groups) continue; const G=m.groups;
    const date=parseDateAny(G.date,Y); if(!date) continue;
    let amount=NaN;
    if(G.debit&&G.debit.trim()) amount=-Math.abs(toNum(G.debit));
    else if(G.credit&&G.credit.trim()) amount=Math.abs(toNum(G.credit));
    else if(G.montant){const raw=G.montant.trim();const v=Math.abs(toNum(raw));const neg=/^-|-$/.test(raw), pos=/^\+/.test(raw);
      const sg=c.r.signe||'moins';
      amount=sg==='plus'?(pos?v:-v):sg==='credit-hint'?((neg||!CREDIT_HINT.test(G.libelle))?-v:v):(neg?-v:v);
      if(G.sens){amount=/^(C|CR|CREDIT|\+)/i.test(norm(G.sens))?v:-v}}
    if(!isFinite(amount)||!amount) continue;
    const label=String(G.libelle||'').replace(/\s+/g,' ').trim(); if(!label||SKIP.test(label)) continue;
    ops.push({date,label,amount:+amount.toFixed(2)});
  }
  return ops;
}
function applyReaders(texts,full,Y){
  for(const r of (S.readers||[])){
    try{const c=compileReader(r); if(c.det&&!c.det.test(full)) continue; const ops=readWith(c,texts,Y); if(ops.length) return {ops,name:r.nom}}catch(e){}
  }
  return null;
}
const READER_FORMAT=`{
  "nom": "Nom de la banque",
  "detection": "expression régulière qui repère cette banque dans le relevé",
  "ligne": "expression régulière JavaScript appliquée à chaque ligne, avec les groupes nommés (?<date>...), (?<libelle>...) et soit (?<montant>...), soit (?<debit>...) et (?<credit>...), éventuellement (?<sens>...)",
  "signe": "moins | plus | credit-hint"
}`;
function claudePrompt(raw){return `J’utilise une application de suivi de dépenses qui lit mes relevés bancaires PDF, mais elle ne reconnaît pas ceux de ma banque. Voici le texte qu’elle a extrait de mon relevé, une ligne par ligne du PDF, déjà anonymisé :

---
${anonymize(raw)}
---

Écris-moi un « lecteur » pour cette application : un objet JSON, et rien d’autre, au format suivant :

${READER_FORMAT}

Règles :
- « ligne » est une expression régulière JavaScript (syntaxe RegExp, drapeau i appliqué automatiquement), écrite comme chaîne JSON : double chaque barre oblique inverse.
- Elle doit reconnaître une ligne d’opération entière et rien d’autre (pas les soldes ni les totaux).
- (?<date>) capture la date telle qu’écrite (ex. 05/03, 05.03.2026, 5 mars 2026). (?<libelle>) capture le libellé.
- Pour le montant : si le relevé a des colonnes Débit et Crédit séparées, utilise (?<debit>) et (?<credit>), chacun optionnel. Sinon, utilise (?<montant>) et indique dans « signe » : « moins » si les débits portent un signe moins (devant ou derrière), « plus » si seuls les crédits portent un signe plus. Si une colonne indique le sens (D/C, Débit/Crédit), capture-la dans (?<sens>).
- Vérifie ton expression sur chaque ligne d’opération du texte ci-dessus avant de répondre.
Réponds uniquement avec le JSON.`}

