import { useState } from 'react';
import { invitationSlug, weddingLink } from './wedding-links.mjs';
import './portal.css';

const copy = {
  fr: { language:'Langue', admin:'Administration', eyebrow:'VOTRE JOUR. VOS SOUVENIRS.', title:<>Les souvenirs<br/>se partagent.</>, intro:'Retrouvez tous les instants de votre mariage, à travers les yeux de vos proches.', guest:'Je suis invité', couple:'Je suis organisateur', heading:'Rejoindre un mariage', manage:'Gérer mon mariage', description:'Saisissez le code ou collez le lien transmis par les mariés.', manageDescription:'Ouvrez votre espace puis connectez-vous avec votre compte administrateur.', label:'Code ou lien du mariage', placeholder:'Ex. : camille-et-alex', button:'Ouvrir mon espace', manageButton:'Accéder à mon administration', opening:'Vérification du lien…', hint:'Vous trouverez ce lien sur votre invitation ou auprès des mariés.', noAccount:'Aucun compte à créer pour les invités.', photo:'Photos', video:'Messages vidéo', live:'Cérémonie en direct', note:'Un espace dédié à chaque mariage', help:'Vous n’avez pas le lien ?', answer:'Demandez le lien ou le QR code aux mariés. Pour préserver leurs souvenirs, aucun annuaire des mariages n’est affiché.', invalid:'Ce code ou ce lien n’est pas valide. Vérifiez l’invitation reçue.', missing:'Ce mariage est introuvable ou son espace est désactivé. Vérifiez le lien auprès des mariés.', unavailable:'Impossible de vérifier le lien pour le moment. Réessayez dans quelques instants.', footer:'Les petits instants font les grands souvenirs.', alt:'Papeterie ivoire, fleurs blanches et ruban sur une étoffe bordeaux.' },
  en: { language:'Language', admin:'Administration', eyebrow:'YOUR DAY. YOUR MEMORIES.', title:<>Memories<br/>are for sharing.</>, intro:'Relive your wedding through the eyes of the people you love.', guest:'I’m a guest', couple:'I’m an organiser', heading:'Join a wedding', manage:'Manage my wedding', description:'Enter the code or paste the link shared by the couple.', manageDescription:'Open your space, then sign in with your administrator account.', label:'Wedding code or link', placeholder:'E.g. camille-and-alex', button:'Open my space', manageButton:'Open my administration', opening:'Checking the invitation…', hint:'Find this link on your invitation or ask the couple.', noAccount:'Guests don’t need an account.', photo:'Photos', video:'Video messages', live:'Live ceremony', note:'A dedicated space for every wedding', help:'Don’t have the link?', answer:'Ask the couple for their link or QR code. There is no public wedding directory, to keep their memories separate.', invalid:'This code or link is invalid. Please check your invitation.', missing:'This wedding cannot be found or has been deactivated. Please ask the couple to check the link.', unavailable:'We can’t check this link right now. Please try again shortly.', footer:'Little moments make lasting memories.', alt:'Ivory wedding stationery, white flowers and ribbon on burgundy fabric.' },
  vi: { language:'Ngôn ngữ', admin:'Quản trị', eyebrow:'NGÀY CỦA BẠN. KỶ NIỆM CỦA BẠN.', title:<>Cùng chia sẻ<br/>những kỷ niệm.</>, intro:'Ngắm lại ngày cưới qua ánh nhìn của những người thân yêu.', guest:'Tôi là khách mời', couple:'Tôi là người tổ chức', heading:'Tham gia đám cưới', manage:'Quản lý đám cưới', description:'Nhập mã hoặc dán liên kết cô dâu chú rể đã gửi.', manageDescription:'Mở trang đám cưới rồi đăng nhập bằng tài khoản quản trị.', label:'Mã hoặc liên kết đám cưới', placeholder:'Ví dụ: camille-et-alex', button:'Mở trang đám cưới', manageButton:'Mở trang quản trị', opening:'Đang kiểm tra liên kết…', hint:'Liên kết có trên thiệp mời hoặc được cô dâu chú rể cung cấp.', noAccount:'Khách mời không cần tạo tài khoản.', photo:'Ảnh', video:'Lời nhắn video', live:'Lễ cưới trực tiếp', note:'Một không gian riêng cho mỗi đám cưới', help:'Bạn chưa có liên kết?', answer:'Hãy xin cô dâu chú rể liên kết hoặc mã QR. Không có danh sách đám cưới công khai.', invalid:'Mã hoặc liên kết không hợp lệ. Hãy kiểm tra lại thiệp mời.', missing:'Không tìm thấy đám cưới hoặc trang đã bị vô hiệu hóa.', unavailable:'Hiện không thể kiểm tra liên kết. Vui lòng thử lại sau.', footer:'Khoảnh khắc nhỏ, kỷ niệm lớn.', alt:'Thiệp cưới màu ngà, hoa trắng và ruy băng trên vải đỏ rượu.' },
  de: { language:'Sprache', admin:'Verwaltung', eyebrow:'EUER TAG. EURE ERINNERUNGEN.', title:<>Erinnerungen<br/>teilt man.</>, intro:'Erlebt eure Hochzeit durch die Augen eurer Liebsten.', guest:'Ich bin Gast', couple:'Ich organisiere', heading:'Zur Hochzeit', manage:'Meine Hochzeit verwalten', description:'Gebt den Code oder den Link des Brautpaars ein.', manageDescription:'Öffnet euren Bereich und meldet euch mit eurem Verwaltungskonto an.', label:'Hochzeitscode oder Link', placeholder:'Z. B. camille-und-alex', button:'Meinen Bereich öffnen', manageButton:'Verwaltung öffnen', opening:'Einladung wird geprüft…', hint:'Den Link findet ihr auf der Einladung oder erhaltet ihn vom Brautpaar.', noAccount:'Gäste brauchen kein Konto.', photo:'Fotos', video:'Videobotschaften', live:'Live-Zeremonie', note:'Ein eigener Bereich für jede Hochzeit', help:'Ihr habt keinen Link?', answer:'Fragt das Brautpaar nach dem Link oder QR-Code. Es gibt kein öffentliches Hochzeitsverzeichnis.', invalid:'Dieser Code oder Link ist ungültig. Bitte prüft eure Einladung.', missing:'Diese Hochzeit wurde nicht gefunden oder deaktiviert.', unavailable:'Der Link kann gerade nicht geprüft werden. Bitte versucht es später erneut.', footer:'Kleine Momente werden zu großen Erinnerungen.', alt:'Elfenbeinfarbenes Hochzeitspapier, weiße Blumen und Band auf bordeauxrotem Stoff.' }
};

function Symbol({type}) {
  const paths = {photo:<><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12" r="3"/><path d="m8 5 1-2h6l1 2"/></>, video:<><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></>, live:<><circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/></>};
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function Portal() {
  const [language, setLanguage] = useState(() => { try {return copy[localStorage.getItem('mariage-lang')] ? localStorage.getItem('mariage-lang') : 'fr';} catch {return 'fr';} });
  const [organiser,setOrganiser] = useState(false);
  const [invitation,setInvitation] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const t = copy[language];
  const base = import.meta.env.BASE_URL;
  const changeLanguage = value => { setLanguage(value); document.documentElement.lang=value; try {localStorage.setItem('mariage-lang',value);} catch {} };

  async function join(event) {
    event.preventDefault();
    setError('');
    let slug;
    try {slug=invitationSlug(invitation);} catch {setError('invalid');return;}
    const config=window.__FIREBASE_CONFIG__ || {};
    if (!config.projectId || !config.apiKey) {setError('unavailable');return;}
    setBusy(true);
    try {
      const response=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents/events/${encodeURIComponent(slug)}?key=${encodeURIComponent(config.apiKey)}`, {signal:AbortSignal.timeout(12000)});
      if(response.status===404 || response.status===403) {setError('missing');return;}
      if(!response.ok) throw new Error('unavailable');
      const record=await response.json();
      if(record.fields?.active?.booleanValue===false) {setError('missing');return;}
      window.location.assign(weddingLink(new URL(base,window.location.origin).href,slug,organiser));
    } catch {setError('unavailable');} finally {setBusy(false);}
  }

  return <div className="wedding-portal">
    <a className="portal-skip" href="#invitation">Aller à mon espace</a>
    <header className="portal-header">
      <a className="portal-brand" href={base} aria-label="Espace Mariage — Accueil"><span className="portal-monogram" aria-hidden="true">m.</span><span>espace <em>mariage</em></span></a>
      <div className="portal-header-actions"><select aria-label={t.language} value={language} onChange={e=>changeLanguage(e.target.value)}><option value="fr">FR</option><option value="en">EN</option><option value="vi">VI</option><option value="de">DE</option></select><a href={`${base}admin.html`}>{t.admin}<span aria-hidden="true"> ↗</span></a></div>
    </header>
    <main className="portal-main">
      <section className="portal-visual" aria-labelledby="portal-title">
        <img src={`${base}images/wedding-editorial.webp`} alt={t.alt} fetchPriority="high" width="1024" height="1536"/>
        <div className="portal-visual-shade"/>
        <div className="portal-story"><p className="portal-eyebrow">{t.eyebrow}</p><h1 id="portal-title">{t.title}</h1><p className="portal-intro">{t.intro}</p></div>
        <p className="portal-visual-caption">ESPACE MARIAGE <span aria-hidden="true">✦</span></p>
      </section>
      <section className="portal-access" id="invitation" aria-labelledby="join-title">
        <div className="portal-access-inner">
          <div className="portal-tabs" role="group" aria-label={t.heading}><button type="button" aria-pressed={!organiser} onClick={()=>{setOrganiser(false);setError('');}}>{t.guest}</button><button type="button" aria-pressed={organiser} onClick={()=>{setOrganiser(true);setError('');}}>{t.couple}</button></div>
          <div className="portal-form-title"><span className="portal-step" aria-hidden="true">BIENVENUE</span><h2 id="join-title">{organiser?t.manage:t.heading}</h2><p>{organiser?t.manageDescription:t.description}</p></div>
          <form onSubmit={join}>
            <label htmlFor="wedding-invitation">{t.label}</label>
            <input id="wedding-invitation" name="invitation" value={invitation} onChange={e=>{setInvitation(e.target.value);setError('');}} placeholder={t.placeholder} autoComplete="off" autoCapitalize="none" spellCheck="false" required maxLength={2048} aria-describedby={error?'invitation-error':'invitation-hint'} aria-invalid={!!error}/>
            <p id="invitation-hint" className="portal-hint">{t.hint}</p>
            {error && <p id="invitation-error" className="portal-error" role="alert">{t[error]}</p>}
            <button className="portal-submit" type="submit" disabled={busy}>{busy?t.opening:organiser?t.manageButton:t.button}<span aria-hidden="true">{busy?'…':'→'}</span></button>
            {!organiser && <p className="portal-account-note">{t.noAccount}</p>}
          </form>
          <div className="portal-capabilities">{['photo','video','live'].map(type=><div key={type}><Symbol type={type}/><span>{t[type]}</span></div>)}</div>
          <details className="portal-help"><summary>{t.help}</summary><p>{t.answer}</p></details>
        </div>
      </section>
    </main>
    <footer className="portal-footer"><span>{t.note}</span><span>{t.footer}</span></footer>
  </div>;
}
