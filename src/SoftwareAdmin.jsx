import PasswordInput from "./PasswordInput.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENT_TYPES, THEME_PRESETS, MODULE_META, DEFAULT_MODULES, presetForType } from "./event-config.mjs";
import { formatEuro } from "./billing-config.mjs";

const PLATFORM_OWNER_UID = "beQK5FNoVla9lnvnzSfqasK93QR2";
const APP_BASE = new URL("./", window.location.href).href;
const eventUrl = (slug, admin = false) => `${APP_BASE}?w=${encodeURIComponent(slug)}${admin ? "#admin" : ""}`;
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

const inputStyle={width:"100%",padding:"12px 14px",border:"1px solid #ddd7d2",borderRadius:10,background:"#fff",fontSize:14,color:"#2f2926"};
const btn=(dark=false)=>({border:0,borderRadius:999,padding:"10px 15px",cursor:"pointer",background:dark?"#24201e":"#eee9e5",color:dark?"#fff":"#3d342f",fontWeight:650});
const panel={background:"#fff",padding:22,borderRadius:18,border:"1px solid #e7dfd9",boxShadow:"0 5px 24px #281b1208"};

const emptyForm=()=>({
  name:"",date:"",location:"",organiserName:"",slug:"",adminEmail:"",adminPassword:"",
  eventType:"wedding",customEventType:"",themePreset:presetForType("wedding"),
  modules:{...DEFAULT_MODULES.wedding},
});

function typeMeta(type){return EVENT_TYPES[type]||EVENT_TYPES.custom;}
function presetMeta(id){return THEME_PRESETS[id]||THEME_PRESETS["custom-neutral"];}

export default function SoftwareAdmin(){
  const [user,setUser]=useState(null),[ready,setReady]=useState(false);
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
  const [events,setEvents]=useState([]),[loading,setLoading]=useState(false),[search,setSearch]=useState("");
  const [typeFilter,setTypeFilter]=useState("all");
  const [showCreate,setShowCreate]=useState(false),[createStep,setCreateStep]=useState(1);
  const [form,setForm]=useState(emptyForm);
  const [slugTouched,setSlugTouched]=useState(false);
  const [editing,setEditing]=useState(null);
  const [editForm,setEditForm]=useState(null);
  const [saving,setSaving]=useState(false);
  const [creating,setCreating]=useState(false),[notice,setNotice]=useState(""),[deleting,setDeleting]=useState("");

  useEffect(()=>{let unsub;initFirebase().then(()=>{unsub=fb.onAuthStateChanged(auth,u=>{setUser(u);setReady(true);});}).catch(e=>{setError(e.message);setReady(true)});return()=>unsub?.();},[]);
  const authorized=user?.uid===PLATFORM_OWNER_UID;

  const load=useCallback(async()=>{
    if(!authorized)return;
    setLoading(true);setError("");
    try{
      const call=fb.httpsCallable(functionsApi,"listWeddings");
      const res=await call({});
      setEvents(res.data?.weddings||[]);
    }catch(e){setError(e.message||"Impossible de charger les événements");}
    finally{setLoading(false);}
  },[authorized]);
  useEffect(()=>{if(authorized)load();},[authorized,load]);

  const login=async()=>{
    setError("");
    try{
      const c=await fb.signInWithEmailAndPassword(auth,email.trim(),password);
      if(c.user.uid!==PLATFORM_OWNER_UID){await fb.signOut(auth);throw new Error("Ce compte n’est pas administrateur du logiciel.");}
    }catch(e){setError(e.message||"Connexion impossible");}
  };

  const normalize=v=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
  const setType=(eventType)=>{
    const preset= presetForType(eventType);
    setForm(current=>({...current,eventType,themePreset:preset,modules:{...DEFAULT_MODULES[eventType]}}));
  };
  const toggleModule=(key)=>setForm(current=>({...current,modules:{...current.modules,[key]:!current.modules[key]}}));

  const validateStep=()=>{
    if(createStep===1 && !form.eventType)return "Choisissez un type d’événement.";
    if(createStep===2){
      if(!form.name.trim()||!form.date||!form.adminEmail.trim())return "Nom, date et email administrateur sont obligatoires.";
      if(normalize(form.slug||form.name).length<3)return "Le lien unique doit contenir au moins 3 caractères.";
      if(form.adminPassword.length<8)return "Le mot de passe temporaire doit contenir au moins 8 caractères.";
    }
    return "";
  };
  const nextStep=()=>{const message=validateStep();if(message){setError(message);return;}setError("");setCreateStep(s=>Math.min(4,s+1));};

  const create=async()=>{
    const payload={
      ...form,
      name:form.name.trim(),
      date:form.date,
      location:form.location.trim(),
      organiserName:form.organiserName.trim(),
      customEventType:form.customEventType.trim(),
      adminEmail:form.adminEmail.trim(),
      slug:normalize(form.slug||form.name),
      theme:{preset:form.themePreset,...presetMeta(form.themePreset).colors},
      labels:{},
      branding:{logoUrl:"",coverUrl:"",organisationName:form.organiserName.trim(),showPlatformBranding:true},
    };
    if(!payload.name||!payload.adminEmail||!payload.slug){setError("Nom, lien unique et email administrateur sont obligatoires.");return;}
    if(payload.slug.length<3){setError("Le lien unique doit contenir au moins 3 caractères.");return;}
    if(payload.adminPassword.length<8){setError("Le mot de passe temporaire doit contenir au moins 8 caractères.");return;}
    setCreating(true);setError("");setNotice("");
    try{
      const call=fb.httpsCallable(functionsApi,"createWeddingV2");
      const res=await call(payload);
      if(res.data?.ok===false){
        const where=res.data?.stage? ` [étape: ${res.data.stage}]`:"";
        const code=res.data?.code? ` [${res.data.code}]`:"";
        throw new Error((res.data?.message||"Création impossible")+where+code);
      }
      let accessMessage="";
      try{await fb.sendPasswordResetEmail(auth,payload.adminEmail);accessMessage=" · email d’activation envoyé";}
      catch(mailError){console.warn("Activation email:",mailError);accessMessage=" · événement créé, email d’activation non envoyé";}
      setNotice(`Événement créé : ${payload.name}${accessMessage}`);
      setForm(emptyForm());setSlugTouched(false);setCreateStep(1);setShowCreate(false);
      await load();
    }catch(e){
      console.error("create event UI:",e);
      const details=e?.details;const sourceCode=details?.sourceCode||e?.code||"";
      const sourceMessage=details?.sourceMessage?` — ${details.sourceMessage}`:"";
      setError((e?.message||"Création impossible")+(sourceCode?` [${sourceCode}]`:"")+sourceMessage);
    }finally{setCreating(false);}
  };

  const removeEvent=async(item)=>{
    if(!window.confirm(`Supprimer définitivement « ${item.name} » et toutes ses données ? Cette action est irréversible.`))return;
    setDeleting(item.id);setError("");setNotice("");
    try{
      await fb.httpsCallable(functionsApi,"deleteWedding")({eventId:item.id});
      setNotice(`Événement supprimé : ${item.name}`);await load();
    }catch(e){setError(e.message||"Suppression impossible");}
    finally{setDeleting("");}
  };

  const startEdit=(item)=>{
    setEditing(item);
    setEditForm({
      name:item.name||"",date:item.date||"",location:item.location||"",organiserName:item.organiserName||"",
      active:item.active!==false,eventType:item.eventType||"wedding",customEventType:item.customEventType||"",
      themePreset:item.themePreset||presetForType(item.eventType||"wedding"),
      modules:{...DEFAULT_MODULES[item.eventType||"wedding"],...(item.modules||{})},
    });
    setError("");setNotice("");
  };
  const saveEdit=async()=>{
    if(!editing||!editForm)return;
    if(!editForm.name.trim()){setError("Le nom de l’événement est obligatoire.");return;}
    setSaving(true);setError("");setNotice("");
    try{
      const preset=presetMeta(editForm.themePreset);
      await fb.httpsCallable(functionsApi,"updateWedding")({
        eventId:editing.id,
        name:editForm.name.trim(),date:editForm.date,location:editForm.location.trim(),organiserName:editForm.organiserName.trim(),
        active:!!editForm.active,eventType:editForm.eventType,customEventType:editForm.customEventType.trim(),
        themePreset:editForm.themePreset,theme:{preset:editForm.themePreset,...preset.colors},modules:editForm.modules,
      });
      setNotice(`Événement mis à jour : ${editForm.name.trim()}`);setEditing(null);await load();
    }catch(e){setError(e.message||"Modification impossible");}
    finally{setSaving(false);}
  };
  const toggleActive=async(item)=>{
    setError("");setNotice("");
    try{
      await fb.httpsCallable(functionsApi,"updateWedding")({eventId:item.id,active:!item.active});
      setNotice(`${item.name} : ${item.active?"désactivé":"activé"}`);await load();
    }catch(e){setError(e.message||"Modification impossible");}
  };
  const resetAccess=async(item)=>{
    if(!item.adminEmail){setError("Aucun email administrateur n’est associé à cet événement.");return;}
    setError("");setNotice("");
    try{await fb.sendPasswordResetEmail(auth,item.adminEmail);setNotice(`Email de réinitialisation envoyé à ${item.adminEmail}`);}
    catch(e){setError(e.message||"Impossible d’envoyer l’email de réinitialisation.");}
  };

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return events.filter(item=>{
      const typeOk=typeFilter==="all"||(item.eventType||"wedding")===typeFilter;
      const textOk=!q||[item.name,item.date,item.slug,item.adminEmail,item.location,item.organiserName].some(v=>String(v||"").toLowerCase().includes(q));
      return typeOk&&textOk;
    });
  },[events,search,typeFilter]);

  if(!ready)return <Shell><p style={{color:"#fff"}}>Connexion…</p></Shell>;
  if(!authorized)return <Shell><div style={{maxWidth:390,width:"100%",background:"#fff",padding:30,borderRadius:20,boxShadow:"0 15px 50px #0002"}}><div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",opacity:.55}}>Administration plateforme</div><h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:34,margin:"7px 0 20px"}}>Gestion des événements</h1><a href={APP_BASE} style={{display:"inline-block",color:"#632c3b",fontSize:14,marginBottom:20}}>← Retour à l’accueil</a><div style={{display:"grid",gap:10}}><input style={inputStyle} type="email" autoComplete="username" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><PasswordInput style={inputStyle}  autoComplete="current-password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>{error&&<p style={{color:"#a33",fontSize:13}}>{error}</p>}<button style={btn(true)} onClick={login}>Se connecter</button></div></div></Shell>;

  const countsByType=Object.keys(EVENT_TYPES).map(type=>[type,events.filter(item=>(item.eventType||"wedding")===type).length]).filter(([,count])=>count>0);
  const paidRevenue=events.reduce((sum,item)=>sum+(item.billing?.status==="paid"?(Number(item.billing?.amount)||0):0),0);

  return <div style={{minHeight:"100vh",background:"#f5f3f1",color:"#302824",fontFamily:"Inter,Arial,sans-serif"}}>
    <header style={{background:"#1f1d1c",color:"#fff",padding:"20px clamp(18px,4vw,48px)",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1}}><div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:.55}}>Event-App · Administration plateforme</div><h1 style={{fontFamily:"Georgia,serif",fontWeight:400,margin:"4px 0 0"}}>Tous les événements</h1></div>
      <button style={{...btn(),background:"#fff"}} onClick={()=>{setShowCreate(!showCreate);setCreateStep(1);setError("");}}>{showCreate?"Fermer":"+ Nouvel événement"}</button>
      <button style={{...btn(),background:"#ffffff18",color:"#fff",border:"1px solid #ffffff33"}} onClick={()=>fb.signOut(auth)}>Déconnexion</button>
    </header>

    <main style={{maxWidth:1240,margin:"0 auto",padding:"28px 16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:18}}>
        {[[events.length,"Événements"],[events.filter(e=>e.active).length,"Actifs"],[events.reduce((s,e)=>s+(e.photoCount||0),0),"Photos"],[events.reduce((s,e)=>s+(e.videoCount||0),0),"Vidéos"],[formatEuro(paidRevenue),"CA encaissé"]].map(([n,l])=><div key={l} style={panel}><div style={{fontSize:11,opacity:.55,textTransform:"uppercase",letterSpacing:1}}>{l}</div><div style={{fontFamily:"Georgia,serif",fontSize:31,marginTop:4}}>{n}</div></div>)}
      </div>

      {showCreate&&<CreateWizard form={form} setForm={setForm} step={createStep} setStep={setCreateStep} slugTouched={slugTouched} setSlugTouched={setSlugTouched} normalize={normalize} nextStep={nextStep} create={create} creating={creating} setType={setType} toggleModule={toggleModule}/>}

      {editing&&editForm&&<EditEvent item={editing} form={editForm} setForm={setEditForm} save={saveEdit} saving={saving} close={()=>setEditing(null)}/>}

      {notice&&<div style={{background:"#ecf7ee",color:"#286335",padding:12,borderRadius:10,marginBottom:14}}>{notice}</div>}
      {error&&<div style={{background:"#fff0ed",color:"#a33",padding:12,borderRadius:10,marginBottom:14}}>{error}</div>}

      <section style={panel}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:16}}>
          <div style={{flex:1,minWidth:220}}><h2 style={{fontFamily:"Georgia,serif",fontWeight:400}}>Événements</h2><small>{filtered.length} affiché{filtered.length!==1?"s":""}</small></div>
          <select style={{...inputStyle,maxWidth:210}} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Tous les types</option>{Object.values(EVENT_TYPES).map(type=><option key={type.id} value={type.id}>{type.icon} {type.label}</option>)}</select>
          <input style={{...inputStyle,maxWidth:310}} placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <button style={btn()} onClick={load}>{loading?"Actualisation…":"Actualiser"}</button>
        </div>
        {countsByType.length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>{countsByType.map(([type,count])=><button key={type} onClick={()=>setTypeFilter(type)} style={{...btn(),padding:"7px 11px",fontSize:12,background:typeFilter===type?"#302824":"#f1ece8",color:typeFilter===type?"#fff":"#51453f"}}>{typeMeta(type).icon} {typeMeta(type).label} · {count}</button>)}</div>}
        {!loading&&filtered.length===0&&<p role="status">{search||typeFilter!=="all"?"Aucun événement ne correspond aux filtres.":"Aucun événement pour le moment."}</p>}
        <div style={{display:"grid",gap:10}}>{filtered.map(item=><EventRow key={item.id} item={item} onEdit={()=>startEdit(item)} onToggle={()=>toggleActive(item)} onReset={()=>resetAccess(item)} onDelete={()=>removeEvent(item)} deleting={deleting===item.id}/>)}</div>
      </section>
    </main>
  </div>;
}

function CreateWizard({form,setForm,step,setStep,slugTouched,setSlugTouched,normalize,nextStep,create,creating,setType,toggleModule}){
  const preset=presetMeta(form.themePreset);
  const type=typeMeta(form.eventType);
  const steps=["Type","Informations","Style & modules","Aperçu"];
  return <section style={{...panel,marginBottom:18}}>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:20}}><div style={{flex:1}}><div style={{fontSize:11,letterSpacing:1.5,textTransform:"uppercase",opacity:.55}}>Nouvel événement</div><h2 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:28}}>Créer un espace</h2></div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{steps.map((label,i)=><button key={label} type="button" onClick={()=>i+1<step&&setStep(i+1)} style={{border:0,borderRadius:99,padding:"7px 10px",fontSize:12,background:step===i+1?"#302824":"#f0ece9",color:step===i+1?"#fff":"#776b65"}}>{i+1}. {label}</button>)}</div></div>

    {step===1&&<div><p style={{marginBottom:15,color:"#6f655f"}}>Choisissez la typologie. Elle configure automatiquement le design, les textes et les modules recommandés.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>{Object.values(EVENT_TYPES).map(meta=><button key={meta.id} onClick={()=>setType(meta.id)} style={{padding:17,borderRadius:14,textAlign:"left",border:`2px solid ${form.eventType===meta.id?"#302824":"#e4ddd8"}`,background:form.eventType===meta.id?"#faf6f2":"#fff"}}><div style={{fontSize:29}}>{meta.icon}</div><strong style={{display:"block",fontSize:16,marginTop:6}}>{meta.label}</strong><span style={{display:"block",fontSize:12,color:"#746963",marginTop:4,lineHeight:1.4}}>{meta.description}</span></button>)}</div>{form.eventType==="custom"&&<input style={{...inputStyle,marginTop:12}} placeholder="Nom du type d’événement" value={form.customEventType} onChange={e=>setForm({...form,customEventType:e.target.value})}/>}<WizardNav next={nextStep}/></div>}

    {step===2&&<div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
      <Field label="Nom de l’événement"><input style={inputStyle} placeholder="Ex. Afterwork Direction 2026" value={form.name} onChange={e=>{const name=e.target.value;setForm({...form,name,slug:slugTouched?form.slug:normalize(name)})}}/></Field>
      <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
      <Field label="Lieu"><input style={inputStyle} placeholder="Paris, siège, rooftop…" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field>
      <Field label="Organisateur"><input style={inputStyle} placeholder="Entreprise / équipe / couple" value={form.organiserName} onChange={e=>setForm({...form,organiserName:e.target.value})}/></Field>
      <Field label="Lien unique"><input style={inputStyle} value={form.slug} onChange={e=>{setSlugTouched(true);setForm({...form,slug:normalize(e.target.value)})}}/></Field>
      <Field label="Email administrateur"><input style={inputStyle} type="email" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})}/></Field>
      <Field label="Mot de passe temporaire"><PasswordInput style={inputStyle}  value={form.adminPassword} onChange={e=>setForm({...form,adminPassword:e.target.value})}/></Field>
    </div><WizardNav back={()=>setStep(1)} next={nextStep}/></div>}

    {step===3&&<div><h3 style={{fontFamily:"Georgia,serif",fontWeight:400,marginBottom:10}}>Univers visuel</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginBottom:20}}>{Object.values(THEME_PRESETS).map(p=><button key={p.id} onClick={()=>setForm({...form,themePreset:p.id})} style={{padding:0,borderRadius:14,overflow:"hidden",border:`2px solid ${form.themePreset===p.id?"#302824":"#e5dfdb"}`,background:"#fff",textAlign:"left"}}><div style={{height:72,background:p.hero}}/><div style={{padding:12}}><strong>{p.label}</strong><div style={{fontSize:11,color:"#766b64",marginTop:3}}>{p.description}</div><div style={{display:"flex",gap:4,marginTop:8}}>{Object.values(p.colors).slice(0,5).map((color,i)=><span key={i} style={{width:18,height:18,borderRadius:"50%",background:color,border:"1px solid #0001"}}/>)}</div></div></button>)}</div>
      <h3 style={{fontFamily:"Georgia,serif",fontWeight:400,marginBottom:10}}>Modules activés</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>{Object.entries(MODULE_META).map(([key,meta])=><label key={key} style={{display:"flex",gap:10,alignItems:"center",border:"1px solid #e5dfdb",borderRadius:12,padding:12,background:form.modules[key]?"#f7f3ef":"#fff",cursor:"pointer"}}><input type="checkbox" checked={!!form.modules[key]} onChange={()=>toggleModule(key)}/><span>{meta.icon} {meta.label}</span></label>)}</div>
      <WizardNav back={()=>setStep(2)} next={nextStep}/>
    </div>}

    {step===4&&<div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(260px,390px)",gap:24,alignItems:"start"}}><div><h3 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:24}}>Résumé</h3><p style={{color:"#766b64",marginTop:6}}>{type.icon} {type.label} · {preset.label}</p><dl style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:"8px 12px",marginTop:18,fontSize:14}}><dt>Nom</dt><dd>{form.name||"—"}</dd><dt>Date</dt><dd>{form.date||"—"}</dd><dt>Lieu</dt><dd>{form.location||"—"}</dd><dt>Lien</dt><dd>{normalize(form.slug||form.name)||"—"}</dd><dt>Admin</dt><dd>{form.adminEmail||"—"}</dd></dl><div style={{marginTop:18,display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(form.modules).filter(([,on])=>on).map(([key])=><span key={key} style={{fontSize:11,padding:"5px 8px",borderRadius:99,background:"#f0ece8"}}>{MODULE_META[key]?.icon} {MODULE_META[key]?.label}</span>)}</div></div><EventPreview form={form}/></div><WizardNav back={()=>setStep(3)} create={create} creating={creating}/></div>}
  </section>;
}

function EventPreview({form}){
  const p=presetMeta(form.themePreset);const meta=typeMeta(form.eventType);
  return <div style={{borderRadius:28,overflow:"hidden",boxShadow:"0 15px 45px #0002",background:p.colors.background,border:"7px solid #1d1d1f",minHeight:520}}>
    <div style={{padding:"30px 22px 26px",background:p.hero,color:p.darkHero?"#fff":p.colors.primary,textAlign:"center"}}>
      <div style={{fontSize:35}}>{meta.icon}</div><h3 style={{fontFamily:p.titleFont,fontSize:32,margin:"10px 0 4px",fontWeight:500}}>{form.name||"Nom de l’événement"}</h3><div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:.75}}>{form.date||"DATE"}{form.location?` · ${form.location}`:""}</div>
    </div>
    <div style={{padding:15,display:"grid",gap:9}}>{Object.entries(form.modules).filter(([key,on])=>on&&["photoUpload","gallery","videoTestimonials","tvDisplay","schedule","practicalInfo"].includes(key)).slice(0,5).map(([key])=><div key={key} style={{background:p.colors.surface,borderRadius:p.radius,padding:"15px 16px",border:`1px solid ${p.colors.soft}`,color:p.colors.text}}><strong>{MODULE_META[key]?.icon} {MODULE_META[key]?.label}</strong></div>)}</div>
  </div>;
}

function WizardNav({back,next,create,creating}){return <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:22}}><div>{back&&<button style={btn()} onClick={back}>← Retour</button>}</div><div>{next&&<button style={btn(true)} onClick={next}>Continuer →</button>}{create&&<button style={btn(true)} disabled={creating} onClick={create}>{creating?"Création…":"Créer l’événement"}</button>}</div></div>}
function Field({label,children}){return <label style={{display:"grid",gap:5,fontSize:12,color:"#6e625c"}}><span>{label}</span>{children}</label>}

function EditEvent({item,form,setForm,save,saving,close}){
  const setType=value=>setForm({...form,eventType:value,themePreset:presetForType(value),modules:{...DEFAULT_MODULES[value]}});
  return <section style={{...panel,marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.5,opacity:.55}}>Modifier l’événement</div><h2 style={{fontFamily:"Georgia,serif",fontWeight:400}}>{item.name}</h2></div><button style={btn()} onClick={close}>Fermer</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10,marginTop:16}}>
      <Field label="Nom"><input style={inputStyle} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
      <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
      <Field label="Lieu"><input style={inputStyle} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field>
      <Field label="Organisateur"><input style={inputStyle} value={form.organiserName} onChange={e=>setForm({...form,organiserName:e.target.value})}/></Field>
      <Field label="Type"><select style={inputStyle} value={form.eventType} onChange={e=>setType(e.target.value)}>{Object.values(EVENT_TYPES).map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></Field>
      <Field label="Thème"><select style={inputStyle} value={form.themePreset} onChange={e=>setForm({...form,themePreset:e.target.value})}>{Object.values(THEME_PRESETS).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
      <label style={{display:"flex",alignItems:"center",gap:10,padding:"24px 8px 0"}}><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Événement actif</label>
    </div>
    <h3 style={{fontFamily:"Georgia,serif",fontWeight:400,margin:"20px 0 10px"}}>Modules</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:7}}>{Object.entries(MODULE_META).map(([key,meta])=><label key={key} style={{display:"flex",gap:9,alignItems:"center",padding:10,border:"1px solid #e6dfda",borderRadius:10}}><input type="checkbox" checked={!!form.modules[key]} onChange={()=>setForm({...form,modules:{...form.modules,[key]:!form.modules[key]}})}/>{meta.icon} {meta.label}</label>)}</div>
    <button style={{...btn(true),marginTop:18}} disabled={saving} onClick={save}>{saving?"Enregistrement…":"Enregistrer les modifications"}</button>
  </section>;
}

function EventRow({item,onEdit,onToggle,onReset,onDelete,deleting}){
  const meta=typeMeta(item.eventType||"wedding"),preset=presetMeta(item.themePreset||presetForType(item.eventType||"wedding"));
  return <div style={{border:"1px solid #e5ddd8",borderRadius:14,padding:15,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",background:"#fff"}}>
    <div style={{width:46,height:46,borderRadius:12,display:"grid",placeItems:"center",fontSize:23,background:preset.colors.soft,color:preset.colors.primary}}>{meta.icon}</div>
    <div style={{flex:"1 1 300px"}}><strong style={{fontFamily:"Georgia,serif",fontSize:20}}>{item.name}</strong><div style={{fontSize:13,opacity:.65,marginTop:3}}>{meta.label} · {preset.label} · {item.date||"Date non renseignée"}</div><div style={{fontSize:12,opacity:.55,marginTop:3}}>{item.location?item.location+" · ":""}Admin : {item.adminEmail||"—"} · <strong>{item.active?"Actif":"Désactivé"}</strong></div></div>
    <div style={{fontSize:13,textAlign:"right"}}>{item.photoCount||0} photos · {item.videoCount||0} vidéos<div style={{fontSize:11,opacity:.62,marginTop:4}}>{item.billing?.status==="paid"?"Payé · "+formatEuro(item.billing?.amount):item.billing?.status==="manual"?"Gestion manuelle":"Paiement en attente"}</div></div>
    <button style={btn()} onClick={onEdit}>Modifier</button><button style={btn()} onClick={onToggle}>{item.active?"Désactiver":"Activer"}</button><button style={btn()} onClick={onReset}>Réinitialiser accès</button><button style={btn()} onClick={()=>window.open(eventUrl(item.slug),"_blank","noopener,noreferrer")}>Application</button><button style={btn(true)} onClick={()=>window.open(eventUrl(item.slug,true),"_blank","noopener,noreferrer")}>Admin</button><button style={{...btn(),background:"#fff0ed",color:"#a33"}} disabled={deleting} onClick={onDelete}>{deleting?"Suppression…":"Supprimer"}</button>
  </div>;
}

function Shell({children}){return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"linear-gradient(145deg,#171514,#35302d)",fontFamily:"Inter,Arial,sans-serif"}}>{children}</div>}
