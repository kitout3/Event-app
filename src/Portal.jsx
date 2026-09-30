import { useEffect, useState } from "react";
import { invitationSlug, weddingLink } from "./wedding-links.mjs";
import PasswordInput from "./PasswordInput.jsx";

const copy = {
  fr: {
    language:"Langue", login:"Se connecter", create:"Créer mon événement", pricing:"Tarif", how:"Comment ça marche",
    eyebrow:"EVENTAPP · SOUVENIRS D'ÉVÉNEMENT", title:<>Toutes les photos et vidéos.<br/>Un seul espace.</>,
    intro:"Créez un espace privé pour votre événement. Vos invités ajoutent leurs photos et vidéos depuis un QR code, sans application à installer.",
    heroPrice:"30 € par événement · paiement unique · aucun abonnement", preview:"Voir comment ça marche",
    trust1:"Aucune application", trust2:"Aucun compte invité", trust3:"QR code & lien privé", trust4:"Photos, vidéos & écran TV",
    joinTitle:"Rejoindre un événement", joinDescription:"Utilisez le lien, le code ou les identifiants transmis par l’organisateur.",
    publicTab:"Lien / code", privateTab:"Accès privé", label:"Code ou lien de l’événement", placeholder:"Ex. : afterwork-direction-2026",
    button:"Ouvrir l’espace", opening:"Vérification…", hint:"Le code figure dans l’invitation ou à côté du QR code.",
    privateHint:"Pour un événement protégé, utilisez l’identifiant invité et le mot de passe fournis par l’organisateur.",
    guestId:"Identifiant invité", guestPassword:"Mot de passe", privateButton:"Accéder à l’événement", connecting:"Connexion…",
    invalid:"Ce code ou ce lien n’est pas valide.", missing:"Cet événement est introuvable ou désactivé.", unavailable:"Impossible de vérifier l’accès pour le moment. Réessayez.", credentials:"Identifiant ou mot de passe incorrect.",
    howEyebrow:"SIMPLE POUR LES INVITÉS", howTitle:"Trois étapes, rien à installer.",
    step1Title:"1. Créez votre espace", step1Text:"Choisissez votre type d’événement, votre identité visuelle et les modules utiles.",
    step2Title:"2. Partagez le QR code", step2Text:"Les invités ouvrent l’espace depuis leur navigateur. Aucun compte n’est requis.",
    step3Title:"3. Profitez des souvenirs", step3Text:"Photos, vidéos, galerie, modération, téléchargement complet et affichage TV sont réunis au même endroit.",
    previewEyebrow:"UN ESPACE COMPLET", previewTitle:"Pensé pour le jour J et pour l’après.",
    featurePhoto:"Collecte photo multi-sélection", featureVideo:"Messages vidéo", featureTv:"Mur photo & mosaïque TV", featureModeration:"Modération des médias", featureZip:"Téléchargement complet en ZIP", featureMulti:"Plusieurs événements par compte",
    pricingEyebrow:"TARIFICATION CLAIRE", pricingTitle:"30 € par événement.", pricingText:"Paiement unique. Pas d’abonnement récurrent. Chaque événement dispose de son propre espace et de ses paramètres.", pricingCta:"Créer mon événement",
    faqEyebrow:"QUESTIONS FRÉQUENTES", faqTitle:"Avant de créer votre espace",
    faq1q:"Les invités doivent-ils installer une application ?", faq1a:"Non. L’espace fonctionne directement dans le navigateur depuis un lien ou un QR code.",
    faq2q:"Les invités doivent-ils créer un compte ?", faq2a:"Non pour les événements accessibles par lien. Les événements privés peuvent utiliser un identifiant et un mot de passe communs.",
    faq3q:"Puis-je gérer plusieurs événements ?", faq3a:"Oui. Un même compte organisateur peut gérer plusieurs événements indépendants.",
    faq4q:"Puis-je récupérer toutes les photos ?", faq4a:"Oui. La galerie peut générer un ZIP contenant l’ensemble des photos approuvées, et pas seulement les premières affichées.",
    footerTag:"Vos événements. Vos souvenirs. Votre espace.", privacy:"Confidentialité", terms:"Conditions", legal:"Mentions légales", account:"Espace organisateur"
  },
  en: {
    language:"Language", login:"Sign in", create:"Create my event", pricing:"Pricing", how:"How it works",
    eyebrow:"EVENTAPP · EVENT MEMORIES", title:<>Every photo and video.<br/>One private space.</>,
    intro:"Create a private space for your event. Guests add photos and videos from a QR code, with nothing to install.",
    heroPrice:"€30 per event · one-time payment · no subscription", preview:"See how it works",
    trust1:"No app", trust2:"No guest account", trust3:"QR code & private link", trust4:"Photos, videos & TV display",
    joinTitle:"Join an event", joinDescription:"Use the link, code or credentials shared by the organiser.",
    publicTab:"Link / code", privateTab:"Private access", label:"Event code or link", placeholder:"E.g. leadership-afterwork-2026",
    button:"Open event", opening:"Checking…", hint:"The code is available in the invitation or next to the QR code.",
    privateHint:"For a protected event, use the guest ID and password supplied by the organiser.", guestId:"Guest ID", guestPassword:"Password", privateButton:"Open private event", connecting:"Signing in…",
    invalid:"This code or link is invalid.", missing:"This event cannot be found or is disabled.", unavailable:"Access cannot be checked right now. Please try again.", credentials:"Incorrect guest ID or password.",
    howEyebrow:"SIMPLE FOR GUESTS", howTitle:"Three steps. Nothing to install.",
    step1Title:"1. Create your space", step1Text:"Choose the event type, visual identity and modules you need.",
    step2Title:"2. Share the QR code", step2Text:"Guests open the space in their browser. No account is required.",
    step3Title:"3. Enjoy the memories", step3Text:"Photos, videos, gallery, moderation, full download and TV display live in one place.",
    previewEyebrow:"ONE COMPLETE SPACE", previewTitle:"Built for the event and everything after it.",
    featurePhoto:"Multi-photo upload", featureVideo:"Video messages", featureTv:"Photo wall & TV mosaic", featureModeration:"Media moderation", featureZip:"Complete ZIP download", featureMulti:"Multiple events per account",
    pricingEyebrow:"SIMPLE PRICING", pricingTitle:"€30 per event.", pricingText:"One-time payment. No recurring subscription. Every event gets its own space and settings.", pricingCta:"Create my event",
    faqEyebrow:"FAQ", faqTitle:"Before creating your space", faq1q:"Do guests need to install an app?", faq1a:"No. The space works in a browser from a link or QR code.", faq2q:"Do guests need an account?", faq2a:"No for link-access events. Private events can use a shared guest ID and password.", faq3q:"Can I manage several events?", faq3a:"Yes. One organiser account can manage several independent events.", faq4q:"Can I download every photo?", faq4a:"Yes. The gallery can generate a ZIP with all approved photos, not only the first photos displayed.",
    footerTag:"Your events. Your memories. Your space.", privacy:"Privacy", terms:"Terms", legal:"Legal notice", account:"Organiser account"
  },
  vi: {
    language:"Ngôn ngữ", login:"Đăng nhập", create:"Tạo sự kiện", pricing:"Giá", how:"Cách hoạt động",
    eyebrow:"EVENTAPP · KỶ NIỆM SỰ KIỆN", title:<>Mọi ảnh và video.<br/>Trong một không gian.</>, intro:"Tạo không gian riêng cho sự kiện. Khách mời thêm ảnh và video bằng mã QR, không cần cài ứng dụng.", heroPrice:"30 € mỗi sự kiện · thanh toán một lần · không thuê bao", preview:"Xem cách hoạt động",
    trust1:"Không cần ứng dụng", trust2:"Khách không cần tài khoản", trust3:"Mã QR & liên kết riêng", trust4:"Ảnh, video & màn hình TV",
    joinTitle:"Tham gia sự kiện", joinDescription:"Dùng liên kết, mã hoặc thông tin đăng nhập do ban tổ chức cung cấp.", publicTab:"Liên kết / mã", privateTab:"Truy cập riêng", label:"Mã hoặc liên kết sự kiện", placeholder:"Ví dụ: afterwork-2026", button:"Mở sự kiện", opening:"Đang kiểm tra…", hint:"Mã có trong lời mời hoặc bên cạnh mã QR.", privateHint:"Với sự kiện được bảo vệ, dùng ID khách và mật khẩu do ban tổ chức cung cấp.", guestId:"ID khách", guestPassword:"Mật khẩu", privateButton:"Vào sự kiện", connecting:"Đang đăng nhập…", invalid:"Mã hoặc liên kết không hợp lệ.", missing:"Không tìm thấy sự kiện hoặc sự kiện đã tắt.", unavailable:"Hiện không thể kiểm tra quyền truy cập. Vui lòng thử lại.", credentials:"ID khách hoặc mật khẩu không đúng.",
    howEyebrow:"ĐƠN GIẢN CHO KHÁCH", howTitle:"Ba bước, không cần cài đặt.", step1Title:"1. Tạo không gian", step1Text:"Chọn loại sự kiện, giao diện và các mô-đun cần thiết.", step2Title:"2. Chia sẻ mã QR", step2Text:"Khách mở trực tiếp trong trình duyệt, không cần tài khoản.", step3Title:"3. Lưu giữ kỷ niệm", step3Text:"Ảnh, video, thư viện, kiểm duyệt, tải toàn bộ và trình chiếu TV trong cùng một nơi.",
    previewEyebrow:"MỘT KHÔNG GIAN ĐẦY ĐỦ", previewTitle:"Dành cho ngày sự kiện và cả sau đó.", featurePhoto:"Tải nhiều ảnh", featureVideo:"Tin nhắn video", featureTv:"Tường ảnh & mosaic TV", featureModeration:"Kiểm duyệt nội dung", featureZip:"Tải ZIP toàn bộ", featureMulti:"Nhiều sự kiện trên một tài khoản",
    pricingEyebrow:"GIÁ RÕ RÀNG", pricingTitle:"30 € mỗi sự kiện.", pricingText:"Thanh toán một lần, không có thuê bao định kỳ. Mỗi sự kiện có không gian và cài đặt riêng.", pricingCta:"Tạo sự kiện", faqEyebrow:"CÂU HỎI", faqTitle:"Trước khi tạo sự kiện", faq1q:"Khách có cần cài ứng dụng không?", faq1a:"Không. Mọi thứ hoạt động trong trình duyệt qua liên kết hoặc mã QR.", faq2q:"Khách có cần tài khoản không?", faq2a:"Không với sự kiện mở bằng liên kết. Sự kiện riêng có thể dùng ID khách và mật khẩu chung.", faq3q:"Tôi có thể quản lý nhiều sự kiện không?", faq3a:"Có. Một tài khoản có thể quản lý nhiều sự kiện độc lập.", faq4q:"Tôi có thể tải toàn bộ ảnh không?", faq4a:"Có. Thư viện có thể tạo ZIP chứa toàn bộ ảnh đã duyệt.", footerTag:"Sự kiện của bạn. Kỷ niệm của bạn. Không gian của bạn.", privacy:"Quyền riêng tư", terms:"Điều khoản", legal:"Thông tin pháp lý", account:"Tài khoản tổ chức"
  },
  de: {
    language:"Sprache", login:"Anmelden", create:"Event erstellen", pricing:"Preis", how:"So funktioniert es",
    eyebrow:"EVENTAPP · EVENT-ERINNERUNGEN", title:<>Alle Fotos und Videos.<br/>Ein privater Ort.</>, intro:"Erstellt einen privaten Bereich für euer Event. Gäste laden Fotos und Videos per QR-Code hoch – ohne App-Installation.", heroPrice:"30 € pro Event · einmalige Zahlung · kein Abo", preview:"So funktioniert es",
    trust1:"Keine App", trust2:"Kein Gastkonto", trust3:"QR-Code & privater Link", trust4:"Fotos, Videos & TV-Anzeige",
    joinTitle:"Event beitreten", joinDescription:"Verwendet Link, Code oder Zugangsdaten des Veranstalters.", publicTab:"Link / Code", privateTab:"Privater Zugang", label:"Event-Code oder Link", placeholder:"Z. B. afterwork-2026", button:"Event öffnen", opening:"Prüfung…", hint:"Der Code steht in der Einladung oder neben dem QR-Code.", privateHint:"Für geschützte Events verwendet ihr Gast-ID und Passwort des Veranstalters.", guestId:"Gast-ID", guestPassword:"Passwort", privateButton:"Privates Event öffnen", connecting:"Anmeldung…", invalid:"Code oder Link ist ungültig.", missing:"Das Event wurde nicht gefunden oder ist deaktiviert.", unavailable:"Der Zugang kann gerade nicht geprüft werden. Bitte erneut versuchen.", credentials:"Gast-ID oder Passwort ist falsch.",
    howEyebrow:"EINFACH FÜR GÄSTE", howTitle:"Drei Schritte. Keine Installation.", step1Title:"1. Bereich erstellen", step1Text:"Event-Typ, Design und benötigte Module auswählen.", step2Title:"2. QR-Code teilen", step2Text:"Gäste öffnen den Bereich direkt im Browser. Kein Konto nötig.", step3Title:"3. Erinnerungen genießen", step3Text:"Fotos, Videos, Galerie, Moderation, Komplett-Download und TV-Anzeige an einem Ort.",
    previewEyebrow:"EIN KOMPLETTER BEREICH", previewTitle:"Für den Eventtag und die Zeit danach.", featurePhoto:"Mehrfach-Fotoupload", featureVideo:"Videobotschaften", featureTv:"Fotowand & TV-Mosaik", featureModeration:"Medienmoderation", featureZip:"Kompletter ZIP-Download", featureMulti:"Mehrere Events pro Konto",
    pricingEyebrow:"KLARE PREISE", pricingTitle:"30 € pro Event.", pricingText:"Einmalige Zahlung, kein laufendes Abo. Jedes Event erhält einen eigenen Bereich und eigene Einstellungen.", pricingCta:"Event erstellen", faqEyebrow:"FAQ", faqTitle:"Vor dem Erstellen", faq1q:"Müssen Gäste eine App installieren?", faq1a:"Nein. Der Bereich funktioniert direkt im Browser über Link oder QR-Code.", faq2q:"Brauchen Gäste ein Konto?", faq2a:"Nein bei Link-Zugang. Private Events können eine gemeinsame Gast-ID und ein Passwort verwenden.", faq3q:"Kann ich mehrere Events verwalten?", faq3a:"Ja. Ein Organisator-Konto kann mehrere unabhängige Events verwalten.", faq4q:"Kann ich alle Fotos herunterladen?", faq4a:"Ja. Die Galerie kann eine ZIP-Datei mit allen freigegebenen Fotos erstellen.", footerTag:"Eure Events. Eure Erinnerungen. Euer Bereich.", privacy:"Datenschutz", terms:"Bedingungen", legal:"Impressum", account:"Organisator-Konto"
  }
};

function FeatureIcon({type}) {
  const paths = {
    photo:<><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12" r="3"/><path d="m8 5 1-2h6l1 2"/></>,
    video:<><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></>,
    screen:<><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8m-4-4v4"/></>,
    shield:<><path d="M12 3 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></>,
    zip:<><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 6h2m-2 3h2m-2 3h2m-2 3h2"/></>,
    events:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h3m2 0h3m-8 3h3"/></>
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

let portalFirebase;
async function getPortalFirebase() {
  if (portalFirebase) return portalFirebase;
  const config = window.__FIREBASE_CONFIG__ || {};
  if (!config.apiKey || !config.projectId) throw new Error("firebase-unavailable");
  const [{initializeApp,getApps}, authMod, fnMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js"),
  ]);
  const app = getApps()[0] || initializeApp(config);
  const auth = authMod.getAuth(app);
  const functions = fnMod.getFunctions(app, "europe-west1");
  portalFirebase = {auth, functions, ...authMod, ...fnMod};
  return portalFirebase;
}

export default function Portal() {
  const [language,setLanguage] = useState(() => { try { const saved=localStorage.getItem("mariage-lang"); return copy[saved]?saved:"fr"; } catch { return "fr"; } });
  const [accessMode,setAccessMode] = useState("link");
  const [invitation,setInvitation] = useState("");
  const [guestId,setGuestId] = useState("");
  const [guestPassword,setGuestPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const t = copy[language];
  const base = new URL("./",window.location.href).href;
  const account = new URL("account.html",base).href;

  useEffect(() => { document.documentElement.lang=language; }, [language]);
  const changeLanguage = value => { setLanguage(value); try { localStorage.setItem("mariage-lang",value); } catch {} };

  async function join(event) {
    event.preventDefault(); setError("");
    let slug;
    try { slug=invitationSlug(invitation); } catch { setError("invalid"); return; }
    const config=window.__FIREBASE_CONFIG__||{};
    if(!config.projectId||!config.apiKey){setError("unavailable");return;}
    setBusy(true);
    try {
      const url=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents/events/${encodeURIComponent(slug)}?key=${encodeURIComponent(config.apiKey)}`;
      const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(response.status===404||response.status===403){setError("missing");return;}
      if(!response.ok)throw new Error("unavailable");
      const record=await response.json();
      if(record.fields?.active?.booleanValue===false){setError("missing");return;}
      window.location.assign(weddingLink(base,slug,false));
    } catch { setError("unavailable"); } finally { setBusy(false); }
  }

  async function joinPrivate(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const fb=await getPortalFirebase();
      const result=await fb.httpsCallable(fb.functions,"loginPrivateEvent")({accessId:guestId.trim(),password:guestPassword});
      const {email,eventId}=result.data||{};
      if(!email||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(eventId||""))throw new Error("invalid-response");
      await fb.signInWithEmailAndPassword(fb.auth,email,guestPassword);
      setGuestPassword("");
      window.location.assign(weddingLink(base,eventId,false));
    } catch (e) {
      const code=String(e?.code||"");
      setError(code.includes("invalid-credential")||code.includes("permission")||code.includes("not-found")?"credentials":"unavailable");
    } finally { setBusy(false); }
  }

  const switchAccess = mode => { setAccessMode(mode); setError(""); setGuestPassword(""); };
  const features = [["photo",t.featurePhoto],["video",t.featureVideo],["screen",t.featureTv],["shield",t.featureModeration],["zip",t.featureZip],["events",t.featureMulti]];

  return <div className="eventapp-portal">
    <a className="portal-skip" href="#join">{t.joinTitle}</a>
    <header className="portal-header">
      <a className="portal-brand" href={base} aria-label="EventApp — Accueil"><span className="portal-brand-mark" aria-hidden="true">E</span><span>Event<em>App</em></span></a>
      <nav className="portal-header-actions" aria-label="Navigation principale">
        <a className="portal-nav-link" href="#how">{t.how}</a>
        <a className="portal-nav-link" href="#pricing">{t.pricing}</a>
        <select aria-label={t.language} value={language} onChange={e=>changeLanguage(e.target.value)}><option value="fr">FR</option><option value="en">EN</option><option value="vi">VI</option><option value="de">DE</option></select>
        <a className="portal-signin" href={account}>{t.login}</a>
      </nav>
    </header>

    <main>
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <p className="portal-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="portal-intro">{t.intro}</p>
          <div className="portal-primary-actions"><a className="portal-create" href={account+"?mode=create"}>{t.create}<span aria-hidden="true">→</span></a><a className="portal-secondary" href="#how">{t.preview}</a></div>
          <p className="portal-price-line">{t.heroPrice}</p>
          <div className="portal-trust-list"><span>✓ {t.trust1}</span><span>✓ {t.trust2}</span><span>✓ {t.trust3}</span><span>✓ {t.trust4}</span></div>
        </div>
        <div className="portal-product-preview" aria-label="Aperçu EventApp">
          <div className="portal-preview-top"><span className="portal-preview-logo">Event<em>App</em></span><span className="portal-preview-badge">LIVE</span></div>
          <div className="portal-preview-event"><p>AFTERWORK 2026</p><h2>Nos meilleurs moments</h2><span>128 photos · 14 vidéos</span></div>
          <div className="portal-preview-grid"><div className="preview-tile large">PHOTO</div><div className="preview-tile">PHOTO</div><div className="preview-tile accent">+ Ajouter</div><div className="preview-tile">PHOTO</div><div className="preview-tile">VIDÉO</div></div>
          <div className="portal-preview-nav"><span>Galerie</span><span>Vidéos</span><span>TV</span><span>Infos</span></div>
        </div>
      </section>

      <section className="portal-join" id="join" aria-labelledby="join-title">
        <div className="portal-section-heading"><p className="portal-eyebrow">INVITÉ</p><h2 id="join-title">{t.joinTitle}</h2><p>{t.joinDescription}</p></div>
        <div className="portal-access-card">
          <div className="portal-tabs" aria-label={t.joinTitle}>
            <button type="button" aria-pressed={accessMode==="link"} onClick={()=>switchAccess("link")}>{t.publicTab}</button>
            <button type="button" aria-pressed={accessMode==="private"} onClick={()=>switchAccess("private")}>{t.privateTab}</button>
          </div>
          {accessMode==="link" ? <form onSubmit={join}>
            <label htmlFor="event-invitation">{t.label}</label>
            <input id="event-invitation" value={invitation} onChange={e=>{setInvitation(e.target.value);setError("")}} placeholder={t.placeholder} autoComplete="off" autoCapitalize="none" spellCheck="false" required maxLength={2048} aria-describedby={error?"join-error":"join-hint"} aria-invalid={!!error}/>
            <p id="join-hint" className="portal-hint">{t.hint}</p>
            {error&&<p id="join-error" className="portal-error" role="alert">{t[error]}</p>}
            <button className="portal-submit" disabled={busy}>{busy?t.opening:t.button}<span aria-hidden="true">→</span></button>
          </form> : <form onSubmit={joinPrivate}>
            <p className="portal-hint portal-private-intro">{t.privateHint}</p>
            <label htmlFor="portal-guest-id">{t.guestId}</label><input id="portal-guest-id" value={guestId} onChange={e=>{setGuestId(e.target.value);setError("")}} autoComplete="username" autoCapitalize="none" required maxLength={40}/>
            <label htmlFor="portal-guest-password">{t.guestPassword}</label><PasswordInput id="portal-guest-password" value={guestPassword} onChange={e=>{setGuestPassword(e.target.value);setError("")}} autoComplete="current-password" required maxLength={128}/>
            {error&&<p className="portal-error" role="alert">{t[error]}</p>}
            <button className="portal-submit" disabled={busy}>{busy?t.connecting:t.privateButton}<span aria-hidden="true">→</span></button>
          </form>}
        </div>
      </section>

      <section className="portal-how" id="how">
        <div className="portal-section-heading centered"><p className="portal-eyebrow">{t.howEyebrow}</p><h2>{t.howTitle}</h2></div>
        <div className="portal-steps"><article><span>01</span><h3>{t.step1Title}</h3><p>{t.step1Text}</p></article><article><span>02</span><h3>{t.step2Title}</h3><p>{t.step2Text}</p></article><article><span>03</span><h3>{t.step3Title}</h3><p>{t.step3Text}</p></article></div>
      </section>

      <section className="portal-features">
        <div className="portal-section-heading"><p className="portal-eyebrow">{t.previewEyebrow}</p><h2>{t.previewTitle}</h2></div>
        <div className="portal-feature-grid">{features.map(([type,label])=><article key={type}><span className="portal-feature-icon"><FeatureIcon type={type}/></span><h3>{label}</h3></article>)}</div>
      </section>

      <section className="portal-pricing" id="pricing">
        <div><p className="portal-eyebrow">{t.pricingEyebrow}</p><h2>{t.pricingTitle}</h2><p>{t.pricingText}</p></div>
        <div className="portal-pricing-card"><strong>30 €</strong><span>/ événement</span><a href={account+"?mode=create"}>{t.pricingCta}<span aria-hidden="true">→</span></a></div>
      </section>

      <section className="portal-faq">
        <div className="portal-section-heading"><p className="portal-eyebrow">{t.faqEyebrow}</p><h2>{t.faqTitle}</h2></div>
        <div className="portal-faq-list"><details><summary>{t.faq1q}</summary><p>{t.faq1a}</p></details><details><summary>{t.faq2q}</summary><p>{t.faq2a}</p></details><details><summary>{t.faq3q}</summary><p>{t.faq3a}</p></details><details><summary>{t.faq4q}</summary><p>{t.faq4a}</p></details></div>
      </section>
    </main>

    <footer className="portal-footer"><div><a className="portal-brand compact" href={base}><span className="portal-brand-mark" aria-hidden="true">E</span><span>Event<em>App</em></span></a><p>{t.footerTag}</p></div><nav aria-label="Informations"><a href={account}>{t.account}</a><a href="./privacy.html">{t.privacy}</a><a href="./terms.html">{t.terms}</a><a href="./legal.html">{t.legal}</a></nav></footer>
  </div>;
}
