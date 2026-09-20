export function guestLoginError(error) {
  const code = String(error?.code || "");
  if (["functions/permission-denied", "functions/invalid-argument", "auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)) return "Identifiant ou mot de passe incorrect.";
  if (code === "functions/failed-precondition") return "L’accès invité n’a pas encore été configuré par l’organisateur.";
  if (code === "auth/too-many-requests" || code === "functions/resource-exhausted") return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (code === "auth/network-request-failed" || code === "functions/unavailable") return "Connexion réseau indisponible. Réessayez.";
  return "Le service de connexion est momentanément indisponible. Réessayez ou contactez l’organisateur.";
}
