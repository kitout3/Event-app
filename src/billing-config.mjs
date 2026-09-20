export const BILLING_PLANS = {
  event: {
    id: "event",
    label: "Événement",
    description: "Une formule unique avec toutes les fonctionnalités Event-App pour votre événement.",
    features: [
      "Photos & galerie",
      "Messages vidéo",
      "QR Code & réactions",
      "Programme & informations pratiques",
      "Personnalisation, logo & couverture",
      "Affichage TV & live",
    ],
    privateAmount: 3000,
    corporateAmount: 3000,
    recommended: true,
  },
};

const LEGACY_PLAN_ALIASES = {
  essential: "event",
  premium: "event",
  signature: "event",
};

export function billingSegmentForEventType(type, eventTypes = {}) {
  const category = eventTypes[type]?.category;
  return category === "corporate" ? "corporate" : "private";
}

export function normalizePlanId(planId) {
  const id = String(planId || "event");
  return BILLING_PLANS[id] ? id : (LEGACY_PLAN_ALIASES[id] || "event");
}

export function amountForPlan(planId, segment = "private") {
  const plan = BILLING_PLANS[normalizePlanId(planId)];
  return segment === "corporate" ? plan.corporateAmount : plan.privateAmount;
}

export function formatEuro(cents) {
  return new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format((Number(cents)||0)/100);
}
