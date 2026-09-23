// src/context/SettingsContext.jsx — shop settings + platform branding, applies the theme everywhere
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { platformAPI, settingsAPI } from "../services/api";
import { applyTheme, applyCachedTheme } from "../utils/theme";
import { configureFormat } from "../utils/helpers";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext(null);

const FALLBACK = {
  businessName: "My Supermarket",
  tagline: "Point of Sale",
  themeMode: "light",
  accentColor: "#bf9c5a",
  sidebarStyle: "dark",
  fontScale: 100,
  currencySymbol: "₹",
  locale: "en-IN",
  taxEnabled: true,
  pricesIncludeTax: true,
  paymentMethods: ["cash", "upi", "card", "credit"],
  defaultPaymentMethod: "cash",
  loyaltyEnabled: true,
  loyaltyPointValue: 1,
  loyaltyMinRedeem: 50,
  lowStockThreshold: 10,
  units: ["pcs", "kg", "g", "l", "ml", "pack", "box", "dozen"],
  categories: [],
  expenseCategories: ["Rent", "Salary", "Electricity", "Other"],
  receiptFormat: "thermal80",
};

applyCachedTheme();

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(FALLBACK);
  const [platform, setPlatform] = useState({ platformName: "SuperMart POS", allowSignup: true, trialDays: 14 });
  const [loaded, setLoaded] = useState(false);

  // Public platform branding (login page etc.)
  useEffect(() => {
    platformAPI
      .getPublic()
      .then((r) => {
        setPlatform(r.data.data);
        document.title = r.data.data.platformName || "SuperMart POS";
        if (!localStorage.getItem("theme")) applyTheme({ themeMode: r.data.data.defaultThemeMode, accentColor: r.data.data.defaultAccentColor });
      })
      .catch(() => {});
  }, []);

  const apply = useCallback((s) => {
    const merged = { ...FALLBACK, ...s };
    setSettings(merged);
    applyTheme(merged);
    configureFormat(merged);
    if (merged.businessName) document.title = merged.businessName;
    return merged;
  }, []);

  const reload = useCallback(async () => {
    try {
      const r = await settingsAPI.get();
      apply(r.data.data.settings);
    } catch {
      /* keep previous */
    } finally {
      setLoaded(true);
    }
  }, [apply]);

  useEffect(() => {
    if (isAuthenticated) reload();
    else setLoaded(true);
  }, [isAuthenticated, reload]);

  // Follow OS theme changes when "system" is selected
  useEffect(() => {
    if (settings.themeMode !== "system" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(settings);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler));
  }, [settings]);

  const save = useCallback(
    async (patch) => {
      const r = await settingsAPI.update(patch);
      return apply(r.data.data.settings);
    },
    [apply],
  );

  // Live preview without saving
  const preview = useCallback((patch) => applyTheme({ ...settings, ...patch }), [settings]);

  return (
    <SettingsContext.Provider value={{ settings, platform, setPlatform, loaded, reload, save, apply, preview }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
};
