const PLANS = {
  event: {
    id:"event",
    label:"Événement",
    privateAmount:3000,
    corporateAmount:3000,
  },
};

const LEGACY_PLAN_ALIASES = {
  essential:"event",
  premium:"event",
  signature:"event",
};

const CORPORATE_TYPES = new Set(["afterwork","christmas","corporate","gala","team_building"]);

function segmentForEventType(eventType) {
  return CORPORATE_TYPES.has(String(eventType || "")) ? "corporate" : "private";
}

function normalizePlanId(planId) {
  const id = String(planId || "event");
  if (PLANS[id]) return id;
  return LEGACY_PLAN_ALIASES[id] || "event";
}

function plan(planId) {
  return PLANS[normalizePlanId(planId)];
}

function quote(planId, eventType) {
  const item = plan(planId);
  const segment = segmentForEventType(eventType);
  const amount = segment === "corporate" ? item.corporateAmount : item.privateAmount;
  return { planId:item.id, planLabel:item.label, segment, amount, currency:"eur" };
}

module.exports={PLANS,LEGACY_PLAN_ALIASES,CORPORATE_TYPES,segmentForEventType,normalizePlanId,plan,quote};
