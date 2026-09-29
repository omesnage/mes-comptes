// Assemble src/ en deux fichiers uniques : dist/mes-comptes.html (indépendants) et dist/mon-compte.html (salariés)
import fs from 'fs'; import path from 'path';
const root=path.dirname(path.dirname(new URL(import.meta.url).pathname));
const r=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=fs.readdirSync(path.join(root,'src/js')).filter(f=>f.endsWith('.js')).sort().map(f=>r('src/js/'+f).replace(/\n$/,'')).join('\n');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
for(const [sal,fichier,dossier,nom] of [[false,'mes-comptes.html','en-ligne/mes-comptes','Mes comptes'],[true,'mon-compte.html','en-ligne/mon-compte','Mon compte']]){
  const out=r('src/index.html').replace('/*@CSS*/',()=>r('src/styles.css').replace(/\n$/,'')).replace('//@JS',()=>js.replace('/*@SAL*/false',sal?'true':'false')).replace('<title>Mes comptes</title>',`<title>${nom}</title>`).replace('<div class="brand">Mes comptes</div>',`<div class="brand">${nom}</div>`);
  fs.writeFileSync(path.join(root,'dist',fichier),out);
  /* Dossier à publier en ligne : le même fichier, nommé index.html pour s'ouvrir à la racine du lien */
  fs.mkdirSync(path.join(root,dossier),{recursive:true});
  fs.writeFileSync(path.join(root,dossier,'index.html'),out);
  console.log('dist/'+fichier,(out.length/1024).toFixed(0)+' Ko');
}
