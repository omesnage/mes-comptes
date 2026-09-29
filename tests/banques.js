// Reproductions de mises en page de relevés des principales banques (données fictives).
import {PDFDocument,StandardFonts} from 'pdf-lib';
import fs from 'fs';
export const OPS=[['03','CB CARREFOUR MARKET',-45.2],['05','PRLV SEPA EDF',-94],['08','VIR SEPA RECU CLIENT ALPHA',1500],['12','CB PHARMACIE DES DUNES',-12.3],['15','VIR CPAM LOIRE',23],['20','CB AMAZON EU',-1234.56]];
export const ATTENDU=OPS.map(o=>o[2]).sort((a,b)=>a-b);
const fr=(v,{mil=' ',dec=',',eur=''}={})=>{const [e,c]=Math.abs(v).toFixed(2).split('.');return e.replace(/\B(?=(\d{3})+(?!\d))/g,mil)+dec+c+eur};
async function pdf(rows,file){
  const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica), page=doc.addPage([595,842]); let y=800;
  for(const r of rows){for(const [x,t,droite] of r) if(t){const w=font.widthOfTextAtSize(t,9);page.drawText(t,{x:droite?x-w:x,y,size:9,font})} y-=16}
  fs.writeFileSync(file,await doc.save()); return file;
}
/* Colonnes Débit / Crédit alignées à droite */
function colonnes({banque,entete,date,valeur,fmt,ancien,nouveau}){
  const rows=[[[40,banque]],[[40,'IBAN FR76 1234 5678 9012 3456 7890 123']],[[40,ancien]]];
  rows.push(entete); let solde=2000;
  for(const [j,l,a] of OPS){solde+=a;const r=[[40,date(j)],[valeur?150:100,l]];if(valeur)r.push([100,date(j)]);r.push(a<0?[460,fmt(a),1]:[540,fmt(a),1]);rows.push(r)}
  rows.push([[40,nouveau.replace('#',fmt(2136.94))]]);
  return rows;
}
export const BANQUES={
  'Crédit Agricole':f=>pdf(colonnes({banque:'CREDIT AGRICOLE ATLANTIQUE VENDEE',entete:[[40,'Date'],[100,'Libellé'],[430,'Débit'],[510,'Crédit']],date:j=>j+'.03',fmt:v=>fr(v),ancien:'Ancien solde créditeur au 28.02.2026 2 000,00',nouveau:'Nouveau solde créditeur au 31.03.2026 #'}),f),
  'BNP Paribas':f=>pdf(colonnes({banque:'BNP PARIBAS',entete:[[40,'Date'],[100,'Nature des opérations'],[430,'Débit'],[510,'Crédit']],date:j=>j+'.03',fmt:v=>fr(v),ancien:'SOLDE CREDITEUR AU 28.02.2026 2 000,00',nouveau:'SOLDE CREDITEUR AU 31.03.2026 #'}),f),
  'Société Générale':f=>pdf(colonnes({banque:'SOCIETE GENERALE',entete:[[40,'Date'],[100,'Valeur'],[150,'Nature de l’opération'],[430,'Débit'],[510,'Crédit']],date:j=>j+'/03/2026',valeur:1,fmt:v=>fr(v),ancien:'SOLDE PRECEDENT AU 28/02/2026 2 000,00',nouveau:'NOUVEAU SOLDE AU 31/03/2026 #'}),f),
  'LCL':f=>pdf(colonnes({banque:'LCL LE CREDIT LYONNAIS',entete:[[40,'DATE'],[100,'LIBELLE'],[430,'DEBIT'],[510,'CREDIT']],date:j=>j+'.03',fmt:v=>fr(v),ancien:'ANCIEN SOLDE 2 000,00',nouveau:'NOUVEAU SOLDE #'}),f),
  'Crédit Mutuel':f=>pdf(colonnes({banque:'CREDIT MUTUEL DE BRETAGNE',entete:[[40,'Date'],[100,'Opération'],[400,'Débit EUROS'],[480,'Crédit EUROS']],date:j=>j+'/03/2026',fmt:v=>fr(v),ancien:'SOLDE CREDITEUR AU 28/02/2026 2 000,00',nouveau:'SOLDE CREDITEUR AU 31/03/2026 #'}),f),
  'CIC':f=>pdf(colonnes({banque:'CIC OUEST',entete:[[40,'Date'],[100,'Opération'],[400,'Débit EUROS'],[480,'Crédit EUROS']],date:j=>j+'/03/2026',fmt:v=>fr(v,{mil:'.'}),ancien:'SOLDE CREDITEUR AU 28/02/2026 2.000,00',nouveau:'SOLDE CREDITEUR AU 31/03/2026 #'}),f),
  'Caisse d’Épargne':f=>pdf(colonnes({banque:'CAISSE D’EPARGNE BRETAGNE PAYS DE LOIRE',entete:[[40,'Date'],[100,'Libellé'],[430,'Débit'],[510,'Crédit']],date:j=>j+'/03/2026',fmt:v=>fr(v,{eur:' €'}),ancien:'Ancien solde au 28/02/2026 2 000,00 €',nouveau:'Nouveau solde au 31/03/2026 #'}),f),
  'La Banque Postale':f=>pdf(colonnes({banque:'LA BANQUE POSTALE',entete:[[40,'Date'],[100,'Opérations'],[420,'Débit (€)'],[500,'Crédit (€)']],date:j=>j+'/03',fmt:v=>fr(v),ancien:'Ancien solde au 28/02/2026 2 000,00',nouveau:'Nouveau solde au 31/03/2026 #'}),f),
  /* Montant signé + colonne de solde courant */
  'Banque Populaire':f=>{const rows=[[[40,'BANQUE POPULAIRE GRAND OUEST']],[[40,'Solde précédent au 28/02/2026 2 000,00']],[[40,'Date'],[100,'Libellé'],[430,'Montant'],[520,'Solde']]];let s=2000;
    for(const [j,l,a] of OPS){s+=a;rows.push([[40,j+'/03/2026'],[100,l],[460,(a<0?'-':'')+fr(a),1],[560,fr(s),1]])}rows.push([[40,'Nouveau solde au 31/03/2026 2 136,94']]);return pdf(rows,f)},
  /* Une ligne de texte par opération, dates en toutes lettres */
  'BoursoBank':f=>pdf([[[40,'BoursoBank']],[[40,'Solde au 28/02/2026 2 000,00 €']],...OPS.map(([j,l,a])=>[[40,`${+j} mars 2026  ${l}  ${a<0?'-':'+'}${fr(a)} €`]]),[[40,'Solde au 31/03/2026 2 136,94 €']]],f),
  'Qonto':f=>pdf([[[40,'QONTO']],[[40,'DUPONT CONSEIL SASU']],[[40,'Solde de début de période 2 000,00 €']],...OPS.map(([j,l,a])=>[[40,`${j}/03/2026  ${l}  ${a<0?'-':'+'}${fr(a)} €`]]),[[40,'Solde final 2 136,94 €']]],f),
  /* Point décimal, montant signé */
  'Shine':f=>{const rows=[[[40,'SHINE']],[[40,'Solde initial 2000.00 €']],[[40,'Date'],[100,'Libellé'],[500,'Montant']]];
    for(const [j,l,a] of OPS) rows.push([[40,j+'/03/2026'],[100,l],[540,(a<0?'-':'+')+Math.abs(a).toFixed(2)+' €',1]]);rows.push([[40,'Solde final 2136.94 €']]);return pdf(rows,f)},
  /* Sans aucun en-tête de colonnes */
  'Sans en-tête':f=>pdf(colonnes({banque:'BANQUE REGIONALE',entete:[[40,' ']],date:j=>j+'/03/2026',fmt:v=>fr(v),ancien:'Ancien solde 2 000,00',nouveau:'Nouveau solde #'}),f)
};
/* Relevé qu'aucune méthode ne sait lire seule : dépenses entre parenthèses « (45,20) » sous des en-têtes inconnus */
export const releveInconnu=f=>{const rows=[[[40,'BANQUE DU LITTORAL']],[[40,'Solde initial au 28.02.2026 2 000,00']],[[40,'Jour'],[110,'Objet'],[420,'Retraits'],[500,'Dépôts']]];
  for(const [j,l,a] of OPS) rows.push([[40,j+'.03.2026'],[110,l],a<0?[460,'('+fr(a)+')',1]:[540,fr(a),1]]);
  rows.push([[40,'Solde final au 31.03.2026 2 136,94']]);return pdf(rows,f)};

/* Format BforBank (données fictives) : lignes « Votre ancien solde » / « Votre nouveau solde » au milieu des opérations,
   libellés sur plusieurs lignes, montant du règlement carte sur la ligne suivante, puis détail des achats carte à débit différé. */
export async function bforbank(f){
  const r=(...c)=>c, D=(x,t)=>[x,t], R=(x,t)=>[x,t,1];
  const eur=(v,signe)=>(signe&&v<0?'-':'')+fr(v);
  const op=(j,type,v,...suite)=>[r(D(58,j+'/01/2026'),D(128,j+'/01/2026'),D(187,type),v<0?R(450,eur(v,1)):R(545,eur(v)),v<0?D(452,'€'):D(548,'€')),...suite.map(s=>r(D(187,s)))];
  const rows=[
    r(D(40,'BforBank')),r(D(40,'Relevé de compte')),r(D(45,'Du 01/01/2026 au 31/01/2026')),r(D(40,'IBAN FR76 1234 5678 9012 3456 7890 123')),
    r(D(60,'Date de')),r(D(119,'Date de valeur'),D(232,'Libellé de l’opération'),D(401,'Débit'),D(496,'Crédit')),r(D(55,'l’opération')),
    r(D(55,'01/01/2026'),D(116,'Votre ancien solde'),R(545,'+2 000,00'),D(548,'€')),
    ...op('05','PRELEVEMENT',-320,'URSSAF PAYS DE LA LOIRE','FR55ZZZ123456','REF-000111'),
    ...op('08','VIREMENT',1500,'CLIENT ALPHA CONSEIL','FACTURE 2026-01'),
    ...op('10','VIREMENT',640,'CARSAT PAYS DE LA LOIRE RETRAITE','PENSION JANVIER'),
    ...op('12','PRELEVEMENT',-94,'EDF CLIENTS PARTICULIERS','FR11ZZZ999999'),
    r(D(55,'15/01/2026'),D(116,'Solde au 15/01/2026'),R(545,'+3 726,00'),D(548,'€')),
    ...op('20','VIREMENT',-300,'GENERALI VIE VERSEMENT LIBRE'),
    r(D(58,'30/01/2026'),D(128,'30/01/2026'),D(187,'REGLEMENT CARTES DEBIT DIFFERE')),r(R(450,'-80,00'),D(452,'€')),r(D(187,'1234-JANVIER 2026')),
    r(D(55,'31/01/2026'),D(116,'Votre nouveau solde'),R(545,'+3 346,00'),D(548,'€')),
    r(D(45,'Total des opérations'),R(450,'794,00'),R(545,'2 140,00')),
    r(D(45,'Détail de vos opérations en euros carte Visa à débit différé')),
    r(D(60,'Date de')),r(D(197,'Libellé de l’opération'),D(401,'Débit'),D(496,'Crédit')),r(D(55,'l’opération')),
    r(D(58,'29/12/2025'),D(116,'AVOIR SUR PAIEMENT CARTE WEB'),R(545,'7,10'),D(548,'€')),r(D(116,'BOUTIQUE EN LIGNE')),
    r(D(58,'02/01/2026'),D(116,'PAIEMENT PAR CARTE'),R(450,'35,00'),D(452,'€')),r(D(116,'CARREFOUR GUERANDE')),r(D(116,'010126 000000 1234 111111')),
    r(D(58,'09/01/2026'),D(116,'PAIEMENT PAR CARTE WEB'),R(450,'52,10')),r(D(116,'CREPERIE DU PORT')),r(D(116,'52,10 EUR 1EUR=0,000 EUR')),
    r(D(45,'Total'),R(450,'87,10'),D(452,'€'),R(545,'7,10'),D(548,'€')),
    r(D(45,'Montant comptabilisé le 30/01/2026'),R(450,'80,00'),D(452,'€'))
  ];
  return pdf(rows,f);
}
