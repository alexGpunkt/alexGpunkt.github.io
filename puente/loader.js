(async()=>{
  const parts=["chunks/bundle-01.txt", "chunks/bundle-02.txt", "chunks/bundle-03.txt", "chunks/bundle-04.txt", "chunks/bundle-05.txt", "chunks/bundle-06.txt"];
  try{
    const texts=await Promise.all(parts.map(p=>fetch(p,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(p+" "+r.status);return r.text()})));
    new Function(texts.join(""))();
  }catch(err){
    const app=document.getElementById("app");
    if(app) app.innerHTML=`<div style="padding:24px;font-family:system-ui"><h2>Puente konnte nicht geladen werden</h2><p>${String(err)}</p><p>Bitte Seite neu laden.</p></div>`;
    console.error(err);
  }
})();
