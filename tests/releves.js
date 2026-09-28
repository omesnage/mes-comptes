// Génère des relevés PDF de test dans trois mises en page différentes.
import {PDFDocument,StandardFonts} from 'pdf-lib';
import fs from 'fs';
async function pdf(rows,file){
  const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica);
  const page=doc.addPage([595,842]); let y=800;
  for(const r of rows){ for(const [x,t] of r) if(t) page.drawText(t,{x,y,size:9,font}); y-=16 }
  fs.writeFileSync(file,await doc.save()); return file;
}
/* 1. Colonnes Débit et Crédit séparées, montants sans signe (compte perso) */
export const releveColonnes=(f,ancien='1 234,56')=>pdf([
  [[40,'CREDIT AGRICOLE ATLANTIQUE VENDEE']],
  [[40,'Relevé de compte courant']],
  [[40,'IBAN : FR76 1470 6000 1234 5678 9012 345']],
  [[40,'Ancien solde créditeur au 28/02/2026'],[500,ancien]],
  [[40,'Date'],[100,'Libellé'],[420,'Débit'],[500,'Crédit']],
  [[40,'02/03'],[100,'CB CARREFOUR MARKET GUERANDE'],[420,'45,20']],
  [[40,'05/03'],[100,'PRLV SEPA EDF CLIENTS PARTICULIERS'],[420,'94,00']],
  [[100,'FACTURE 2026-03']],
  [[40,'08/03'],[100,'VIR SEPA RECU DE QONTO SAS'],[500,'1 500,00']],
  [[40,'12/03'],[100,'CB PHARMACIE DES DUNES'],[420,'12,30']],
  [[40,'15/03'],[100,'VIR CPAM LOIRE ATLANTIQUE'],[500,'23,00']],
  [[40,'Nouveau solde créditeur au 31/03/2026'],[500,'2 606,06']]
],f);
/* 2. Signe moins en fin de montant pour les débits (compte pro) */
export const releveMoinsFin=f=>pdf([
  [[40,'QONTO']],[[40,'DUPONT CONSEIL SASU']],[[40,'IBAN FR76 1695 8000 0112 3456 7890 123']],
  [[40,'Date   Opération   Montant']],
  [[40,'03/03/2026  Virement de CLIENT ALPHA SARL  2 400,00']],
  [[40,'04/03/2026  Prélèvement URSSAF  612,00-']],
  [[40,'07/03/2026  Virement vers O DUPONT PERSO  1 500,00-']],
  [[40,'10/03/2026  Carte ADOBE SYSTEMS  23,99-']],
  [[40,'15/03/2026  Carte LDLC  349,90-']],
  [[40,'20/03/2026  Virement de CLIENT BETA  1 250,00']],
  [[40,'Nouveau solde au 31/03/2026  5 000,00']]
],f);
/* 3. Dates en toutes lettres, signes devant et symbole € */
export const releveLettres=f=>pdf([
  [[40,'BoursoBank']],[[40,'Relevé mensuel']],
  [[40,'28 févr. 2026  CARTE BIOCOOP LA BAULE  -18,20 €']],
  [[40,'5 mars 2026  CARTE LIDL SAINT NAZAIRE  -23,40 €']],
  [[40,'9 mars 2026  VIR SALAIRE ACME  +2 100,00 €']],
  [[40,'12 mars 2026  PRLV NETFLIX.COM  -13,49 €']]
],f);
