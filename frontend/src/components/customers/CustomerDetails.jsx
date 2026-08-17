import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { customerAPI, billAPI } from "../../services/api";
import { invoiceAPI } from "../../services/api";
import {
  ArrowLeft,
  Receipt,
  IndianRupee,
  Calendar,
  Eye,
  User,
  Phone,
} from "lucide-react";

export default function CustomerDetails() {
  const { phone } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      setLoading(true);

      const res = await customerAPI.getByPhone(phone);

      setCustomer(res.data.data.customer);
      setBills(res.data.data.bills);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div style={{ padding: 30 }}>
        <h2>Loading...</h2>
      </div>
    );

  if (!customer)
    return (
      <div style={{ padding: 30 }}>
        <h2>Customer not found</h2>
      </div>
    );

  return (
    <div
      style={{
        padding: 30,
        background: "#f8f6f2",
        minHeight: "100vh",
      }}
    >
      {/* Header */}

      <button
        onClick={() => navigate("/customers")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          marginBottom: 25,
          color: "#555",
          fontSize: 15,
        }}
      >
        <ArrowLeft size={18} />
        Back to Customers
      </button>

      <h1
        style={{
          fontSize: 34,
          marginBottom: 6,
          fontFamily: "'Fraunces', serif",
        }}
      >
        {customer.name}
      </h1>

      <div
        style={{
          display: "flex",
          gap: 20,
          color: "#666",
          marginBottom: 30,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <User size={16} />
          {customer.name}
        </span>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Phone size={16} />
          {customer.phone}
        </span>
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
          title="Total Bills"
          value={customer.totalBills}
          icon={<Receipt color="#bf9c5a" />}
        />

        <Card
          title="Total Purchase"
          value={`₹${Number(customer.totalSpent).toFixed(2)}`}
          icon={<IndianRupee color="#3a7a5a" />}
        />

        <Card
          title="Last Purchase"
          value={new Date(customer.lastPurchase).toLocaleDateString()}
          icon={<Calendar color="#3366ff" />}
        />
      </div>

      {/* Purchase History */}

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e5e5e5",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid #eee",
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          Purchase History
        </div>

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
              <Th>Bill No</Th>
              <Th>Date</Th>
              <Th>Payment</Th>
              <Th>Amount</Th>
              <Th>Invoice</Th>
            </tr>
          </thead>

          <tbody>
            {bills.map((bill) => (
              <tr
                key={bill.id}
                style={{
                  borderTop: "1px solid #eee",
                }}
              >
                <Td>{bill.bill_number}</Td>

                <Td>{new Date(bill.createdAt).toLocaleString()}</Td>

                <Td>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 30,
                      background: "#f4efe8",
                      fontSize: 13,
                      textTransform: "capitalize",
                    }}
                  >
                    {bill.payment_method}
                  </span>
                </Td>

                <Td>₹{Number(bill.total_amount).toFixed(2)}</Td>

                <Td>
                  <button
                    onClick={async () => {
                      try {
                        const res = await invoiceAPI.download(bill.id);

                        const url = window.URL.createObjectURL(
                          new Blob([res.data], { type: "application/pdf" }),
                        );

                        window.open(url, "_blank");
                      } catch (err) {
                        console.error(err);
                        alert("Unable to open invoice.");
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: "#1a1714",
                      color: "#fff",
                    }}
                  >
                    <Eye size={16} />
                    View
                  </button>
                </Td>
              </tr>
            ))}
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
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 16 }}>{icon}</div>

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
