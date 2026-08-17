// src/components/dashboard/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { reportAPI } from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/helpers";
import { StatCard, PageLoader } from "../shared/UI";
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="card"
      style={{
        padding: "10px 14px",
        fontSize: 12.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
      }}
    >
      <p style={{ color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--accent)", fontWeight: 600 }}>
        {formatCurrency(payload[0]?.value)}
      </p>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await reportAPI.getDashboard();
      setData(res.data.data);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const chartData = data.last7Days.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
    }),
    revenue: d.revenue,
    bills: d.count,
  }));

  const paymentColor = (m) =>
    ({ cash: "#3a7a5a", card: "#3a5a7a", upi: "#7a3a7a", other: "#6b6560" })[
      m
    ] || "#6b6560";

  return (
    <div
      style={{ padding: "32px 36px", maxWidth: 1280 }}
      className="fade-in page-content"
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Fraunces','Playfair Display',serif",
            fontSize: 28,
            fontWeight: 300,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div
        className="stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard
          icon={DollarSign}
          label="Today's Revenue"
          value={formatCurrency(data.today.revenue)}
          sub={`${data.today.bills} transactions`}
          accentColor="#bf9c5a"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={formatCurrency(data.month.revenue)}
          sub={`${data.month.bills} transactions`}
          accentColor="#3a7a5a"
        />
        <StatCard
          icon={ShoppingBag}
          label="All-time Bills"
          value={data.allTime.bills.toLocaleString()}
          sub="Total transactions"
          accentColor="#3a5a7a"
        />
        <StatCard
          icon={Package}
          label="Active Products"
          value={data.totalProducts.toLocaleString()}
          sub="In inventory"
          accentColor="#7a5a3a"
        />
      </div>

      {/* Chart + Low stock */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Area chart */}
        <div className="card fade-in" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              Revenue — 7 days
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bf9c5a" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#bf9c5a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#bf9c5a"
                strokeWidth={1.8}
                fill="url(#grad)"
                dot={false}
                activeDot={{ r: 4, fill: "#bf9c5a", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Low stock */}
        <div className="card fade-in">
          <div
            style={{
              padding: "16px 18px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} style={{ color: "#bf9c5a" }} />
            <p
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              Low Stock
            </p>
          </div>
          <div style={{ padding: "8px 0" }}>
            {data.lowStock.length === 0 ? (
              <p
                style={{
                  padding: "24px 18px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                All items stocked ✓
              </p>
            ) : (
              data.lowStock.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 18px",
                  }}
                >
                  <div style={{ minWidth: 0, marginRight: 8 }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {p.category || "—"}
                    </p>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background:
                        p.quantity === 0
                          ? "var(--danger-light)"
                          : "var(--accent-light)",
                      color:
                        p.quantity === 0
                          ? "var(--danger)"
                          : "var(--accent-dark)",
                      flexShrink: 0,
                    }}
                  >
                    {p.quantity} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card fade-in">
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--text-secondary)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Recent Transactions
          </p>
        </div>
        {data.recentBills.length === 0 ? (
          <p
            style={{
              padding: "32px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            No transactions yet
          </p>
        ) : (
          <div>
            {data.recentBills.map((bill, i) => (
              <div
                key={bill.id}
                className="table-row-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 22px",
                  borderBottom:
                    i < data.recentBills.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  transition: "background 0.12s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: paymentColor(bill.paymentMethod),
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 500,
                      }}
                    >
                      {bill.billNumber}
                    </p>
                    <p
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        marginTop: 1,
                      }}
                    >
                      {formatDateTime(bill.createdAt)}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    className="badge"
                    style={{
                      background: "var(--bg-sunken)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      textTransform: "capitalize",
                    }}
                  >
                    {bill.paymentMethod}
                  </span>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {formatCurrency(bill.totalAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
