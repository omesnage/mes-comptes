/* ============ Bulles d'explication ============
   Sur ordinateur : en passant la souris. Sur téléphone : en gardant le doigt posé un instant (un simple toucher agit comme d'habitude). */
let BULLE_T=null, BULLE_LONG=0;
function montrerBulle(el){
  const b=document.getElementById('bulle'); if(!b||!el||!el.dataset.tip) return;
  b.textContent=el.dataset.tip; b.classList.add('on');
  const r=el.getBoundingClientRect(), w=b.offsetWidth, vw=document.documentElement.clientWidth;
  b.style.top=Math.round(r.bottom+8)+'px';
  b.style.left=Math.round(Math.max(8,Math.min(r.left+r.width/2-w/2,vw-w-8)))+'px';
}
function cacherBulle(){clearTimeout(BULLE_T);const b=document.getElementById('bulle');if(b)b.classList.remove('on')}
const cibleBulle=e=>e.target.closest&&e.target.closest('[data-tip]');
document.addEventListener('mouseover',e=>{const c=cibleBulle(e);if(c&&matchMedia('(hover:hover)').matches)montrerBulle(c)});
document.addEventListener('mouseout',e=>{if(cibleBulle(e))cacherBulle()});
document.addEventListener('focusin',e=>{const c=cibleBulle(e);if(c)montrerBulle(c)});
document.addEventListener('focusout',cacherBulle);
document.addEventListener('touchstart',e=>{const c=cibleBulle(e);cacherBulle();if(!c)return;
  BULLE_T=setTimeout(()=>{BULLE_LONG=Date.now();montrerBulle(c);BULLE_T=setTimeout(cacherBulle,4000)},450)},{passive:true});
['touchend','touchmove','touchcancel'].forEach(ev=>document.addEventListener(ev,()=>{if(ev!=='touchend')cacherBulle();else clearTimeout(BULLE_T)},{passive:true}));
document.addEventListener('click',e=>{if(Date.now()-BULLE_LONG<900&&cibleBulle(e)){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('contextmenu',e=>{if(cibleBulle(e)&&Date.now()-BULLE_LONG<2000)e.preventDefault()});

/* Message de confirmation, en haut de l'écran */
let TOAST_T=null;
function toast(msg,ok){
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.className='on '+(ok===false?'attention':'ok');
  clearTimeout(TOAST_T); TOAST_T=setTimeout(()=>{t.className=''},6000);
}
