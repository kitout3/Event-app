import { useEffect, useState } from "react";

const filters = [["all","Toutes"],["pending","En attente"],["approved","Validées"],["rejected","Refusées"]];
const buttonStyle = {padding:"9px 14px",borderRadius:999,border:"1px solid var(--blush)",background:"var(--white)",color:"var(--burgundy)",cursor:"pointer"};

export default function AdminVideos({ eventId, db, storage, firebase }) {
  const [videos,setVideos] = useState([]);
  const [filter,setFilter] = useState("all");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  useEffect(()=>{
    if(!firebase||!db){setError("Connexion Firebase indisponible.");setLoading(false);return;}
    setLoading(true);
    const query=firebase.query(firebase.collection(db,"events",eventId,"videoTestimonials"),firebase.orderBy("createdAt","desc"));
    return firebase.onSnapshot(query,snapshot=>{
      setVideos(snapshot.docs.map(doc=>({...doc.data(),id:doc.id})));
      setLoading(false);
    },()=>{setError("Impossible de charger les vidéos. Vérifiez votre connexion administrateur.");setLoading(false);});
  },[eventId,db,firebase]);

  const act=async(action,success)=>{
    if(busy)return;
    setBusy(true);setError("");setNotice("");
    try{await action();setNotice(success);}
    catch{setError("L’opération a échoué. Réessayez ; la liste n’a pas été supprimée de cet écran.");}
    finally{setBusy(false);}
  };
  const moderate=(video,status)=>act(()=>firebase.updateDoc(firebase.doc(db,"events",eventId,"videoTestimonials",video.id),{
    status,selectedForTv:status==="approved",updatedAt:firebase.serverTimestamp(),
  }),status==="approved"?"Vidéo validée et publiée.":"Vidéo refusée, masquée aux invités.");
  const remove=video=>{
    if(!window.confirm("Supprimer définitivement cette vidéo et son fichier ?"))return;
    return act(async()=>{
      if(video.path){
        if(!video.path.startsWith(`events/${eventId}/videos/`))throw new Error("Invalid event storage path");
        try{await firebase.deleteObject(firebase.ref(storage,video.path));}
        catch(error){if(error?.code!=="storage/object-not-found")throw error;}
      }
      await firebase.deleteDoc(firebase.doc(db,"events",eventId,"videoTestimonials",video.id));
    },"Vidéo supprimée.");
  };
  const download=video=>act(async()=>{
    if(typeof window.weddingDownloadMedia!=="function")throw new Error("Download unavailable");
    const extension=(video.mimeType||"").includes("quicktime")?"mov":(video.mimeType||"").includes("webm")?"webm":"mp4";
    await window.weddingDownloadMedia({kind:"video",id:video.id,url:video.url,name:`video-${video.id}.${extension}`});
  },"");
  const statusOf=video=>video.status||"pending";
  const visible=videos.filter(video=>filter==="all"||statusOf(video)===filter);

  return <section aria-label="Modération des vidéos">
    <h2 style={{fontFamily:"var(--event-title-font)",color:"var(--burgundy)",marginBottom:8}}>Vidéos</h2>
    <p style={{color:"var(--muted)",fontSize:13,marginBottom:16}}>Visionnez les vidéos, validez leur publication, refusez-les ou supprimez-les.</p>
    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
      {filters.map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} style={{...buttonStyle,background:filter===key?"var(--burgundy)":"var(--white)",color:filter===key?"#fff":"var(--burgundy)"}} onClick={()=>setFilter(key)}>{label} ({key==="all"?videos.length:videos.filter(video=>statusOf(video)===key).length})</button>)}
    </div>
    {error&&<p role="alert" style={{color:"#b83232",marginBottom:12}}>{error}</p>}
    {notice&&<p role="status" style={{color:"#26734d",marginBottom:12}}>{notice}</p>}
    {loading?<p>Chargement des vidéos…</p>:!visible.length?<p>Aucune vidéo dans cette catégorie.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:14}}>
      {visible.map(video=><article key={video.id} style={{background:"var(--white)",border:"1px solid var(--blush)",borderRadius:16,overflow:"hidden"}}>
        <video controls playsInline preload="metadata" src={video.url} style={{display:"block",width:"100%",aspectRatio:"16/9",background:"#161616"}}/>
        <div style={{padding:14,display:"grid",gap:9}}>
          <strong>{video.author||"Sans prénom"}</strong>
          {video.message&&<p><span translate="no">{video.message}</span></p>}
          <span style={{fontSize:13,color:"var(--muted)"}}>{Math.round(Number(video.duration)||0)} s · {Math.round((Number(video.size)||0)/1048576)} Mo · {filters.find(([key])=>key===statusOf(video))?.[1]||statusOf(video)}</span>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            <button type="button" style={buttonStyle} disabled={busy||statusOf(video)==="approved"} onClick={()=>moderate(video,"approved")}>Valider</button>
            <button type="button" style={buttonStyle} disabled={busy||statusOf(video)==="rejected"} onClick={()=>moderate(video,"rejected")}>Refuser</button>
            <button type="button" style={buttonStyle} disabled={busy} onClick={()=>download(video)}>Télécharger</button>
            <button type="button" style={{...buttonStyle,color:"#b83232"}} disabled={busy} onClick={()=>remove(video)}>Supprimer</button>
          </div>
        </div>
      </article>)}
    </div>}
  </section>;
}
