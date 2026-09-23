// utils/shopPayload.js — consistent shape of the `shop` object sent to the frontend
const { planLimits } = require("./settings");

const shopPayload = (shop, platform, superAdmin = false) => {
  const ends = shop.subscriptionEnds ? new Date(shop.subscriptionEnds) : null;
  const daysLeft = ends ? Math.ceil((ends.getTime() - Date.now()) / 86400000) : null;
  return {
    id: shop.id,
    name: shop.name,
    plan: shop.plan,
    planLabel: platform ? planLimits(platform, shop.plan).label || shop.plan : shop.plan,
    limits: platform ? planLimits(platform, shop.plan) : null,
    subscriptionEnds: shop.subscriptionEnds,
    daysLeft,
    subscriptionActive: superAdmin || !ends || ends.getTime() >= Date.now(),
    isActive: shop.isActive,
  };
};

module.exports = { shopPayload };
