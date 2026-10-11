/* Relevé de carte fictif d'un mois (96 opérations), au format d'une banque en ligne : aucune donnée réelle.
   Les proportions imitent un relevé réel : environ la moitié d'enseignes connues, le reste de commerces locaux inventés.
   Chaque ligne : [jour, libellé, montant, rubrique attendue ou null si personne ne pourrait la deviner]. */
const V=['FRLA BAULE','FRNANTES','FRVANNES','FRSAINT NAZAIRE','FRPARIS','FRRENNES','FRANGERS','FRLORIENT'];
const carte=(nom,ville)=>`PAIEMENT PAR CARTE ${nom} ${ville||'FRLA BAULE'} 0${'1'}0126 000000 8195 ${String(100000+((nom.length*7919)%899999))}`;
const web=(nom,ville)=>`PAIEMENT PAR CARTE WEB ${nom} ${ville||'FRPARIS'} 0${'1'}0126 000000 8195 ${String(200000+((nom.length*104729)%799999))}`;
export const LIGNES=[
  /* courses */
  [2,carte('SUPER U'),-44.1,'courses'],[4,carte('SUPER U'),-18.9,'courses'],[7,carte('SUPER U'),-63.15,'courses'],[11,carte('SUPER U'),-27.4,'courses'],[15,carte('SUPER U'),-51.2,'courses'],[22,carte('SUPER U'),-33.8,'courses'],
  [3,carte('CARREFOUR MARKET','FRNANTES'),-38.6,'courses'],[19,carte('CARREFOUR MARKET','FRNANTES'),-22.1,'courses'],
  [6,carte('E LECLERC','FRVANNES'),-71.9,'courses'],[25,carte('E LECLERC','FRVANNES'),-45.5,'courses'],
  [9,carte('PICARD 0798','FRLA BAULE'),-19.2,'courses'],[13,carte('FRANPRIX 4421','FRPARIS'),-7.3,'courses'],[14,carte('FRANPRIX 4421','FRPARIS'),-9.6,'courses'],
  [16,carte('LIDL','FRANGERS'),-24.7,'courses'],[26,carte('LIDL','FRANGERS'),-31.2,'courses'],[18,carte('BIOCOOP','FRRENNES'),-28.9,'courses'],[20,web('CROWDFARMING','FR28002 MADRI'),-21.5,'courses'],
  /* restauration */
  [5,carte('MC DONALDS','FRLORIENT'),-21.9,'resto'],[21,carte('MC DONALDS','FRLORIENT'),-14.5,'resto'],[8,carte('SUSHI SHOP','FRPARIS'),-31.5,'resto'],[8,web('SUSHI SHOP'),-31.6,'resto'],
  [10,carte('LA PASTA FRESCA','FRRENNES'),-8.5,'resto'],[12,carte('BURGER KING','FRNANTES'),-12.4,'resto'],[17,carte('BOULANGERIE PAUL','FRPARIS'),-6.8,'resto'],[23,carte('BOULANGERIE PAUL','FRPARIS'),-4.9,'resto'],
  [24,carte('STARBUCKS COFFEE','FRPARIS'),-5.6,'resto'],[27,web('UBER EATS','NL33810109808'),-27.3,'resto'],[28,carte('PIZZERIA DA MARCO','FRLA BAULE'),-36,'resto'],[29,carte('BAR DU PORT','FRLA BAULE'),-9.5,'resto'],
  /* santé */
  [3,carte('PHARM DU CENTRE','FR44LA BAULE'),-14.8,'sante'],[19,carte('PHARM DU CENTRE','FR44LA BAULE'),-9.9,'sante'],[12,carte('PHIE DES QUAIS','FRNANTES'),-11.4,'sante'],
  [13,carte('KRYS OPTIQUE','FRVANNES'),-21.3,'sante'],[22,carte('CABINET DENTAIRE MOREAU','FRANGERS'),-60,'sante'],
  /* transports */
  [4,carte('TOTALENERGIES ACCESS','FRLORIENT'),-58.2,'transport'],[20,carte('TOTALENERGIES ACCESS','FRLORIENT'),-49.7,'transport'],[9,carte('STATION SERVICE','FRMARIGNANE'),-39,'transport'],
  [10,carte('AUTOROUTES DU S','FR13SALON'),-9.2,'transport'],[10,carte('AUTOROUTES DU S','FR13SALON'),-6.1,'transport'],[11,carte('AUTOROUTES DU S','FR13SALON'),-5,'transport'],
  [14,carte('INDIGO','FRPARIS075071'),-6.2,'transport'],[15,carte('INDIGO','FRPARIS075071'),-5.1,'transport'],[17,web('SNCF VOYAGEURS','FRPARIS'),-46,'transport'],[25,web('UBER','NL33810109808'),-14.2,'transport'],[26,carte('GARAGE MARTIN','FRLA BAULE'),-182,'transport'],
  /* abonnements */
  [1,web('NETFLIX COM','IE0805540003'),-13.49,'abonnements'],[5,web('SPOTIFY','SE1234567'),-10.99,'abonnements'],[5,web('APPLE.COM/BILL','IE0805540003'),-0.99,'abonnements'],[2,web('Prime Video *ZG','FRamzn.fr/bil'),-3.99,'abonnements'],
  [18,web('MOLOTOV','FRPARIS'),-6.99,'abonnements'],[7,'PRELEVEMENT SEPA FREE MOBILE FR29ZZZ12345 REF 998877',-19.99,'abonnements'],
  /* achats */
  [3,'PRELEVEMENT AMAZON PAYMENTS EUROPE S C A AMAZON DE94ZZZ00000561653',-24.99,'enligne'],[9,'PRELEVEMENT AMAZON PAYMENTS EUROPE S C A AMAZON DE94ZZZ00000561653',-9.9,'enligne'],
  [16,'PRELEVEMENT AMAZON PAYMENTS EUROPE S C A AMAZON DE94ZZZ00000561653',-49.9,'enligne'],[21,web('VEEPEE'),-158.4,'enligne'],[22,carte('ZARA','FRNANTES'),-39.95,'shopping'],
  [23,carte('DECATHLON','FRVANNES'),-64.9,'shopping'],[24,carte('FNAC','FRRENNES'),-27.5,'enligne'],
  /* maison, voyages, loisirs, animaux, dons */
  [6,carte('IKEA','FRNANTES'),-89,'maison'],[12,carte('LEROY MERLIN','FRVANNES'),-54.3,'maison'],[15,carte('MAISONS DU MONDE','FRLA BAULE'),-17.9,'maison'],[21,web('LITERIE A DOMICILE','FRPLESCOP'),-214.9,'maison'],
  [4,web('BOOKING.COM','NL33810109808'),-171.2,'voyages'],[10,web('EASYJET','GB12345'),-98,'voyages'],[19,carte('HOLIDAY INN','FRPARIS'),-18.5,'voyages'],[27,web('CARJET.COM','FRROISSY'),-81.4,'voyages'],
  [8,carte('UGC CINE CITE','FRNANTES'),-19.2,'loisirs'],[25,carte('PHOTOMATON','FRPARIS'),-12,'loisirs'],[13,web('PETCO','ATWIEN'),-52.3,'animaux'],
  [11,web('CHANGE.ORG','US12345'),-10,'dons'],[26,web('HELLOASSO','FRPARIS'),-30,'dons'],
  /* logement, épargne, retraits, rentrées */
  [5,'PRELEVEMENT EDF CLIENTS PARTICULIERS FR55ZZZ143065 REF ABC123',-94.3,'logement'],[8,'PRELEVEMENT VEOLIA EAU FR37ZZZ89B995 REF 2026-01',-48.6,'logement'],
  [12,'PRELEVEMENT GENERALI VIE SA FR22ZZZ000000 REF GBPR000001',-450,'epargne'],[14,'RETRAIT AU DISTRIBUTEUR SUPER U LA BAULE 140126 124817',-100,'divers'],[28,'RETRAIT AU DISTRIBUTEUR CREDIT MUTUEL NANTES 280126 101010',-60,'divers'],
  [3,'VIREMENT CARSAT PAYS LOIRE PREST TI RETRAITE BASE ET OU RCI',1050.4,'retraite'],[3,'VIREMENT INSTIT RETRAITE COMPLEME ENSEI IRCEC:RAAP 01-01/2026',187.3,'retraite'],
  [20,'VIREMENT MACIF SANTE PREVOYANCE Vir Prest REF 000000600933104D',22.1,'sante'],[9,'AVOIR SUR PAIEMENT CARTE WEB VEEPEE 090126 000000 8195',52.7,'enligne'],
  /* commerces locaux inventés : impossibles à deviner, les plus gros sont demandés */
  [2,carte('ETS DURAND ET FILS','FRLA BAULE'),-245,null],[6,carte('ETS DURAND ET FILS','FRLA BAULE'),-132,null],
  [4,carte('ATELIER DES SAVEURS','FRLA BAULE'),-14.5,null],[11,carte('ATELIER DES SAVEURS','FRLA BAULE'),-22,null],[18,carte('ATELIER DES SAVEURS','FRLA BAULE'),-17.5,null],
  [7,carte('AU BON GOUT','FRVANNES'),-33.3,null],[9,carte('GRAIN DE SEL','FRVANNES'),-28.1,null],[10,carte('TERRE ET MER','FRLORIENT'),-42.6,null],
  [13,carte('MAISON LEFEVRE','FRRENNES'),-95.7,null],[16,carte('LES ARTISANS REUNIS','FRLA BAULE'),-67.4,null],[17,carte('SARL DUBOIS','FRANGERS'),-58,null],
  [19,carte('LE 7 A HUIT','FRNANTES'),-9.8,null],[21,carte('DELICES DE LOLA','FRPARIS'),-12.7,null],[23,carte('ATELIER CLEMENT','FRLORIENT'),-19.9,null],
  [24,carte('MADAME BLEU','FRRENNES'),-8.2,null],[26,carte('LA FABRIQUE','FRANGERS'),-15.4,null],[27,carte('AUX QUATRE VENTS','FRLA BAULE'),-6.9,null],
  [28,carte('CHEZ NICOLE','FRVANNES'),-11.5,'resto'],[29,carte('LE RELAIS DES MARAIS','FRLA BAULE'),-24,null],
];
export const texteCollage=()=>LIGNES.slice().sort((a,b)=>a[0]-b[0]).map(([j,l,m])=>`${String(j).padStart(2,'0')}/01/2026 ${l} ${m<0?'-':'+'}${Math.abs(m).toFixed(2).replace('.',',')} €`).join('\n');
