export const BILLING_PLANS = {
  essential: {
    id: "essential",
    label: "Essentiel",
    description: "L’essentiel pour centraliser les souvenirs de l’événement.",
    features: ["Photos & galerie", "QR Code", "Réactions", "Espace organisateur"],
    privateAmount: 5000,
    corporateAmount: 5000,
  },
  premium: {
    id: "premium",
    label: "Premium",
    description: "Le format complet pour une expérience événementielle interactive.",
    features: ["Tout Essentiel", "Messages vidéo", "Programme & infos pratiques", "Personnalisation avancée", "Affichage TV"],
    privateAmount: 5000,
    corporateAmount: 5000,
    recommended: true,
  },
  signature: {
    id: "signature",
    label: "Signature",
    description: "L’expérience la plus complète, pensée pour les événements premium.",
    features: ["Tout Premium", "Live", "Branding complet", "Livre d’or", "Expérience premium"],
    privateAmount: 5000,
    corporateAmount: 5000,
  },
};

export function billingSegmentForEventType(type, eventTypes = {}) {
  const category = eventTypes[type]?.category;
  return category === "corporate" ? "corporate" : "private";
}

export function amountForPlan(planId, segment = "private") {
  const plan = BILLING_PLANS[planId] || BILLING_PLANS.premium;
  return segment === "corporate" ? plan.corporateAmount : plan.privateAmount;
}

export function formatEuro(cents) {
  return new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format((Number(cents)||0)/100);
}
