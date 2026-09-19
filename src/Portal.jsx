import { useState } from 'react';
import { invitationSlug, weddingLink } from './wedding-links.mjs';
import './portal.css';

const copy = {
  fr: {
    language:'Langue', admin:'Administration', eyebrow:'VOS ÉVÉNEMENTS. VOS SOUVENIRS.',
    title:<>Les moments<br/>se partagent.</>,
    intro:'Photos, vidéos, live et souvenirs réunis dans un espace privé adapté à chaque événement.',
    guest:'Je suis participant', couple:'Je suis organisateur', heading:'Rejoindre un événement', manage:'Gérer mon événement',
    description:'Saisissez le code ou collez le lien transmis par l’organisateur.',
    manageDescription:'Ouvrez votre espace puis connectez-vous avec votre compte administrateur.',
    label:'Code ou lien de l’événement', placeholder:'Ex. : afterwork-direction-2026',
    button:'Ouvrir l’espace', manageButton:'Accéder à l’administration', opening:'Vérification du lien…',
    hint:'Vous trouverez ce lien dans votre invitation, votre QR code ou auprès de l’organisateur.',
    noAccount:'Aucun compte à créer pour les participants.', photo:'Photos', video:'Messages vidéo', live:'Live & écran',
    note:'Un espace dédié à chaque événement', help:'Vous n’avez pas le lien ?',
    answer:'Demandez le lien ou le QR code à l’organisateur. Aucun annuaire public des événements n’est affiché.',
    invalid:'Ce code ou ce lien n’est pas valide.', missing:'Cet événement est introuvable ou son espace est désactivé.',
    unavailable:'Impossible de vérifier le lien pour le moment. Réessayez dans quelques instants.',
    footer:'Les petits instants font les grands souvenirs.',
  },
  en: {
    language:'Language', admin:'Administration', eyebrow:'YOUR EVENTS. YOUR MEMORIES.',
    title:<>Moments<br/>are for sharing.</>,
    intro:'Photos, videos, live streams and memories in one private space tailored to every event.',
    guest:'I’m a participant', couple:'I’m an organiser', heading:'Join an event', manage:'Manage my event',
    description:'Enter the code or paste the link shared by the organiser.',
    manageDescription:'Open your event space, then sign in with your administrator account.',
    label:'Event code or link', placeholder:'E.g. leadership-afterwork-2026',
    button:'Open event space', manageButton:'Open administration', opening:'Checking the link…',
    hint:'Find the link in your invitation, QR code or ask the organiser.',
    noAccount:'Participants don’t need an account.', photo:'Photos', video:'Video messages', live:'Live & screen',
    note:'A dedicated space for every event', help:'Don’t have the link?',
    answer:'Ask the organiser for the event link or QR code. There is no public event directory.',
    invalid:'This code or link is invalid.', missing:'This event cannot be found or has been deactivated.',
    unavailable:'We can’t check this link right now. Please try again shortly.',
    footer:'Small moments become lasting memories.',
  },
  vi: {
    language:'Ngôn ngữ', admin:'Quản trị', eyebrow:'SỰ KIỆN CỦA BẠN. KỶ NIỆM CỦA BẠN.',
    title:<>Cùng chia sẻ<br/>những khoảnh khắc.</>,
    intro:'Ảnh, video, phát trực tiếp và kỷ niệm trong một không gian riêng cho từng sự kiện.',
    guest:'Tôi là người tham dự', couple:'Tôi là người tổ chức', heading:'Tham gia sự kiện', manage:'Quản lý sự kiện',
    description:'Nhập mã hoặc dán liên kết do ban tổ chức cung cấp.',
    manageDescription:'Mở không gian sự kiện rồi đăng nhập bằng tài khoản quản trị.',
    label:'Mã hoặc liên kết sự kiện', placeholder:'Ví dụ: afterwork-2026',
    button:'Mở sự kiện', manageButton:'Mở trang quản trị', opening:'Đang kiểm tra liên kết…',
    hint:'Liên kết có trong lời mời, mã QR hoặc do ban tổ chức cung cấp.',
    noAccount:'Người tham dự không cần tạo tài khoản.', photo:'Ảnh', video:'Lời nhắn video', live:'Trực tiếp & màn hình',
    note:'Một không gian riêng cho mỗi sự kiện', help:'Bạn chưa có liên kết?',
    answer:'Hãy xin ban tổ chức liên kết hoặc mã QR. Không có danh sách sự kiện công khai.',
    invalid:'Mã hoặc liên kết không hợp lệ.', missing:'Không tìm thấy sự kiện hoặc trang đã bị vô hiệu hóa.',
    unavailable:'Hiện không thể kiểm tra liên kết. Vui lòng thử lại sau.',
    footer:'Khoảnh khắc nhỏ, kỷ niệm lớn.',
  },
  de: {
    language:'Sprache', admin:'Verwaltung', eyebrow:'EURE EVENTS. EURE ERINNERUNGEN.',
    title:<>Momente<br/>teilt man.</>,
    intro:'Fotos, Videos, Live-Streams und Erinnerungen in einem privaten Bereich für jedes Event.',
    guest:'Ich nehme teil', couple:'Ich organisiere', heading:'Event beitreten', manage:'Event verwalten',
    description:'Gebt den Code ein oder fügt den Link des Veranstalters ein.',
    manageDescription:'Öffnet den Eventbereich und meldet euch mit dem Verwaltungskonto an.',
    label:'Event-Code oder Link', placeholder:'Z. B. afterwork-2026',
    button:'Event öffnen', manageButton:'Verwaltung öffnen', opening:'Link wird geprüft…',
    hint:'Den Link findet ihr in der Einladung, im QR-Code oder beim Veranstalter.',
    noAccount:'Teilnehmende brauchen kein Konto.', photo:'Fotos', video:'Videobotschaften', live:'Live & Bildschirm',
    note:'Ein eigener Bereich für jedes Event', help:'Ihr habt keinen Link?',
    answer:'Fragt den Veranstalter nach Link oder QR-Code. Es gibt kein öffentliches Eventverzeichnis.',
    invalid:'Dieser Code oder Link ist ungültig.', missing:'Dieses Event wurde nicht gefunden oder deaktiviert.',
    unavailable:'Der Link kann gerade nicht geprüft werden. Bitte versucht es später erneut.',
    footer:'Kleine Momente werden zu großen Erinnerungen.',
  }
};

function Symbol({type}) {
  const paths = {photo:<><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12" r="3"/><path d="m8 5 1-2h6l1 2"/></>, video:<><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></>, live:<><circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/></>};
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function Portal() {
  const [language,setLanguage]=useState(()=>{try{return copy[localStorage.getItem('mariage-lang')]?localStorage.getItem('mariage-lang'):'fr';}catch{return 'fr';}});
  const [organiser,setOrganiser]=useState(false);
  const [invitation,setInvitation]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const t=copy[language];
  const base=import.meta.env.BASE_URL;
  const changeLanguage=value=>{setLanguage(value);document.documentElement.lang=value;try{localStorage.setItem('mariage-lang',value);}catch{}};

  async function join(event) {
    event.preventDefault();setError('');
    let slug;
    try{slug=invitationSlug(invitation);}catch{setError('invalid');return;}
    const config=window.__FIREBASE_CONFIG__||{};
    if(!config.projectId||!config.apiKey){setError('unavailable');return;}
    setBusy(true);
    try{
      const response=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents/events/${encodeURIComponent(slug)}?key=${encodeURIComponent(config.apiKey)}`,{signal:AbortSignal.timeout(12000)});
      if(response.status===404||response.status===403){setError('missing');return;}
      if(!response.ok)throw new Error('unavailable');
      const record=await response.json();
      if(record.fields?.active?.booleanValue===false){setError('missing');return;}
      window.location.assign(weddingLink(new URL(base,window.location.origin).href,slug,organiser));
    }catch{setError('unavailable');}finally{setBusy(false);}
  }

  return <div className="wedding-portal">
    <a className="portal-skip" href="#invitation">Aller à mon espace</a>
    <header className="portal-header">
      <a className="portal-brand" href={base} aria-label="Souvenir — Accueil"><span className="portal-monogram" aria-hidden="true">s.</span><span>souvenir <em>events</em></span></a>
      <div className="portal-header-actions"><select aria-label={t.language} value={language} onChange={e=>changeLanguage(e.target.value)}><option value="fr">FR</option><option value="en">EN</option><option value="vi">VI</option><option value="de">DE</option></select><a href={`${base}admin.html`}>{t.admin}<span aria-hidden="true"> ↗</span></a></div>
    </header>

    <main className="portal-main">
      <section className="portal-visual" aria-labelledby="portal-title">
        <div className="portal-event-orbits" aria-hidden="true"><span>💍</span><span>🥂</span><span>🎄</span><span>🏢</span><span>🎂</span><span>🏆</span></div>
        <div className="portal-visual-shade"/>
        <div className="portal-story"><p className="portal-eyebrow">{t.eyebrow}</p><h1 id="portal-title">{t.title}</h1><p className="portal-intro">{t.intro}</p></div>
        <p className="portal-visual-caption">SOUVENIR EVENTS <span aria-hidden="true">✦</span></p>
      </section>

      <section className="portal-access" id="invitation" aria-labelledby="join-title">
        <div className="portal-access-inner">
          <div className="portal-tabs" role="group" aria-label={t.heading}><button type="button" aria-pressed={!organiser} onClick={()=>{setOrganiser(false);setError('');}}>{t.guest}</button><button type="button" aria-pressed={organiser} onClick={()=>{setOrganiser(true);setError('');}}>{t.couple}</button></div>
          <div className="portal-form-title"><span className="portal-step" aria-hidden="true">BIENVENUE</span><h2 id="join-title">{organiser?t.manage:t.heading}</h2><p>{organiser?t.manageDescription:t.description}</p></div>
          <form onSubmit={join}>
            <label htmlFor="event-invitation">{t.label}</label>
            <input id="event-invitation" name="invitation" value={invitation} onChange={e=>{setInvitation(e.target.value);setError('');}} placeholder={t.placeholder} autoComplete="off" autoCapitalize="none" spellCheck="false" required maxLength={2048} aria-describedby={error?'invitation-error':'invitation-hint'} aria-invalid={!!error}/>
            <p id="invitation-hint" className="portal-hint">{t.hint}</p>
            {error&&<p id="invitation-error" className="portal-error" role="alert">{t[error]}</p>}
            <button className="portal-submit" type="submit" disabled={busy}>{busy?t.opening:organiser?t.manageButton:t.button}<span aria-hidden="true">{busy?'…':'→'}</span></button>
            {!organiser&&<p className="portal-account-note">{t.noAccount}</p>}
          </form>
          <div className="portal-capabilities">{['photo','video','live'].map(type=><div key={type}><Symbol type={type}/><span>{t[type]}</span></div>)}</div>
          <details className="portal-help"><summary>{t.help}</summary><p>{t.answer}</p></details>
        </div>
      </section>
    </main>
    <footer className="portal-footer"><span>{t.note}</span><span>{t.footer}</span></footer>
  </div>;
}
