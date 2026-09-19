const PLANS = {
  essential: {
    id:"essential", label:"Essentiel",
    privateAmount:4900, corporateAmount:14900,
  },
  premium: {
    id:"premium", label:"Premium",
    privateAmount:8900, corporateAmount:24900,
  },
  signature: {
    id:"signature", label:"Signature",
    privateAmount:12900, corporateAmount:39900,
  },
};

const CORPORATE_TYPES = new Set(["afterwork","christmas","corporate","gala","team_building"]);

function segmentForEventType(eventType) {
  return CORPORATE_TYPES.has(String(eventType || "")) ? "corporate" : "private";
}

function plan(planId) {
  const value = PLANS[String(planId || "")];
  if (!value) throw new Error("unknown-plan");
  return value;
}

function quote(planId, eventType) {
  const item = plan(planId);
  const segment = segmentForEventType(eventType);
  const amount = segment === "corporate" ? item.corporateAmount : item.privateAmount;
  return { planId:item.id, planLabel:item.label, segment, amount, currency:"eur" };
}

module.exports={PLANS,CORPORATE_TYPES,segmentForEventType,plan,quote};
