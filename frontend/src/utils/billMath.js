// src/utils/billMath.js — same calculation as backend/utils/billMath.js (keep in sync)
const num = (v, f = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : f;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const calculateBill = (lines, { billDiscount = 0, loyaltyDiscount = 0, pricesIncludeTax = true, taxEnabled = true, roundOff = true }) => {
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

