import { useId, useState } from "react";

export default function PasswordInput({ style, id, ...props }) {
  const generatedId = useId();
  const [visible, setVisible] = useState(false);
  const inputId = id || generatedId;
  return <div style={{position:"relative",width:"100%"}}>
    <input {...props} id={inputId} type={visible ? "text" : "password"}
      style={{...style,width:"100%",paddingRight:92}}/>
    <button type="button" aria-controls={inputId} aria-pressed={visible}
      aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      onClick={()=>setVisible(value=>!value)}
      style={{position:"absolute",right:5,top:4,minHeight:34,padding:"6px 9px",border:0,borderRadius:7,background:"transparent",color:"inherit",cursor:"pointer",fontSize:12}}>
      {visible ? "Masquer" : "Afficher"}
    </button>
  </div>;
}
