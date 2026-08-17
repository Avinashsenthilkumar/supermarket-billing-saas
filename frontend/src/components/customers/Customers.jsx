import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerAPI } from "../../services/api";
import { Users, Receipt, IndianRupee, Search } from "lucide-react";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();

    setFiltered(
      customers.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(search),
      ),
    );
  }, [search, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const res = await customerAPI.getAll();

      setCustomers(res.data.data.customers);
      setFiltered(res.data.data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCustomers = customers.length;

  const totalRevenue = customers.reduce(
    (sum, c) => sum + Number(c.totalSpent || 0),
    0,
  );

  const repeatCustomers = customers.filter(
    (c) => Number(c.totalBills) > 1,
  ).length;

  return (
    <div
      style={{
        padding: 30,
        background: "#f8f6f2",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 34,
              fontFamily: "'Fraunces', serif",
              marginBottom: 8,
            }}
          >
            Customers
          </h1>

          <p style={{ color: "#777" }}>View all customer purchase history.</p>
        </div>

        <div
          style={{
            width: 320,
            display: "flex",
            alignItems: "center",
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            padding: "10px 14px",
          }}
        >
          <Search size={18} color="#999" />

          <input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              background: "transparent",
            }}
          />
        </div>
      </div>

      {/* Cards */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <Card
          title="Customers"
          value={totalCustomers}
          icon={<Users color="#bf9c5a" />}
        />

        <Card
          title="Total Revenue"
          value={`₹${totalRevenue.toFixed(2)}`}
          icon={<IndianRupee color="#3a7a5a" />}
        />

        <Card
          title="Repeat Customers"
          value={repeatCustomers}
          icon={<Receipt color="#3366ff" />}
        />
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e5e5e5",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead
            style={{
              background: "#fafafa",
            }}
          >
            <tr>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th>Total Bills</Th>
              <Th>Total Purchase</Th>
              <Th>Last Purchase</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: 40,
                  }}
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: 40,
                  }}
                >
                  No customers found
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={i}
                  onClick={() =>
                    navigate(`/customers/${encodeURIComponent(c.phone)}`)
                  }
                  style={{
                    borderTop: "1px solid #eee",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#faf9f7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  <Td>{c.name || "-"}</Td>

                  <Td>{c.phone}</Td>

                  <Td>{c.totalBills}</Td>

                  <Td>₹{Number(c.totalSpent).toFixed(2)}</Td>

                  <Td>{new Date(c.lastPurchase).toLocaleDateString()}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 22,
        border: "1px solid #e5e5e5",
      }}
    >
      <div
        style={{
          marginBottom: 15,
        }}
      >
        {icon}
      </div>

      <h2
        style={{
          fontSize: 28,
          margin: 0,
        }}
      >
        {value}
      </h2>

      <p
        style={{
          color: "#777",
          marginTop: 8,
        }}
      >
        {title}
      </p>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: 18,
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td
      style={{
        padding: 18,
      }}
    >
      {children}
    </td>
  );
}
