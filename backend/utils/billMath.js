// utils/billMath.js — pure bill calculations (no database access, unit-testable)
const { HttpError, num, str, round2 } = require("./helpers");

const PAYMENT_METHODS = ["cash", "upi", "card", "credit", "wallet", "cheque", "other"];

/**
 * Pure calculation of a bill. Exported for unit tests.
 * lines: [{ price, quantity, discount, taxRate }]
 * returns per-line amounts + totals
 */
const calculateBill = (lines, { billDiscount = 0, loyaltyDiscount = 0, pricesIncludeTax = true, taxEnabled = true, roundOff = true }) => {
  const computed = lines.map((l) => {
    const gross = round2(num(l.price) * num(l.quantity));
    const discount = round2(Math.min(Math.max(0, num(l.discount)), gross));
    return { ...l, gross, discount, net: round2(gross - discount) };
  });
  const subtotal = round2(computed.reduce((a, l) => a + l.gross, 0));
  const itemDiscount = round2(computed.reduce((a, l) => a + l.discount, 0));
  const netSum = round2(computed.reduce((a, l) => a + l.net, 0));

  const billDisc = round2(Math.min(Math.max(0, billDiscount), netSum));
  const loyaltyDisc = round2(Math.min(Math.max(0, loyaltyDiscount), round2(netSum - billDisc)));
  const extra = round2(billDisc + loyaltyDisc);

  // Spread bill-level discounts over lines proportionally (keeps GST correct)
  let allocated = 0;
  computed.forEach((l, i) => {
    let share;
    if (i === computed.length - 1) share = round2(extra - allocated);
    else share = netSum > 0 ? round2((extra * l.net) / netSum) : 0;
    share = Math.min(share, l.net);
    allocated = round2(allocated + share);
    l.finalNet = round2(l.net - share);
    const rate = taxEnabled ? Math.max(0, num(l.taxRate)) / 100 : 0;
    if (pricesIncludeTax) {
      l.taxable = round2(l.finalNet / (1 + rate));
      l.tax = round2(l.finalNet - l.taxable);
      l.total = l.finalNet;
    } else {
      l.taxable = l.finalNet;
      l.tax = round2(l.finalNet * rate);
      l.total = round2(l.finalNet + l.tax);
    }
  });

  const taxableAmount = round2(computed.reduce((a, l) => a + l.taxable, 0));
  const taxAmount = round2(computed.reduce((a, l) => a + l.tax, 0));
  const rawTotal = round2(computed.reduce((a, l) => a + l.total, 0));
  const totalAmount = roundOff ? Math.round(rawTotal) : rawTotal;
  const cgst = round2(taxAmount / 2);
  return {
    lines: computed,
    subtotal,
    itemDiscount,
    billDiscount: billDisc,
    loyaltyDiscount: loyaltyDisc,
    taxableAmount,
    taxAmount,
    cgst,
    sgst: round2(taxAmount - cgst),
    roundOff: round2(totalAmount - rawTotal),
    totalAmount: round2(totalAmount),
  };
};

// Normalise payments → { payments, paid, due, change, method }
const settlePayments = (total, body, settings) => {
  const allowed = PAYMENT_METHODS;
  let payments = Array.isArray(body.payments) ? body.payments : [];
  payments = payments
    .map((p) => ({ method: String(p.method || "").toLowerCase(), amount: round2(num(p.amount)), reference: str(p.reference, 80) }))
    .filter((p) => allowed.includes(p.method) && p.amount > 0);

  if (!payments.length) {
    const method = allowed.includes(body.paymentMethod) ? body.paymentMethod : settings.defaultPaymentMethod || "cash";
    payments = [{ method, amount: total, reference: str(body.paymentReference, 80) }];
  }

  const creditPart = round2(payments.filter((p) => p.method === "credit").reduce((a, p) => a + p.amount, 0));
  const tendered = round2(payments.filter((p) => p.method !== "credit").reduce((a, p) => a + p.amount, 0));
  const cashTendered = round2(payments.filter((p) => p.method === "cash").reduce((a, p) => a + p.amount, 0));

  let change = 0;
  let paid = tendered;
  if (tendered > total) {
    change = round2(tendered - total);
    if (change > cashTendered + 0.001) throw new HttpError(400, "Only cash payments can be more than the bill amount");
    paid = total;
    // Keep only the cash actually retained (tendered − change) in the payment lines
    let left = change;
    for (let i = payments.length - 1; i >= 0 && left > 0; i--) {
      if (payments[i].method !== "cash") continue;
      const cut = Math.min(left, payments[i].amount);
      payments[i] = { ...payments[i], amount: round2(payments[i].amount - cut), tendered: payments[i].amount };
      left = round2(left - cut);
    }
    payments = payments.filter((p) => p.amount > 0 || p.method !== "cash");
  }
  const due = round2(Math.max(0, total - paid));
  if (creditPart > 0 && due <= 0) {
    // credit entered but fully paid by other methods — drop credit line
    payments = payments.filter((p) => p.method !== "credit");
  }
  // Record the real credit amount (what is actually outstanding)
  payments = payments.filter((p) => p.method !== "credit");
  if (due > 0) payments.push({ method: "credit", amount: due, reference: null });

  const used = [...new Set(payments.map((p) => p.method))];
  const method = used.length > 1 ? "split" : used[0] || "cash";
  return { payments, paid, due, change, method };
};

module.exports = { calculateBill, settlePayments, PAYMENT_METHODS };
