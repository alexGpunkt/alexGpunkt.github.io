(async()=>{
  const files=["chunks/bundle-01.b64","chunks/bundle-02.b64","chunks/bundle-03.b64","chunks/bundle-04.b64"];
  try{
    if(!("DecompressionStream" in window)) throw new Error("Dieser Browser unterstützt DecompressionStream nicht. Bitte einen aktuellen Browser verwenden.");
    const b64=(await Promise.all(files.map(p=>fetch(p,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(p+" "+r.status);return r.text()})))).join("").replace(/\s+/g,"");
    const bin=atob(b64), bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const code=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    new Function(code)();
  }catch(err){
    const app=document.getElementById("app");
    if(app) app.innerHTML=`<div style="padding:24px;font-family:system-ui"><h2>Puente konnte nicht geladen werden</h2><p>${String(err)}</p><p>Bitte die Seite neu laden oder einen aktuellen Browser verwenden.</p></div>`;
    console.error(err);
  }
})();
