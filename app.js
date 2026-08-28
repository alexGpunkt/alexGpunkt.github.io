(function(){
'use strict';
/* ------------------------------------------------------------------ *
 * CHH Mathe – Grundwissen Klasse 8
 * v1.3  ·  App-internes Eingabefeld (Brüche/Variablen/Text),
 *          tolerante Rundungsprüfung, scrollfreie Oberfläche,
 *          erweiterter Aufgabenpool (gleiche Themenbereiche).
 * ------------------------------------------------------------------ */
var VERSION='1.5', QCOUNT=12;
var MAIL_TO='alexander.goehl@chh.berlin';
/* Direktversand: Formular-ID von formspree.io hier eintragen (z. B. 'xayzbqwe').
   Das Empfängerpostfach wird im Formspree-Konto festgelegt – dort MAIL_TO hinterlegen.
   Solange die ID leer ist, bleibt der Knopf „Jetzt senden“ ausgeblendet. */
var FORMSPREE_ID='';
var $=function(s){return document.querySelector(s)},
    $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var rnd=function(a,b){return Math.floor(Math.random()*(b-a+1))+a};
var pick=function(a){return a[rnd(0,a.length-1)]};
var shuffle=function(a){var b=a.slice(),i,j,t;for(i=b.length-1;i>0;i--){j=rnd(0,i);t=b[i];b[i]=b[j];b[j]=t}return b};
var fmt=function(n){return Math.abs(n-Math.round(n))<1e-9?String(Math.round(n)):Number(n.toFixed(4)).toLocaleString('de-DE')};
var fix=function(n,k){return Number(n.toFixed(k)).toLocaleString('de-DE',{minimumFractionDigits:k,maximumFractionDigits:k})};
var gcd=function(a,b){a=Math.abs(a);b=Math.abs(b);return b?gcd(b,a%b):a};
var lcm=function(a,b){return Math.abs(a*b)/gcd(a,b)};
var frac=function(a,b){var g=gcd(a,b)||1;a/=g;b/=g;if(b<0){a=-a;b=-b}return b===1?String(a):a+'/'+b};
var sum=function(v){return v.reduce(function(a,b){return a+b},0)};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};

var N={numbers:'Zahlen & Rechnen',measure:'Größen & Messen',geometry:'Raum & Form',algebra:'Gleichungen & Funktionen',data:'Daten & Zufall',bbr:'BBR-Stil'};
var M={numbers:['½','Rechnen · Brüche · Prozent'],measure:['↔','Einheiten · Fläche · Volumen'],geometry:['△','Winkel · Figuren · Koordinaten'],algebra:['x','Terme · Gleichungen · Zuordnungen'],data:['▥','Diagramme · Kennwerte · Zufall'],bbr:['★','Sachaufgaben · Prüfungsstil']};
var L={lernen:'Lernen · RLP D',g:'Grundkurs · D–E',e:'Erweiterung · E'};

function read(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v===null||typeof v!=='object'?d:v}catch(e){return d}}
var user=read('m8user',{name:''});
var pref=read('m8pref',{level:'g',advanced:false}),
    prog=read('m8prog',{}),
    stats=read('m8stats',{sessions:0,bestStreak:0,lastSession:null,levels:{lernen:{r:0,w:0},g:{r:0,w:0},e:{r:0,w:0}}});
var S={screen:'home',level:pref.level||'g',advanced:!!pref.advanced,topic:'mix',qs:[],i:0,right:0,wrong:0,streak:0,answered:false,selected:null,sessionRecorded:false};
if(!L[S.level])S.level='g';
Object.keys(N).forEach(function(k){
  if(!prog[k]||typeof prog[k]!=='object')prog[k]={r:0,w:0};
  if(typeof prog[k].r!=='number')prog[k].r=0;
  if(typeof prog[k].w!=='number')prog[k].w=0;
  if(!prog[k].levels)prog[k].levels={};
  ['lernen','g','e'].forEach(function(l){if(!prog[k].levels[l])prog[k].levels[l]={r:0,w:0}});
});
if(!stats.levels)stats.levels={};
['lernen','g','e'].forEach(function(l){if(!stats.levels[l])stats.levels[l]={r:0,w:0}});
function save(){try{localStorage.setItem('m8pref',JSON.stringify({level:S.level,advanced:S.advanced}));localStorage.setItem('m8prog',JSON.stringify(prog));localStorage.setItem('m8stats',JSON.stringify(stats))}catch(e){}}
function saveUser(){try{localStorage.setItem('m8user',JSON.stringify({name:user.name||''}))}catch(e){}}
function pc(k){var p=prog[k],n=p.r+p.w;return n?Math.round(100*p.r/n):0}

/* ---------------------- Antwort-Auswertung ------------------------- */
var UNIT_RE=/\s*(euro|cent|stück|stueck|km\/h|m\/s|cm³|dm³|cm2|dm3|cm3|m³|m3|mm²|mm2|cm²|m²|m2|km²|km2|kwh|min|std|sek|tage|tag|kg|km|dm|cm|mm|ml|mg|€|%|°|h|l|t|g|m|s)\.?$/i;
/* Zerlegt eine Eingabe in Zahlwerte. Erkennt: Dezimalkomma und -punkt,
   deutsche Tausenderpunkte, Brüche, gemischte Zahlen, Einheiten, Prozentzeichen. */
function parseValue(raw){
  var s=String(raw==null?'':raw);
  s=s.replace(/[\u00a0\u202f\u2007]/g,' ').replace(/[\u2212\u2013\u2014]/g,'-').replace(/[\u2044\u2215]/g,'/').trim();
  if(!s)return null;
  s=s.replace(/^\+/,'').replace(UNIT_RE,'').trim();
  if(!s)return null;
  var neg=false;
  if(/^-/.test(s)){neg=true;s=s.slice(1).trim()}
  var m;
  /* gemischte Zahl: 2 1/2 oder 2½-Schreibweise mit Leerzeichen */
  if((m=/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s))){
    var d1=Number(m[3]);if(!d1)return null;
    return val((Number(m[1])+Number(m[2])/d1)*(neg?-1:1),null,true,Number(m[2])+Number(m[1])*d1,d1);
  }
  /* Bruch */
  if((m=/^(\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)$/.exec(s))){
    var zn=Number(m[1].replace(',','.')),nn=Number(m[2].replace(',','.'));
    if(!nn)return null;
    return val(zn/nn*(neg?-1:1),null,true,zn,nn);
  }
  /* reine Zahl – Trennzeichen normalisieren */
  var t=s.replace(/[\s']/g,'');
  if(!/^\d+([.,]\d+)*$/.test(t))return null;
  var cands=[];
  if(/^\d{1,3}(\.\d{3})+,\d+$/.test(t))cands.push(t.replace(/\./g,'').replace(',','.'));           /* 1.234.567,8 */
  else if(/^\d{1,3}(,\d{3})+\.\d+$/.test(t))cands.push(t.replace(/,/g,''));                        /* 1,234,567.8 */
  else if(/^\d{1,3}(\.\d{3})+$/.test(t)){
    cands.push(t.replace(/\./g,''));                                                               /* 1.234 = 1234 */
    if(/^\d{1,3}\.\d{3}$/.test(t))cands.push(t);                                                   /* … oder 1,234 */
  }
  else if(/^\d{1,3}(,\d{3})+$/.test(t)){
    if(/^\d{1,3},\d{3}$/.test(t)){cands.push(t.replace(',','.'));cands.push(t.replace(/,/g,''))}   /* 1,234 = Dezimalzahl, evtl. 1234 */
    else cands.push(t.replace(/,/g,''));
  }
  else if(/^\d+[.,]\d+$/.test(t))cands.push(t.replace(',','.'));
  else if(/^\d+$/.test(t))cands.push(t);
  else return null;
  var main=Number(cands[0]);
  if(!isFinite(main))return null;
  var dm=/\.(\d+)$/.exec(cands[0]),decs=dm?dm[1].length:null;
  var out=val(main*(neg?-1:1),decs,false,null,null);
  out.alt=cands.slice(1).map(function(c){return Number(c)*(neg?-1:1)}).filter(isFinite);
  return out;
}
function val(v,decs,isFrac,n,d){return{v:v,dec:decs,frac:isFrac,n:n,d:d,alt:[]}}
function normText(s){
  return String(s==null?'':s).toLowerCase()
    .replace(/[\u00a0\u202f]/g,' ')
    .replace(/[\u2212\u2013\u2014]/g,'-')
    .replace(/[·×*]/g,'')
    .replace(/\s+/g,'')
    .replace(/[.;!]$/,'');
}
/* Prüft eine Eingabe gegen eine Aufgabe. Liefert {ok, note}. */
function verify(u,o){
  if(o.type==='mc')return{ok:String(u)===String(o.a)};
  if(o.type==='text'||typeof o.a==='string'){
    var n=normText(u),list=[o.a].concat(o.alt||[]);
    for(var i=0;i<list.length;i++)if(normText(list[i])===n)return{ok:true};
    return{ok:false};
  }
  var p=parseValue(u);
  if(!p)return{ok:false,note:'Bitte eine Zahl, einen Bruch (z. B. 3/4) oder eine gemischte Zahl (z. B. 2 1/2) eingeben.'};
  var cands=[p.v].concat(p.alt||[]),hit=false;
  for(var j=0;j<cands.length;j++)if(numMatch(cands[j],p.dec,o))hit=true;
  if(!hit)return{ok:false};
  if(o.reduce&&p.frac&&p.d&&gcd(p.n,p.d)!==1)
    return{ok:false,note:'Richtig gerechnet – der Bruch ist aber noch nicht vollständig gekürzt.'};
  return{ok:true};
}
function numMatch(v,dec,o){
  if(!isFinite(v))return false;
  var a=o.a,eps=1e-9*Math.max(1,Math.abs(a));
  if(Math.abs(v-a)<=eps)return true;
  var tol=eps;
  if(dec!=null&&dec>=1)tol=Math.max(tol,.5*Math.pow(10,-dec));      /* auf eigene Genauigkeit gerundet */
  if(o.dec!=null)tol=Math.max(tol,.5*Math.pow(10,-o.dec));          /* geforderte Rundung */
  if(o.dec===0)tol=Math.max(tol,.5);
  if(o.tol!=null)tol=Math.max(tol,o.tol);
  return Math.abs(v-a)<=tol*(1+1e-9);
}

/* ------------------------ Aufgaben-Bausteine ----------------------- */
function q(o){o.type=o.type||'num';o.unit=o.unit||'';o.h=o.h||'Nutze eine passende Grundregel.';o.x=o.x||'';return o}
function tq(o){o.type='text';return q(o)}
function fq(o){o.reduce=true;o.ph=o.ph||'z. B. 3/4';return q(o)}
function mc(o){o.type='mc';o.options=shuffle(o.options);return q(o)}
function bars(v,lbl){
  var m=Math.max.apply(null,v)||1,s='<svg viewBox="0 0 340 132" role="img"><line x1="20" y1="110" x2="325" y2="110" stroke="#7890ad"/>';
  v.forEach(function(x,i){
    var h=75*x/m,p=34+i*58;
    s+='<rect x="'+p+'" y="'+(110-h)+'" width="34" height="'+h+'" rx="4" fill="#5aa7ff"/>'+
       '<text x="'+(p+17)+'" y="'+(105-h)+'" fill="#fff" font-size="10" text-anchor="middle">'+x+'</text>';
    if(lbl&&lbl[i])s+='<text x="'+(p+17)+'" y="124" fill="#9fb0c5" font-size="9" text-anchor="middle">'+lbl[i]+'</text>';
  });
  return s+'</svg>';
}
function fractionBar(n,d){
  var w=280/d,s='<svg viewBox="0 0 340 115" role="img"><rect x="30" y="30" width="280" height="52" rx="7" fill="#07131f" stroke="#7890ad"/>';
  for(var i=0;i<d;i++){
    if(i<n)s+='<rect x="'+(30+i*w)+'" y="30" width="'+w+'" height="52" fill="#58e0d3" opacity=".72"/>';
    if(i)s+='<line x1="'+(30+i*w)+'" y1="30" x2="'+(30+i*w)+'" y2="82" stroke="#7890ad"/>';
  }
  return s+'</svg>';
}
function rectSvg(a,b,ua,ub){
  var w=210,h=Math.max(50,Math.min(110,210*b/a));
  return '<svg viewBox="0 0 340 150" role="img"><rect x="60" y="20" width="'+w+'" height="'+h+'" rx="5" fill="rgba(90,167,255,.14)" stroke="#5aa7ff"/>'+
  '<text x="'+(60+w/2)+'" y="'+(h+38)+'" fill="#9fb0c5" font-size="12" text-anchor="middle">'+ua+'</text>'+
  '<text x="42" y="'+(20+h/2)+'" fill="#9fb0c5" font-size="12" text-anchor="end">'+ub+'</text></svg>';
}
function angleSvg(a){
  var r=70,rad=a*Math.PI/180,x=120+r*Math.cos(-rad),y=110+r*Math.sin(-rad);
  return '<svg viewBox="0 0 340 140" role="img"><line x1="120" y1="110" x2="290" y2="110" stroke="#7890ad" stroke-width="2"/>'+
  '<line x1="120" y1="110" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="#5aa7ff" stroke-width="2"/>'+
  '<path d="M 150 110 A 30 30 0 0 0 '+(120+30*Math.cos(-rad)).toFixed(1)+' '+(110+30*Math.sin(-rad)).toFixed(1)+'" fill="none" stroke="#58e0d3"/>'+
  '<text x="162" y="102" fill="#58e0d3" font-size="12">?</text></svg>';
}

/* --------------------------- Aufgabenpool -------------------------- */
var POOL={};

POOL.numbers={d:[
 function(){var a=rnd(120,980),b=rnd(20,99);return q({p:'Berechne '+a+' − '+b+'.',a:a-b,h:'Subtrahiere stellenweise, achte auf den Übertrag.',x:a+' − '+b+' = '+(a-b)+'.'})},
 function(){var a=rnd(148,879),b=rnd(24,199);return q({p:'Berechne '+a+' + '+b+'.',a:a+b,h:'Addiere Einer, Zehner und Hunderter getrennt.',x:a+' + '+b+' = '+(a+b)+'.'})},
 function(){var a=rnd(12,48),b=rnd(3,12);return q({p:'Berechne '+a+' · '+b+'.',a:a*b,h:'Zerlege einen Faktor, z. B. '+b+' = '+(b-1)+' + 1.',x:a+' · '+b+' = '+(a*b)+'.'})},
 function(){var b=rnd(3,12),x=rnd(7,25),a=b*x;return q({p:'Berechne '+a+' : '+b+'.',a:x,h:'Nutze die Umkehraufgabe · '+b+'.',x:a+' : '+b+' = '+x+'.'})},
 function(){var b=rnd(3,9),k=rnd(4,14),r=rnd(1,b-1),a=b*k+r;return q({p:'Welchen Rest lässt '+a+' : '+b+'?',a:r,h:'Suche das größte Vielfache von '+b+', das unter '+a+' liegt.',x:a+' : '+b+' = '+k+' Rest '+r+'.'})},
 function(){var a=rnd(2,9),b=rnd(2,9),c=rnd(2,9);return q({p:'Berechne '+a+' + '+b+' · '+c+'.',a:a+b*c,h:'Punktrechnung vor Strichrechnung.',x:'Zuerst '+b+' · '+c+' = '+(b*c)+', dann + '+a+' = '+(a+b*c)+'.'})},
 function(){var a=rnd(3,9),b=rnd(2,8),c=rnd(2,6);return q({p:'Berechne ('+a+' + '+b+') · '+c+'.',a:(a+b)*c,h:'Die Klammer wird zuerst berechnet.',x:'('+a+' + '+b+') · '+c+' = '+(a+b)+' · '+c+' = '+((a+b)*c)+'.'})},
 function(){var d=pick([4,5,8,10]),n=rnd(1,d-1);return q({p:'Welcher Anteil ist markiert? Gib den Bruch ein.',v:fractionBar(n,d),a:n/d,ph:'z. B. 3/4',h:'Markierte Teile durch alle Teile.',x:'Der Anteil ist '+frac(n,d)+'.'})},
 function(){var d=pick([2,4,5,10,20]),n=rnd(1,d-1);return q({p:'Schreibe '+frac(n,d)+' als Dezimalzahl.',a:n/d,h:'Zähler durch Nenner teilen.',x:frac(n,d)+' = '+fmt(n/d)+'.'})},
 function(){var d=pick([3,4,5,6,8]),n=rnd(1,d-1),all=d*pick([6,8,10,12]);return q({p:'Wie viel sind '+frac(n,d)+' von '+all+'?',a:all*n/d,h:'Teile zuerst durch '+d+'.',x:all+' : '+d+' · '+n+' = '+(all*n/d)+'.'})},
 function(){var n=rnd(1000,99999),z=pick([10,100,1000]),a=Math.round(n/z)*z;return q({p:'Runde '+n.toLocaleString('de-DE')+' auf '+(z===10?'Zehner':z===100?'Hunderter':'Tausender')+'.',a:a,h:'Beachte die Ziffer rechts neben der Rundungsstelle.',x:'Gerundet: '+a.toLocaleString('de-DE')+'.'})},
 function(){var p=pick([2,3,4,5,9,10]),n=p*rnd(10,40);return mc({p:'Welche Aussage stimmt?',options:[n+' ist durch '+p+' teilbar.',n+' ist eine Primzahl.',n+' ist nicht durch '+p+' teilbar.','Nur 1 teilt '+n+'.'],a:n+' ist durch '+p+' teilbar.',h:'Nutze die Teilbarkeitsregeln.',x:n+' : '+p+' = '+(n/p)+' ohne Rest.'})},
 function(){var g=pick([2,3,4,5,6]),n=pick([2,3,4,5,7]),d=n+pick([1,2,3,5]);if(gcd(n,d)!==1)d=n+1;return fq({p:'Kürze '+(n*g)+'/'+(d*g)+' vollständig.',a:n/d,h:'Teile Zähler und Nenner durch denselben Teiler ('+g+').',x:(n*g)+'/'+(d*g)+' = '+frac(n,d)+'.'})},
 function(){var d=pick([3,4,5,6]),n=rnd(1,d-1),f=pick([2,3,4,5]);return q({p:'Erweitere '+frac(n,d)+' auf den Nenner '+(d*f)+'. Wie heißt der Zähler?',a:n*f,h:'Zähler und Nenner mit derselben Zahl multiplizieren.',x:frac(n,d)+' = '+(n*f)+'/'+(d*f)+'.'})},
 function(){var d=pick([5,6,8,10,12]),n1=rnd(1,d-2),n2=rnd(n1+1,d-1);return mc({p:'Welcher Bruch ist größer?',options:[n2+'/'+d,n1+'/'+d,'beide sind gleich groß','das lässt sich nicht vergleichen'],a:n2+'/'+d,h:'Bei gleichem Nenner entscheidet der Zähler.',x:'Bei gleichem Nenner ist der Bruch mit dem größeren Zähler größer: '+n2+'/'+d+'.'})},
 function(){var z=pick([[0.5,1,2],[0.25,1,4],[0.75,3,4],[0.2,1,5],[0.4,2,5],[0.6,3,5],[0.8,4,5],[0.125,1,8],[0.1,1,10],[0.3,3,10]]);return fq({p:'Schreibe '+fmt(z[0])+' als vollständig gekürzten Bruch.',a:z[1]/z[2],h:'Denke an Zehntel, Hundertstel oder Tausendstel und kürze.',x:fmt(z[0])+' = '+z[1]+'/'+z[2]+'.'})},
 function(){var p=pick([5,10,20,25,50,75]);return q({p:'Schreibe '+p+' % als Dezimalzahl.',a:p/100,h:'Prozent bedeutet Hundertstel – teile durch 100.',x:p+' % = '+fmt(p/100)+'.'})},
 function(){var a=pick([0.2,0.4,0.5,0.6,0.8,1.5,2.5]),b=rnd(3,9);return q({p:'Berechne '+fmt(a)+' · '+b+'.',a:a*b,h:'Rechne ohne Komma und setze es danach richtig.',x:fmt(a)+' · '+b+' = '+fmt(a*b)+'.'})},
 function(){var b=pick([2,4,5,8]),x=pick([0.3,0.6,1.2,2.5,3.5]),a=x*b;return q({p:'Berechne '+fmt(a)+' : '+b+'.',a:x,h:'Teile wie bei natürlichen Zahlen und setze das Komma.',x:fmt(a)+' : '+b+' = '+fmt(x)+'.'})},
 function(){var g=pick([20,25,40,50,80,200]),p=pick([10,20,25,50,75]);return q({p:'Wie viel Prozent sind '+fmt(g*p/100)+' von '+g+'?',a:p,unit:'%',h:'Prozentsatz = Prozentwert : Grundwert · 100.',x:fmt(g*p/100)+' : '+g+' · 100 = '+p+' %.'})},
 function(){var g=pick([4,6,8,9,12]),a=g*pick([2,3,5]),b=g*pick([4,7,11]);return q({p:'Bestimme den größten gemeinsamen Teiler von '+a+' und '+b+'.',a:gcd(a,b),h:'Vergleiche die Teiler beider Zahlen.',x:'ggT('+a+'; '+b+') = '+gcd(a,b)+'.'})},
 function(){var a=pick([4,6,8,9,12]),b=pick([6,10,14,15,18]);return q({p:'Bestimme das kleinste gemeinsame Vielfache von '+a+' und '+b+'.',a:lcm(a,b),h:'Schreibe die Vielfachen beider Zahlen auf.',x:'kgV('+a+'; '+b+') = '+lcm(a,b)+'.'})},
 function(){var a=pick([2.4,3.5,0.7,12.6,4.05]),z=pick([10,100,1000]);return q({p:'Berechne '+fmt(a)+' · '+z+'.',a:a*z,h:'Das Komma wandert nach rechts.',x:fmt(a)+' · '+z+' = '+fmt(a*z)+'.'})},
 function(){return mc({p:'Welche Zahl ist die kleinste?',options:['0,7','0,07','0,75','0,507'],a:'0,07',h:'Vergleiche die Ziffern stellenweise nach dem Komma.',x:'0,07 ist am kleinsten, weil an der Zehntelstelle eine 0 steht.'})},
 function(){var pr=pick([13,17,19,23,29,31]);return mc({p:'Welche dieser Zahlen ist eine Primzahl?',options:[String(pr),String(pr+1),String(2*pr),String(pr*3)],a:String(pr),h:'Eine Primzahl hat genau zwei Teiler.',x:pr+' ist nur durch 1 und durch sich selbst teilbar.'})},
 function(){var n=rnd(4,15);return q({p:'Berechne '+n+'².',a:n*n,h:n+'² bedeutet '+n+' · '+n+'.',x:n+'² = '+(n*n)+'.'})}
],e:[
 function(){var a=rnd(-15,8),b=rnd(-10,13);return q({p:'Berechne '+a+' '+(b>=0?'+':'−')+' '+Math.abs(b)+'.',a:a+b,h:'Nutze die Zahlengerade oder die Vorzeichenregeln.',x:'Ergebnis: '+(a+b)+'.'})},
 function(){var a=rnd(-12,-2),b=rnd(2,12);return q({p:'Berechne '+a+' − ('+(-b)+').',a:a+b,h:'Minus und Minus ergibt Plus.',x:a+' − ('+(-b)+') = '+a+' + '+b+' = '+(a+b)+'.'})},
 function(){var a=rnd(-9,-2),b=rnd(2,9);return q({p:'Berechne ('+a+') · '+b+'.',a:a*b,h:'Ungleiche Vorzeichen ergeben ein negatives Produkt.',x:'('+a+') · '+b+' = '+(a*b)+'.'})},
 function(){var p=pick([10,15,20,25,30,40,50,75]),g=rnd(40,360);return q({p:'Wie viel sind '+p+' % von '+g+' €?',a:g*p/100,unit:'€',h:'Prozentwert = Grundwert · Prozentsatz : 100.',x:g+' · '+p+' : 100 = '+fmt(g*p/100)+' €.'})},
 function(){var g=pick([80,120,160,200,240,300]),p=pick([10,20,25,30,40]),w=g*p/100;return q({p:fmt(w)+' sind '+p+' % von welcher Zahl?',a:g,h:'Gesucht ist der Grundwert.',x:fmt(w)+' : '+p+' · 100 = '+g+'.'})},
 function(){var g=pick([25,40,50,60,80,120]),p=pick([15,20,35,45,60]),w=g*p/100;return q({p:'Wie viel Prozent sind '+fmt(w)+' von '+g+'?',a:p,unit:'%',h:'Prozentsatz = Prozentwert : Grundwert · 100.',x:fmt(w)+' : '+g+' · 100 = '+p+' %.'})},
 function(){var d1=pick([3,4,5,6]),d2=pick([3,4,5,6]),n1=rnd(1,d1-1),n2=rnd(1,d2-1);return q({p:'Berechne '+frac(n1,d1)+' + '+frac(n2,d2)+'. Gib einen Bruch ein.',a:n1/d1+n2/d2,ph:'z. B. 7/12',h:'Mache die Brüche zuerst gleichnamig.',x:frac(n1,d1)+' + '+frac(n2,d2)+' = '+frac(n1*d2+n2*d1,d1*d2)+'.'})},
 function(){var d=pick([4,5,6,8,10]),n2=rnd(1,d-2),n1=rnd(n2+1,d-1);return q({p:'Berechne '+n1+'/'+d+' − '+n2+'/'+d+'. Gib einen Bruch ein.',a:(n1-n2)/d,ph:'z. B. 1/4',h:'Bei gleichem Nenner nur die Zähler subtrahieren.',x:n1+'/'+d+' − '+n2+'/'+d+' = '+frac(n1-n2,d)+'.'})},
 function(){var d1=pick([2,3,4,5]),d2=pick([3,4,5,7]),n1=rnd(1,d1-1),n2=rnd(1,d2-1);return fq({p:'Berechne '+frac(n1,d1)+' · '+frac(n2,d2)+'. Kürze vollständig.',a:n1*n2/(d1*d2),h:'Zähler mal Zähler, Nenner mal Nenner.',x:frac(n1,d1)+' · '+frac(n2,d2)+' = '+frac(n1*n2,d1*d2)+'.'})},
 function(){var d=pick([2,3,4,5]),n=rnd(1,d-1),k=rnd(2,6);return q({p:'Berechne '+frac(n,d)+' : '+k+'. Gib einen Bruch ein.',a:n/(d*k),ph:'z. B. 1/8',h:'Durch eine Zahl teilen heißt: mit ihrem Kehrwert multiplizieren.',x:frac(n,d)+' : '+k+' = '+frac(n,d*k)+'.'})},
 function(){var d=pick([3,4,5,7,8]),n=rnd(2,d-1);if(gcd(n,d)!==1)n=d-1;return fq({p:'Wie heißt der Kehrwert von '+n+'/'+d+'?',a:d/n,h:'Zähler und Nenner tauschen.',x:'Der Kehrwert ist '+frac(d,n)+'.'})},
 function(){var g=rnd(2,5),d=pick([3,4,5,8]),n=rnd(1,d-1);return q({p:'Schreibe '+g+' '+n+'/'+d+' als unechten Bruch. Wie heißt der Zähler?',a:g*d+n,h:'Ganze mal Nenner, dann den Zähler addieren.',x:g+' '+n+'/'+d+' = '+(g*d+n)+'/'+d+'.'})},
 function(){var a=pick([0.2,0.25,0.4,0.5,0.75]),b=pick([0.1,0.3,0.6,0.8]);return q({p:'Berechne '+fmt(a)+' + '+fmt(b)+'.',a:a+b,h:'Schreibe die Kommas untereinander.',x:fmt(a)+' + '+fmt(b)+' = '+fmt(a+b)+'.'})},
 function(){var a=rnd(3,9),b=rnd(2,8),c=rnd(2,7),d=rnd(2,9);return q({p:'Berechne '+a+' · '+b+' − '+c+' · '+d+'.',a:a*b-c*d,h:'Erst beide Produkte, dann subtrahieren.',x:(a*b)+' − '+(c*d)+' = '+(a*b-c*d)+'.'})},
 function(){var b=pick([3,6,7,9,11]),a=rnd(20,90);while(a%b===0)a++;return q({p:'Berechne '+a+' : '+b+'.',a:a/b,dec:2,h:'Rechne schriftlich und runde erst am Ende.',x:a+' : '+b+' ≈ '+fix(a/b,2)+'.'})}
],x:[
 function(){var a=rnd(2,9),b=rnd(2,4);return q({p:'Zusatz: Berechne '+a+'^'+b+'.',a:Math.pow(a,b),h:'Eine Potenz ist wiederholte Multiplikation.',x:a+'^'+b+' = '+Math.pow(a,b)+'.'})},
 function(){var n=pick([4,5,6,7,8,9,11,12,13,15]);return q({p:'Zusatz: Berechne √'+(n*n)+'.',a:n,h:'Welche Zahl ergibt mit sich selbst multipliziert '+(n*n)+'?',x:'√'+(n*n)+' = '+n+'.'})},
 function(){var g=pick([40,60,80,120,200]),p=pick([5,10,15,20,25]);return q({p:'Zusatz: '+g+' € werden um '+p+' % erhöht. Wie hoch ist der neue Wert?',a:g*(1+p/100),unit:'€',h:'Der neue Wert entspricht 100 % + '+p+' %.',x:g+' · '+fmt(1+p/100)+' = '+fmt(g*(1+p/100))+' €.'})},
 function(){var a=pick([2,3,5]),m=rnd(2,3),n=rnd(2,3);return mc({p:'Zusatz: Wie lautet '+a+'^'+m+' · '+a+'^'+n+' als eine Potenz?',options:[a+"^"+(m+n),(a*a)+"^"+(m+n),a+"^"+(m+n+1),a+"^"+(m+n-1)],a:a+'^'+(m+n),h:'Bei gleicher Basis werden die Exponenten addiert.',x:a+'^'+m+' · '+a+'^'+n+' = '+a+'^'+(m+n)+'.'})}
]};

POOL.measure={d:[
 function(){var m=rnd(2,15),cm=rnd(1,99);return q({p:'Wandle '+m+' m '+cm+' cm in Zentimeter um.',a:m*100+cm,unit:'cm',h:'1 m = 100 cm.',x:m+' m '+cm+' cm = '+(m*100+cm)+' cm.'})},
 function(){var kg=rnd(1,8),g=pick([100,200,250,500,750]);return q({p:'Wandle '+kg+' kg '+g+' g in Kilogramm um.',a:kg+g/1000,unit:'kg',h:'1000 g = 1 kg.',x:kg+' kg '+g+' g = '+fmt(kg+g/1000)+' kg.'})},
 function(){var h=rnd(1,4),min=pick([10,15,20,30,45]);return q({p:'Wie viele Minuten sind '+h+' h '+min+' min?',a:h*60+min,unit:'min',h:'1 Stunde = 60 Minuten.',x:h+' · 60 + '+min+' = '+(h*60+min)+' min.'})},
 function(){var mm=pick([35,80,125,240,505]);return q({p:'Wandle '+mm+' mm in Zentimeter um.',a:mm/10,unit:'cm',h:'10 mm = 1 cm.',x:mm+' mm = '+fmt(mm/10)+' cm.'})},
 function(){var km=pick([1.5,2.4,3,7.2,12]);return q({p:'Wandle '+fmt(km)+' km in Meter um.',a:km*1000,unit:'m',h:'1 km = 1000 m.',x:fmt(km)+' km = '+fmt(km*1000)+' m.'})},
 function(){var t=pick([1.5,2,3.5,4.25,6]);return q({p:'Wandle '+fmt(t)+' t in Kilogramm um.',a:t*1000,unit:'kg',h:'1 t = 1000 kg.',x:fmt(t)+' t = '+fmt(t*1000)+' kg.'})},
 function(){var l=pick([0.5,1.5,2,2.75,3.2]);return q({p:'Wandle '+fmt(l)+' l in Milliliter um.',a:l*1000,unit:'ml',h:'1 l = 1000 ml.',x:fmt(l)+' l = '+fmt(l*1000)+' ml.'})},
 function(){var min=pick([2,3,5,7,10]);return q({p:'Wie viele Sekunden sind '+min+' min?',a:min*60,unit:'s',h:'1 min = 60 s.',x:min+' · 60 = '+(min*60)+' s.'})},
 function(){var h1=rnd(7,11),m1=pick([5,10,20,35,40,50]),dm=pick([25,40,55,70,95]),tot=h1*60+m1+dm,h2=Math.floor(tot/60),m2=tot%60;
   return q({p:'Ein Film beginnt um '+h1+':'+(m1<10?'0':'')+m1+' Uhr und endet um '+h2+':'+(m2<10?'0':'')+m2+' Uhr. Wie lange dauert er in Minuten?',a:dm,unit:'min',h:'Rechne zuerst bis zur vollen Stunde.',x:'Die Dauer beträgt '+dm+' min.'})},
 function(){var a=rnd(4,16),b=rnd(3,12);return q({p:'Rechteck: a = '+a+' cm, b = '+b+' cm. Berechne den Flächeninhalt.',v:rectSvg(a,b,a+' cm',b+' cm'),a:a*b,unit:'cm²',h:'A = a · b.',x:'A = '+a+' · '+b+' = '+(a*b)+' cm².'})},
 function(){var a=rnd(4,16),b=rnd(3,12);return q({p:'Rechteck: a = '+a+' cm, b = '+b+' cm. Berechne den Umfang.',v:rectSvg(a,b,a+' cm',b+' cm'),a:2*(a+b),unit:'cm',h:'U = 2 · a + 2 · b.',x:'U = 2 · ('+a+' + '+b+') = '+(2*(a+b))+' cm.'})},
 function(){var s=rnd(3,15);return q({p:'Quadrat mit der Seitenlänge '+s+' cm. Berechne den Flächeninhalt.',a:s*s,unit:'cm²',h:'A = a · a.',x:'A = '+s+' · '+s+' = '+(s*s)+' cm².'})},
 function(){var s=rnd(3,18);return q({p:'Quadrat mit der Seitenlänge '+s+' cm. Berechne den Umfang.',a:4*s,unit:'cm',h:'U = 4 · a.',x:'U = 4 · '+s+' = '+(4*s)+' cm.'})},
 function(){var a=rnd(3,12),b=rnd(4,14),c=rnd(5,16);return q({p:'Dreieck mit den Seiten '+a+' cm, '+b+' cm und '+c+' cm. Berechne den Umfang.',a:a+b+c,unit:'cm',h:'Alle drei Seiten addieren.',x:'U = '+a+' + '+b+' + '+c+' = '+(a+b+c)+' cm.'})},
 function(){var a=rnd(2,8),b=rnd(2,7),c=rnd(2,6);return q({p:'Quader: '+a+' cm × '+b+' cm × '+c+' cm. Berechne das Volumen.',a:a*b*c,unit:'cm³',h:'V = Länge · Breite · Höhe.',x:'V = '+a+' · '+b+' · '+c+' = '+(a*b*c)+' cm³.'})},
 function(){var a=rnd(2,7),b=rnd(2,7),c=rnd(2,6),o=2*(a*b+a*c+b*c);return q({p:'Quader mit den Kanten '+a+' cm, '+b+' cm und '+c+' cm. Berechne die Oberfläche.',a:o,unit:'cm²',h:'Je zwei gegenüberliegende Flächen sind gleich groß.',x:'O = 2 · ('+(a*b)+' + '+(a*c)+' + '+(b*c)+') = '+o+' cm².'})},
 function(){var s=rnd(2,9);return q({p:'Würfel mit der Kantenlänge '+s+' cm. Berechne das Volumen.',a:s*s*s,unit:'cm³',h:'V = a · a · a.',x:'V = '+s+'³ = '+(s*s*s)+' cm³.'})},
 function(){var s=rnd(2,9);return q({p:'Würfel mit der Kantenlänge '+s+' cm. Berechne die Oberfläche.',a:6*s*s,unit:'cm²',h:'Ein Würfel hat 6 gleich große Quadratflächen.',x:'O = 6 · '+s+'² = '+(6*s*s)+' cm².'})},
 function(){var a=rnd(6,12),b=rnd(4,9),c=rnd(2,4),d=rnd(2,4);return q({p:'Eine L-förmige Fläche besteht aus einem Rechteck '+a+' m × '+b+' m, aus dem eine Ecke von '+c+' m × '+d+' m ausgeschnitten ist. Wie groß ist die Fläche?',a:a*b-c*d,unit:'m²',h:'Große Fläche minus ausgeschnittene Fläche.',x:(a*b)+' m² − '+(c*d)+' m² = '+(a*b-c*d)+' m².'})},
 function(){var dm=pick([2,3,5,7.5,12]);return q({p:'Wie viele Liter sind '+fmt(dm)+' dm³?',a:dm,unit:'l',h:'1 dm³ = 1 l.',x:fmt(dm)+' dm³ = '+fmt(dm)+' l.'})},
 function(){var n=pick([2,3,4,5]),pr=pick([1.2,2.4,3.5,4.8]);return q({p:n+' kg Äpfel kosten '+fmt(n*pr)+' €. Was kostet 1 kg?',a:pr,unit:'€',h:'Gesamtpreis durch die Masse teilen.',x:fmt(n*pr)+' € : '+n+' = '+fmt(pr)+' €.'})}
],e:[
 function(){var g=rnd(4,16),h=rnd(3,12);return q({p:'Dreieck: g = '+g+' cm, h = '+h+' cm. Berechne den Flächeninhalt.',a:g*h/2,unit:'cm²',h:'A = g · h : 2.',x:'A = '+g+' · '+h+' : 2 = '+fmt(g*h/2)+' cm².'})},
 function(){var g=rnd(4,14),h=rnd(3,11);return q({p:'Parallelogramm: g = '+g+' cm, h = '+h+' cm. Berechne den Flächeninhalt.',a:g*h,unit:'cm²',h:'A = g · h (Höhe senkrecht zur Grundseite).',x:'A = '+g+' · '+h+' = '+(g*h)+' cm².'})},
 function(){var cm=rnd(2,9),scale=pick([50,100,200,500]);return q({p:'Maßstab 1 : '+scale+'. Auf dem Plan sind es '+cm+' cm. Wie viele Meter sind es in Wirklichkeit?',a:cm*scale/100,unit:'m',h:'Planlänge · Maßstabszahl, dann cm in m umrechnen.',x:cm+' cm · '+scale+' = '+(cm*scale)+' cm = '+fmt(cm*scale/100)+' m.'})},
 function(){var m=pick([4,10,15,25,50]),scale=pick([100,200,500]);return q({p:'Maßstab 1 : '+scale+'. In Wirklichkeit sind es '+m+' m. Wie lang ist die Strecke auf dem Plan?',a:m*100/scale,unit:'cm',h:'Wirklichkeit in cm umrechnen und durch die Maßstabszahl teilen.',x:(m*100)+' cm : '+scale+' = '+fmt(m*100/scale)+' cm.'})},
 function(){var km=pick([12,18,24,30,36]),h=pick([0.5,1.5,2,3]);return q({p:'Eine Strecke von '+km+' km wird in '+fmt(h)+' h zurückgelegt. Wie groß ist die Durchschnittsgeschwindigkeit?',a:km/h,unit:'km/h',h:'v = Strecke : Zeit.',x:km+' km : '+fmt(h)+' h = '+fmt(km/h)+' km/h.'})},
 function(){var v=pick([40,60,80,90]),h=pick([0.5,1.5,2,2.5]);return q({p:'Ein Auto fährt mit '+v+' km/h. Wie lange braucht es für '+fmt(v*h)+' km?',a:h,unit:'h',h:'Zeit = Strecke : Geschwindigkeit.',x:fmt(v*h)+' km : '+v+' km/h = '+fmt(h)+' h.'})},
 function(){var a=rnd(4,15),b=rnd(3,12);return q({p:'Ein Rechteck hat den Flächeninhalt '+(a*b)+' cm² und die Seite a = '+a+' cm. Wie lang ist die Seite b?',a:b,unit:'cm',h:'b = A : a.',x:(a*b)+' cm² : '+a+' cm = '+b+' cm.'})},
 function(){var u=pick([16,24,32,40,52]);return q({p:'Ein Quadrat hat den Umfang '+u+' cm. Wie lang ist eine Seite?',a:u/4,unit:'cm',h:'U = 4 · a.',x:u+' cm : 4 = '+fmt(u/4)+' cm.'})},
 function(){var a=rnd(2,8),b=rnd(2,7),c=rnd(2,9);return q({p:'Ein Quader hat das Volumen '+(a*b*c)+' cm³, die Grundfläche misst '+a+' cm × '+b+' cm. Wie hoch ist er?',a:c,unit:'cm',h:'h = V : (a · b).',x:(a*b*c)+' cm³ : '+(a*b)+' cm² = '+c+' cm.'})},
 function(){var m=pick([2,3,4.5,7,10]);return q({p:'Wandle '+fmt(m)+' m² in Quadratzentimeter um.',a:m*10000,unit:'cm²',h:'1 m² = 10 000 cm².',x:fmt(m)+' m² = '+fmt(m*10000)+' cm².'})}
],x:[
 function(){var r=rnd(2,8);return q({p:'Zusatz: Ein Kreis hat den Radius '+r+' cm. Berechne den Umfang mit π ≈ 3,14.',a:2*3.14*r,unit:'cm',dec:2,h:'U = 2 · π · r.',x:'U ≈ 2 · 3,14 · '+r+' = '+fmt(2*3.14*r)+' cm.'})},
 function(){var r=rnd(2,7);return q({p:'Zusatz: Ein Kreis hat den Radius '+r+' cm. Berechne den Flächeninhalt mit π ≈ 3,14.',a:3.14*r*r,unit:'cm²',dec:2,h:'A = π · r².',x:'A ≈ 3,14 · '+(r*r)+' = '+fmt(3.14*r*r)+' cm².'})},
 function(){var z=pick([[3,4,5],[6,8,10],[5,12,13],[9,12,15]]);return q({p:'Zusatz: Rechtwinkliges Dreieck mit den Katheten '+z[0]+' cm und '+z[1]+' cm. Wie lang ist die Hypotenuse?',a:z[2],unit:'cm',h:'a² + b² = c².',x:z[0]+'² + '+z[1]+'² = '+(z[0]*z[0]+z[1]*z[1])+', also c = '+z[2]+' cm.'})},
 function(){var z=pick([[3,4,5],[6,8,10],[5,12,13],[8,15,17]]);return q({p:'Zusatz: Rechtwinkliges Dreieck mit der Hypotenuse '+z[2]+' cm und einer Kathete '+z[0]+' cm. Wie lang ist die andere Kathete?',a:z[1],unit:'cm',h:'b² = c² − a².',x:z[2]+'² − '+z[0]+'² = '+(z[1]*z[1])+', also b = '+z[1]+' cm.'})},
 function(){var g=rnd(6,20),h=rnd(3,12);return q({p:'Zusatz: Ein Prisma hat die Grundfläche '+g+' cm² und die Höhe '+h+' cm. Berechne das Volumen.',a:g*h,unit:'cm³',h:'V = Grundfläche · Höhe.',x:'V = '+g+' · '+h+' = '+(g*h)+' cm³.'})}
]};

POOL.geometry={d:[
 function(){var a=rnd(25,75);return q({p:'Ein Nebenwinkel misst '+a+'°. Wie groß ist der andere?',v:angleSvg(a),a:180-a,unit:'°',h:'Nebenwinkel ergänzen sich zu 180°.',x:'180° − '+a+'° = '+(180-a)+'°.'})},
 function(){var a=rnd(30,140);return q({p:'Zwei Geraden schneiden sich. Ein Winkel misst '+a+'°. Wie groß ist sein Scheitelwinkel?',a:a,unit:'°',h:'Scheitelwinkel sind gleich groß.',x:'Der Scheitelwinkel misst ebenfalls '+a+'°.'})},
 function(){var a=rnd(15,75);return q({p:'Zwei Winkel ergänzen sich zu 90°. Einer misst '+a+'°. Wie groß ist der andere?',a:90-a,unit:'°',h:'90° − gegebener Winkel.',x:'90° − '+a+'° = '+(90-a)+'°.'})},
 function(){var a=rnd(35,70),b=rnd(35,70);return q({p:'In einem Dreieck sind zwei Winkel '+a+'° und '+b+'° groß. Wie groß ist der dritte Winkel?',a:180-a-b,unit:'°',h:'Die Innenwinkelsumme im Dreieck beträgt 180°.',x:'180° − '+a+'° − '+b+'° = '+(180-a-b)+'°.'})},
 function(){var a=rnd(60,120),b=rnd(50,110),c=rnd(60,100);return q({p:'In einem Viereck sind drei Winkel '+a+'°, '+b+'° und '+c+'° groß. Wie groß ist der vierte Winkel?',a:360-a-b-c,unit:'°',h:'Die Innenwinkelsumme im Viereck beträgt 360°.',x:'360° − '+a+'° − '+b+'° − '+c+'° = '+(360-a-b-c)+'°.'})},
 function(){var s=pick([20,30,40,50,70,80]);return q({p:'Ein gleichschenkliges Dreieck hat den Spitzenwinkel '+s+'°. Wie groß ist ein Basiswinkel?',a:(180-s)/2,unit:'°',h:'Beide Basiswinkel sind gleich groß.',x:'(180° − '+s+'°) : 2 = '+fmt((180-s)/2)+'°.'})},
 function(){return q({p:'Wie groß ist jeder Innenwinkel in einem gleichseitigen Dreieck?',a:60,unit:'°',h:'Alle drei Winkel sind gleich groß.',x:'180° : 3 = 60°.'})},
 function(){return mc({p:'Welche Aussage beschreibt kongruente Figuren?',options:['Sie sind deckungsgleich.','Sie haben nur denselben Umfang.','Sie sind immer unterschiedlich groß.','Sie sind nur achsensymmetrisch.'],a:'Sie sind deckungsgleich.',h:'Denke an Verschieben, Drehen und Spiegeln.',x:'Kongruente Figuren lassen sich zur Deckung bringen.'})},
 function(){return mc({p:'Welches Dreieck hat drei gleich lange Seiten?',options:['gleichseitiges Dreieck','gleichschenkliges Dreieck','rechtwinkliges Dreieck','stumpfwinkliges Dreieck'],a:'gleichseitiges Dreieck',h:'Der Name beschreibt die Seiten.',x:'Beim gleichseitigen Dreieck sind alle drei Seiten gleich lang.'})},
 function(){var x=rnd(1,8),y=rnd(1,8);if(y===x)y=x%8+1;return mc({p:'Wie werden die Koordinaten x = '+x+' und y = '+y+' geschrieben?',options:['('+x+' | '+y+')','('+y+' | '+x+')','(−'+x+' | '+y+')','('+x+' | −'+y+')'],a:'('+x+' | '+y+')',h:'Immer zuerst x, dann y.',x:'Richtig ist ('+x+' | '+y+').'})},
 function(){var x=rnd(1,7),y=rnd(1,7);return tq({p:'Spiegle den Punkt P('+x+' | '+y+') an der x-Achse. Gib den Bildpunkt in der Form (x|y) ein.',a:'('+x+'|'+(-y)+')',alt:[x+'|'+(-y),'('+x+' | '+(-y)+')'],ph:'(3|-5)',kb:'num',h:'Beim Spiegeln an der x-Achse wechselt nur das Vorzeichen von y.',x:'Der Bildpunkt ist ('+x+' | '+(-y)+').'})},
 function(){var a=pick([35,55,80,110,125,145]),name=a<90?'spitzer Winkel':'stumpfer Winkel';return mc({p:'Welche Winkelart hat ein Winkel von '+a+'°?',options:['spitzer Winkel','rechter Winkel','stumpfer Winkel','gestreckter Winkel'],a:name,h:'Vergleiche mit 90° und 180°.',x:a+'° ist ein '+name+'.'})},
 function(){return q({p:'Wie viele Symmetrieachsen hat ein Quadrat?',a:4,h:'Zwei durch die Seitenmitten, zwei durch die Ecken.',x:'Ein Quadrat hat 4 Symmetrieachsen.'})},
 function(){return q({p:'Wie viele Kanten hat ein Würfel?',a:12,h:'Oben 4, unten 4 und 4 senkrechte Kanten.',x:'Ein Würfel hat 12 Kanten.'})},
 function(){return mc({p:'Wie viele Flächen hat ein Quader?',options:['6','8','12','4'],a:'6',h:'Denke an eine Schachtel.',x:'Ein Quader wird von 6 Rechtecken begrenzt.'})},
 function(){return mc({p:'Welche Figur hat genau zwei Symmetrieachsen?',options:['Rechteck (keine Quadratform)','gleichseitiges Dreieck','Quadrat','beliebiges Parallelogramm'],a:'Rechteck (keine Quadratform)',h:'Zeichne die Achsen gedanklich ein.',x:'Ein Rechteck hat zwei Symmetrieachsen durch die Seitenmitten.'})}
],e:[
 function(){var x=rnd(-6,-1),y=rnd(1,6);return mc({p:'In welchem Quadranten liegt der Punkt P('+x+' | '+y+')?',options:['I','II','III','IV'],a:'II',h:'x ist negativ, y ist positiv.',x:'Der Punkt liegt im II. Quadranten.'})},
 function(){return mc({p:'Was bleibt bei ähnlichen Figuren gleich?',options:['entsprechende Winkel','alle Seitenlängen','der Flächeninhalt','der Umfang'],a:'entsprechende Winkel',h:'Ähnlich bedeutet gleiche Form.',x:'Entsprechende Winkel sind gleich; die Längen ändern sich im gleichen Verhältnis.'})},
 function(){var a=rnd(25,70);return q({p:'An zwei parallelen Geraden ist ein Stufenwinkel '+a+'° groß. Wie groß ist der zugehörige Stufenwinkel?',a:a,unit:'°',h:'Stufenwinkel an Parallelen sind gleich groß.',x:'Er misst ebenfalls '+a+'°.'})},
 function(){var a=rnd(30,80);return q({p:'An zwei parallelen Geraden misst ein Winkel '+a+'°. Wie groß ist der Wechselwinkel?',a:a,unit:'°',h:'Wechselwinkel an Parallelen sind gleich groß.',x:'Der Wechselwinkel misst ebenfalls '+a+'°.'})},
 function(){var n=pick([5,6,8,10]);return q({p:'Wie groß ist die Innenwinkelsumme in einem '+n+'-Eck?',a:(n-2)*180,unit:'°',h:'Summe = (n − 2) · 180°.',x:'('+n+' − 2) · 180° = '+((n-2)*180)+'°.'})},
 function(){var x=rnd(1,7),y=rnd(1,7);return tq({p:'Spiegle den Punkt P('+x+' | '+y+') am Koordinatenursprung. Gib den Bildpunkt in der Form (x|y) ein.',a:'('+(-x)+'|'+(-y)+')',alt:[(-x)+'|'+(-y),'('+(-x)+' | '+(-y)+')'],ph:'(-3|-5)',kb:'num',h:'Beide Koordinaten wechseln das Vorzeichen.',x:'Der Bildpunkt ist ('+(-x)+' | '+(-y)+').'})},
 function(){var a=rnd(2,6),k=pick([2,3,4]);return q({p:'Ein Dreieck wird mit dem Faktor '+k+' vergrößert. Eine Seite war '+a+' cm lang. Wie lang ist sie danach?',a:a*k,unit:'cm',h:'Alle Längen werden mit dem Streckfaktor multipliziert.',x:a+' cm · '+k+' = '+(a*k)+' cm.'})},
 function(){return mc({p:'Was gilt für jeden Punkt der Mittelsenkrechten einer Strecke AB?',options:['Er hat von A und B denselben Abstand.','Er liegt immer auf der Strecke AB.','Er hat von A einen doppelt so großen Abstand wie von B.','Er liegt immer außerhalb des Dreiecks.'],a:'Er hat von A und B denselben Abstand.',h:'Denke an die Konstruktion mit dem Zirkel.',x:'Die Mittelsenkrechte ist die Menge aller Punkte mit gleichem Abstand zu A und B.'})}
],x:[
 function(){return mc({p:'Zusatz: Wofür steht der Kongruenzsatz SSS?',options:['drei Seiten','drei Winkel','Seite-Winkel-Seite in beliebiger Lage','nur gleicher Umfang'],a:'drei Seiten',h:'S steht für Seite.',x:'SSS: Drei entsprechende Seiten legen ein Dreieck eindeutig fest.'})},
 function(){return q({p:'Zusatz: Wie groß ist ein Innenwinkel in einem regelmäßigen Sechseck?',a:120,unit:'°',h:'Innenwinkelsumme (6 − 2) · 180° gleichmäßig verteilen.',x:'720° : 6 = 120°.'})},
 function(){return mc({p:'Zusatz: Welcher Kongruenzsatz passt, wenn zwei Seiten und der eingeschlossene Winkel gegeben sind?',options:['SWS','SSS','WWW','SSW mit kleinerer Seite'],a:'SWS',h:'Der Winkel liegt zwischen den beiden Seiten.',x:'Zwei Seiten mit eingeschlossenem Winkel: Kongruenzsatz SWS.'})}
]};

POOL.algebra={d:[
 function(){var a=rnd(3,18),x=rnd(2,12);return q({p:'Löse die Gleichung: x + '+a+' = '+(x+a)+'.',a:x,h:'Ziehe auf beiden Seiten '+a+' ab.',x:'x = '+(x+a)+' − '+a+' = '+x+'.'})},
 function(){var a=rnd(3,15),x=rnd(4,20);return q({p:'Löse die Gleichung: x − '+a+' = '+(x-a)+'.',a:x,h:'Addiere auf beiden Seiten '+a+'.',x:'x = '+(x-a)+' + '+a+' = '+x+'.'})},
 function(){var a=rnd(2,10),x=rnd(2,12);return q({p:'Löse die Gleichung: '+a+' · x = '+(a*x)+'.',a:x,h:'Teile beide Seiten durch '+a+'.',x:'x = '+(a*x)+' : '+a+' = '+x+'.'})},
 function(){var a=rnd(2,8),x=rnd(2,12);return q({p:'Löse die Gleichung: x : '+a+' = '+x+'.',a:a*x,h:'Multipliziere beide Seiten mit '+a+'.',x:'x = '+x+' · '+a+' = '+(a*x)+'.'})},
 function(){var x=rnd(2,11),b=rnd(2,8);return q({p:'Berechne den Wert von 3x + '+b+' für x = '+x+'.',a:3*x+b,h:'Setze '+x+' für x ein.',x:'3 · '+x+' + '+b+' = '+(3*x+b)+'.'})},
 function(){var x=rnd(3,12),b=rnd(2,9);return q({p:'Berechne den Wert von 2x − '+b+' für x = '+x+'.',a:2*x-b,h:'Erst multiplizieren, dann subtrahieren.',x:'2 · '+x+' − '+b+' = '+(2*x-b)+'.'})},
 function(){var a=rnd(2,7),b=rnd(2,7);return tq({p:'Fasse zusammen: '+a+'x + '+b+'x',a:(a+b)+'x',alt:['x·'+(a+b),(a+b)+'*x'],ph:'z. B. 7x',kb:'num',h:'Gleichartige Glieder werden addiert.',x:a+'x + '+b+'x = '+(a+b)+'x.'})},
 function(){var a=rnd(5,12),b=rnd(2,4);return tq({p:'Fasse zusammen: '+a+'x − '+b+'x',a:(a-b)+'x',alt:['x·'+(a-b),(a-b)+'*x'],ph:'z. B. 5x',kb:'num',h:'Nur die Zahlen vor dem x werden verrechnet.',x:a+'x − '+b+'x = '+(a-b)+'x.'})},
 function(){var a=rnd(2,6),b=rnd(2,6);return tq({p:'Fasse zusammen: '+a+'a + '+b+'a + 3b',a:(a+b)+'a+3b',alt:['3b+'+(a+b)+'a'],ph:'z. B. 5a+3b',kb:'abc',h:'Nur gleichartige Glieder dürfen zusammengefasst werden.',x:a+'a + '+b+'a + 3b = '+(a+b)+'a + 3b.'})},
 function(){var b=rnd(3,9);return mc({p:'Welcher Term beschreibt „eine Zahl x wird um '+b+' vergrößert“?',options:['x + '+b,'x − '+b,b+' · x','x : '+b],a:'x + '+b,h:'Vergrößern bedeutet addieren.',x:'„um '+b+' vergrößert“ heißt x + '+b+'.'})},
 function(){var n=rnd(2,6),pr=rnd(2,8);return q({p:n+' Hefte kosten '+(n*pr)+' €. Was kosten '+(n+2)+' Hefte?',a:(n+2)*pr,unit:'€',h:'Bestimme zuerst den Preis für ein Heft.',x:'Ein Heft kostet '+pr+' €, also '+(n+2)+' · '+pr+' € = '+((n+2)*pr)+' €.'})},
 function(){var a=rnd(2,6),b=rnd(10,30),c=rnd(2,5);return q({p:'Direkte Zuordnung: '+a+' Stück kosten '+b+' €. Was kosten '+(a*c)+' Stück?',a:b*c,unit:'€',h:'Die Stückzahl wird mit '+c+' multipliziert – der Preis ebenfalls.',x:b+' € · '+c+' = '+(b*c)+' €.'})},
 function(){var k=pick([3,4,5,6,8]),x=rnd(2,9);return q({p:'Bei einer proportionalen Zuordnung gehört zu x = '+x+' der Wert y = '+(k*x)+'. Wie groß ist der Proportionalitätsfaktor?',a:k,h:'Faktor = y : x.',x:(k*x)+' : '+x+' = '+k+'.'})},
 function(){var s=pick([3,4,5,6]);return mc({p:'Welcher Term beschreibt den Umfang eines Quadrats mit der Seitenlänge a?',options:['4a','a + 4','a²','2a'],a:'4a',h:'Vier gleich lange Seiten.',x:'U = 4 · a.'})}
],e:[
 function(){var x=rnd(-4,9),a=rnd(2,7),b=rnd(-7,7),c=a*x+b;return q({p:'Löse die Gleichung: '+a+'x '+(b>=0?'+ ':'− ')+Math.abs(b)+' = '+c+'.',a:x,h:'Erst die Addition rückgängig machen, dann teilen.',x:a+'x = '+(c-b)+', also x = '+x+'.'})},
 function(){var a=rnd(2,7),x=rnd(2,10),b=rnd(2,8),c=a*x-b;return q({p:'Welche Zahl x erfüllt '+a+'x − '+b+' = '+c+'?',a:x,h:'Addiere zuerst '+b+', dann teile durch '+a+'.',x:a+'x = '+(c+b)+', also x = '+x+'.'})},
 function(){var x=rnd(2,9),a=rnd(3,8),c=rnd(1,2),b=rnd(2,9),d=(a-c)*x+b;return q({p:'Löse die Gleichung: '+a+'x + '+b+' = '+c+'x + '+d+'.',a:x,h:'Bringe die x zuerst auf eine Seite.',x:(a-c)+'x = '+(d-b)+', also x = '+x+'.'})},
 function(){var a=pick([2,3,4,5]),k=rnd(2,9),x=a*k,b=rnd(2,8);return q({p:'Löse die Gleichung: x : '+a+' + '+b+' = '+(k+b)+'.',a:x,h:'Erst '+b+' abziehen, dann mit '+a+' multiplizieren.',x:'x : '+a+' = '+k+', also x = '+x+'.'})},
 function(){var a=rnd(2,6),b=rnd(2,8);return tq({p:'Multipliziere aus: '+a+'(x + '+b+')',a:(a*b)===0?'0':a+'x+'+(a*b),alt:[(a*b)+'+'+a+'x'],ph:'z. B. 3x+6',kb:'num',h:'Jedes Glied in der Klammer wird mit '+a+' multipliziert.',x:a+'(x + '+b+') = '+a+'x + '+(a*b)+'.'})},
 function(){var a=rnd(2,5),b=rnd(2,7);return tq({p:'Multipliziere aus: '+a+'(2x − '+b+')',a:(2*a)+'x-'+(a*b),alt:['-'+(a*b)+'+'+(2*a)+'x'],ph:'z. B. 6x-9',kb:'num',h:'Beide Glieder mit '+a+' multiplizieren, Vorzeichen beachten.',x:a+'(2x − '+b+') = '+(2*a)+'x − '+(a*b)+'.'})},
 function(){var p=pick([2,3,4]),h=pick([6,8,10,12]);return q({p:p+' Personen brauchen für eine Arbeit '+h+' h. Wie lange brauchen '+(2*p)+' gleich schnelle Personen?',a:h/2,unit:'h',h:'Indirekte Proportionalität: doppelt so viele → halb so lange.',x:h+' h : 2 = '+fmt(h/2)+' h.'})},
 function(){var n=pick([4,6,8]),d=pick([12,15,18,24]);return q({p:'Ein Vorrat reicht für '+n+' Tiere '+d+' Tage. Wie viele Tage reicht er für '+(n/2)+' Tiere?',a:d*2,unit:'Tage',h:'Halb so viele Tiere → doppelt so lange.',x:d+' Tage · 2 = '+(d*2)+' Tage.'})},
 function(){return mc({p:'Welche Zuordnung ist direkt proportional?',options:['Masse Äpfel → Preis bei festem Kilopreis','Anzahl der Arbeiter → Zeit für dieselbe Arbeit','Alter → Körpergröße','Uhrzeit → Temperatur'],a:'Masse Äpfel → Preis bei festem Kilopreis',h:'Verdoppeln der einen Größe verdoppelt die andere.',x:'Bei festem Kilopreis ist der Preis direkt proportional zur Masse.'})}
],x:[
 function(){var a=rnd(2,5),b=rnd(1,5),x=rnd(2,8);return q({p:'Zusatz: Löse '+a+'(x + '+b+') = '+(a*(x+b))+'.',a:x,h:'Zuerst durch den Faktor vor der Klammer teilen.',x:'x + '+b+' = '+(x+b)+', also x = '+x+'.'})},
 function(){var a=pick([2,3,4,5]),b=pick([2,3,4]);return mc({p:'Zusatz: Klammere aus: '+(a*1)+'x + '+(a*b),options:[a+'(x + '+b+')',a+'(x + '+(a*b)+')','x('+a+' + '+b+')',(a*b)+'(x + '+a+')'],a:a+'(x + '+b+')',h:'Suche den gemeinsamen Faktor.',x:a+'x + '+(a*b)+' = '+a+'(x + '+b+').'})}
]};

POOL.data={d:[
 function(){var v=[rnd(2,12),rnd(2,12),rnd(2,12),rnd(2,12),rnd(2,12)];return q({p:'Lies das Säulendiagramm ab: Wie groß ist der höchste Wert?',v:bars(v,['A','B','C','D','E']),a:Math.max.apply(null,v),h:'Suche die höchste Säule.',x:'Der höchste Wert ist '+Math.max.apply(null,v)+'.'})},
 function(){var v=[rnd(2,12),rnd(2,12),rnd(2,12),rnd(2,12),rnd(2,12)];return q({p:'Lies das Säulendiagramm ab: Wie groß ist die Summe aller Werte?',v:bars(v,['A','B','C','D','E']),a:sum(v),h:'Alle abgelesenen Werte addieren.',x:v.join(' + ')+' = '+sum(v)+'.'})},
 function(){var v=[rnd(3,14),rnd(3,14),rnd(3,14),rnd(3,14),rnd(3,14)],mi=Math.min.apply(null,v),ma=Math.max.apply(null,v);return q({p:'Lies das Säulendiagramm ab: Wie groß ist der Unterschied zwischen höchstem und niedrigstem Wert?',v:bars(v,['A','B','C','D','E']),a:ma-mi,h:'Höchster Wert minus niedrigster Wert.',x:ma+' − '+mi+' = '+(ma-mi)+'.'})},
 function(){var v=[rnd(4,22),rnd(4,22),rnd(4,22),rnd(4,22),rnd(4,22),rnd(4,22)],mi=Math.min.apply(null,v),ma=Math.max.apply(null,v);return q({p:'Messwerte: '+v.join(', ')+'. Bestimme die Spannweite.',a:ma-mi,h:'Spannweite = Maximum − Minimum.',x:ma+' − '+mi+' = '+(ma-mi)+'.'})},
 function(){var b=rnd(2,9),v=[b,b+2,b+4,b+6,b+8];return q({p:'Bestimme das arithmetische Mittel von '+v.join(', ')+'.',a:sum(v)/5,h:'Summe durch Anzahl teilen.',x:sum(v)+' : 5 = '+fmt(sum(v)/5)+'.'})},
 function(){var m=rnd(2,9),v=shuffle([m,m,m,m+rnd(1,4),m+rnd(5,8),m-1]);return q({p:'Bestimme den Modalwert von '+v.join(', ')+'.',a:m,h:'Der Modalwert kommt am häufigsten vor.',x:'Der Wert '+m+' kommt am häufigsten vor.'})},
 function(){var n=rnd(1,5);return q({p:'Bei einem fairen Würfel sind '+n+' von 6 Ergebnissen günstig. Wie groß ist die Wahrscheinlichkeit? Gib einen Bruch ein.',a:n/6,ph:'z. B. 1/6',h:'P = günstige : mögliche Ergebnisse.',x:'P = '+n+'/6 = '+frac(n,6)+'.'})},
 function(){var r=rnd(2,6),b=rnd(2,6),g=rnd(1,4),t=r+b+g;return q({p:'In einer Urne liegen '+r+' rote, '+b+' blaue und '+g+' grüne Kugeln. Wie groß ist die Wahrscheinlichkeit für Rot? Gib einen Bruch ein.',a:r/t,ph:'z. B. 3/10',h:'Günstige Kugeln durch alle Kugeln.',x:'P(rot) = '+r+'/'+t+' = '+frac(r,t)+'.'})},
 function(){var a=rnd(2,5),b=rnd(2,5);return q({p:a+' T-Shirts werden mit '+b+' Hosen kombiniert. Wie viele verschiedene Kombinationen gibt es?',a:a*b,h:'Jedes Oberteil lässt sich mit jeder Hose kombinieren.',x:a+' · '+b+' = '+(a*b)+'.'})},
 function(){var a=rnd(2,4),b=rnd(2,3),c=rnd(2,3);return q({p:'Ein Menü besteht aus '+a+' Vorspeisen, '+b+' Hauptgerichten und '+c+' Nachspeisen. Wie viele Menüs sind möglich?',a:a*b*c,h:'Alle Möglichkeiten multiplizieren.',x:a+' · '+b+' · '+c+' = '+(a*b*c)+'.'})},
 function(){return mc({p:'Welches Ereignis ist beim einmaligen Würfeln mit einem Würfel unmöglich?',options:['eine 7 würfeln','eine 6 würfeln','eine gerade Zahl würfeln','eine Zahl kleiner als 4 würfeln'],a:'eine 7 würfeln',h:'Welche Augenzahlen gibt es überhaupt?',x:'Ein Würfel zeigt nur die Zahlen 1 bis 6 – eine 7 ist unmöglich.'})},
 function(){var s=[rnd(3,9),rnd(3,9),rnd(3,9),rnd(3,9)];return q({p:'Eine Strichliste ergibt: Montag '+s[0]+', Dienstag '+s[1]+', Mittwoch '+s[2]+', Donnerstag '+s[3]+'. Wie viele Eintragungen sind es insgesamt?',a:sum(s),h:'Alle absoluten Häufigkeiten addieren.',x:s.join(' + ')+' = '+sum(s)+'.'})}
],e:[
 function(){var base=[4,6,8,10,12],z=pick([0,1,2]),v=base.map(function(x){return x+z});return q({p:'Bestimme das arithmetische Mittel von '+v.join(', ')+'.',a:sum(v)/5,h:'Summe durch Anzahl.',x:sum(v)+' : 5 = '+fmt(sum(v)/5)+'.'})},
 function(){var v=shuffle([2,4,4,5,7,8,10]);return q({p:'Bestimme den Median von '+v.join(', ')+'.',a:5,h:'Sortiere die Werte zuerst der Größe nach.',x:'Sortiert: 2, 4, 4, 5, 7, 8, 10 → der mittlere Wert ist 5.'})},
 function(){var a=rnd(2,6),b=a+rnd(1,3),c=b+rnd(1,3),d=c+rnd(1,3),v=shuffle([a,b,c,d]);return q({p:'Bestimme den Median von '+v.join(', ')+'.',a:(b+c)/2,h:'Bei gerader Anzahl: Mittelwert der beiden mittleren Werte.',x:'Sortiert: '+[a,b,c,d].join(', ')+' → ('+b+' + '+c+') : 2 = '+fmt((b+c)/2)+'.'})},
 function(){var n=pick([5,10,15,20,25,30,40]);return q({p:'Von 50 Versuchen waren '+n+' Treffer. Wie groß ist die relative Häufigkeit in Prozent?',a:n/50*100,unit:'%',h:'Treffer : Versuche · 100.',x:n+' : 50 · 100 = '+fmt(n/50*100)+' %.'})},
 function(){var p=pick([15,20,25,30,40,60]);return q({p:'Die Wahrscheinlichkeit für ein Ereignis beträgt '+p+' %. Wie groß ist die Wahrscheinlichkeit des Gegenereignisses?',a:100-p,unit:'%',h:'Beide Wahrscheinlichkeiten ergeben zusammen 100 %.',x:'100 % − '+p+' % = '+(100-p)+' %.'})},
 function(){var v=[rnd(3,9),rnd(3,9),rnd(3,9)],m=pick([5,6,7,8]),miss=4*m-sum(v);if(miss<1){miss=1;m=(sum(v)+1)/4}return q({p:'Vier Messwerte haben das Mittel '+fmt(m)+'. Drei davon sind '+v.join(', ')+'. Wie groß ist der vierte Wert?',a:miss,h:'Gesamtsumme = Mittelwert · Anzahl.',x:'Summe: '+fmt(4*m)+', davon '+sum(v)+' bekannt → '+fmt(miss)+'.'})},
 function(){var t=pick([20,25,40,50]),n=rnd(3,t-3);return q({p:'In einer Klasse mit '+t+' Kindern haben '+n+' ein Haustier. Wie groß ist die relative Häufigkeit in Prozent?',a:n/t*100,unit:'%',dec:2,h:'Anteil · 100.',x:n+' : '+t+' · 100 = '+fmt(n/t*100)+' %.'})},
 function(){return mc({p:'Welcher Kennwert bezeichnet den häufigsten Wert einer Datenreihe?',options:['Modalwert','Median','Spannweite','arithmetisches Mittel'],a:'Modalwert',h:'„Modus“ bedeutet: am häufigsten vorkommend.',x:'Der Modalwert ist der am häufigsten auftretende Wert.'})}
],x:[
 function(){var p=pick([20,25,30,40]);return q({p:'Zusatz: Welchem Mittelpunktswinkel entsprechen '+p+' % in einem Kreisdiagramm?',a:360*p/100,unit:'°',h:'100 % entsprechen 360°.',x:'360° · '+p+' : 100 = '+(360*p/100)+'°.'})},
 function(){var w=pick([36,72,90,144,180]);return q({p:'Zusatz: Ein Kreisausschnitt hat den Mittelpunktswinkel '+w+'°. Wie viel Prozent sind das?',a:w/360*100,unit:'%',h:'360° entsprechen 100 %.',x:w+' : 360 · 100 = '+fmt(w/360*100)+' %.'})},
 function(){return q({p:'Zusatz: Eine Münze wird zweimal geworfen. Wie groß ist die Wahrscheinlichkeit für zweimal Kopf? Gib einen Bruch ein.',a:0.25,ph:'z. B. 1/4',h:'Bei zwei Würfen gibt es 4 gleich wahrscheinliche Ergebnisse.',x:'P = 1/2 · 1/2 = 1/4.'})}
]};

POOL.bbr={d:[
 function(){var n=rnd(3,7),pr=pick([2.5,3,3.5,4]);return q({p:'BBR-Stil: '+n+' Tickets kosten je '+fmt(pr)+' €. Wie hoch ist der Gesamtpreis?',a:n*pr,unit:'€',h:'Anzahl · Einzelpreis.',x:n+' · '+fmt(pr)+' € = '+fmt(n*pr)+' €.'})},
 function(){var pr=pick([12.4,17.5,23.8,31.2]),geg=pick([20,50]);if(geg<pr)geg=50;return q({p:'BBR-Stil: Ein Einkauf kostet '+fmt(pr)+' €. Bezahlt wird mit '+geg+' €. Wie viel Rückgeld gibt es?',a:geg-pr,unit:'€',h:'Bezahlter Betrag minus Rechnungsbetrag.',x:geg+' € − '+fmt(pr)+' € = '+fmt(geg-pr)+' €.'})},
 function(){var a=rnd(4,9),b=rnd(3,7),pr=pick([6,8,10,12]);return q({p:'BBR-Stil: Ein Raum misst '+a+' m × '+b+' m. Der Bodenbelag kostet '+pr+' € pro m². Wie hoch sind die Materialkosten?',a:a*b*pr,unit:'€',h:'Zuerst die Fläche, dann mit dem Preis pro m² multiplizieren.',x:(a*b)+' m² · '+pr+' € = '+(a*b*pr)+' €.'})},
 function(){var d=pick([4,5]),n=rnd(1,d-1),all=d*pick([15,20,25]);return q({p:'BBR-Stil: Von '+all+' Plätzen sind '+n+'/'+d+' belegt. Wie viele Plätze sind das?',a:all*n/d,h:'Durch '+d+' teilen und mit '+n+' multiplizieren.',x:all+' : '+d+' · '+n+' = '+(all*n/d)+' Plätze.'})},
 function(){var b=pick([6,8,12]),ml=pick([500,750]);return q({p:'BBR-Stil: '+b+' Flaschen enthalten je '+ml+' ml. Wie viele Liter sind das insgesamt?',a:b*ml/1000,unit:'l',h:'Zuerst die Gesamtmenge in ml, dann durch 1000.',x:(b*ml)+' ml = '+fmt(b*ml/1000)+' l.'})},
 function(){var p=rnd(4,8),g=pick([250,300,400]),k=pick([2,3]);return q({p:'BBR-Stil: Ein Rezept für '+p+' Personen braucht '+g+' g Mehl. Wie viel Mehl braucht man für '+(p*k)+' Personen?',a:g*k,unit:'g',h:'Die Personenzahl wird mit '+k+' multipliziert.',x:g+' g · '+k+' = '+(g*k)+' g.'})},
 function(){var kwh=pick([120,180,250,320]),pr=pick([0.3,0.35,0.4]);return q({p:'BBR-Stil: Ein Haushalt verbraucht '+kwh+' kWh. Eine kWh kostet '+fmt(pr)+' €. Wie hoch sind die Stromkosten?',a:kwh*pr,unit:'€',dec:2,h:'Verbrauch · Preis pro kWh.',x:kwh+' · '+fmt(pr)+' € = '+fmt(kwh*pr)+' €.'})},
 function(){var n=pick([20,24,25,30]),ges=n*pick([3,4,5,6]);return q({p:'BBR-Stil: Eine Klasse mit '+n+' Kindern zahlt insgesamt '+ges+' € in die Klassenkasse. Wie viel zahlt jedes Kind?',a:ges/n,unit:'€',h:'Gesamtbetrag durch die Anzahl der Kinder.',x:ges+' € : '+n+' = '+fmt(ges/n)+' €.'})},
 function(){var l=pick([6,8,12]),d=rnd(3,7);return q({p:'BBR-Stil: Eine Familie verbraucht täglich '+l+' l Wasser für Getränke. Wie viel sind das in '+d+' Tagen?',a:l*d,unit:'l',h:'Tagesmenge · Anzahl der Tage.',x:l+' l · '+d+' = '+(l*d)+' l.'})},
 function(){var st=pick([6,8,12]),n=rnd(2,5);return q({p:'BBR-Stil: Eine Pizza ist in '+st+' gleich große Stücke geteilt. '+n+' Stücke werden gegessen. Welcher Anteil ist das? Gib einen Bruch ein.',a:n/st,ph:'z. B. 1/4',h:'Gegessene Stücke durch alle Stücke.',x:n+'/'+st+' = '+frac(n,st)+'.'})},
 function(){var h1=rnd(7,10),m1=pick([12,25,38,47]),dm=pick([35,48,65,80]),tot=h1*60+m1+dm,h2=Math.floor(tot/60),m2=tot%60;
   return q({p:'BBR-Stil: Ein Zug fährt um '+h1+':'+(m1<10?'0':'')+m1+' Uhr ab und kommt um '+h2+':'+(m2<10?'0':'')+m2+' Uhr an. Wie lange dauert die Fahrt in Minuten?',a:dm,unit:'min',h:'Rechne zuerst bis zur vollen Stunde.',x:'Die Fahrt dauert '+dm+' min.'})},
 function(){var a=pick([1.2,1.5,2.4]),b=pick([3,4,5]);return mc({p:'BBR-Stil: Packung A enthält '+b+' Riegel für '+fmt(a*b)+' €, Packung B enthält '+(2*b)+' Riegel für '+fmt(a*2*b-0.5)+' €. Welche Packung ist pro Riegel günstiger?',options:['Packung B','Packung A','beide gleich teuer','das lässt sich nicht berechnen'],a:'Packung B',h:'Berechne jeweils den Preis für einen Riegel.',x:'Packung B kostet pro Riegel '+fmt((a*2*b-0.5)/(2*b))+' €, Packung A '+fmt(a)+' €.'})}
],e:[
 function(){var old=pick([40,60,80,120,160]),p=pick([10,15,20,25]);return q({p:'BBR-Stil: Ein Artikel kostet '+old+' € und wird um '+p+' % reduziert. Wie hoch ist der neue Preis?',a:old*(1-p/100),unit:'€',h:'Rabatt berechnen und vom Preis abziehen.',x:old+' € − '+fmt(old*p/100)+' € = '+fmt(old*(1-p/100))+' €.'})},
 function(){var net=pick([50,80,120,200,250]);return q({p:'BBR-Stil: Ein Gerät kostet netto '+net+' €. Dazu kommen 19 % Mehrwertsteuer. Wie hoch ist der Bruttopreis?',a:net*1.19,unit:'€',dec:2,h:'Bruttopreis = 119 % des Nettopreises.',x:net+' € · 1,19 = '+fmt(net*1.19)+' €.'})},
 function(){var p=pick([4,6,8]),d=pick([2,3,4]);return q({p:'BBR-Stil: '+p+' Helfer benötigen '+d+' Tage. Wie lange brauchen '+(2*p)+' gleich schnelle Helfer?',a:d/2,unit:'Tage',h:'Doppelte Helferzahl → halbe Zeit.',x:d+' Tage : 2 = '+fmt(d/2)+' Tage.'})},
 function(){var v=[8,10,12,14,16],z=pick([-2,0,2]),d=v.map(function(x){return x+z});return q({p:'BBR-Stil: Messwerte '+d.join(', ')+'. Bestimme den Mittelwert.',a:sum(d)/5,h:'Summe durch 5.',x:sum(d)+' : 5 = '+fmt(sum(d)/5)+'.'})},
 function(){var v=pick([10,12,15,20,24,30]),h=pick([0.5,1,1.5,2]),km=v*h;return q({p:'BBR-Stil: Eine Strecke von '+fmt(km)+' km wird in '+fmt(h)+' h gefahren. Wie groß ist die Durchschnittsgeschwindigkeit?',a:v,unit:'km/h',h:'Strecke : Zeit.',x:fmt(km)+' km : '+fmt(h)+' h = '+v+' km/h.'})},
 function(){var g=pick([5,8,10]),m=pick([0.1,0.2,0.25]),min=pick([40,60,80,120]);return q({p:'BBR-Stil: Ein Handytarif kostet '+g+' € Grundgebühr und '+fmt(m)+' € pro Minute. Wie hoch sind die Kosten bei '+min+' Gesprächsminuten?',a:g+m*min,unit:'€',dec:2,h:'Grundgebühr + Minutenpreis · Minuten.',x:g+' € + '+fmt(m)+' € · '+min+' = '+fmt(g+m*min)+' €.'})},
 function(){var cm=pick([3,4,6,8]),sc=pick([25000,50000,100000]);return q({p:'BBR-Stil: Auf einer Karte im Maßstab 1 : '+sc.toLocaleString('de-DE')+' sind zwei Orte '+cm+' cm voneinander entfernt. Wie viele Kilometer sind das in Wirklichkeit?',a:cm*sc/100000,unit:'km',h:'Erst in cm rechnen, dann in km umwandeln (1 km = 100 000 cm).',x:cm+' · '+sc.toLocaleString('de-DE')+' cm = '+fmt(cm*sc/100000)+' km.'})},
 function(){var t=pick([200,250,400,500]),n=Math.round(t*pick([0.15,0.2,0.35,0.4]));return q({p:'BBR-Stil: Bei einer Umfrage unter '+t+' Personen antworten '+n+' mit „ja“. Wie viel Prozent sind das?',a:n/t*100,unit:'%',dec:1,h:'Anteil · 100.',x:n+' : '+t+' · 100 = '+fmt(n/t*100)+' %.'})},
 function(){var mo=pick([15,20,25,40]),z=mo*pick([4,6,8,10]);return q({p:'BBR-Stil: Für ein Fahrrad werden '+z+' € gespart. Monatlich werden '+mo+' € zurückgelegt. Nach wie vielen Monaten ist das Ziel erreicht?',a:z/mo,unit:'Monate',h:'Zielbetrag durch monatliche Sparrate.',x:z+' € : '+mo+' € = '+(z/mo)+' Monate.'})}
],x:[
 function(){var r=pick([3,4,5,6]);return q({p:'BBR-Zusatz: Ein rundes Beet hat den Radius '+r+' m. Berechne die Fläche mit π ≈ 3,14.',a:3.14*r*r,unit:'m²',dec:2,h:'A = π · r².',x:'A ≈ 3,14 · '+(r*r)+' = '+fmt(3.14*r*r)+' m².'})},
 function(){var neu=pick([60,90,120,180]),p=pick([20,25,40]),alt=neu/(1-p/100);return q({p:'BBR-Zusatz: Nach einem Rabatt von '+p+' % kostet ein Artikel '+neu+' €. Wie hoch war der ursprüngliche Preis?',a:alt,unit:'€',dec:2,h:'Der neue Preis entspricht '+(100-p)+' % des alten Preises.',x:neu+' € : '+fmt((100-p)/100)+' = '+fmt(alt)+' €.'})}
]};

/* ------------------------- Aufgabenauswahl ------------------------- */
function generators(k,level,advanced){
  level=level||S.level;
  advanced=advanced===undefined?S.advanced:advanced;
  var a=POOL[k].d.slice();
  if(level!=='lernen')a=a.concat(POOL[k].e);
  if(level==='e')a=a.concat(POOL[k].e);
  if(advanced)a=a.concat(POOL[k].x);
  return a;
}
function make(t,count,level,advanced){
  count=count||QCOUNT;
  var ks=t==='mix'?Object.keys(N):[t],out=[],used={},i,k,gens,idx,guard;
  for(i=0;i<count;i++){
    k=t==='mix'?ks[i%ks.length]:ks[0];
    if(t==='mix'&&i>=ks.length)k=pick(ks);
    gens=generators(k,level,advanced);
    if(!used[k])used[k]=[];
    /* Nach Funktion vergleichen: dieselbe Vorlage kann in der Liste mehrfach stehen */
    if(used[k].length>=gens.length)used[k]=[];
    idx=rnd(0,gens.length-1);guard=0;
    while(used[k].indexOf(gens[idx])>=0&&guard<60){idx=rnd(0,gens.length-1);guard++}
    used[k].push(gens[idx]);
    var o=gens[idx]();
    o.topic=k;
    out.push(o);
  }
  return t==='mix'?shuffle(out):out;
}

/* --------------------- App-internes Eingabefeld -------------------- */
var KP_NUM=[
 ['7','8','9',{k:'/',l:'/',c:'op',t:'Bruchstrich'},{a:'back',l:'⌫',c:'op'}],
 ['4','5','6',{k:',',l:','},{a:'clear',l:'C',c:'danger'}],
 ['1','2','3',{k:'-',l:'−',c:'op'},{k:' ',l:'␣',t:'Leerzeichen'}],
 ['0',{k:'(',l:'('},{k:')',l:')'},{k:'|',l:'|'},{a:'abc',l:'ABC',c:'mode'}]
];
var KP_ABC=[
 ['q','w','e','r','t','z','u','i','o','p'],
 ['a','s','d','f','g','h','j','k','l','ö'],
 ['y','x','c','v','b','n','m','ä','ü','ß'],
 [{a:'num',l:'123',c:'mode',w:2},{k:',',l:','},{k:'-',l:'−'},{k:'/',l:'/'},{k:' ',l:'␣',w:3},{k:'π',l:'π'},{k:'°',l:'°'},{a:'back',l:'⌫',c:'op',w:2}]
];
function keyHtml(def){
  var o=typeof def==='string'?{k:def,l:def}:def;
  return '<button type="button" class="kp'+(o.c?' '+o.c:'')+'"'+(o.w?' style="flex:'+o.w+'"':'')+
    (o.a?' data-act="'+o.a+'"':' data-k="'+esc(o.k)+'"')+
    (o.t?' title="'+esc(o.t)+'" aria-label="'+esc(o.t)+'"':'')+'>'+esc(o.l)+'</button>';
}
function rowsHtml(rows,cls){
  return '<div class="kp-page '+cls+'">'+rows.map(function(r){
    return '<div class="kp-row">'+r.map(keyHtml).join('')+'</div>';
  }).join('')+'</div>';
}
function keypadHtml(o,id,target,preview){
  return '<div class="keypad" id="'+(id||'keypad')+'" data-page="'+(o.kb==='abc'?'abc':'num')+'"'+
    ' data-target="'+(target||'#answerInput')+'"'+(preview?' data-preview="'+preview+'"':'')+'>'+
    rowsHtml(KP_NUM,'kp-num')+rowsHtml(KP_ABC,'kp-abc')+'</div>';
}
function answerHtml(o){
  if(o.type==='mc')
    return '<div class="mc-grid">'+o.options.map(function(x){
      return '<button class="answer-btn" data-a="'+esc(x)+'">'+esc(x)+'</button>';
    }).join('')+'</div>';
  return '<div class="input-shell">'+
      '<div class="numeric-row">'+
        '<input id="answerInput" class="answer-input" type="text" inputmode="none" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Antwort eingeben" placeholder="'+esc(o.ph||'Antwort')+'">'+
        (o.unit?'<span class="unit-label">'+esc(o.unit)+'</span>':'')+
        '<button type="button" id="sysKb" class="kb-toggle" title="Gerätetastatur ein-/ausschalten" aria-label="Gerätetastatur ein- oder ausschalten">⌨</button>'+
      '</div>'+
      '<div id="prettyPreview" class="pretty-preview" hidden></div>'+
    '</div>'+keypadHtml(o,'keypad','#answerInput','#prettyPreview');
}
function inputEl(){return $('#answerInput')}
function kpInput(kp){return kp?$(kp.dataset.target||'#answerInput'):null}
function kpPreview(kp){return kp&&kp.dataset.preview?$(kp.dataset.preview):null}
function insertKey(kp,txt){
  var el=kpInput(kp);if(!el||el.disabled)return;
  var s=el.selectionStart,e=el.selectionEnd;
  if(s==null){s=e=el.value.length}
  el.value=el.value.slice(0,s)+txt+el.value.slice(e);
  var p=s+txt.length;
  try{el.focus({preventScroll:true});el.setSelectionRange(p,p)}catch(err){}
  updatePreview(kp);
}
function backspace(kp){
  var el=kpInput(kp);if(!el||el.disabled)return;
  var s=el.selectionStart,e=el.selectionEnd;
  if(s==null){el.value=el.value.slice(0,-1)}
  else if(s!==e){el.value=el.value.slice(0,s)+el.value.slice(e);e=s}
  else if(s>0){el.value=el.value.slice(0,s-1)+el.value.slice(s);s--;e=s}
  try{el.focus({preventScroll:true});el.setSelectionRange(s==null?el.value.length:s,e==null?el.value.length:e)}catch(err){}
  updatePreview(kp);
}
function updatePreview(kp){
  var el=kpInput(kp),pv=kpPreview(kp);
  if(!el||!pv)return;
  var m=/^\s*(-?\d+)?\s*(-?\d+)\s*\/\s*(\d+)\s*$/.exec(el.value);
  if(m&&m[3]&&m[3]!=='0'){
    pv.innerHTML='<span class="pf">'+(m[1]?'<b>'+esc(m[1])+'</b>':'')+
      '<span class="pf-frac"><i>'+esc(m[2])+'</i><i>'+esc(m[3])+'</i></span></span>';
    pv.hidden=false;
  }else{pv.hidden=true;pv.innerHTML=''}
}
function bindKeypad(kpId,sysId){
  var kp=$('#'+(kpId||'keypad'));if(!kp)return;
  kp.addEventListener('mousedown',function(e){e.preventDefault()});
  kp.onclick=function(e){
    var b=e.target.closest('button');if(!b)return;
    var act=b.dataset.act;
    if(act==='back')return backspace(kp);
    if(act==='clear'){var el=kpInput(kp);if(el&&!el.disabled){el.value='';try{el.focus({preventScroll:true})}catch(err){}}return updatePreview(kp)}
    if(act==='abc'||act==='num'){kp.dataset.page=act;var el2=kpInput(kp);if(el2)try{el2.focus({preventScroll:true})}catch(err){};return}
    if(b.dataset.k!=null)insertKey(kp,b.dataset.k);
  };
  var sys=$('#'+(sysId||'sysKb'));
  if(sys)sys.onclick=function(){
    var el=kpInput(kp);if(!el)return;
    var on=el.getAttribute('inputmode')==='none';
    el.setAttribute('inputmode',on?'text':'none');
    sys.classList.toggle('active',on);
    try{el.blur();el.focus({preventScroll:true})}catch(err){}
  };
}
/* ----------------------------- Ansichten --------------------------- */
function sync(){
  $$('#drawerLevels [data-level]').forEach(function(b){b.classList.toggle('active',b.dataset.level===S.level)});
  $('#advancedToggle').checked=S.advanced;
}
function render(){
  sync();
  if(S.screen==='home')home();
  else if(S.screen==='trainer')trainer();
  else result();
}
function home(){
  var cards=Object.keys(N).map(function(k){
    return '<button class="topic-card" data-topic="'+k+'"><span class="topic-icon">'+M[k][0]+'</span>'+
      '<div><b>'+N[k]+'</b><small>'+M[k][1]+'</small><div class="mini-progress"><i style="width:'+pc(k)+'%"></i></div></div></button>';
  }).join('');
  $('#mainView').innerHTML='<section class="home-screen">'+
    '<div class="hero"><div class="kicker">Grundwissen bis Ende Klasse 7</div><h1>Fit für Klasse 8</h1>'+
    '<p>Erweiterter Aufgabenpool aus allen fünf Leitideen des Berliner RLP – mit drei Niveaus, Tipps und dauerhaftem Lernstand.</p></div>'+
    '<div class="level-picker">'+
      '<button data-l="lernen" class="'+(S.level==='lernen'?'active':'')+'"><b>Lernen</b><small>RLP D</small></button>'+
      '<button data-l="g" class="'+(S.level==='g'?'active':'')+'"><b>Grundkurs</b><small>D–E</small></button>'+
      '<button data-l="e" class="'+(S.level==='e'?'active':'')+'"><b>Erweiterung</b><small>RLP E</small></button>'+
    '</div><div class="topic-grid">'+cards+'</div>'+
    '<div class="start-row"><button id="startMix" class="btn">▶ Gemischtes Training</button><button id="openInfo" class="btn secondary">RLP</button></div></section>';
  $$('[data-l]').forEach(function(b){b.onclick=function(){S.level=b.dataset.l;save();home();sync()}});
  $$('[data-topic]').forEach(function(b){b.onclick=function(){start(b.dataset.topic)}});
  $('#startMix').onclick=function(){start('mix')};
  $('#openInfo').onclick=function(){$('#infoDialog').showModal()};
}
function start(t){
  S.topic=t;S.qs=make(t);S.i=S.right=S.wrong=S.streak=0;
  S.answered=false;S.selected=null;S.sessionRecorded=false;S.screen='trainer';
  render();
}
function trainer(){
  var o=S.qs[S.i];
  var note=o.dec!=null?'<p class="q-note">Runde auf '+(o.dec===1?'eine Nachkommastelle':o.dec+' Nachkommastellen')+'.</p>':'';
  $('#mainView').innerHTML='<section class="trainer-screen">'+
    '<div class="session-head"><div class="session-meta"><div class="line1"><b>'+(S.topic==='mix'?'Gemischtes Training':N[S.topic])+'</b>'+
    '<span class="pill">'+L[S.level]+'</span></div><small>Aufgabe '+(S.i+1)+' von '+QCOUNT+' · '+N[o.topic]+'</small></div>'+
    '<div class="score-pill">✓ '+S.right+' · Serie '+S.streak+'</div>'+
    '<div class="progress-track"><i style="width:'+(S.i/QCOUNT*100)+'%"></i></div></div>'+
    '<article class="question-card"><div class="q-top"><span class="q-label">'+N[o.topic]+'</span>'+
    '<span class="q-difficulty">'+(S.level==='lernen'?'D':S.level==='g'?'D–E':'E')+'</span></div>'+
    '<div class="q-body"><h2>'+o.p+'</h2>'+note+(o.v?'<div class="visual">'+o.v+'</div>':'')+'</div>'+
    '<div id="feedback" class="q-feedback">💡 <span>Bei Bedarf kannst du einen Tipp einblenden.</span></div></article>'+
    '<div class="answer-dock">'+answerHtml(o)+'</div>'+
    '<div class="session-actions"><button id="quitBtn" class="btn ghost" aria-label="Training beenden">⌂</button>'+
    '<button id="checkBtn" class="btn main-action">Prüfen</button>'+
    '<button id="hintBtn" class="btn secondary">Tipp</button></div></section>';
  if(o.type==='mc'){
    $$('.answer-btn').forEach(function(b){
      b.onclick=function(){
        if(S.answered)return;
        S.selected=b.dataset.a;
        $$('.answer-btn').forEach(function(x){x.classList.toggle('selected',x===b)});
      };
    });
  }else{
    var el=inputEl();
    el.oninput=function(){updatePreview($('#keypad'))};
    el.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();check()}};
    bindKeypad('keypad','sysKb');
    try{el.focus({preventScroll:true})}catch(err){}
  }
  $('#checkBtn').onclick=check;
  $('#hintBtn').onclick=function(){$('#feedback').className='q-feedback';$('#feedback').innerHTML='💡 <span><strong>Tipp:</strong> '+o.h+'</span>'};
  $('#quitBtn').onclick=function(){S.screen='home';render()};
}
function check(){
  var o=S.qs[S.i];
  if(S.answered){
    if(S.i===QCOUNT-1){S.screen='result';render()}
    else{S.i++;S.answered=false;S.selected=null;render()}
    return;
  }
  var u=o.type==='mc'?S.selected:inputEl().value;
  if(u===null||String(u).trim()===''){toast('Bitte zuerst antworten.');return}
  var res=verify(u,o);
  if(!res.ok&&res.note&&o.type!=='mc'&&!parseValue(u)){toast(res.note);return}
  S.answered=true;
  var yes=res.ok,lp=prog[o.topic].levels[S.level],sl=stats.levels[S.level];
  if(yes){S.right++;S.streak++;prog[o.topic].r++;lp.r++;sl.r++;stats.bestStreak=Math.max(stats.bestStreak,S.streak)}
  else{S.wrong++;S.streak=0;prog[o.topic].w++;lp.w++;sl.w++}
  save();
  var f=$('#feedback');
  f.className='q-feedback '+(yes?'good':'bad');
  f.innerHTML=(yes?'✓':'✕')+' <span><strong>'+(yes?'Richtig!':'Noch nicht.')+'</strong> '+(res.note&&!yes?res.note+' ':'')+o.x+'</span>';
  if(o.type==='mc'){
    $$('.answer-btn').forEach(function(b){
      if(b.dataset.a===String(o.a))b.classList.add('correct');
      else if(b.dataset.a===String(u)&&!yes)b.classList.add('wrong');
      b.disabled=true;
    });
  }else{
    inputEl().disabled=true;
    var kp=$('#keypad');if(kp)kp.classList.add('locked');
    var sys=$('#sysKb');if(sys)sys.disabled=true;
  }
  $('#checkBtn').textContent=S.i===QCOUNT-1?'Auswertung':'Nächste Aufgabe';
  $('#checkBtn').focus();
  $('#hintBtn').disabled=true;
}
function recordSession(){
  if(S.sessionRecorded)return;
  S.sessionRecorded=true;
  stats.sessions=(stats.sessions||0)+1;
  stats.lastSession=new Date().toISOString();
  save();
}
function result(){
  recordSession();
  var p=Math.round(S.right/QCOUNT*100);
  $('#mainView').innerHTML='<section class="result-screen"><div class="result-card">'+
    '<div class="result-ring" style="--pct:'+p+'%"><div><b>'+p+'%</b></div></div>'+
    '<div class="kicker">Training abgeschlossen</div><h2>'+(S.topic==='mix'?'Gemischtes Grundwissen':N[S.topic])+'</h2>'+
    '<p>'+(p>=85?'Sehr sichere Leistung.':p>=65?'Gute Basis – einzelne Bereiche lohnen noch eine Runde.':'Weiter üben lohnt sich – nutze die Tipps gezielt.')+'</p>'+
    '<div class="result-stats"><div><b>'+S.right+'</b><small>richtig</small></div><div><b>'+S.wrong+'</b><small>offen</small></div>'+
    '<div><b>'+S.streak+'</b><small>letzte Serie</small></div></div>'+
    '<div class="result-actions"><button id="againBtn" class="btn">Noch eine Runde</button>'+
    '<button id="homeBtn" class="btn secondary">Startseite</button>'+
    '<button id="sendBtn" class="btn ghost span-2">✉ Auswertung an die Lehrkraft senden</button></div></div></section>';
  $('#againBtn').onclick=function(){start(S.topic)};
  $('#sendBtn').onclick=openMailDialog;
  $('#homeBtn').onclick=function(){S.screen='home';render()};
}
function statsSummary(){
  var totalR=0,totalW=0,rows=[];
  Object.keys(N).forEach(function(k){
    var p=prog[k],n=p.r+p.w;
    totalR+=p.r;totalW+=p.w;
    rows.push({name:N[k],r:p.r,n:n,pc:n?Math.round(100*p.r/n):0});
  });
  var total=totalR+totalW;
  return{
    total:total,right:totalR,wrong:totalW,rate:total?Math.round(100*totalR/total):0,rows:rows,
    levels:['lernen','g','e'].map(function(l){
      var p=stats.levels[l],n=p.r+p.w;
      return{name:l==='lernen'?'Lernen':l==='g'?'Grundkurs':'Erweiterung',n:n,r:p.r,pc:n?Math.round(100*p.r/n):0};
    }),
    sessions:stats.sessions||0,best:stats.bestStreak||0,
    last:stats.lastSession?new Date(stats.lastSession).toLocaleDateString('de-DE'):'–'
  };
}
function statsHtml(){
  var s=statsSummary();
  var rows=s.rows.map(function(t){
    return '<div class="eval-row"><div class="eval-row-head"><b>'+t.name+'</b><span>'+t.r+' / '+t.n+' richtig · '+t.pc+'%</span></div>'+
      '<div class="eval-bar"><i style="width:'+t.pc+'%"></i></div></div>';
  }).join('');
  var levelRows=s.levels.map(function(l){
    return '<div class="eval-level"><b>'+l.name+'</b><span>'+l.n+' Aufgaben · '+l.pc+'%</span></div>';
  }).join('');
  return '<div class="eval-overview"><div><b>'+s.total+'</b><small>bearbeitet</small></div><div><b>'+s.right+'</b><small>richtig</small></div>'+
    '<div><b>'+s.rate+'%</b><small>Trefferquote</small></div><div><b>'+s.sessions+'</b><small>Runden</small></div></div>'+
    '<div class="eval-meta"><span>Beste Serie: <b>'+s.best+'</b></span><span>Letzte Runde: <b>'+s.last+'</b></span></div>'+
    '<h3>Themenprofil</h3><div class="eval-rows">'+rows+'</div><h3>Niveaus</h3><div class="eval-levels">'+levelRows+'</div>';
}
/* ------------------- Auswertung als E-Mail senden ------------------ */
function reportText(name){
  var s=statsSummary(),now=new Date();
  var T=[];
  T.push('Auswertung – Mathe Grundwissen Klasse 8 (CHH)');
  T.push('');
  T.push('Name: '+(name||'—'));
  T.push('Erstellt am: '+now.toLocaleDateString('de-DE')+', '+now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr');
  T.push('Eingestelltes Niveau: '+L[S.level]);
  T.push('Zusatzthemen: '+(S.advanced?'ein':'aus'));
  T.push('');
  T.push('Gesamt: '+s.total+' Aufgaben bearbeitet, '+s.right+' richtig ('+s.rate+' %)');
  T.push('Trainingsrunden: '+s.sessions+' · Beste Serie: '+s.best+' · Letzte Runde: '+s.last);
  T.push('');
  T.push('Themenprofil');
  s.rows.forEach(function(t){T.push('- '+t.name+': '+t.r+' / '+t.n+' richtig ('+t.pc+' %)')});
  T.push('');
  T.push('Niveaus');
  s.levels.forEach(function(l){T.push('- '+l.name+': '+l.n+' Aufgaben, '+l.r+' richtig ('+l.pc+' %)')});
  T.push('');
  T.push('Die Werte stammen aus dem lokal auf diesem Gerät gespeicherten Lernstand.');
  return T.join('\n');
}
function refreshReport(){
  var ta=$('#reportText');
  if(ta)ta.value=reportText(($('#userName').value||'').trim());
}
function openMailDialog(){
  var host=$('#mailKeypadHost');
  if(host&&!$('#mailKeypad')){
    host.innerHTML=keypadHtml({kb:'abc'},'mailKeypad','#userName');
    bindKeypad('mailKeypad','mailSysKb');
  }
  var inp=$('#userName');
  inp.value=user.name||'';
  inp.disabled=false;
  inp.oninput=refreshReport;
  inp.onkeydown=function(e){if(e.key==='Enter')e.preventDefault()};
  $('#mailStatus').textContent='';
  $('#mailTo').textContent=MAIL_TO;
  refreshReport();
  var post=$('#postReport');
  post.hidden=!formspreeReady();
  $('#mailSetup').hidden=formspreeReady();
  $('#mailDialog').showModal();
  try{inp.focus({preventScroll:true})}catch(e){}
}
function mailName(){
  var name=($('#userName').value||'').trim();
  if(!name){
    toast('Bitte zuerst den Namen eintragen.');
    try{$('#userName').focus({preventScroll:true})}catch(e){}
    return '';
  }
  user.name=name;saveUser();refreshReport();
  return name;
}
function sendReportMail(){
  var name=mailName();if(!name)return;
  var href='mailto:'+MAIL_TO+
    '?subject='+encodeURIComponent('Auswertung Mathe Grundwissen – '+name)+
    '&body='+encodeURIComponent(reportText(name));
  var a=document.createElement('a');
  a.href=href;a.rel='noopener';
  document.body.appendChild(a);a.click();a.remove();
  $('#mailStatus').textContent='Das E-Mail-Programm wurde mit der fertigen Nachricht geöffnet. Abgeschickt wird sie erst dort mit „Senden“.';
}
function copyReportText(){
  var name=mailName();if(!name)return;
  var ta=$('#reportText'),txt=ta.value;
  var ok=function(){$('#mailStatus').textContent='Auswertung kopiert – jetzt in eine E-Mail an '+MAIL_TO+' einfügen.'};
  var manual=function(){$('#mailStatus').textContent='Kopieren war nicht möglich – bitte den Text unten markieren und von Hand kopieren.'};
  var legacy=function(){
    try{
      ta.removeAttribute('readonly');ta.select();ta.setSelectionRange(0,txt.length);
      var done=document.execCommand('copy');
      ta.setAttribute('readonly','readonly');
      if(done)ok();else manual();
    }catch(e){manual()}
  };
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,legacy);
  else legacy();
}
function showStats(){var c=$('#statsContent');if(c)c.innerHTML=statsHtml();$('#statsDialog').showModal()}


/* ------------------- Direktversand über Formspree ------------------ */
function formspreeReady(){return /^[A-Za-z0-9_-]{6,}$/.test(FORMSPREE_ID)}
function sendViaFormspree(){
  var name=mailName();if(!name)return;
  if(!formspreeReady()){
    $('#mailStatus').textContent='Der Direktversand ist noch nicht eingerichtet. Bitte „E-Mail öffnen“ oder „Text kopieren“ verwenden.';
    return;
  }
  var s=statsSummary(),btn=$('#postReport');
  btn.disabled=true;
  $('#mailStatus').textContent='Auswertung wird gesendet …';
  fetch('https://formspree.io/f/'+FORMSPREE_ID,{
    method:'POST',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
      _subject:'Auswertung Mathe Grundwissen – '+name,
      Name:name,
      Niveau:L[S.level],
      Bearbeitet:s.total,
      Richtig:s.right,
      Trefferquote:s.rate+' %',
      Runden:s.sessions,
      Auswertung:reportText(name)
    })
  }).then(function(r){
    btn.disabled=false;
    if(r.ok){
      $('#mailStatus').textContent='Die Auswertung wurde an die Lehrkraft gesendet. Danke!';
      toast('Auswertung gesendet');
    }else{
      r.json().then(function(d){
        var msg=d&&d.errors&&d.errors.length?d.errors.map(function(e){return e.message}).join(' · '):'Statuscode '+r.status;
        $('#mailStatus').textContent='Senden nicht möglich ('+msg+'). Bitte „E-Mail öffnen“ oder „Text kopieren“ verwenden.';
      },function(){
        $('#mailStatus').textContent='Senden nicht möglich (Statuscode '+r.status+'). Bitte „E-Mail öffnen“ oder „Text kopieren“ verwenden.';
      });
    }
  },function(){
    btn.disabled=false;
    $('#mailStatus').textContent='Keine Verbindung zum Versanddienst. Bitte „E-Mail öffnen“ oder „Text kopieren“ verwenden.';
  });
}

/* ------------------ Arbeitsblatt (Druck / PDF) --------------------- */
var sheet={topic:'mix',count:12,level:null,solutions:true};
function sheetLevel(){return sheet.level||S.level}
function chipRow(id,items,active){
  return '<div class="chip-row" id="'+id+'">'+items.map(function(it){
    return '<button type="button" data-v="'+esc(String(it.v))+'"'+(String(it.v)===String(active)?' class="active"':'')+'>'+esc(it.t)+'</button>';
  }).join('')+'</div>';
}
function sheetOptionsHtml(){
  var topics=[{v:'mix',t:'Gemischt'}].concat(Object.keys(N).map(function(k){return{v:k,t:N[k]}}));
  return '<p class="field-label">Themenbereich</p>'+chipRow('sheetTopic',topics,sheet.topic)+
    '<p class="field-label">Niveau</p>'+chipRow('sheetLevel',[{v:'lernen',t:'Lernen'},{v:'g',t:'Grundkurs'},{v:'e',t:'Erweiterung'}],sheetLevel())+
    '<p class="field-label">Anzahl der Aufgaben</p>'+chipRow('sheetCount',[8,12,16,20].map(function(n){return{v:n,t:String(n)}}),sheet.count);
}
function renderSheetOptions(){
  var host=$('#sheetOptions');if(!host)return;
  host.innerHTML=sheetOptionsHtml();
  host.onclick=function(e){
    var b=e.target.closest('.chip-row button');if(!b)return;
    var row=b.parentNode.id,v=b.dataset.v;
    if(row==='sheetTopic')sheet.topic=v;
    else if(row==='sheetLevel')sheet.level=v;
    else if(row==='sheetCount')sheet.count=Number(v);
    renderSheetOptions();
  };
}
function openSheetDialog(){
  if(!sheet.level)sheet.level=S.level;
  renderSheetOptions();
  $('#sheetSolutions').checked=sheet.solutions;
  $('#sheetStatus').textContent='';
  $('#sheetDialog').showModal();
}
/* Farben der Grafiken für den Schwarz-Weiß-Druck anpassen */
function printSvg(svg){
  return String(svg)
    .replace(/#07131f/g,'#ffffff').replace(/#07111f/g,'#ffffff')
    .replace(/#5aa7ff/g,'#b9d5ff').replace(/#58e0d3/g,'#bdeee8')
    .replace(/#7890ad/g,'#333333').replace(/fill="#fff"/g,'fill="#000"')
    .replace(/opacity="\.72"/g,'opacity=".55"');
}
function ratio(v){
  for(var d=1;d<=64;d++){var n=v*d;if(Math.abs(n-Math.round(n))<1e-9)return{n:Math.round(n),d:d}}
  return null;
}
function wantsFraction(o){return !!(o.reduce||(o.ph&&String(o.ph).indexOf('/')>=0))}
function labelNum(v,o){
  var s;
  if(o.dec!=null)s=fix(v,o.dec);
  else if(wantsFraction(o)){var r=ratio(v);s=r?(r.d===1?String(r.n):r.n+'/'+r.d):fmt(v)}
  else s=fmt(v);
  return s+(o.unit?' '+o.unit:'');
}
function answerLabel(o){
  if(o.type==='mc'||o.type==='text')return String(o.a);
  return labelNum(o.a,o);
}
/* Falsche, aber plausible Lösung zur selben Aufgabe */
function distractor(o,used){
  var cands=[],i;
  if(o.type==='mc'){
    o.options.forEach(function(x){if(String(x)!==String(o.a))cands.push(String(x))});
  }else if(o.type==='text'){
    var s=String(o.a),m=/\d+/.exec(s);
    if(m){
      cands.push(s.replace(/\d+/,String(Number(m[0])+1)));
      if(Number(m[0])>1)cands.push(s.replace(/\d+/,String(Number(m[0])-1)));
      cands.push(s.replace(/\d+/,String(Number(m[0])+2)));
    }
  }else if(wantsFraction(o)){
    var r=ratio(o.a);
    if(r){
      [[r.n+1,r.d],[r.n,r.d+1],[r.n-1,r.d],[r.d,r.n],[r.n+1,r.d+1],[r.n,r.d+2]].forEach(function(f){
        if(f[0]<1||f[1]<2)return;
        if(f[0]%f[1]===0)return;                 /* keine ganzen Zahlen als Bruch-Ablenker */
        if(Math.abs(f[0]/f[1]-o.a)<1e-9)return;
        var lab=labelNum(f[0]/f[1],o);
        if(lab.indexOf('/')>=0)cands.push(lab);   /* zu einem Bruch gehört ein Bruch */
      });
    }
  }
  if(!cands.length&&!wantsFraction(o)&&o.type!=='mc'&&o.type!=='text'){
    var a=o.a,whole=Math.abs(a-Math.round(a))<1e-9,
        pool=[a+1,a-1,a*2,a/2,a+10,a-10,a*10,a/10,a+2,a-2,Math.round(a*1.2*100)/100];
    if(!whole)pool.push(a+0.1,a-0.5,a+0.25);
    pool.forEach(function(v){
      if(!isFinite(v))return;
      if(a>0&&v<=0)return;
      if(Math.abs(v-a)<1e-9)return;
      if(Math.abs(v)>1e7)return;
      /* Zu einer ganzen Zahl passt kein krummer Ablenker */
      if(whole&&Math.abs(v-Math.round(v))>1e-9)return;
      cands.push(labelNum(v,o));
    });
  }
  cands=shuffle(cands);
  for(i=0;i<cands.length;i++)if(cands[i]&&!used[cands[i]])return cands[i];
  return null;
}
function solutionBox(qs){
  var right=[],used={},wrong=[],i;
  qs.forEach(function(o){
    var l=answerLabel(o);
    if(l&&!used[l]){used[l]=true;right.push(l)}
  });
  for(i=0;i<qs.length&&wrong.length<right.length;i++){
    var w=distractor(qs[i],used);
    if(w){used[w]=true;wrong.push(w)}
  }
  for(i=0;wrong.length<right.length&&i<qs.length*4;i++){
    var o=qs[i%qs.length],w2=distractor(o,used);
    if(w2){used[w2]=true;wrong.push(w2)}else if(o.type==='num'||!o.type){
      var v=o.a+rnd(2,40),lab=labelNum(v,o);
      if(!used[lab]){used[lab]=true;wrong.push(lab)}
    }
  }
  var all=shuffle(right.concat(wrong));
  return '<section class="ws-solutions"><h2>Lösungen zur Selbstkontrolle</h2>'+
    '<p>Im Kasten stehen alle richtigen Ergebnisse – und ebenso viele falsche. Prüfe, ob dein Ergebnis dabei ist. '+
    'Wenn nicht, rechne die Aufgabe noch einmal.</p><div class="ws-chips">'+
    all.map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div></section>';
}
function worksheetHtml(qs){
  var title=sheet.topic==='mix'?'Gemischtes Grundwissen':N[sheet.topic];
  var d=new Date();
  var items=qs.map(function(o,i){
    var body='<div class="ws-q"><b>'+(i+1)+'.</b> '+o.p+'</div>';
    if(o.dec!=null)body+='<div class="ws-note">Runde auf '+(o.dec===1?'eine Nachkommastelle':o.dec+' Nachkommastellen')+'.</div>';
    if(o.v)body+='<div class="ws-visual">'+printSvg(o.v)+'</div>';
    if(o.type==='mc'){
      body+='<div class="ws-options">'+o.options.map(function(x,j){
        return '<span>'+'ABCD'.charAt(j)+') '+esc(x)+'</span>';
      }).join('')+'</div>';
    }else{
      body+='<div class="ws-line">Lösung: <span class="ws-blank"></span>'+(o.unit?' <i>'+esc(o.unit)+'</i>':'')+'</div>';
    }
    if(sheet.topic==='mix')body+='<div class="ws-topic">'+N[o.topic]+'</div>';
    return '<li class="ws-item">'+body+'</li>';
  }).join('');
  return '<article class="ws">'+
    '<header class="ws-head"><h1>Mathe Grundwissen · '+esc(title)+'</h1>'+
    '<p class="ws-meta">Niveau: '+L[sheetLevel()]+' · '+qs.length+' Aufgaben · erstellt am '+d.toLocaleDateString('de-DE')+'</p>'+
    '<p class="ws-name">Name: <span class="ws-blank wide"></span> Klasse: <span class="ws-blank"></span> Datum: <span class="ws-blank"></span></p></header>'+
    '<ol class="ws-list">'+items+'</ol>'+
    (sheet.solutions?solutionBox(qs):'')+
    '<footer class="ws-foot">CHH · Mathe Grundwissen Klasse 8 · erstellt mit der Übungs-App (Rahmenlehrplan Berlin-Brandenburg)</footer></article>';
}
function makeWorksheet(){
  sheet.solutions=$('#sheetSolutions').checked;
  var qs=make(sheet.topic,sheet.count,sheetLevel(),S.advanced);
  $('#printSheet').innerHTML=worksheetHtml(qs);
  return qs;
}
function printWorksheet(){
  try{makeWorksheet()}catch(e){$('#sheetStatus').textContent='Arbeitsblatt konnte nicht erzeugt werden.';return}
  $('#sheetDialog').close();
  setTimeout(function(){
    try{window.print()}catch(e){}
  },200);
}

/* ------------------------- Menü & Dialoge -------------------------- */
function openD(){$('#drawerBackdrop').hidden=false;$('#drawer').classList.add('open');$('#drawer').setAttribute('aria-hidden','false');$('#closeDrawer').focus()}
function closeD(){$('#drawer').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true');setTimeout(function(){$('#drawerBackdrop').hidden=true},220)}
function resetProgress(){
  Object.keys(N).forEach(function(k){prog[k]={r:0,w:0,levels:{lernen:{r:0,w:0},g:{r:0,w:0},e:{r:0,w:0}}}});
  stats={sessions:0,bestStreak:0,lastSession:null,levels:{lernen:{r:0,w:0},g:{r:0,w:0},e:{r:0,w:0}}};
  save();S.screen='home';render();toast('Lernstand zurückgesetzt');
}
$('#menuBtn').onclick=openD;
$('#closeDrawer').onclick=closeD;
$('#drawerBackdrop').onclick=closeD;
$('#drawerLevels').onclick=function(e){
  var b=e.target.closest('[data-level]');
  if(b){S.level=b.dataset.level;save();sync();closeD();if(S.screen==='home')home()}
};
$('#menuHome').onclick=function(){S.screen='home';closeD();render()};
$('#menuStats').onclick=function(){closeD();setTimeout(showStats,150)};
$('#menuMail').onclick=function(){closeD();setTimeout(openMailDialog,150)};
$('#statsSend').onclick=function(){$('#statsDialog').close();setTimeout(openMailDialog,140)};
$('#sendReport').onclick=sendReportMail;
$('#postReport').onclick=sendViaFormspree;
$('#menuSheet').onclick=function(){closeD();setTimeout(openSheetDialog,150)};
$('#printSheetBtn').onclick=printWorksheet;
$('#copyReport').onclick=copyReportText;
$('#menuCalc').onclick=function(){closeD();setTimeout(function(){$('#calcDialog').showModal()},150)};
$('#calcShortcut').onclick=function(){$('#calcDialog').showModal()};
$('#menuRlp').onclick=function(){closeD();setTimeout(function(){$('#infoDialog').showModal()},150)};
$('#advancedToggle').onchange=function(e){S.advanced=e.target.checked;save();toast(S.advanced?'Zusatzthemen an':'Zusatzthemen aus')};
$('#menuReset').onclick=function(){closeD();setTimeout(function(){$('#confirmDialog').showModal()},150)};
$('#confirmDialog').addEventListener('close',function(){if($('#confirmDialog').returnValue==='ok')resetProgress()});
$('#menuQr').onclick=function(){
  closeD();
  setTimeout(function(){
    var url=location.href.split('#')[0],box=$('#qrCode');
    box.innerHTML='';$('#qrUrl').textContent=url;
    var im=document.createElement('img');
    im.width=240;im.height=240;im.alt='QR-Code für '+url;
    im.onerror=function(){box.innerHTML='<p class="qr-fallback">Der QR-Code konnte nicht geladen werden (keine Internetverbindung). Die Adresse steht unten.</p>'};
    im.src='https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data='+encodeURIComponent(url);
    box.appendChild(im);
    $('#qrDialog').showModal();
  },150);
};
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&$('#drawer').classList.contains('open')){closeD()}
});

/* --------------------------- Taschenrechner ------------------------ */
var ce='';
$('#calcGrid').onclick=function(e){
  var b=e.target.closest('[data-calc]');if(!b)return;
  var v=b.dataset.calc;
  if(v==='clear'){ce='';$('#calcResult').textContent='0'}
  else if(v==='back')ce=ce.replace(/(sqrt\(|\*\*2|PI|.)$/,'');
  else if(v==='sqrt')ce+='sqrt(';
  else if(v==='square')ce+='**2';
  else if(v==='pi')ce+='PI';
  else if(v==='equals'){
    try{
      var x=ce.replace(/,/g,'.').replace(/PI/g,'('+Math.PI+')').replace(/sqrt\(/g,'Math.sqrt(').replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');
      if(!/^[0-9+\-*/().\sMathsqr]+$/.test(x))throw 0;
      var n=Function('"use strict";return('+x+')')();
      if(!Number.isFinite(n))throw 0;
      $('#calcResult').textContent=fmt(n);
    }catch(err){$('#calcResult').textContent='Fehler'}
    $('#calcExpression').textContent=prettyCalc(ce)||' ';
    return;
  }else ce+=v;
  $('#calcExpression').textContent=prettyCalc(ce)||' ';
};
function prettyCalc(s){return s.replace(/PI/g,'π').replace(/\*\*2/g,'²').replace(/\*/g,'·').replace(/\//g,':')}

/* ----------------------------- Hinweise ---------------------------- */
var tt;
function toast(t){
  var x=$('#toast');
  x.textContent=t;x.classList.add('show');
  clearTimeout(tt);
  tt=setTimeout(function(){x.classList.remove('show')},2600);
}

/* --------- Scrollen in der App unterbinden (Menü ausgenommen) ------- */
document.addEventListener('touchmove',function(e){
  var t=e.target;
  if(t&&t.closest&&t.closest('.scrollable'))return;
  if(e.cancelable)e.preventDefault();
},{passive:false});
document.addEventListener('gesturestart',function(e){if(e.cancelable)e.preventDefault()});
window.addEventListener('scroll',function(){if(window.scrollY||window.scrollX)window.scrollTo(0,0)},{passive:true});

var vl=$('#versionLabel');if(vl)vl.textContent='v'+VERSION;
try{render()}catch(err){
  $('#mainView').innerHTML='<section class="home-screen"><div class="hero"><div class="kicker">Startfehler</div>'+
    '<h1>Trainer konnte nicht geladen werden</h1><p>'+esc(String(err&&err.message||err))+'</p></div></section>';
  console.error(err);
}
})();
