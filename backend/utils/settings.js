// utils/settings.js — read platform settings (master) and shop settings (tenant)
const { PlatformSetting } = require("../models/master");
const { mergePlatform, mergeSettings } = require("./defaults");

let platformCache = { value: null, at: 0 };

const getPlatformSettings = async (fresh = false) => {
  if (!fresh && platformCache.value && Date.now() - platformCache.at < 30000) return platformCache.value;
  const row = await PlatformSetting.findByPk(1);
  const value = mergePlatform(row ? row.data : {});
  platformCache = { value, at: Date.now() };
  return value;
};

const clearPlatformCache = () => {
  platformCache = { value: null, at: 0 };
};

const getShopSettings = async (db, options = {}) => {
  const row = await db.Setting.findByPk(1, options);
  return mergeSettings(row ? row.data : {});
};

// Atomically take the next number for bills / purchases / returns
const nextSequence = async (db, column, transaction) => {
  const row = await db.Setting.findByPk(1, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  const next = (row[column] || 0) + 1;
  row[column] = next;
  await row.save({ transaction, fields: [column] });
  return { next, settings: mergeSettings(row.data) };
};

const planLimits = (platform, plan) => platform.plans[plan] || platform.plans.free || { maxUsers: 0, maxProducts: 0 };

module.exports = { getPlatformSettings, clearPlatformCache, getShopSettings, nextSequence, planLimits };
