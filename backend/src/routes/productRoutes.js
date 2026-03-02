const express = require("express");
const router = express.Router();
const { productController } = require("../controllers");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middlewares/auth");
const { cacheMiddleware } = require("../middlewares/cache");
const { uploadExcel } = require("../middlewares/upload");
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateStockUpdate,
} = require("../utils/validators");

// ── Admin-only GET routes (must be BEFORE /:id to avoid param shadowing) ──
router.get(
  "/admin/all",
  authenticate,
  authorize("admin"),
  productController.getAllProductsAdmin,
);
router.get(
  "/admin/low-stock",
  authenticate,
  authorize("admin"),
  productController.getLowStockProducts,
);
router.get(
  "/template/download",
  authenticate,
  authorize("admin"),
  productController.downloadTemplate,
);

// ── Public / optional-auth routes with caching ────────────────────────────
router.get("/", optionalAuth, cacheMiddleware('products', 180), productController.getAllProducts);
router.get("/search", optionalAuth, cacheMiddleware('products', 120), productController.searchProducts);
router.get(
  "/:id/frequently-bought-together",
  optionalAuth,
  cacheMiddleware('products', 300),
  productController.getFrequentlyBoughtTogether,
);
router.get("/:id", optionalAuth, cacheMiddleware('products', 300), productController.getProductById);

// ── Admin-only mutation routes ─────────────────────────────────────────────
router.use(authenticate);
router.use(authorize("admin"));
router.post("/", validateCreateProduct, productController.createProduct);
router.put("/:id", validateUpdateProduct, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.put("/:id/stock", validateStockUpdate, productController.updateStock);
router.put("/:id/toggle-active", productController.toggleActive);
router.post("/bulk-upload", uploadExcel, productController.bulkUpload);
module.exports = router;
