/* ============ Libellés → marchand ============ */
function norm(s){return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function merchantOf(label){
  let s=norm(label);
  if(/RETRAIT|\bDAB\b|\bGAB\b/.test(s)) return 'RETRAIT ESPECES';
  const br=BRANDS.find(b=>b[0].test(s)); if(br) return br[1];
  if(/\b(ECH(EANCE)?|REMB(OURSEMENT)?)\s+(DE\s+)?PRET\b/.test(s)){const ln=s.match(/PRET\D*(\d{4,})/);return 'ECHEANCE PRET'+(ln?' '+ln[1].slice(-4):'')}
  s=s.replace(/\b(PAIEMENT PAR CARTE|PAIEMENT CB|PAIEMENT|ACHAT CB|ACHAT|FACTURE CARTE|CARTE X?\d*|CB\*?\d*|PRLV SEPA|PRELEVEMENT SEPA|PRELEVEMENT|PRLV|VIREMENT SEPA|VIREMENT INSTANTANE|VIREMENT|VIR SEPA|VIR INST|VIR|RECU|EMIS|ECHEANCE PRET|ECH PRET|DE|DU|A|VERS|POUR|LE|LA|LES|MR|MME|M)\b/g,' ');
  s=s.replace(/\b(REMBOURSEMENT|REMBT|REMB|RBT|AVOIR|ANNULATION|ANNUL|RETOUR|REFUND|PAYPAL)\b/g,' ');
  const cut=s.search(/\b(MOTIF|REF|REFERENCE|LIBELLE|RUM|ICS|FACTURE|FACT|ECHEANCE|NUM|COMMANDE|CDE)\b/);
  if(cut>0&&/[A-Z]{2}/.test(s.slice(0,cut).replace(/[^A-Z ]/g,''))) s=s.slice(0,cut);
  s=s.replace(/\b(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE|JANV|FEV|AVR|JUIL|SEPT|OCT|NOV|DEC)\b/g,' ');
  s=s.replace(/\d{2}[\/.]\d{2}([\/.]\d{2,4})?/g,' ').replace(/[^A-Z0-9& '.-]/g,' ');
  const stop=new Set(['SA','SAS','SARL','FR','EUR','REF','MOTIF','ID','ICS','RUM','X','COMMERCE','ELECTRONIQUE','WWW','COM','EUROPE','ET','CIE','SCA','SE','LTD','GMBH','PP']);
  const w=s.split(/\s+/).map(x=>x.replace(/^[.'-]+|[.'-]+$/g,'')).filter(x=>x.length>1&&!/\d/.test(x)&&!stop.has(x)&&!/^([A-Z]\.)+[A-Z]?$/.test(x));
  return w.slice(0,3).join(' ')||(/PAYPAL/.test(norm(label))?'PAYPAL':norm(label).trim().slice(0,24))||'INCONNU';
}
/* Suggestion de rubrique d'après le libellé et le type du compte (perso, pro ou mixte) */
function kwSuggest(m,label,atype,amount){
  const t=norm(m+' '+label);
  if(atype==='pro'&&amount<0&&/\b(VIR|VIREMENT)\b/.test(t)&&/\b(PERSO|PERSONNEL|REMUNERATION|PRELEVEMENT EXPLOITANT)\b/.test(t)) return 'remu';
  if(amount>0&&NDF_RE.test(t)) return 'fraisrembourses';
  if(/DGFIP|IMPOTS?\b|TRESOR PUBLIC|FINANCES PUBLIQUES|\bCFE\b/.test(t)&&atype!=='perso') return 'impots';
  for(const [re,c] of KW_PRO) if(re.test(t)) return c;
  if(atype==='pro') for(const [re,c] of KW_PROACC) if(re.test(t)) return c;
  for(const [re,c] of KW) if(re.test(t)) return c==='revenus'&&atype==='perso'&&/HONORAIRES/.test(t)?'revenus':c;
  if(amount>0&&!REFUND_RE.test(t)) return atype==='perso'?'rentrees':'revenus';
  return null;
}

