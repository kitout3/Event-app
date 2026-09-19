(() => {
  const LANG_KEY = "mariage-lang";
  const EVENT_ID = window.__WEDDING_TENANT__?.eventId || "quentin-huyen-2026";
  const MAX_BYTES = 500 * 1024 * 1024;
  const MAX_SECONDS = 300;

  const I18N = {
    fr: {
      cardTitle: "Laisser un témoignage vidéo", cardDesc: "Enregistrez un message pour Huyen & Quentin",
      galleryTitle: "Galerie vidéos", galleryDesc: "Regardez les témoignages vidéo validés",
      title: "Témoignage vidéo", subtitle: "Laissez un souvenir vidéo à Huyen & Quentin",
      firstName: "Votre prénom (optionnel)", message: "Un petit mot (optionnel)",
      record: "Enregistrer une vidéo", choose: "Choisir une vidéo", start: "Démarrer l’enregistrement", stop: "Arrêter l’enregistrement", retry: "Recommencer",
      send: "Envoyer la vidéo", back: "Retour à l’accueil", uploading: "Envoi en cours…", success: "Merci ! Votre témoignage a bien été envoyé.",
      tooLarge: "La vidéo dépasse 500 Mo.", tooLong: "La vidéo dépasse 5 minutes.", invalid: "Choisissez une vidéo MP4, MOV ou WebM.", error: "L’envoi a échoué. Vérifiez votre connexion et réessayez.",
      cameraError: "Impossible d’accéder à la caméra ou au microphone. Vérifiez les autorisations du navigateur.", recording: "Enregistrement en cours", ready: "Vidéo prête à être envoyée.",
      moderationNote: "Les vidéos sont limitées à 5 minutes et 500 Mo. Elles doivent être validées avant diffusion.",
      adminTitle: "Témoignages vidéo", pending: "En attente", approved: "Validée", rejected: "Refusée", approve: "Valider", reject: "Refuser", remove: "Supprimer", download: "Télécharger", empty: "Aucun témoignage vidéo.",
      playAll: "Lire toutes les vidéos", noApproved: "Aucune vidéo validée.", tvTitle: "Diffuser les témoignages", tvStop: "Arrêter la diffusion", previous: "Précédente", next: "Suivante"
    },
    en: {
      cardTitle: "Leave a video message", cardDesc: "Record a message for Huyen & Quentin",
      galleryTitle: "Video gallery", galleryDesc: "Watch approved video messages",
      title: "Video message", subtitle: "Leave a video memory for Huyen & Quentin",
      firstName: "Your first name (optional)", message: "A short message (optional)",
      record: "Record a video", choose: "Choose a video", start: "Start recording", stop: "Stop recording", retry: "Record again",
      send: "Upload video", back: "Back to home", uploading: "Uploading…", success: "Thank you! Your video has been uploaded.",
      tooLarge: "The video is larger than 500 MB.", tooLong: "The video is longer than 5 minutes.", invalid: "Choose an MP4, MOV or WebM video.", error: "Upload failed. Check your connection and try again.",
      cameraError: "Camera or microphone access failed. Check your browser permissions.", recording: "Recording", ready: "Video ready to upload.",
      moderationNote: "Videos are limited to 5 minutes and 500 MB. They must be approved before publication.",
      adminTitle: "Video messages", pending: "Pending", approved: "Approved", rejected: "Rejected", approve: "Approve", reject: "Reject", remove: "Delete", download: "Download", empty: "No video messages.",
      playAll: "Play all videos", noApproved: "No approved videos.", tvTitle: "Play video messages", tvStop: "Stop playback", previous: "Previous", next: "Next"
    },
    de: {
      cardTitle: "Videobotschaft hinterlassen", cardDesc: "Nehmen Sie eine Nachricht für Huyen & Quentin auf",
      galleryTitle: "Videogalerie", galleryDesc: "Veröffentlichte Videobotschaften ansehen",
      title: "Videobotschaft", subtitle: "Hinterlassen Sie eine Videoerinnerung für Huyen & Quentin",
      firstName: "Ihr Vorname (optional)", message: "Eine kurze Nachricht (optional)",
      record: "Video aufnehmen", choose: "Video auswählen", start: "Aufnahme starten", stop: "Aufnahme stoppen", retry: "Erneut aufnehmen",
      send: "Video hochladen", back: "Zurück zur Startseite", uploading: "Wird hochgeladen…", success: "Danke! Ihr Video wurde hochgeladen.",
      tooLarge: "Das Video ist größer als 500 MB.", tooLong: "Das Video ist länger als 5 Minuten.", invalid: "Bitte MP4-, MOV- oder WebM-Video auswählen.", error: "Upload fehlgeschlagen. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      cameraError: "Kein Zugriff auf Kamera oder Mikrofon. Prüfen Sie die Browserberechtigungen.", recording: "Aufnahme läuft", ready: "Video ist bereit zum Hochladen.",
      moderationNote: "Die Veröffentlichung hängt von den Moderationseinstellungen dieses Ereignisses ab.",
      adminTitle: "Videobotschaften", pending: "Ausstehend", approved: "Freigegeben", rejected: "Abgelehnt", approve: "Freigeben", reject: "Ablehnen", remove: "Löschen", download: "Herunterladen", empty: "Keine Videobotschaften.",
      playAll: "Alle Videos abspielen", noApproved: "Keine veröffentlichten Videos.", tvTitle: "Videobotschaften abspielen", tvStop: "Wiedergabe stoppen", previous: "Zurück", next: "Weiter"
    },
    vi: {
      cardTitle: "Gửi lời chúc bằng video", cardDesc: "Quay lời nhắn dành cho Huyen & Quentin",
      galleryTitle: "Thư viện video", galleryDesc: "Xem các video đã được duyệt",
      title: "Lời chúc bằng video", subtitle: "Gửi một kỷ niệm bằng video tới Huyen & Quentin",
      firstName: "Tên của bạn (không bắt buộc)", message: "Lời nhắn ngắn (không bắt buộc)",
      record: "Quay video", choose: "Chọn video", start: "Bắt đầu quay", stop: "Dừng quay", retry: "Quay lại",
      send: "Gửi video", back: "Về trang chủ", uploading: "Đang tải lên…", success: "Cảm ơn! Video của bạn đã được gửi.",
      tooLarge: "Video vượt quá 500 MB.", tooLong: "Video dài hơn 5 phút.", invalid: "Hãy chọn video MP4, MOV hoặc WebM.", error: "Không thể tải lên. Hãy kiểm tra kết nối và thử lại.",
      cameraError: "Không thể truy cập camera hoặc micrô. Hãy kiểm tra quyền của trình duyệt.", recording: "Đang quay", ready: "Video đã sẵn sàng để gửi.",
      moderationNote: "Video giới hạn 5 phút và 500 MB. Video phải được duyệt trước khi hiển thị.",
      adminTitle: "Lời chúc bằng video", pending: "Đang chờ", approved: "Đã duyệt", rejected: "Đã từ chối", approve: "Duyệt", reject: "Từ chối", remove: "Xóa", download: "Tải xuống", empty: "Chưa có video.",
      playAll: "Phát tất cả video", noApproved: "Chưa có video đã duyệt.", tvTitle: "Phát lời chúc video", tvStop: "Dừng phát", previous: "Trước", next: "Tiếp"
    }
  };

  const lang = () => I18N[localStorage.getItem(LANG_KEY)] ? localStorage.getItem(LANG_KEY) : "fr";
  const eventName = () => window.__WEDDING_EVENT__?.name
    || (EVENT_ID === "quentin-huyen-2026"
      ? "Huyen & Quentin"
      : ({ fr: "les mariés", en: "the couple", de: "das Brautpaar", vi: "cô dâu chú rể" }[lang()] || "les mariés"));
  const t = key => String(I18N[lang()][key] || I18N.fr[key] || key).replaceAll("Huyen & Quentin", eventName());
  const esc = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

  const css = `
    .vt-card{background:var(--white);border:1.5px solid var(--blush);border-radius:18px;padding:1.5rem 1.25rem;text-align:left;box-shadow:0 3px 16px rgba(92,42,30,.12);cursor:pointer;transition:.2s}
    .vt-card:hover{transform:translateY(-1px);filter:brightness(1.02)}
    .vt-overlay{position:fixed;inset:0;z-index:2147483645;background:linear-gradient(160deg,var(--cream),var(--blush));overflow:auto;padding:24px 16px;font-family:Jost,Arial,sans-serif;color:var(--text)}
    .vt-shell{max-width:760px;margin:0 auto}.vt-panel{background:var(--white);border-radius:22px;padding:22px;box-shadow:0 6px 30px rgba(92,42,30,.16)}
    .vt-btn{border:0;border-radius:999px;padding:12px 18px;cursor:pointer;font-weight:600}.vt-btn:disabled{opacity:.5;cursor:not-allowed}.vt-primary{background:linear-gradient(135deg,var(--rose),var(--burgundy));color:#fff}.vt-secondary{background:var(--blush);color:var(--burgundy)}.vt-danger{background:#9f2f2f;color:#fff}
    .vt-input{width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--blush);border-radius:12px;background:var(--cream);font:inherit}.vt-grid{display:grid;gap:12px}.vt-actions{display:flex;gap:9px;flex-wrap:wrap}
    .vt-heart-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;width:100%;max-width:520px;margin:4px auto 8px}
    .vt-heart-btn{--heart-fill:#8b443b;--heart-text:#fff;position:relative;width:100%;aspect-ratio:1.08/1;min-width:0;padding:0;border:0;background:transparent;cursor:pointer;font:inherit;filter:drop-shadow(0 8px 14px rgba(92,42,30,.18));transition:transform .2s ease,filter .2s ease}
    .vt-heart-btn:hover{transform:translateY(-3px) scale(1.02);filter:drop-shadow(0 11px 18px rgba(92,42,30,.24))}.vt-heart-btn:active{transform:translateY(0) scale(.98)}.vt-heart-btn:focus-visible{outline:3px solid rgba(92,42,30,.3);outline-offset:4px;border-radius:42%}
    .vt-heart-choose{--heart-fill:#efc9bf;--heart-text:var(--burgundy)}.vt-heart-shape{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.vt-heart-shape path{fill:var(--heart-fill);transition:fill .2s ease}
    .vt-heart-label{position:absolute;inset:25% 12% 18%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--heart-text);font-size:clamp(.78rem,2.4vw,.95rem);font-weight:600;line-height:1.12;text-align:center;pointer-events:none}.vt-heart-icon{font-size:clamp(1.45rem,4.5vw,2rem);line-height:1}
    @media (max-width:480px){.vt-panel{padding:18px 14px}.vt-heart-actions{gap:8px}.vt-heart-label{inset:24% 8% 18%;font-size:.78rem}.vt-heart-icon{font-size:1.5rem}}
    .vt-progress{height:10px;border-radius:999px;background:var(--blush);overflow:hidden}.vt-progress>div{height:100%;background:var(--burgundy);transition:width .2s}
    .vt-camera{position:relative;background:#000;border-radius:16px;overflow:hidden}.vt-camera video{display:block;width:100%;max-height:460px;object-fit:contain}.vt-timer{position:absolute;top:12px;left:12px;background:rgba(0,0,0,.66);color:#fff;padding:7px 10px;border-radius:999px;font-weight:700}
    .vt-admin{margin-top:16px;background:var(--white);border-radius:18px;padding:18px;box-shadow:0 2px 12px rgba(92,42,30,.12)}.vt-item{border:1px solid var(--blush);border-radius:14px;padding:12px;display:grid;gap:9px;margin-top:10px}.vt-mini{border:0;border-radius:999px;padding:7px 11px;cursor:pointer}
    .vt-gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.vt-gallery-item{background:#fff;border:1px solid #f1d8cf;border-radius:16px;padding:10px;box-shadow:0 2px 10px rgba(92,42,30,.08)}.vt-gallery-item video{width:100%;aspect-ratio:16/9;background:#000;border-radius:11px;object-fit:contain}
    .vt-tv{position:fixed;inset:0;z-index:2147483647;background:#000;display:flex;align-items:center;justify-content:center}.vt-tv video{width:100%;height:100%;object-fit:contain}.vt-close{position:fixed;top:16px;right:16px;z-index:2;background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:10px 15px;cursor:pointer}
  `;
  if (!document.getElementById("vt-style-v2")) { const s=document.createElement("style"); s.id="vt-style-v2"; s.textContent=css; document.head.appendChild(s); }

  let firebasePromise;
  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const cfg = window.__FIREBASE_CONFIG__ || {};
      if (!cfg.apiKey || !cfg.projectId || !cfg.storageBucket) throw new Error("Firebase config missing");
      const [{initializeApp,getApps},fs,st,fn] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js")
      ]);
      const app = getApps()[0] || initializeApp(cfg);
      return {
        db:fs.getFirestore(app),
        storage:st.getStorage(app),
        functions:fn.getFunctions(app,"europe-west1"),
        fs,st,fn
      };
    })();
    return firebasePromise;
  }

  function getDuration(file) {
    return new Promise((resolve,reject) => {
      const v=document.createElement("video"), url=URL.createObjectURL(file); v.preload="metadata";
      v.onloadedmetadata=()=>{const d=v.duration;URL.revokeObjectURL(url);resolve(d)};
      v.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("metadata"))};v.src=url;
    });
  }

  async function uploadVideo(file,onProgress) {
    const {db,storage,fs,st}=await firebase();
    const id=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const ext=(file.name.split(".").pop()||"webm").replace(/[^a-z0-9]/gi,"").toLowerCase();
    const path=`events/${EVENT_ID}/videos/${id}.${ext}`;
    const safeName=file.name.replace(/["\\]/g,"-");
    const task=st.uploadBytesResumable(st.ref(storage,path),file,{contentType:file.type,contentDisposition:`attachment; filename="${safeName}"`,customMetadata:{eventId:EVENT_ID}});
    const snap=await new Promise((resolve,reject)=>task.on("state_changed",s=>onProgress(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,()=>resolve(task.snapshot)));
    const url=await st.getDownloadURL(snap.ref);
    const duration=Math.round(await getDuration(file));
    const prefs={...(window.__WEDDING_EVENT__?.settings||{})};
    const videoMode=prefs.videoModerationMode||"moderated";
    const delayMinutes=Math.max(1,Number(prefs.videoDelayMinutes)||60);
    const status=videoMode==="immediate"?"approved":"pending";
    const publishAt=videoMode==="delayed"?fs.Timestamp.fromDate(new Date(Date.now()+delayMinutes*60000)):null;
    const doc=await fs.addDoc(fs.collection(db,"events",EVENT_ID,"videoTestimonials"),{eventId:EVENT_ID,url,path,author:null,message:null,duration,size:file.size,mimeType:file.type,status,moderationMode:videoMode,publishAt,createdAt:fs.serverTimestamp(),selectedForTv:videoMode==="immediate"});
    return {id:doc.id,url};
  }

  async function listVideos(adminMode=false){
    const {db,fs,functions,fn}=await firebase();
    if(!adminMode){
      try {
        const call=fn.httpsCallable(functions,"listPublicVideos");
        const res=await call({eventId:EVENT_ID});
        return Array.isArray(res.data?.videos)?res.data.videos:[];
      } catch (error) {
        // Transition fallback only: while the new backend is being deployed,
        // stay tenant-scoped and use the legacy Firestore read path. Once the
        // hardened rules are live this fallback is naturally denied.
        if (!String(error?.code || "").includes("not-found")) throw error;
        const snap=await fs.getDocs(fs.collection(db,"events",EVENT_ID,"videoTestimonials"));
        return snap.docs.map(d=>({id:d.id,...d.data()}));
      }
    }
    const snap=await fs.getDocs(fs.query(
      fs.collection(db,"events",EVENT_ID,"videoTestimonials"),
      fs.orderBy("createdAt","desc")
    ));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  async function updateVideo(id,patch){const {db,fs}=await firebase();await fs.updateDoc(fs.doc(db,"events",EVENT_ID,"videoTestimonials",id),patch);}
  async function deleteVideo(item){const {db,storage,fs,st}=await firebase();if(item.path){try{await st.deleteObject(st.ref(storage,item.path))}catch{}}await fs.deleteDoc(fs.doc(db,"events",EVENT_ID,"videoTestimonials",item.id));}

  function closeOverlay(){document.getElementById("vt-overlay")?.remove();history.replaceState(null,"",location.pathname+location.search);}

  function preferredMime(){
    const types=["video/mp4;codecs=h264,aac","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
    return types.find(x=>window.MediaRecorder?.isTypeSupported?.(x)) || "";
  }

  async function openGuest(){
    closeOverlay();history.replaceState(null,"",`${location.pathname}${location.search}#video`);
    const el=document.createElement("section");el.id="vt-overlay";el.className="vt-overlay";
    const heart=`<svg class="vt-heart-shape" viewBox="0 0 200 190" aria-hidden="true" focusable="false"><path d="M100 182C93 176 22 121 22 70C22 37 45 18 71 18C88 18 98 28 100 32C102 28 112 18 129 18C155 18 178 37 178 70C178 121 107 176 100 182Z"></path></svg>`;
    el.innerHTML=`<div class="vt-shell"><button class="vt-btn vt-secondary" data-close>← ${t("back")}</button><div style="height:14px"></div><div class="vt-panel vt-grid"><div style="text-align:center"><div style="font-size:42px">🎬</div><h1 style="font:300 2.2rem 'Cormorant Garamond',serif;color:var(--burgundy);margin:.2rem">${t("title")}</h1><p style="color:var(--muted)">${t("subtitle")}</p></div><input data-file type="file" accept="video/mp4,video/quicktime,video/webm" hidden><div class="vt-heart-actions"><button class="vt-heart-btn vt-heart-record" data-camera aria-label="${t("record")}">${heart}<span class="vt-heart-label"><span class="vt-heart-icon">🎥</span><span>${t("record")}</span></span></button><button class="vt-heart-btn vt-heart-choose" data-choose aria-label="${t("choose")}">${heart}<span class="vt-heart-label"><span class="vt-heart-icon">📁</span><span>${t("choose")}</span></span></button></div><div class="vt-camera" data-camera-box style="display:none"><video data-live autoplay muted playsinline></video><span class="vt-timer" data-timer>00:00 / 05:00</span></div><div class="vt-actions" data-record-actions style="display:none"><button class="vt-btn vt-primary" data-start>● ${t("start")}</button><button class="vt-btn vt-danger" data-stop disabled>■ ${t("stop")}</button></div><video data-preview controls playsinline style="display:none;width:100%;max-height:460px;border-radius:15px;background:#000"></video><button class="vt-btn vt-secondary" data-retry style="display:none">↻ ${t("retry")}</button><p style="font-size:.82rem;color:var(--muted)">${t("moderationNote")}</p><div class="vt-progress" style="display:none"><div style="width:0"></div></div><button class="vt-btn vt-primary" data-send disabled>⬆️ ${t("send")}</button><p data-status style="min-height:22px;text-align:center"></p></div></div>`;
    document.body.appendChild(el);

    const q=s=>el.querySelector(s), fileInput=q("[data-file]"), preview=q("[data-preview]"), live=q("[data-live]"), status=q("[data-status]"), send=q("[data-send]"), bar=q(".vt-progress"), fill=bar.firstElementChild, cameraBox=q("[data-camera-box]"), recordActions=q("[data-record-actions]"), startBtn=q("[data-start]"), stopBtn=q("[data-stop]"), retryBtn=q("[data-retry]"), timer=q("[data-timer]");
    let file=null, stream=null, recorder=null, chunks=[], seconds=0, interval=null, autoStop=null, previewUrl=null;

    const cleanupStream=()=>{stream?.getTracks().forEach(track=>track.stop());stream=null;live.srcObject=null;clearInterval(interval);clearTimeout(autoStop)};
    const setPreview=f=>{if(previewUrl)URL.revokeObjectURL(previewUrl);file=f;previewUrl=URL.createObjectURL(f);preview.src=previewUrl;preview.style.display="block";cameraBox.style.display="none";recordActions.style.display="none";retryBtn.style.display="inline-block";send.disabled=false;status.textContent=t("ready")};
    const validate=async f=>{status.textContent="";if(!f)return false;if(!/^video\/(mp4|quicktime|webm)/.test(f.type)){status.textContent=t("invalid");return false}if(f.size>MAX_BYTES){status.textContent=t("tooLarge");return false}try{if(await getDuration(f)>MAX_SECONDS+.5){status.textContent=t("tooLong");return false}}catch{status.textContent=t("invalid");return false}return true};
    const openCamera=async()=>{cleanupStream();preview.style.display="none";retryBtn.style.display="none";send.disabled=true;status.textContent="";try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1,sampleRate:{ideal:48000}}});live.srcObject=stream;cameraBox.style.display="block";recordActions.style.display="flex";startBtn.disabled=false;stopBtn.disabled=true}catch(e){console.error(e);status.textContent=t("cameraError")}};
    const startRecording=()=>{if(!stream)return;chunks=[];seconds=0;timer.textContent="00:00 / 05:00";const mime=preferredMime();try{recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:2500000,audioBitsPerSecond:128000}:{videoBitsPerSecond:2500000,audioBitsPerSecond:128000})}catch{recorder=new MediaRecorder(stream)}recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};recorder.onstop=async()=>{const type=recorder.mimeType||mime||"video/webm";const ext=type.includes("mp4")?"mp4":"webm";const blob=new Blob(chunks,{type});const recorded=new File([blob],`temoignage-${Date.now()}.${ext}`,{type});cleanupStream();if(await validate(recorded))setPreview(recorded)};recorder.start(1000);startBtn.disabled=true;stopBtn.disabled=false;status.textContent=t("recording");interval=setInterval(()=>{seconds++;const m=String(Math.floor(seconds/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");timer.textContent=`${m}:${s} / 05:00`},1000);autoStop=setTimeout(()=>{if(recorder?.state==="recording")recorder.stop()},MAX_SECONDS*1000)};
    const stopRecording=()=>{if(recorder?.state==="recording"){recorder.stop();stopBtn.disabled=true}};

    q("[data-close]").onclick=()=>{if(recorder?.state==="recording")recorder.stop();cleanupStream();closeOverlay()};
    q("[data-camera]").onclick=openCamera;q("[data-choose]").onclick=()=>fileInput.click();startBtn.onclick=startRecording;stopBtn.onclick=stopRecording;retryBtn.onclick=openCamera;
    fileInput.onchange=async e=>{const f=e.target.files?.[0];if(await validate(f))setPreview(f)};
    send.onclick=async()=>{if(!file)return;send.disabled=true;bar.style.display="block";status.textContent=t("uploading");try{await uploadVideo(file,p=>{fill.style.width=`${p}%`;status.textContent=`${t("uploading")} ${p}%`});status.textContent=t("success");setTimeout(closeOverlay,1800)}catch(e){console.error(e);status.textContent=t("error");send.disabled=false}};
  }

  async function openGallery(){
    closeOverlay();history.replaceState(null,"",`${location.pathname}${location.search}#video-gallery`);
    const el=document.createElement("section");el.id="vt-overlay";el.className="vt-overlay";el.innerHTML=`<div class="vt-shell"><button class="vt-btn vt-secondary" data-close>← ${t("back")}</button><div style="height:14px"></div><div class="vt-panel"><div style="text-align:center"><div style="font-size:42px">🎞️</div><h1 style="font:300 2.2rem 'Cormorant Garamond',serif;color:var(--burgundy)">${t("galleryTitle")}</h1></div><div class="vt-actions" style="justify-content:center;margin:16px 0"><button class="vt-btn vt-primary" data-all>▶ ${t("playAll")}</button></div><div class="vt-gallery-grid" data-grid>${t("uploading")}</div></div></div>`;document.body.appendChild(el);el.querySelector("[data-close]").onclick=closeOverlay;
    try{const now=Date.now();const items=(await listVideos()).filter(v=>v.url&&(v.status==="approved"||(v.moderationMode==="delayed"&&v.status==="pending"&&v.publishAt&&((v.publishAt.toMillis?.()||Date.parse(v.publishAt))<=now))));const grid=el.querySelector("[data-grid]");grid.innerHTML=items.length?"":`<p>${t("noApproved")}</p>`;items.forEach(item=>{const card=document.createElement("article");card.className="vt-gallery-item";card.dataset.mediaKind="video";card.dataset.mediaId=item.id;card.dataset.mediaUrl=item.url;card.dataset.mediaName=`video-${item.id}.${(item.mimeType||"").includes("quicktime")?"mov":(item.mimeType||"").includes("webm")?"webm":"mp4"}`;card.dataset.mediaSize=item.size||"";card.innerHTML=`<video controls playsinline preload="metadata" src="${item.url}"></video><strong>${esc(item.author)||"—"}</strong>${item.message?`<p>${esc(item.message)}</p>`:""}`;grid.appendChild(card)});window.dispatchEvent(new CustomEvent("wedding:media-rendered"));el.querySelector("[data-all]").disabled=!items.length;el.querySelector("[data-all]").onclick=()=>startPlaylist(items)}catch(e){console.error(e);el.querySelector("[data-grid]").textContent=t("error")}
  }

  function startPlaylist(items){if(!items?.length)return alert(t("noApproved"));const tv=document.createElement("div");tv.className="vt-tv";tv.innerHTML=`<button class="vt-close">✕ ${t("tvStop")}</button><video autoplay controls playsinline></video>`;document.body.appendChild(tv);const video=tv.querySelector("video");let i=0;const play=()=>{video.src=items[i%items.length].url;video.muted=false;video.volume=1;video.play().catch(()=>{})};video.onended=()=>{i++;play()};tv.querySelector("button").onclick=()=>tv.remove();play()}

  async function renderAdmin(container){if(container.dataset.vtReadyV2)return;container.dataset.vtReadyV2="1";const box=document.createElement("div");box.className="vt-admin";box.innerHTML=`<h3 style="font:600 1.35rem 'Cormorant Garamond',serif;color:var(--burgundy)">🎬 ${t("adminTitle")}</h3><p style="font-size:.8rem;color:var(--muted)">${t("moderationNote")}</p><div data-list>${t("uploading")}</div>`;container.appendChild(box);const list=box.querySelector("[data-list]");const refresh=async()=>{try{const items=await listVideos(true);list.innerHTML=items.length?"":`<p>${t("empty")}</p>`;items.forEach(item=>{const row=document.createElement("div");row.className="vt-item";row.innerHTML=`<video controls preload="metadata" src="${item.url}" style="width:100%;max-height:260px;border-radius:10px;background:#000"></video><div><strong>${esc(item.author)||"—"}</strong> · ${Math.round(item.duration||0)} s · ${Math.round((item.size||0)/1048576)} Mo</div>${item.message?`<p>${esc(item.message)}</p>`:""}<div style="font-size:.8rem;color:var(--muted)">${t(item.status||"pending")}</div><div class="vt-actions"><button class="vt-mini" data-ok>✓ ${t("approve")}</button><button class="vt-mini" data-no>✕ ${t("reject")}</button><a class="vt-mini" href="${item.url}" target="_blank" rel="noopener">⬇ ${t("download")}</a><button class="vt-mini" data-del>🗑 ${t("remove")}</button></div>`;row.querySelector("[data-ok]").onclick=async()=>{await updateVideo(item.id,{status:"approved",selectedForTv:true});refresh()};row.querySelector("[data-no]").onclick=async()=>{await updateVideo(item.id,{status:"rejected",selectedForTv:false});refresh()};row.querySelector("[data-del]").onclick=async()=>{if(confirm(`${t("remove")}?`)){await deleteVideo(item);refresh()}};list.appendChild(row)})}catch(e){console.error(e);list.textContent=t("error")}};refresh()}

  function addCards(){
    const event=window.__WEDDING_EVENT__||{};
    if(event.modules?.videoTestimonials===false){document.getElementById("vt-home-card")?.remove();document.getElementById("vt-gallery-card")?.remove();return}
    const admin=document.querySelector("[data-event-admin-card='true']")||[...document.querySelectorAll("button")].find(b=>/Administration|Espace organisateur|Organisation|Quản trị/i.test(b.textContent));const grid=admin?.parentElement;if(!grid||getComputedStyle(grid).display!=="grid")return;
    const title=event.labels?.videoTitle||t("cardTitle");
    if(!document.getElementById("vt-home-card")){const card=document.createElement("button");card.id="vt-home-card";card.className="vt-card event-card";card.innerHTML=`<div style="font-family:var(--event-title-font);font-size:1.2rem;color:var(--burgundy)">🎥 ${title}</div><div style="color:var(--muted);font-size:.82rem">${t("cardDesc")}</div>`;card.onclick=openGuest;grid.insertBefore(card,admin)}
    if(!document.getElementById("vt-gallery-card")){const card=document.createElement("button");card.id="vt-gallery-card";card.className="vt-card event-card";card.innerHTML=`<div style="font-family:var(--event-title-font);font-size:1.2rem;color:var(--burgundy)">🎞️ ${t("galleryTitle")}</div><div style="color:var(--muted);font-size:.82rem">${t("galleryDesc")}</div>`;card.onclick=openGallery;grid.insertBefore(card,admin)}
  }
  function addAdmin(){
    const event=window.__WEDDING_EVENT__||{};
    if(event.modules?.videoTestimonials===false)return;
    const host=document.querySelector("[data-event-admin-root='true']")||document.body;
    if(location.hash==="#admin")renderAdmin(host);
  }
  function refresh(){addCards();if(location.hash==="#admin")addAdmin();if(location.hash==="#video"&&!document.getElementById("vt-overlay"))openGuest();if(location.hash==="#video-gallery"&&!document.getElementById("vt-overlay"))openGallery()}
  document.addEventListener("click",e=>{if(e.target.closest("#wedding-language-switcher"))setTimeout(()=>{document.getElementById("vt-home-card")?.remove();document.getElementById("vt-gallery-card")?.remove();document.querySelectorAll(".vt-admin").forEach(x=>x.remove());refresh()},40)});
  const obs=new MutationObserver(()=>setTimeout(refresh,30));document.addEventListener("DOMContentLoaded",()=>{refresh();obs.observe(document.body,{childList:true,subtree:true})});window.addEventListener("load",refresh);setTimeout(refresh,400);
})();
