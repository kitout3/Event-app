(() => {
  "use strict";
  const KEY="mariage-account-preferences";
  const defaults={
    primary:"#5c2a1e",background:"#fdf8f4",
    showUpload:true,showGallery:true,showVideo:true,showTv:true,
    videoModerationMode:"moderated",videoDelayMinutes:60
  };
  const read=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {...defaults}}};
  const save=p=>{const n={...read(),...p};localStorage.setItem(KEY,JSON.stringify(n));apply(n);return n};
  const matches=(el,re)=>re.test((el.textContent||"").trim());
  function apply(p=read()){
    document.documentElement.style.setProperty("--burgundy",p.primary);
    document.documentElement.style.setProperty("--rose",p.primary);
    document.documentElement.style.setProperty("--gold",p.primary);
    document.documentElement.style.setProperty("--text",p.primary);
    document.documentElement.style.setProperty("--muted",p.primary);
    document.documentElement.style.setProperty("--cream",p.background);
    const rules=[
      [/(Envoyer une photo|Upload a photo|Gửi ảnh|Foto hochladen)/i,p.showUpload],
      [/(Galerie & réactions|Gallery & reactions|Thư viện ảnh|Galerie & Reaktionen)/i,p.showGallery],
      [/(Laisser un témoignage vidéo|Leave a video message|Gửi lời chúc bằng video|Videobotschaft hinterlassen)/i,p.showVideo],
      [/(Galerie vidéos|Video gallery|Thư viện video|Videogalerie)/i,p.showVideo],
      [/(Affichage TV|TV display|Màn hình trình chiếu|TV-Anzeige)/i,p.showTv],
      [/(Regarder le live|Watch live|Xem trực tiếp|Live ansehen)/i,false]
    ];
    document.querySelectorAll("button").forEach(b=>{
      for(const [re,on] of rules) if(matches(b,re)){b.style.display=on?"":"none";break}
    });
    document.querySelectorAll("#wedding-live-card,#wedding-live-panel").forEach(el=>el.remove());
  }
  function panel(){
    const settings=[...document.querySelectorAll("button")].find(b=>/Paramètres|Settings|Cài đặt|Einstellungen/i.test(b.textContent||""));
    if(!settings)return;
    const content=settings.parentElement?.nextElementSibling;if(!content)return;
    if(document.getElementById("account-customization-panel"))return;
    const box=document.createElement("section");box.id="account-customization-panel";
    Object.assign(box.style,{maxWidth:"560px",background:"var(--white,#fffdf9)",borderRadius:"18px",padding:"1.5rem",boxShadow:"0 2px 10px rgba(92,42,30,.12)",marginTop:"12px"});
    box.innerHTML=`
      <h3 style="font:1.35rem 'Cormorant Garamond',serif;color:var(--burgundy);margin-bottom:14px">Personnalisation du compte</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px">
        <label>Couleur des textes et onglets<input data-pref="primary" type="color" style="width:100%;height:42px"></label>
        <label>Couleur de l’arrière-plan<input data-pref="background" type="color" style="width:100%;height:42px"></label>
      </div>
      <h4 style="margin:10px 0">Onglets visibles</h4>
      <div style="display:grid;gap:8px">
        <label><input data-pref="showUpload" type="checkbox"> Envoi de photos</label>
        <label><input data-pref="showGallery" type="checkbox"> Galerie photos</label>
        <label><input data-pref="showVideo" type="checkbox"> Vidéos et témoignages</label>
        <label><input data-pref="showTv" type="checkbox"> Affichage TV</label>
      </div>
      <h4 style="margin:18px 0 8px">Modération des vidéos</h4>
      <select data-pref="videoModerationMode" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd">
        <option value="immediate">Immédiate — visible dès l'envoi</option>
        <option value="moderated">Modérée — validation manuelle</option>
        <option value="delayed">Différée — publication automatique après délai</option>
      </select>
      <label data-delay style="display:block;margin-top:10px">Délai avant publication (minutes)
        <input data-pref="videoDelayMinutes" type="number" min="1" step="1" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd">
      </label>
      <p style="font-size:.76rem;color:#9e7060;margin-top:12px">Ces réglages sont propres à cet espace mariage. Le Live cérémonie reste masqué.</p>`;
    content.appendChild(box);
    const p=read();
    box.querySelectorAll("[data-pref]").forEach(el=>{
      const k=el.dataset.pref; if(el.type==="checkbox")el.checked=!!p[k];else el.value=p[k];
      el.onchange=()=>{const v=el.type==="checkbox"?el.checked:el.type==="number"?Number(el.value):el.value;const n=save({[k]:v});box.querySelector("[data-delay]").style.display=n.videoModerationMode==="delayed"?"block":"none"};
    });
    box.querySelector("[data-delay]").style.display=p.videoModerationMode==="delayed"?"block":"none";
  }
  document.addEventListener("click",e=>{if(e.target.closest("button")&&/Paramètres|Settings|Cài đặt|Einstellungen/i.test(e.target.closest("button").textContent||""))setTimeout(panel,30)},true);
  const obs=new MutationObserver(()=>{apply();panel()});
  function start(){apply();obs.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  window.weddingAccountPreferences={read,save,apply};
})();