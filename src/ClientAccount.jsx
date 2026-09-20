import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENT_TYPES, THEME_PRESETS, DEFAULT_MODULES, presetForType } from "./event-config.mjs";
import { BILLING_PLANS, amountForPlan, billingSegmentForEventType, formatEuro } from "./billing-config.mjs";
import PasswordInput from "./PasswordInput.jsx";
import { guestLoginError } from "./auth-errors.mjs";

const runtimeConfig=window.__FIREBASE_CONFIG__||{};
const FIREBASE_CONFIG={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY||runtimeConfig.apiKey,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||runtimeConfig.authDomain,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||runtimeConfig.projectId,
  storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||runtimeConfig.storageBucket,
  messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||runtimeConfig.messagingSenderId,
  appId:import.meta.env.VITE_FIREBASE_APP_ID||runtimeConfig.appId,
};
const APP_BASE=new URL("./",window.location.href).href;
const EVENT_URL=slug=>APP_BASE+"?w="+encodeURIComponent(slug);
const ACCOUNT_URL=new URL("account.html",APP_BASE).href;

let auth,functionsApi,fb;
async function initFirebase(){
  if(auth)return;
  const [{initializeApp,getApps},authMod,fnMod]=await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js"),
  ]);
  const app=getApps()[0]||initializeApp(FIREBASE_CONFIG);
  auth=authMod.getAuth(app);functionsApi=fnMod.getFunctions(app,"europe-west1");fb={...authMod,...fnMod};
}

const emptyEvent=()=>({
  eventType:"wedding",customEventType:"",name:"",date:"",location:"",organiserName:"",
  themePreset:presetForType("wedding"),modules:{...DEFAULT_MODULES.wedding},planId:"event",
});

function normalizeSlug(value){return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)}
function typeMeta(type){return EVENT_TYPES[type]||EVENT_TYPES.custom}
function presetMeta(id){return THEME_PRESETS[id]||THEME_PRESETS["custom-neutral"]}

export default function ClientAccount(){
  const params=new URLSearchParams(window.location.search);
  const initialCreate=params.get("mode")==="create";
  const [ready,setReady]=useState(false),[user,setUser]=useState(null),[authMode,setAuthMode]=useState(initialCreate?"signup":"login");
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[displayName,setDisplayName]=useState("");
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const [events,setEvents]=useState([]),[loading,setLoading]=useState(false),[tab,setTab]=useState("events");
  const [showCreate,setShowCreate]=useState(initialCreate),[step,setStep]=useState(1),[form,setForm]=useState(emptyEvent);
  const [audience,setAudience]=useState("organizer");
  const [guestId,setGuestId]=useState("");
  const [guestPassword,setGuestPassword]=useState("");
  const switchAudience=value=>{setAudience(value);setError("");setPassword("");setGuestPassword("");};

  const loadEvents=useCallback(async()=>{
    if(!auth?.currentUser)return;
    setLoading(true);setError("");
    try{
      const result=await fb.httpsCallable(functionsApi,"listMyEvents")({});
      setEvents(result.data?.events||[]);
    }catch(e){setError(e.message||"Impossible de charger vos événements.");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{
    let unsub;
    initFirebase().then(()=>{
      unsub=fb.onAuthStateChanged(auth,async current=>{
        // A shared guest session must never open the organiser dashboard.
        if(current?.uid?.startsWith("event-guest-")){
          setUser(null);setReady(true);setEvents([]);return;
        }
        setUser(current||null);setReady(true);
        if(current){
          await loadEvents();
          const query=new URLSearchParams(window.location.search);
          const sessionId=query.get("session_id");
          if(query.get("checkout")==="success"&&sessionId){
            try{
              setBusy(true);
              await fb.httpsCallable(functionsApi,"confirmEventCheckout")({sessionId});
              setNotice("Paiement confirmé. Votre événement est maintenant actif.");
              await loadEvents();
              window.history.replaceState(null,"",ACCOUNT_URL);
            }catch(e){setError(e.message||"Le paiement a été reçu mais sa confirmation est encore en cours.");}
            finally{setBusy(false);}
          }else if(query.get("checkout")==="cancelled"){
            setNotice("Paiement annulé. Votre événement reste dans votre espace et vous pourrez reprendre le paiement.");
            window.history.replaceState(null,"",ACCOUNT_URL);
          }
        }
      });
    }).catch(e=>{setError(e.message);setReady(true);});
    return()=>unsub?.();
  },[loadEvents]);

  const submitAuth=async e=>{
    e.preventDefault();setBusy(true);setError("");
    try{
      if(authMode==="signup"){
        if(password.length<8)throw new Error("Choisissez un mot de passe d’au moins 8 caractères.");
        const credential=await fb.createUserWithEmailAndPassword(auth,email.trim(),password);
        if(displayName.trim())await fb.updateProfile(credential.user,{displayName:displayName.trim()});
        setNotice("Compte créé. Vous pouvez maintenant créer votre premier événement.");
        setShowCreate(true);
      }else await fb.signInWithEmailAndPassword(auth,email.trim(),password);
    }catch(e){
      const code=String(e?.code||"");
      if(code.includes("email-already-in-use"))setError("Cette adresse possède déjà un compte. Utilisez « Se connecter ».");
      else if(code.includes("invalid-credential"))setError("Email ou mot de passe incorrect.");
      else setError(e.message||"Connexion impossible.");
    }finally{setBusy(false);}
  };

  const submitGuest=async e=>{
    e.preventDefault();if(busy)return;
    setBusy(true);setError("");
    try{
      const result=await fb.httpsCallable(functionsApi,"loginPrivateEvent")({accessId:guestId.trim(),password:guestPassword});
      const {email:guestEmail,eventId}=result.data||{};
      if(!guestEmail||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(eventId||""))throw new Error("Invalid guest response");
      await fb.signInWithEmailAndPassword(auth,guestEmail,guestPassword);
      setGuestPassword("");
      window.location.assign(EVENT_URL(eventId));
    }catch(e){setError(guestLoginError(e));}
    finally{setBusy(false);}
  };

  const changeType=eventType=>setForm(current=>({...current,eventType,themePreset:presetForType(eventType),modules:{...DEFAULT_MODULES[eventType]}}));
  const segment=billingSegmentForEventType(form.eventType,EVENT_TYPES);
  const selectedAmount=amountForPlan(form.planId,segment);

  const createAndPay=async()=>{
    setBusy(true);setError("");setNotice("");
    try{
      if(!form.name.trim()||!form.date)throw new Error("Nom et date de l’événement sont obligatoires.");
      const preset=presetMeta(form.themePreset);
      const draft=await fb.httpsCallable(functionsApi,"createClientEventDraft")({
        name:form.name.trim(),date:form.date,location:form.location.trim(),organiserName:form.organiserName.trim(),
        slug:normalizeSlug(form.name),eventType:form.eventType,customEventType:form.customEventType.trim(),
        themePreset:form.themePreset,theme:{preset:form.themePreset,...preset.colors},modules:form.modules,planId:form.planId,
      });
      const eventId=draft.data?.eventId;
      if(!eventId)throw new Error("L’événement n’a pas pu être créé.");
      await startCheckout(eventId);
    }catch(e){setError(e.message||"Création impossible.");setBusy(false);}
  };

  const startCheckout=async eventId=>{
    setBusy(true);setError("");
    try{
      const result=await fb.httpsCallable(functionsApi,"createEventCheckoutSession")({eventId,returnUrl:ACCOUNT_URL});
      if(!result.data?.url)throw new Error("Le paiement n’est pas encore configuré.");
      window.location.assign(result.data.url);
    }catch(e){setError(e.message||"Impossible d’ouvrir le paiement.");setBusy(false);await loadEvents();}
  };

  if(!ready)return <div className="account-shell" style={{display:"grid",placeItems:"center"}}>Ouverture de votre espace…</div>;

  if(!user||audience==="guest")return <div className="account-shell">
    <header className="account-topbar"><a className="account-brand" href={APP_BASE}>Event-<em>App</em></a><div className="account-topbar-spacer"/><a className="account-link" href={APP_BASE}>← Accueil</a></header>
    <div className="auth-wrap">
      <section className="auth-visual"><div><p className="account-eyebrow">{audience==="guest"?"VOTRE ESPACE INVITÉ":"VOTRE ESPACE ORGANISATEUR"}</p><h2>{audience==="guest"?<>Vos événements.<br/>Vos souvenirs.</>:<>Un compte.<br/>Tous vos événements.</>}</h2><p>{audience==="guest"?"Retrouvez les photos et vidéos de votre événement avec les identifiants transmis par l’organisateur. Aucun compte à créer.":"Créez autant d’événements que nécessaire. Chaque événement est acheté séparément puis apparaît dans votre tableau de bord."}</p></div><p>Photos · vidéos · live · QR code · galerie · programme</p></section>
      <section className="auth-panel"><div className="auth-card">
        <p className="account-eyebrow">EVENT-APP</p>
        <div className="auth-toggle" aria-label="Choisir votre espace">
          <button type="button" disabled={busy} aria-pressed={audience==="organizer"} className={audience==="organizer"?"active":""} onClick={()=>switchAudience("organizer")}>Organisateur</button>
          <button type="button" disabled={busy} aria-pressed={audience==="guest"} className={audience==="guest"?"active":""} onClick={()=>switchAudience("guest")}>Invité</button>
        </div>
        {audience==="guest"?<form onSubmit={submitGuest}>
          <h1>Connexion invité</h1>
          <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>Utilisez l’identifiant de connexion invité et le mot de passe fournis par l’organisateur, pas la référence de l’événement.</p>
          <div className="field"><label htmlFor="guest-id">Identifiant invité</label><input id="guest-id" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={40} value={guestId} onChange={e=>setGuestId(e.target.value)}/></div>
          <div className="field"><label htmlFor="guest-password">Mot de passe</label><PasswordInput id="guest-password" autoComplete="current-password" required maxLength={128} value={guestPassword} onChange={e=>setGuestPassword(e.target.value)}/></div>
          {error&&<div className="auth-error" role="alert">{error}</div>}
          <button className="account-button wine" style={{width:"100%",marginTop:5}} disabled={busy}>{busy?"Connexion…":"Accéder à mon événement"}</button>
        </form>:<form onSubmit={submitAuth}>
          <h1>{authMode==="signup"?"Créer mon compte":"Se connecter"}</h1>
          <div className="auth-toggle" aria-label="Compte organisateur">
            <button type="button" disabled={busy} className={authMode==="signup"?"active":""} onClick={()=>{setAuthMode("signup");setError("");setPassword("")}}>S’inscrire</button>
            <button type="button" disabled={busy} className={authMode==="login"?"active":""} onClick={()=>{setAuthMode("login");setError("");setPassword("")}}>Se connecter</button>
          </div>
          {authMode==="signup"&&<div className="field"><label htmlFor="organizer-name">Nom / société</label><input id="organizer-name" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Votre nom ou votre entreprise"/></div>}
          <div className="field"><label htmlFor="organizer-email">Email</label><input id="organizer-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.fr"/></div>
          <div className="field"><label htmlFor="organizer-password">Mot de passe</label><PasswordInput key={authMode} id="organizer-password" autoComplete={authMode==="signup"?"new-password":"current-password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="8 caractères minimum"/></div>
          {error&&<div className="auth-error" role="alert">{error}</div>}
          <button className="account-button wine" style={{width:"100%",marginTop:5}} disabled={busy}>{busy?"Patientez…":authMode==="signup"?"Créer mon compte":"Se connecter"}</button>
        </form>}
      </div></section>
    </div>
  </div>;

  const isSettled=item=>item.billing?.status==="paid"||item.billing?.status==="manual"||(item.active===true&&!item.billing);
  const paidEvents=events.filter(isSettled);
  const pendingEvents=events.filter(item=>!isSettled(item));

  return <div className="account-shell">
    <header className="account-topbar"><a className="account-brand" href={APP_BASE}>Event-<em>App</em></a><div className="account-topbar-spacer"/><span style={{fontSize:12,color:"var(--muted)"}}><span translate="no">{user.displayName||user.email}</span></span><button className="account-button light" onClick={()=>fb.signOut(auth)}>Déconnexion</button></header>
    <main className="account-main">
      <div className="account-tabs" aria-label="Choisir votre espace"><button className="active" aria-pressed="true">Organisateur</button><button onClick={()=>switchAudience("guest")}>Invité</button></div>
      <div className="account-hero"><div><p className="account-eyebrow">ESPACE CLIENT</p><h1>Mes événements</h1><p>{`${events.length} événement(s) · ${paidEvents.length} payé(s)`}{pendingEvents.length?<> · {`${pendingEvents.length} paiement(s) à terminer`}</>:null}</p></div><button className="account-button wine" onClick={()=>{setForm(emptyEvent());setStep(1);setShowCreate(true);setTab("events");setError("")}}>+ Créer un événement</button></div>

      {notice&&<div className="account-notice">{notice}</div>}{error&&<div className="account-error">{error}</div>}

      <div className="account-tabs"><button className={tab==="events"?"active":""} onClick={()=>setTab("events")}>Mes événements</button><button className={tab==="billing"?"active":""} onClick={()=>setTab("billing")}>Facturation</button></div>

      {tab==="events"&&<>
        {showCreate&&<CreateWizard form={form} setForm={setForm} step={step} setStep={setStep} changeType={changeType} segment={segment} amount={selectedAmount} createAndPay={createAndPay} busy={busy} close={()=>setShowCreate(false)}/>}
        {loading?<div className="empty-state">Chargement…</div>:events.length===0?<div className="empty-state"><strong>Vous n’avez pas encore d’événement.</strong><br/>Créez votre premier espace puis réglez-le pour l’activer.</div>:<div className="account-grid">{events.map(item=><EventCard key={item.id} item={item} pay={()=>startCheckout(item.id)}/>)}</div>}
      </>}

      {tab==="billing"&&<Billing events={events} pay={startCheckout}/>}
    </main>
  </div>;
}

function CreateWizard({form,setForm,step,setStep,changeType,segment,amount,createAndPay,busy,close}){
  const preset=presetMeta(form.themePreset),plan=BILLING_PLANS[form.planId];
  const steps=["Type","Informations","Design","Paiement"];
  const next=()=>{
    if(step===2&&(!form.name.trim()||!form.date))return;
    setStep(Math.min(4,step+1));
  };
  return <section className="wizard"><div className="wizard-head"><div><p className="account-eyebrow">NOUVEL ÉVÉNEMENT</p><h2>Créer un nouvel espace</h2></div><button className="account-button light" onClick={close}>Fermer</button></div><div className="stepper">{steps.map((label,index)=><span key={label} className={step===index+1?"active":""}>{index+1}. {label}</span>)}</div>

    {step===1&&<div className="choice-grid" style={{marginTop:18}}>{Object.values(EVENT_TYPES).map(meta=><button key={meta.id} className={"choice "+(form.eventType===meta.id?"active":"")} onClick={()=>changeType(meta.id)}><span className="choice-icon">{meta.icon}</span><strong>{meta.label}</strong><small>{meta.description}</small></button>)}</div>}

    {step===2&&<div className="form-grid" style={{marginTop:18}}><div className="field"><label>Nom de l’événement</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex. Afterwork Direction 2026"/></div><div className="field"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><div className="field"><label>Lieu</label><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Paris, Lyon, siège…"/></div><div className="field"><label>Organisateur</label><input value={form.organiserName} onChange={e=>setForm({...form,organiserName:e.target.value})} placeholder="Société, équipe, couple…"/></div>{form.eventType==="custom"&&<div className="field"><label>Type d’événement</label><input value={form.customEventType} onChange={e=>setForm({...form,customEventType:e.target.value})}/></div>}</div>}

    {step===3&&<div className="choice-grid" style={{marginTop:18}}>{Object.values(THEME_PRESETS).map(item=><button key={item.id} className={"choice "+(form.themePreset===item.id?"active":"")} onClick={()=>setForm({...form,themePreset:item.id})}><div className="theme-preview" style={{background:item.hero}}/><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>}

    {step===4&&<div style={{marginTop:18}}><p style={{color:"var(--muted)",margin:"0 0 14px"}}>Une seule formule : 30 € par événement, paiement unique. Une fois le paiement confirmé, l’espace devient actif et reste visible dans votre compte.</p><div className="plan-grid">{Object.values(BILLING_PLANS).map(item=>{const price=amountForPlan(item.id,segment);return <button key={item.id} className={"plan "+(form.planId===item.id?"active":"")} onClick={()=>setForm({...form,planId:item.id})}>{item.recommended&&<span className="plan-badge">Recommandé</span>}<h3>{item.label}</h3><div className="plan-price">{formatEuro(price)}</div><small>par événement · paiement unique</small><p style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>{item.description}</p><ul>{item.features.map(feature=><li key={feature}>{feature}</li>)}</ul></button>})}</div><div style={{marginTop:18,padding:16,borderRadius:14,background:"#f7f3ef",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><strong>{typeMeta(form.eventType).label} · {preset.label}</strong><div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{form.name||"Votre événement"} · {plan.label}</div></div><strong style={{fontSize:24}}>{formatEuro(amount)}</strong></div></div>}

    <div className="wizard-nav"><div>{step>1&&<button className="account-button light" onClick={()=>setStep(step-1)}>← Retour</button>}</div><div>{step<4?<button className="account-button wine" disabled={step===2&&(!form.name.trim()||!form.date)} onClick={next}>Continuer →</button>:<button className="account-button wine" disabled={busy} onClick={createAndPay}>{busy?"Préparation…":"Créer et payer "+formatEuro(amount)}</button>}</div></div>
  </section>;
}

function EventCard({item,pay}){
  const meta=typeMeta(item.eventType),paid=item.billing?.status==="paid"||item.billing?.status==="manual"||(item.active===true&&!item.billing),active=item.active===true;
  return <article className="event-card"><div className="event-card-head"><div className="event-icon">{meta.icon}</div><div><h3><span translate="no">{item.name}</span></h3><div className="event-meta">{[item.date,item.location].filter(Boolean).join(" · ")||"Date à définir"}</div></div></div><div className="status-row"><span className="pill">{meta.label}</span><span className={"pill "+(paid?"paid":"pending")}>{paid?"Payé":"Paiement à terminer"}</span><span className={"pill "+(active?"paid":"pending")}>{active?"Actif":"Non publié"}</span>{item.billing?.planLabel&&<span className="pill">{item.billing.planLabel}</span>}</div><div className="event-actions">{!paid&&<button className="primary" onClick={pay}>Payer {formatEuro(item.billing?.amount)}</button>}{paid&&<a className="primary" href={EVENT_URL(item.slug)+"#admin"}>Gérer</a>}{active&&<a href={EVENT_URL(item.slug)} target="_blank" rel="noreferrer">Voir l’événement</a>}{item.billing?.invoiceUrl&&<a href={item.billing.invoiceUrl} target="_blank" rel="noreferrer">Facture</a>}</div></article>;
}

function Billing({events,pay}){
  const rows=useMemo(()=>[...events].sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))),[events]);
  if(!rows.length)return <div className="empty-state">Aucune opération pour le moment.</div>;
  return <table className="billing-table"><thead><tr><th>Événement</th><th>Formule</th><th>Montant</th><th>Statut</th><th>Document</th></tr></thead><tbody>{rows.map(item=><tr key={item.id}><td><strong><span translate="no">{item.name}</span></strong><br/><span style={{color:"var(--muted)",fontSize:11}}>{item.date||"—"}</span></td><td>{item.billing?.planLabel||item.billing?.planId||"—"}</td><td>{formatEuro(item.billing?.amount)}</td><td>{item.billing?.status==="paid"?"Payé":item.billing?.status==="manual"||(!item.billing&&item.active)?"Gestion manuelle":"À payer"}</td><td>{item.billing?.invoiceUrl?<a href={item.billing.invoiceUrl} target="_blank" rel="noreferrer">Ouvrir la facture</a>:!(item.billing?.status==="paid"||item.billing?.status==="manual"||(!item.billing&&item.active))?<button className="account-button light" style={{padding:"7px 10px"}} onClick={()=>pay(item.id)}>Payer</button>:"—"}</td></tr>)}</tbody></table>;
}
