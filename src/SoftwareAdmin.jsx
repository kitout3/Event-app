import { useCallback, useEffect, useMemo, useState } from "react";

const PLATFORM_OWNER_UID = "beQK5FNoVla9lnvnzSfqasK93QR2";
const APP_BASE = `${window.location.origin}${window.location.pathname.replace(/admin\.html$/, "")}`;
const runtimeConfig = window.__FIREBASE_CONFIG__ || {};
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || runtimeConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || runtimeConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || runtimeConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || runtimeConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || runtimeConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || runtimeConfig.appId,
};

let auth, functionsApi, fb;

async function initFirebase() {
  if (auth) return;
  const [{ initializeApp, getApps }, authMod, fnMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js"),
  ]);
  const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  auth = authMod.getAuth(app);
  functionsApi = fnMod.getFunctions(app, "europe-west1");
  fb = { ...authMod, ...fnMod };
}

const inputStyle={width:"100%",padding:"12px 14px",border:"1px solid #e5d6cf",borderRadius:10,background:"#fff",fontSize:14};
const btn=(dark=false)=>({border:0,borderRadius:999,padding:"10px 15px",cursor:"pointer",background:dark?"#4b261b":"#efe4de",color:dark?"#fff":"#4b261b",fontWeight:600});

export default function SoftwareAdmin(){
  const [user,setUser]=useState(null),[ready,setReady]=useState(false);
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
  const [weddings,setWeddings]=useState([]),[loading,setLoading]=useState(false),[search,setSearch]=useState("");
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({name:"",date:"",slug:"",adminEmail:"",adminPassword:""});
  const [slugTouched,setSlugTouched]=useState(false);
  const [editing,setEditing]=useState(null);
  const [editForm,setEditForm]=useState({name:"",date:"",active:true});
  const [saving,setSaving]=useState(false);
  const [creating,setCreating]=useState(false),[notice,setNotice]=useState(""),[deleting,setDeleting]=useState("");

  useEffect(()=>{ let unsub; initFirebase().then(()=>{unsub=fb.onAuthStateChanged(auth,u=>{setUser(u);setReady(true);});}).catch(e=>{setError(e.message);setReady(true)}); return()=>unsub?.();},[]);
  const authorized=user?.uid===PLATFORM_OWNER_UID;

  const load=useCallback(async()=>{
    if(!authorized)return;
    setLoading(true); setError("");
    try{
      const call=fb.httpsCallable(functionsApi,"listWeddings");
      const res=await call({});
      setWeddings(res.data?.weddings||[]);
    }catch(e){setError(e.message||"Impossible de charger les mariages");}
    finally{setLoading(false);}
  },[authorized]);
  useEffect(()=>{if(authorized)load();},[authorized,load]);

  const login=async()=>{setError("");try{const c=await fb.signInWithEmailAndPassword(auth,email.trim(),password);if(c.user.uid!==PLATFORM_OWNER_UID){await fb.signOut(auth);throw new Error("Ce compte n’est pas administrateur du logiciel.");}}catch(e){setError(e.message||"Connexion impossible");}};
  const normalize=v=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
  const create=async()=>{
    setCreating(true); setError(""); setNotice("");
    const payload={...form,name:form.name.trim(),date:form.date.trim(),adminEmail:form.adminEmail.trim(),slug:normalize(form.slug||form.name)};
    if(!payload.name||!payload.adminEmail||!payload.slug){setError("Nom, lien unique et email administrateur sont obligatoires.");setCreating(false);return;}
    if(payload.slug.length<3){setError("Le lien unique doit contenir au moins 3 caractères.");setCreating(false);return;}
    if(payload.adminPassword.length<8){setError("Le mot de passe temporaire doit contenir au moins 8 caractères.");setCreating(false);return;}
    try{
      const call=fb.httpsCallable(functionsApi,"createWeddingV2");
      const res=await call(payload);
      if(res.data?.ok===false){
        const where=res.data?.stage ? ` [étape: ${res.data.stage}]` : "";
        const code=res.data?.code ? ` [${res.data.code}]` : "";
        throw new Error((res.data?.message||"Création impossible")+where+code);
      }
      setForm({name:"",date:"",slug:"",adminEmail:"",adminPassword:""});
      setSlugTouched(false);
      setShowCreate(false);
      setNotice(`Mariage créé avec succès : ${payload.name}`);
      await load();
      if(res.data?.guestUrl) window.open(res.data.guestUrl,"_blank");
    }catch(e){
      console.error("createWedding UI:", e);
      const details=e?.details;
      const sourceCode=details?.sourceCode || e?.code || "";
      const sourceMessage=details?.sourceMessage ? ` — ${details.sourceMessage}` : "";
      const suffix=sourceCode ? ` [${sourceCode}]` : "";
      setError((e?.message||"Création impossible")+suffix+sourceMessage);
    }
    finally{setCreating(false)}
  };
  const removeWedding=async(w)=>{
    if(!window.confirm(`Supprimer définitivement « ${w.name} » et toutes ses données ? Cette action est irréversible.`))return;
    setDeleting(w.id);setError("");setNotice("");
    try{
      const call=fb.httpsCallable(functionsApi,"deleteWedding");
      await call({eventId:w.id});
      setNotice(`Mariage supprimé : ${w.name}`);
      await load();
    }catch(e){setError(e.message||"Suppression impossible");}
    finally{setDeleting("");}
  };

  const startEdit=(w)=>{
    setEditing(w);
    setEditForm({name:w.name||"",date:w.date||"",active:w.active!==false});
    setError("");setNotice("");
  };
  const saveEdit=async()=>{
    if(!editing)return;
    if(!editForm.name.trim()){setError("Le nom du mariage est obligatoire.");return;}
    setSaving(true);setError("");setNotice("");
    try{
      const call=fb.httpsCallable(functionsApi,"updateWedding");
      await call({eventId:editing.id,name:editForm.name.trim(),date:editForm.date.trim(),active:!!editForm.active});
      setNotice(`Mariage mis à jour : ${editForm.name.trim()}`);
      setEditing(null);
      await load();
    }catch(e){setError(e.message||"Modification impossible");}
    finally{setSaving(false);}
  };
  const toggleActive=async(w)=>{
    setError("");setNotice("");
    try{
      const call=fb.httpsCallable(functionsApi,"updateWedding");
      await call({eventId:w.id,active:!w.active});
      setNotice(`${w.name} : ${w.active?"désactivé":"activé"}`);
      await load();
    }catch(e){setError(e.message||"Modification impossible");}
  };

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return weddings.filter(w=>!q||[w.name,w.date,w.slug,w.adminEmail].some(v=>String(v||"").toLowerCase().includes(q)))},[weddings,search]);
  if(!ready)return <Shell><p>Connexion…</p></Shell>;
  if(!authorized)return <Shell><div style={{maxWidth:390,width:"100%",background:"#fff",padding:30,borderRadius:20,boxShadow:"0 15px 50px #0002"}}><div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",opacity:.55}}>Administration logiciel</div><h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:34,margin:"7px 0 20px"}}>Gestion des mariages</h1><div style={{display:"grid",gap:10}}><input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input style={inputStyle} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>{error&&<p style={{color:"#a33",fontSize:13}}>{error}</p>}<button style={btn(true)} onClick={login}>Se connecter</button></div></div></Shell>;

  return <div style={{minHeight:"100vh",background:"#f7f3f0",color:"#38231c",fontFamily:"Arial,sans-serif"}}>
    <header style={{background:"#24140e",color:"#fff",padding:"18px clamp(18px,4vw,48px)",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1}}><div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:.55}}>Administration logiciel · build 2026.09.19-5</div><h1 style={{fontFamily:"Georgia,serif",fontWeight:400,margin:"4px 0 0"}}>Tous les mariages</h1></div>
      <button style={{...btn(),background:"#fff"}} onClick={()=>setShowCreate(!showCreate)}>{showCreate?"Fermer":"Nouveau mariage"}</button>
      <button style={{...btn(),background:"#ffffff18",color:"#fff",border:"1px solid #ffffff33"}} onClick={()=>fb.signOut(auth)}>Déconnexion</button>
    </header>
    <main style={{maxWidth:1180,margin:"0 auto",padding:"28px 16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:18}}>
        {[[weddings.length,"Mariages"],[weddings.filter(w=>w.active).length,"Actifs"],[weddings.reduce((s,w)=>s+(w.photoCount||0),0),"Photos"],[weddings.reduce((s,w)=>s+(w.videoCount||0),0),"Vidéos"]].map(([n,l])=><div key={l} style={{background:"#fff",padding:20,borderRadius:16,border:"1px solid #eaded7"}}><div style={{fontSize:12,opacity:.6,textTransform:"uppercase"}}>{l}</div><div style={{fontFamily:"Georgia,serif",fontSize:30,marginTop:4}}>{n}</div></div>)}
      </div>
      {showCreate&&<section style={{background:"#fff",padding:22,borderRadius:18,border:"1px solid #eaded7",marginBottom:18}}><h2 style={{fontFamily:"Georgia,serif",fontWeight:400}}>Créer un mariage</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:14}}><input style={inputStyle} placeholder="Nom · Julie & Paul" value={form.name} onChange={e=>{const name=e.target.value;setForm({...form,name,slug:slugTouched?form.slug:normalize(name)})}}/><input style={inputStyle} placeholder="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><input style={inputStyle} placeholder="Lien unique (généré automatiquement)" value={form.slug} onChange={e=>{setSlugTouched(true);setForm({...form,slug:normalize(e.target.value)})}}/><input style={inputStyle} type="email" placeholder="Email administrateur" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})}/><input style={inputStyle} type="password" placeholder="Mot de passe temporaire" value={form.adminPassword} onChange={e=>setForm({...form,adminPassword:e.target.value})}/><button style={btn(true)} disabled={creating} onClick={create}>{creating?"Création…":"Créer le mariage"}</button></div><p style={{fontSize:12,opacity:.6,marginTop:10}}>Le lien est généré depuis le nom. Modifie-le seulement si nécessaire.</p></section>}
      {editing&&<section style={{background:"#fff",padding:22,borderRadius:18,border:"1px solid #eaded7",marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><h2 style={{fontFamily:"Georgia,serif",fontWeight:400}}>Modifier {editing.name}</h2><button style={btn()} onClick={()=>setEditing(null)}>Annuler</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:14}}><input style={inputStyle} placeholder="Nom du mariage" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/><input style={inputStyle} placeholder="Date" value={editForm.date} onChange={e=>setEditForm({...editForm,date:e.target.value})}/><label style={{display:"flex",alignItems:"center",gap:10,padding:"0 8px"}}><input type="checkbox" checked={editForm.active} onChange={e=>setEditForm({...editForm,active:e.target.checked})}/> Mariage actif</label><button style={btn(true)} disabled={saving} onClick={saveEdit}>{saving?"Enregistrement…":"Enregistrer"}</button></div></section>}
      {notice&&<div style={{background:"#eef8ef",color:"#286335",padding:12,borderRadius:10,marginBottom:14}}>{notice}</div>}
      {error&&<div style={{background:"#fff0ed",color:"#a33",padding:12,borderRadius:10,marginBottom:14}}>{error}</div>}
      <section style={{background:"#fff",padding:22,borderRadius:18,border:"1px solid #eaded7"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:16}}><div style={{flex:1}}><h2 style={{fontFamily:"Georgia,serif",fontWeight:400}}>Mariages en cours</h2><small>{filtered.length} mariage{filtered.length!==1?"s":""}</small></div><input style={{...inputStyle,maxWidth:350}} placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/><button style={btn()} onClick={load}>{loading?"Actualisation…":"Actualiser"}</button></div>
        <div style={{display:"grid",gap:10}}>{filtered.map(w=><div key={w.id} style={{border:"1px solid #eaded7",borderRadius:14,padding:15,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}><div style={{flex:"1 1 300px"}}><strong style={{fontFamily:"Georgia,serif",fontSize:20}}>{w.name}</strong><div style={{fontSize:13,opacity:.65,marginTop:3}}>{w.date||"Date non renseignée"} · {w.slug}</div><div style={{fontSize:12,opacity:.55,marginTop:3}}>Admin : {w.adminEmail||"—"} · <strong>{w.active?"Actif":"Désactivé"}</strong></div></div><div style={{fontSize:13}}>{w.photoCount||0} photos · {w.videoCount||0} vidéos</div><button style={btn()} onClick={()=>startEdit(w)}>Modifier</button><button style={btn()} onClick={()=>toggleActive(w)}>{w.active?"Désactiver":"Activer"}</button><button style={btn()} onClick={()=>window.open(w.guestUrl||`${APP_BASE}?w=${encodeURIComponent(w.slug)}`,"_blank")}>Application</button><button style={btn(true)} onClick={()=>window.open(w.adminUrl||`${APP_BASE}?w=${encodeURIComponent(w.slug)}#admin`,"_blank")}>Admin mariage</button><button style={{...btn(),background:"#fff0ed",color:"#a33"}} disabled={deleting===w.id} onClick={()=>removeWedding(w)}>{deleting===w.id?"Suppression…":"Supprimer"}</button></div>)}</div>
      </section>
    </main>
  </div>;
}
function Shell({children}){return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"linear-gradient(145deg,#1a1008,#3d2010)",fontFamily:"Arial,sans-serif"}}>{children}</div>}
