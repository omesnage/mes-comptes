/* ============ Libellés → marchand ============ */
function norm(s){return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function merchantOf(label){
  let s=norm(label);
  if(/\bRETRAITS?\b|\bDAB\b|\bGAB\b/.test(s)) return 'RETRAIT ESPECES';
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
/* Mots à chercher sur le web pour un libellé inconnu : le type d'opération, les numéros, les formes de société
   et le code pays collé à la ville sont retirés ; après un intermédiaire de paiement (SumUp, PayPal…), on garde le vrai vendeur. */
const INTERMEDIAIRES=/^(SUMUP|SUM UP|PAYPAL|STRIPE|ZETTLE|IZETTLE|PAYPLUG|LYDIA|SQUARE|SQ|MOLLIE|ADYEN|PAYGREEN|LYF)$/;
const MOTS_TYPE=new Set(['PAIEMENT','PAR','CARTE','CB','WEB','PRLV','PRELEVEMENT','SEPA','VIR','VIREMENT','RECU','EMIS','INST','INSTANTANE','ACHAT','FACTURE','AVOIR','SUR','DE','DU','VERS','EUR','EUROS','SA','SAS','SASU','SARL','EURL','SNC','SCA','LTD','GMBH','BV','SE','SRL','SL','ETS','ET','CIE','DEBIT','DIFFERE','EUROPEEN','COMMERCE','ELECTRONIQUE','MOTIF','REF','RUM','ICS']);
const DEBUT_FR=/^FR(ANC|AIS|EE|ESH|IT|OMAG|UIT|ERE|IGO|ICHE|ONT|AGRA|ED|OID|ANP|ENCH)/;
function motsRecherche(label){
  let s=norm(label||'').replace(/\b\d+[.,]\d+\s*EUR\b.*$/,' ').replace(/\s+/g,' ').trim();
  /* Intermédiaire de paiement : « SUMUP *BOULANGERIE » → « BOULANGERIE » */
  const et=s.split('*'); if(et.length>1){const g=et[0].trim().split(' ');if(INTERMEDIAIRES.test(g[g.length-1]||'')||INTERMEDIAIRES.test(g.slice(-2).join(' ')))s=et.slice(1).join(' ')}
  let w=s.replace(/[*]/g,' ').split(/\s+/).map(x=>x.replace(/^[.,:;'"()-]+|[.,:;'"()-]+$/g,''))
    .filter(x=>x&&!MOTS_TYPE.has(x)&&!INTERMEDIAIRES.test(x)&&x.length>1&&(x.match(/\d/g)||[]).length<2&&!(x.length>=8&&/\d/.test(x))&&!/^\d+$/.test(x));
  if(w.length>1){const d=w[w.length-1],m=d.match(/^(FR|IE|LU|NL|GB)([A-Z]{3,})$/);if(m&&!DEBUT_FR.test(d))w[w.length-1]=m[2]}
  return w.slice(0,6).join(' ');
}
const lienRecherche=label=>{const q=motsRecherche(label);return q?`<a class="lien chercher" href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer"><i data-lucide="search"></i>À quoi correspond ce libellé ?</a>`:''};
/* Suggestion de rubrique d'après le libellé et le type du compte (perso, pro ou mixte) */
function kwSuggest(m,label,atype,amount){
  const t=norm(m+' '+label);
  if(atype==='pro'&&amount<0&&/\b(VIR|VIREMENT)\b/.test(t)&&/\b(PERSO|PERSONNEL|REMUNERATION|PRELEVEMENT EXPLOITANT)\b/.test(t)) return 'remu';
  if(/DGFIP|IMPOTS?\b|TRESOR PUBLIC|FINANCES PUBLIQUES|\bCFE\b/.test(t)&&atype!=='perso') return 'impots';
  for(const [re,c] of KW_PRO) if(re.test(t)) return c;
  if(atype==='pro') for(const [re,c] of KW_PROACC) if(re.test(t)) return c;
  for(const [re,c] of KW) if(re.test(t)) return c==='revenus'&&atype==='perso'&&/HONORAIRES/.test(t)?'revenus':c;
  if(amount>0&&!REFUND_RE.test(t)) return atype==='perso'?'rentrees':'revenus';
  return null;
}

