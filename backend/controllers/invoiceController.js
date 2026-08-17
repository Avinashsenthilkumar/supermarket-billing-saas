// controllers/invoiceController.js
const PDFDocument = require("pdfkit");
const { Bill, BillItem, Product } = require("../models");

const generateInvoice = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      where: { id: req.params.id, shopId: req.shopId },
      include: [
        {
          model: BillItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
      ],
    });

    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });
    }

    const pageWidth = 227;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    const doc = new PDFDocument({
      size: [pageWidth, 900],
      margins: { top: margin, bottom: margin, left: margin, right: margin },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${bill.billNumber}.pdf`,
    );
    doc.pipe(res);

    const lx = margin;
    const rx = pageWidth - margin;

    const solidLine = () => {
      doc.moveDown(0.3);
      doc.moveTo(lx, doc.y).lineTo(rx, doc.y).stroke();
      doc.moveDown(0.3);
    };
    const dashedLine = () => {
      doc.moveDown(0.3);
      doc.moveTo(lx, doc.y).lineTo(rx, doc.y).dash(2, { space: 2 }).stroke();
      doc.undash();
      doc.moveDown(0.3);
    };
    const center = (text, size = 7, bold = false) => {
      doc
        .fontSize(size)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(text, lx, doc.y, { width: contentWidth, align: "center" });
    };

    // Header — pulled from the logged-in shop (multi-tenant)
    const shop = req.user && req.user.shop ? req.user.shop : null;
    center((shop && shop.name) || "INVOICE", 15, true);
    if (shop && shop.address) center(shop.address, 7);
    if (shop && shop.phone) center(`Ph: ${shop.phone}`, 7);
    solidLine();

    // Bill info
    const billDate = new Date(bill.createdAt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    center(`Bill No: ${bill.billNumber}`, 7);
    center(`Date: ${billDate}`, 7);
    center(`Payment: ${bill.paymentMethod.toUpperCase()}`, 7);
    if (bill.customerName) {
      center(`Customer: ${bill.customerName}`, 7);
      if (bill.customerPhone) center(`Phone: ${bill.customerPhone}`, 7);
    }
    dashedLine();

    // ✅ Table columns: ITEM | QTY | MRP | PRICE | TOTAL
    // contentWidth = 203, lx = 12
    // name: 0-75, qty: 77, mrp: 100, price: 133, total: 168
    const c = {
      name: lx,
      qty: lx + 77,
      mrp: lx + 100,
      price: lx + 133,
      total: lx + 163,
    };

    doc.fontSize(7).font("Helvetica-Bold");
    const hy = doc.y;
    doc.text("ITEM", c.name, hy, { width: 75 });
    doc.text("QTY", c.qty, hy, { width: 21, align: "center" });
    doc.text("MRP", c.mrp, hy, { width: 31, align: "right" });
    doc.text("PRICE", c.price, hy, { width: 28, align: "right" });
    doc.text("TOTAL", c.total, hy, { width: 36, align: "right" });
    doc.moveDown(0.8);
    solidLine();

    // Items
    doc.font("Helvetica").fontSize(7);
    bill.items.forEach((item) => {
      const ry = doc.y;
      const mrp = item.product?.mrp ? parseFloat(item.product.mrp) : null;
      const unitPrice = parseFloat(item.unitPrice);

      doc.text(item.productName, c.name, ry, { width: 75 });
      const afterName = doc.y;

      doc.text(String(item.quantity), c.qty, ry, {
        width: 21,
        align: "center",
      });

      // MRP column — show in black, no strikethrough
      if (mrp && mrp > 0) {
        doc.fillColor("#000000").font("Helvetica").fontSize(7);
        doc.text(`${mrp.toFixed(2)}`, c.mrp, ry, { width: 31, align: "right" });
      } else {
        doc.text("—", c.mrp, ry, { width: 31, align: "right" });
      }

      // Price column
      doc.fillColor("#000000").font("Helvetica").fontSize(7);
      doc.text(`${unitPrice.toFixed(2)}`, c.price, ry, {
        width: 28,
        align: "right",
      });

      // Total column
      doc.text(`${parseFloat(item.totalPrice).toFixed(2)}`, c.total, ry, {
        width: 36,
        align: "right",
      });

      doc.y = Math.max(afterName, doc.y);
      doc.moveDown(0.5);
    });

    dashedLine();

    // Totals
    const tl = lx + 55;
    const tw = contentWidth - 55;
    const trow = (label, val, bold = false) => {
      const y = doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 8 : 7);
      doc.text(label, tl, y, { width: tw / 2 });
      doc.text(val, tl + tw / 2, y, { width: tw / 2, align: "right" });
      doc.moveDown(0.4);
    };

    trow("Subtotal :", `${parseFloat(bill.subtotal).toFixed(2)}`);
    if (parseFloat(bill.taxAmount) > 0)
      trow(
        `Tax (${bill.taxRate}%) :`,
        `${parseFloat(bill.taxAmount).toFixed(2)}`,
      );
    if (parseFloat(bill.discountAmount) > 0)
      trow("Discount :", `-${parseFloat(bill.discountAmount).toFixed(2)}`);
    solidLine();
    trow("TOTAL :", `Rs.${parseFloat(bill.totalAmount).toFixed(2)}`, true);

    dashedLine();

    center("** Thank you for shopping! **", 7, true);
    center("Please visit again", 7);
    doc.moveDown(0.5);
    center("Thank you for shopping with us!", 6);

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { generateInvoice };
