const assert = require("assert");
const { calculateBill, settlePayments } = require("../utils/billMath");
const S = { defaultPaymentMethod: "cash" };

// 1. GST inclusive, 2 lines, no discounts
let c = calculateBill([{ price: 118, quantity: 1, taxRate: 18 }, { price: 50, quantity: 2, taxRate: 0 }], { pricesIncludeTax: true, taxEnabled: true, roundOff: true });
assert.equal(c.subtotal, 218); assert.equal(c.taxAmount, 18); assert.equal(c.taxableAmount, 200); assert.equal(c.totalAmount, 218);
assert.equal(c.cgst + c.sgst, 18);

// 2. GST exclusive
c = calculateBill([{ price: 100, quantity: 3, taxRate: 5 }], { pricesIncludeTax: false, roundOff: false });
assert.equal(c.taxAmount, 15); assert.equal(c.totalAmount, 315);

// 3. Bill discount distributed; total = net - discount (inclusive)
c = calculateBill([{ price: 100, quantity: 1, taxRate: 12 }, { price: 300, quantity: 1, taxRate: 5 }], { billDiscount: 40, pricesIncludeTax: true, roundOff: false });
assert.equal(c.totalAmount, 360); assert.equal(c.billDiscount, 40);
assert.equal(c.lines[0].finalNet, 90); assert.equal(c.lines[1].finalNet, 270);

// 4. Discount cannot exceed amount, loyalty capped
c = calculateBill([{ price: 10, quantity: 1 }], { billDiscount: 8, loyaltyDiscount: 50, roundOff: false });
assert.equal(c.totalAmount, 0); assert.equal(c.loyaltyDiscount, 2);

// 5. Decimal qty + round-off
c = calculateBill([{ price: 64.5, quantity: 1.25, taxRate: 0 }], { roundOff: true });
assert.equal(c.subtotal, 80.63); assert.equal(c.totalAmount, 81); assert.equal(c.roundOff, 0.37);

// 6. Item discount
c = calculateBill([{ price: 50, quantity: 4, discount: 20 }], { roundOff: false });
assert.equal(c.itemDiscount, 20); assert.equal(c.totalAmount, 180);

// Payments
let p = settlePayments(180, { paymentMethod: "upi" }, S);
assert.deepEqual([p.paid, p.due, p.method], [180, 0, "upi"]);
p = settlePayments(180, { payments: [{ method: "cash", amount: 200 }] }, S);
assert.deepEqual([p.paid, p.change, p.due], [180, 20, 0]);
p = settlePayments(180, { payments: [{ method: "cash", amount: 100 }, { method: "upi", amount: 50 }] }, S);
assert.deepEqual([p.paid, p.due, p.method], [150, 30, "split"]);
assert.equal(p.payments.find((x) => x.method === "credit").amount, 30);
p = settlePayments(180, { paymentMethod: "credit" }, S);
assert.deepEqual([p.paid, p.due, p.method], [0, 180, "credit"]);
assert.throws(() => settlePayments(100, { payments: [{ method: "upi", amount: 150 }] }, S), /Only cash/);
p = settlePayments(100, { payments: [{ method: "upi", amount: 100 }, { method: "credit", amount: 30 }] }, S);
assert.deepEqual([p.due, p.method], [0, "upi"]);
console.log("All bill math tests passed ✔");
{
  const { settlePayments } = require("../utils/billMath");
  const p = settlePayments(180, { payments: [{ method: "upi", amount: 100 }, { method: "cash", amount: 100 }] }, { defaultPaymentMethod: "cash" });
  assert.deepEqual([p.paid, p.change, p.due, p.method], [180, 20, 0, "split"]);
  assert.equal(p.payments.find((x) => x.method === "cash").amount, 80);
  assert.equal(p.payments.reduce((a, x) => a + x.amount, 0), 180);
  const q = settlePayments(180, { payments: [{ method: "cash", amount: 500 }] }, {});
  assert.equal(q.payments[0].amount, 180); assert.equal(q.change, 320);
  console.log("Change-handling tests passed ✔");
}
