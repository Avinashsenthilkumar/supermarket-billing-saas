// src/components/dashboard/Reports.jsx
import React, { useState, useEffect, useCallback } from "react";
import { reportAPI } from "../../services/api";
import { formatCurrency, getErrorMessage } from "../../utils/helpers";
import { PageLoader, StatCard, SectionHeader } from "../shared/UI";
import { DollarSign, ShoppingBag, TrendingUp, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import toast from "react-hot-toast";

const PALETTE = [
  "#bf9c5a",
  "#3a7a5a",
  "#3a5a7a",
  "#7a5a3a",
  "#7a3a7a",
  "#5a7a3a",
  "#7a3a5a",
];

const CustomBarTooltip = ({ active, payload, label }) => {
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
        {payload[0].value} units
      </p>
    </div>
  );
};

export default function Reports() {
  const [sales, setSales] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ startDate: "", endDate: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;
      const [sr, tr] = await Promise.all([
        reportAPI.getSales(params),
        reportAPI.getTopProducts({ ...params, limit: 8 }),
      ]);
      setSales(sr.data.data);
      setTopProducts(tr.data.data.topProducts);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, []);

  const barData = topProducts.map((p) => ({
    name:
      p.productName.length > 14
        ? p.productName.slice(0, 14) + "…"
        : p.productName,
    units: parseInt(p.totalSold),
  }));

  const pieData = topProducts
    .slice(0, 6)
    .map((p) => ({ name: p.productName, value: parseFloat(p.totalRevenue) }));

  if (loading) return <PageLoader />;

  return (
    <div
      style={{ padding: "28px 36px", maxWidth: 1280 }}
      className="fade-in page-content"
    >
      <SectionHeader
        title="Reports"
        subtitle="Sales analytics & insights"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              value={range.startDate}
              onChange={(e) =>
                setRange({ ...range, startDate: e.target.value })
              }
              className="input-field"
              style={{ width: 148 }}
            />
            <input
              type="date"
              value={range.endDate}
              onChange={(e) => setRange({ ...range, endDate: e.target.value })}
              className="input-field"
              style={{ width: 148 }}
            />
            <button
              onClick={load}
              className="btn-primary"
              style={{ padding: "9px 16px" }}
            >
              Apply
            </button>
            <button
              onClick={() => {
                setRange({ startDate: "", endDate: "" });
                setTimeout(load, 50);
              }}
              className="btn-ghost"
              style={{ padding: "9px 16px" }}
            >
              Clear
            </button>
          </div>
        }
      />

      {/* Summary stats */}
      {sales && (
        <div
          className="stagger"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon={ShoppingBag}
            label="Total Bills"
            value={sales.summary.totalBills}
            sub="Completed transactions"
            accentColor="#3a5a7a"
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={formatCurrency(sales.summary.totalRevenue)}
            sub="Net sales"
            accentColor="#bf9c5a"
          />
          <StatCard
            icon={TrendingUp}
            label="Average Bill"
            value={formatCurrency(sales.summary.averageBillValue)}
            sub="Per transaction"
            accentColor="#3a7a5a"
          />
          <StatCard
            icon={BarChart3}
            label="Items Sold"
            value={sales.summary.totalItems.toLocaleString()}
            sub="Units total"
            accentColor="#7a5a3a"
          />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Bar chart */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Top Products — Units Sold
          </p>
          {barData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                padding: "40px 0",
              }}
            >
              No data for this period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={barData}
                margin={{ top: 5, right: 5, left: 0, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "var(--bg-sunken)" }}
                />
                <Bar
                  dataKey="units"
                  fill="#bf9c5a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Revenue Share
          </p>
          {pieData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                padding: "40px 0",
              }}
            >
              No data for this period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PALETTE[i % PALETTE.length]}
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  formatter={(v) => (
                    <span
                      style={{ color: "var(--text-secondary)", fontSize: 11.5 }}
                    >
                      {v}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Top Products by Revenue
          </p>
        </div>
        {topProducts.length === 0 ? (
          <p
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No data for this period
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13.5,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["#", "Product", "Units Sold", "Orders", "Revenue"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign:
                          h === "#" || h === "Product" ? "left" : "right",
                        padding: "10px 18px",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr
                  key={p.productId}
                  className="table-row-hover"
                  style={{
                    borderBottom:
                      i < topProducts.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    transition: "background 0.12s ease",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 18px",
                      color: "var(--text-muted)",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background:
                          i < 3 ? "var(--accent-light)" : "var(--bg-sunken)",
                        color:
                          i < 3 ? "var(--accent-dark)" : "var(--text-muted)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 18px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {p.productName}
                  </td>
                  <td
                    style={{
                      padding: "12px 18px",
                      textAlign: "right",
                      fontFamily: "JetBrains Mono, monospace",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {parseInt(p.totalSold)}
                  </td>
                  <td
                    style={{
                      padding: "12px 18px",
                      textAlign: "right",
                      fontFamily: "JetBrains Mono, monospace",
                      color: "var(--text-muted)",
                    }}
                  >
                    {parseInt(p.orderCount)}
                  </td>
                  <td
                    style={{
                      padding: "12px 18px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "var(--accent)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {formatCurrency(p.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
