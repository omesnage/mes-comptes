// Assemble src/ en un fichier unique : dist/mes-comptes.html
import fs from 'fs'; import path from 'path';
const root=path.dirname(path.dirname(new URL(import.meta.url).pathname));
const r=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=fs.readdirSync(path.join(root,'src/js')).filter(f=>f.endsWith('.js')).sort().map(f=>r('src/js/'+f).replace(/\n$/,'')).join('\n');
const out=r('src/index.html').replace('/*@CSS*/',()=>r('src/styles.css').replace(/\n$/,'')).replace('//@JS',()=>js);
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/mes-comptes.html'),out);
console.log('dist/mes-comptes.html',(out.length/1024).toFixed(0)+' Ko');
