// src/components/admin/Admin.jsx — PLATFORM admin: every business (each with its own database) + platform settings
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Store, Users, Package, Receipt, Plus, Eye, EyeOff, LayoutDashboard, Settings as SettingsIcon, Database, LogIn, Save, Trash2, Key } from "lucide-react";
import { adminAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { formatCurrency, formatDate, getErrorMessage, ROLE_LABELS, ymd } from "../../utils/helpers";
import { Page, SectionHeader, Tabs, StatCard, Modal, Field, Grid, Toggle, Spinner, Table, Th, Td, Pill, SearchInput, PageLoader, EmptyState, MiniStat } from "../shared/UI";

const emptyShop = { shopName: "", ownerEmail: "", username: "", password: "", phone: "", plan: "free", days: 30 };

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, sh] = await Promise.all([adminAPI.getStats(), adminAPI.getShops()]);
      setStats(s.data.data);
      setShops(sh.data.data.shops);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = shops.filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || [s.name, s.ownerEmail, s.phone, s.dbName].some((v) => String(v || "").toLowerCase().includes(q));
  });

  return (
    <Page>
      <SectionHeader
        title="Platform Admin"
        subtitle="Every business runs on its own private database"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New business
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Overview", icon: LayoutDashboard },
          { value: "shops", label: `Businesses (${shops.length})`, icon: Store },
          { value: "settings", label: "Settings", icon: SettingsIcon },
        ]}
      />

      {loading ? (
        <PageLoader />
      ) : tab === "overview" ? (
        <Overview stats={stats} shops={shops} onOpen={setSelected} />
      ) : tab === "shops" ? (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Search business, email, phone…" style={{ maxWidth: 380, marginBottom: 14 }} />
          <ShopTable shops={filtered} onOpen={setSelected} />
        </>
      ) : (
        <PlatformSettings />
      )}

      <CreateShopModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        plans={stats?.plans}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
      <ShopModal shopId={selected} plans={stats?.plans} onClose={() => setSelected(null)} onChanged={load} />
    </Page>
  );
}

function Overview({ stats, shops, onOpen }) {
  if (!stats) return null;
  const expiring = shops
    .filter((s) => s.daysLeft !== null && s.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard icon={Store} label="Businesses" value={stats.totalShops} sub={`${stats.activeShops} active · ${stats.expiredShops} expired`} />
        <StatCard icon={Users} label="User logins" value={stats.totalUsers} sub={`${stats.totalCustomers} customers across shops`} />
        <StatCard icon={Package} label="Products" value={stats.totalProducts.toLocaleString()} sub="All shops" />
        <StatCard icon={Receipt} label="Bills" value={stats.totalBills.toLocaleString()} sub={formatCurrency(stats.totalRevenue)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {Object.entries(stats.plans || {}).map(([k, p]) => (
          <MiniStat key={k} label={`${p.label} plan`} value={stats.byPlan?.[k] || 0} />
        ))}
        <MiniStat label="Open DB connections" value={stats.connections} />
        <MiniStat label="Inactive" value={stats.inactiveShops} tone={stats.inactiveShops ? "danger" : undefined} />
      </div>
      <div className="card">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          Subscriptions ending within 7 days
        </div>
        {expiring.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Nothing expiring soon ✓</p>
        ) : (
          <ShopTable shops={expiring} onOpen={onOpen} compact />
        )}
      </div>
    </>
  );
}

function ShopTable({ shops, onOpen, compact }) {
  if (!shops.length)
    return (
      <div className="card">
        <EmptyState icon={Store} title="No businesses found" />
      </div>
    );
  return (
    <div className={compact ? "" : "card"} style={{ overflow: "hidden" }}>
      <Table minWidth={860}>
        <thead>
          <tr>
            <Th>Business</Th>
            <Th>Owner</Th>
            <Th>Plan</Th>
            <Th>Valid till</Th>
            <Th align="right">Users</Th>
            <Th align="right">Products</Th>
            <Th align="right">Sales</Th>
            <Th align="center">Status</Th>
          </tr>
        </thead>
        <tbody>
          {shops.map((s) => (
            <tr key={s.id} className="table-row-hover" style={{ cursor: "pointer" }} onClick={() => onOpen(s.id)}>
              <Td>
                <p style={{ fontWeight: 600 }}>{s.name}</p>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>{s.dbName}</p>
              </Td>
              <Td muted>
                {s.ownerEmail}
                {s.phone && <div style={{ fontSize: 11.5 }}>{s.phone}</div>}
              </Td>
              <Td>{s.planLabel}</Td>
              <Td muted>
                {s.subscriptionEnds ? formatDate(s.subscriptionEnds) : "Lifetime"}
                {s.daysLeft !== null && (
                  <div style={{ fontSize: 11.5, color: s.daysLeft < 0 ? "var(--danger)" : s.daysLeft <= 7 ? "var(--accent-dark)" : "var(--text-muted)" }}>
                    {s.daysLeft < 0 ? `Expired ${-s.daysLeft}d ago` : `${s.daysLeft} days left`}
                  </div>
                )}
              </Td>
              <Td align="right" mono>
                {s.users}
              </Td>
              <Td align="right" mono>
                {s.products}
              </Td>
              <Td align="right" mono>
                {formatCurrency(s.revenue)}
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.bills} bills</div>
              </Td>
              <Td align="center">
                {!s.dbOk ? (
                  <Pill tone="danger">DB error</Pill>
                ) : !s.isActive ? (
                  <Pill tone="danger">Inactive</Pill>
                ) : s.subscriptionActive ? (
                  <Pill tone="success">Active</Pill>
                ) : (
                  <Pill tone="warning">Expired</Pill>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function CreateShopModal({ isOpen, onClose, onCreated, plans }) {
  const [form, setForm] = useState(emptyShop);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (isOpen) setForm(emptyShop);
  }, [isOpen]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.shopName || !form.ownerEmail || !form.password) return toast.error("Business name, owner email and password are required");
    setSaving(true);
    try {
      const r = await adminAPI.createShop(form);
      toast.success(`Created — database ${r.data.data.dbName}`);
      onCreated();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New business" maxWidth={520}>
      <Grid cols={2}>
        <Field label="Business name" required span={2}>
          <input className="input-field" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} placeholder="e.g. Krish Mart" />
        </Field>
        <Field label="Owner name">
          <input className="input-field" value={form.username} onChange={(e) => set("username", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className="input-field" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Owner email (login)" required>
          <input className="input-field" type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
        </Field>
        <Field label="Password" required>
          <div style={{ position: "relative" }}>
            <input className="input-field" type={showPass ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} style={{ paddingRight: 38 }} />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
        <Field label="Plan">
          <select className="input-field" value={form.plan} onChange={(e) => set("plan", e.target.value)}>
            {Object.entries(plans || { free: { label: "Free" } }).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valid for (days)">
          <input className="input-field" type="number" min={1} value={form.days} onChange={(e) => set("days", e.target.value)} />
        </Field>
      </Grid>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>A new private MySQL database is created automatically for this business.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={submit} disabled={saving}>
          {saving ? <Spinner size={13} color="var(--bg)" /> : <Plus size={14} />} Create
        </button>
      </div>
    </Modal>
  );
}

function ShopModal({ shopId, onClose, onChanged, plans }) {
  const { loginWithSession, shop: myShop } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (!shopId) return;
    setData(null);
    setNewPass("");
    setConfirmName("");
    adminAPI
      .getShop(shopId)
      .then((r) => {
        setData(r.data.data);
        const s = r.data.data.shop;
        setForm({
          name: s.name,
          phone: s.phone || "",
          plan: s.plan,
          subscriptionEnds: s.subscriptionEnds ? ymd(new Date(s.subscriptionEnds)) : "",
          notes: s.notes || "",
          isActive: s.isActive,
        });
      })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, [shopId]);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(msg || r?.data?.message || "Done");
      onChanged();
      return r;
    } catch (e) {
      toast.error(getErrorMessage(e));
      return null;
    } finally {
      setBusy("");
    }
  };

  const save = () =>
    run("save", () => adminAPI.updateShop(shopId, { ...form, subscriptionEnds: form.subscriptionEnds ? `${form.subscriptionEnds}T23:59:59` : null })).then((r) => {
      if (r) setData((d) => ({ ...d, shop: r.data.data.shop }));
    });
  const extend = (days) =>
    run("extend", () => adminAPI.updateShop(shopId, { extendDays: days }), `Extended by ${days} days`).then((r) => {
      if (r) {
        setData((d) => ({ ...d, shop: r.data.data.shop }));
        setForm((f) => ({ ...f, subscriptionEnds: ymd(new Date(r.data.data.shop.subscriptionEnds)) }));
      }
    });

  const s = data?.shop;
  const own = s && myShop && s.id === myShop.id;
  return (
    <Modal isOpen={!!shopId} onClose={onClose} title={s ? s.name : "Business"} maxWidth={720}>
      {!data ? (
        <PageLoader />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }} className="form-grid">
            <MiniStat label="Products" value={s.products} />
            <MiniStat label="Bills" value={s.bills} />
            <MiniStat label="Customers" value={s.customers} />
            <MiniStat label="Sales" value={formatCurrency(s.revenue)} />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Database size={13} /> Database: <code>{s.dbName}</code> · Created {formatDate(s.createdAt)}
          </p>

          <Grid cols={2}>
            <Field label="Business name">
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Plan">
              <select className="input-field" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                {Object.entries(plans || {}).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Valid till (empty = lifetime)">
              <input className="input-field" type="date" value={form.subscriptionEnds} onChange={(e) => setForm({ ...form, subscriptionEnds: e.target.value })} />
            </Field>
            <Field label="Admin notes" span={2}>
              <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment received, contact person…" />
            </Field>
          </Grid>
          {!own && <Toggle label="Business is active" description="Inactive businesses cannot log in" checked={!!form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={save} disabled={busy === "save"}>
              {busy === "save" ? <Spinner size={13} color="var(--bg)" /> : <Save size={13} />} Save
            </button>
            {[30, 90, 365].map((d) => (
              <button key={d} className="btn-ghost" onClick={() => extend(d)} disabled={busy === "extend"}>
                +{d} days
              </button>
            ))}
          </div>

          <div className="card-sunken" style={{ padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Users ({data.users.length})</p>
            {data.users.map((u) => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                <span>
                  {u.username} <span style={{ color: "var(--text-muted)" }}>· {u.email}</span>
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {u.isSuperAdmin ? "Platform admin" : ROLE_LABELS[u.role]} {u.isActive ? "" : "(disabled)"}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <input className="input-field" type="text" placeholder="New owner password" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={{ maxWidth: 240 }} />
              <button
                className="btn-ghost"
                disabled={newPass.length < 6 || busy === "pw"}
                onClick={() => run("pw", () => adminAPI.resetPassword(shopId, { newPassword: newPass })).then(() => setNewPass(""))}
              >
                <Key size={13} /> Reset owner password
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!own && (
              <button
                className="btn-ghost"
                disabled={busy === "login"}
                onClick={async () => {
                  setBusy("login");
                  try {
                    const r = await adminAPI.loginAs(shopId);
                    loginWithSession(r.data.data);
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                    setBusy("");
                  }
                }}
              >
                <LogIn size={13} /> Open this shop
              </button>
            )}
            <button className="btn-ghost" onClick={() => run("repair", () => adminAPI.repairDb(shopId))} disabled={busy === "repair"}>
              <Database size={13} /> Verify database
            </button>
          </div>

          {!own && (
            <div style={{ border: "1px solid var(--danger)", borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>Delete business permanently</p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 10px" }}>
                Drops database <code>{s.dbName}</code> with all products, bills and customers. This cannot be undone. Type <b>{s.name}</b> to confirm.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input-field" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={s.name} style={{ maxWidth: 260 }} />
                <button
                  className="btn-danger"
                  disabled={confirmName !== s.name || busy === "delete"}
                  onClick={() =>
                    run("delete", () => adminAPI.deleteShop(shopId, confirmName)).then((r) => {
                      if (r) onClose();
                    })
                  }
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PlatformSettings() {
  const { setPlatform } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminAPI
      .getSettings()
      .then((r) => setForm(r.data.data.settings))
      .catch((e) => toast.error(getErrorMessage(e)));
  }, []);
  if (!form) return <PageLoader />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPlan = (key, field, value) => setForm((f) => ({ ...f, plans: { ...f.plans, [key]: { ...f.plans[key], [field]: value } } }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await adminAPI.updateSettings(form);
      setForm(r.data.data.settings);
      setPlatform((p) => ({ ...p, ...r.data.data.settings }));
      toast.success("Platform settings saved");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const card = (title, children, description) => (
    <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
      <h3 style={{ fontSize: 17 }}>{title}</h3>
      {description && <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{description}</p>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
        These settings apply to the whole platform. Each business sets its own name, theme and colours in <b>Settings</b> (sidebar).
      </p>
      {card(
        "Branding",
        <Grid cols={2}>
          <Field label="Platform name (login page & title)">
            <input className="input-field" value={form.platformName} onChange={(e) => set("platformName", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <input className="input-field" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Support phone">
            <input className="input-field" value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} />
          </Field>
          <Field label="Support email">
            <input className="input-field" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
          </Field>
          <Field label="Default theme for new shops">
            <select className="input-field" value={form.defaultThemeMode} onChange={(e) => set("defaultThemeMode", e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Follow device</option>
            </select>
          </Field>
          <Field label="Default brand colour for new shops">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="color"
                value={form.defaultAccentColor}
                onChange={(e) => set("defaultAccentColor", e.target.value)}
                style={{ width: 46, height: 38, border: "1px solid var(--border)", borderRadius: 8, background: "none" }}
              />
              <code>{form.defaultAccentColor}</code>
            </div>
          </Field>
          <Field label="Default currency symbol">
            <input className="input-field" value={form.currencySymbol} onChange={(e) => set("currencySymbol", e.target.value)} maxLength={4} />
          </Field>
        </Grid>,
      )}
      {card(
        "Signups & trial",
        <>
          <Toggle label="Allow public signups" description="When off, only you can create businesses" checked={!!form.allowSignup} onChange={(v) => set("allowSignup", v)} />
          <Grid cols={3} style={{ marginTop: 10 }}>
            <Field label="Free trial days">
              <input className="input-field" type="number" min={1} max={365} value={form.trialDays} onChange={(e) => set("trialDays", e.target.value)} />
            </Field>
          </Grid>
        </>,
      )}
      {card(
        "Plans",
        <Table minWidth={560}>
          <thead>
            <tr>
              <Th>Key</Th>
              <Th>Label</Th>
              <Th>Price / month</Th>
              <Th>Max users</Th>
              <Th>Max products</Th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(form.plans).map(([k, p]) => (
              <tr key={k}>
                <Td mono>{k}</Td>
                <Td>
                  <input className="input-field" value={p.label} onChange={(e) => setPlan(k, "label", e.target.value)} />
                </Td>
                <Td>
                  <input className="input-field" type="number" min={0} value={p.price} onChange={(e) => setPlan(k, "price", e.target.value)} />
                </Td>
                <Td>
                  <input className="input-field" type="number" min={0} value={p.maxUsers} onChange={(e) => setPlan(k, "maxUsers", e.target.value)} />
                </Td>
                <Td>
                  <input className="input-field" type="number" min={0} value={p.maxProducts} onChange={(e) => setPlan(k, "maxProducts", e.target.value)} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>,
        "0 = unlimited",
      )}
      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? <Spinner size={13} color="var(--bg)" /> : <Save size={14} />} Save platform settings
      </button>
    </div>
  );
}
