// controllers/productController.js
const { Op } = require("sequelize");
const { Product } = require("../models");

// NOTE: req.shopId is set by the `protect` middleware. Every query below is
// scoped to it so one shop can never see or touch another shop's products.

const getProducts = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 50, active = "true" } = req.query;
    const offset = (page - 1) * limit;
    const where = { shopId: req.shopId };
    if (active === "true") where.isActive = true;
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } },
        { serialNumber: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Product.findAndCountAll({
      where,
      order: [["name", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({
      success: true,
      data: {
        products: rows,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = isNaN(id)
      ? { shopId: req.shopId, [Op.or]: [{ barcode: id }, { serialNumber: id }] }
      : { shopId: req.shopId, id };
    const product = await Product.findOne({ where });
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
};

const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: { shopId: req.shopId, barcode: req.params.barcode, isActive: true },
    });
    if (!product)
      return res.status(404).json({
        success: false,
        message: "Product not found with this barcode",
      });
    res.json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, barcode, serialNumber, mrp, price, quantity, category, description, expiryDate } = req.body;
    if (!name || price === undefined)
      return res.status(400).json({ success: false, message: "Name and price are required" });
    const product = await Product.create({
      shopId: req.shopId,
      name,
      barcode: barcode || null,
      serialNumber: serialNumber || null,
      mrp: mrp ? parseFloat(mrp) : null,
      price,
      quantity: quantity || 0,
      category,
      description,
      expiryDate: expiryDate || null,
    });
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, shopId: req.shopId } });
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });
    const { name, barcode, serialNumber, mrp, price, quantity, category, description, isActive, expiryDate } = req.body;
    await product.update({
      name,
      barcode: barcode || null,
      serialNumber: serialNumber || null,
      mrp: mrp ? parseFloat(mrp) : null,
      price,
      quantity: quantity !== undefined && quantity !== "" ? parseInt(quantity) : product.quantity,
      category,
      description,
      isActive,
      expiryDate: expiryDate || null,
    });
    res.json({
      success: true,
      message: "Product updated successfully",
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const { quantity, operation = "add" } = req.body;
    const product = await Product.findOne({ where: { id: req.params.id, shopId: req.shopId } });
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });
    const newQty =
      operation === "add"
        ? product.quantity + parseInt(quantity)
        : product.quantity - parseInt(quantity);
    if (newQty < 0)
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    await product.update({ quantity: newQty });
    res.json({ success: true, message: "Stock updated", data: { product } });
  } catch (error) {
    next(error);
  }
};

const scanBarcode = async (req, res, next) => {
  try {
    const { barcode, quantity = 1, expiryDate, mrp, name, price, category, description, ...rest } = req.body;
    if (!barcode)
      return res.status(400).json({ success: false, message: "Barcode is required" });

    let product = await Product.findOne({ where: { shopId: req.shopId, barcode } });

    if (product) {
      const updateData = { quantity: product.quantity + parseInt(quantity) };
      if (expiryDate) updateData.expiryDate = expiryDate;
      if (mrp !== undefined) updateData.mrp = mrp ? parseFloat(mrp) : null;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (name) updateData.name = name;
      if (category !== undefined) updateData.category = category;
      if (description !== undefined) updateData.description = description;

      await product.update(updateData);
      return res.json({
        success: true,
        message: "Stock updated successfully",
        data: { product, action: "updated" },
      });
    }

    product = await Product.create({
      shopId: req.shopId,
      barcode,
      name: name || null,
      price: price ? parseFloat(price) : 0,
      mrp: mrp ? parseFloat(mrp) : null,
      quantity: parseInt(quantity),
      category: category || null,
      description: description || null,
      expiryDate: expiryDate || null,
      ...rest,
    });
    res.status(201).json({
      success: true,
      message: "New product created",
      data: { product, action: "created" },
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, shopId: req.shopId } });
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });
    await product.update({ isActive: false });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      attributes: ["category"],
      where: { shopId: req.shopId, isActive: true, category: { [Op.ne]: null } },
      group: ["category"],
    });
    const categories = products.map((p) => p.category).filter(Boolean);
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
};

const bulkImport = async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0)
      return res.status(400).json({ success: false, message: "No products data provided" });

    const results = { created: 0, updated: 0, failed: 0, errors: [] };

    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      const rowNum = i + 2;
      try {
        if (!row.name || row.name.toString().trim() === "") {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }
        if (!row.price || isNaN(parseFloat(row.price))) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Valid price is required`);
          continue;
        }
        const productData = {
          shopId: req.shopId,
          name: row.name.toString().trim(),
          mrp: row.mrp ? parseFloat(row.mrp) : null,
          price: parseFloat(row.price),
          quantity: parseInt(row.quantity) || 0,
          category: row.category ? row.category.toString().trim() : null,
          barcode: row.barcode ? row.barcode.toString().trim() : null,
          serialNumber: row.serialNumber ? row.serialNumber.toString().trim() : null,
          description: row.description ? row.description.toString().trim() : null,
          expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
        };
        if (row.expiryDate && isNaN(new Date(row.expiryDate).getTime())) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Invalid expiry date`);
          continue;
        }
        if (productData.barcode) {
          const existing = await Product.findOne({
            where: { shopId: req.shopId, barcode: productData.barcode },
          });
          if (existing) {
            await existing.update({
              ...productData,
              quantity: existing.quantity + productData.quantity,
              isActive: true,
            });
            results.updated++;
            continue;
          }
        }
        const existingByName = await Product.findOne({
          where: { shopId: req.shopId, name: productData.name, isActive: true },
        });
        if (existingByName) {
          await existingByName.update({
            ...productData,
            quantity: existingByName.quantity + productData.quantity,
          });
          results.updated++;
          continue;
        }
        await Product.create({ ...productData, isActive: true });
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }
    res.json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.updated} updated, ${results.failed} failed`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateStock,
  scanBarcode,
  deleteProduct,
  getCategories,
  bulkImport,
};
