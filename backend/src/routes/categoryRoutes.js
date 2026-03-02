const express = require("express");
const router = express.Router();
const { categoryController } = require("../controllers");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middlewares/auth");
const { cacheMiddleware } = require("../middlewares/cache");
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../utils/validators");

// ── Admin-only GET routes (must be BEFORE /:id to avoid param shadowing) ──
router.get(
  "/admin/all",
  authenticate,
  authorize("admin"),
  categoryController.getAllCategoriesAdmin,
);

// ── Public / optional-auth routes with caching ─────────────────────────────
router.get("/", optionalAuth, cacheMiddleware('categories', 600), categoryController.getAllCategories);
router.get("/:id", optionalAuth, cacheMiddleware('categories', 600), categoryController.getCategoryById);
router.get(
  "/:id/products",
  optionalAuth,
  cacheMiddleware('products', 300),
  categoryController.getCategoryProducts,
);

// ── Admin-only mutation routes ─────────────────────────────────────────────
router.use(authenticate);
router.use(authorize("admin"));
router.post("/", validateCreateCategory, categoryController.createCategory);
router.put("/:id", validateUpdateCategory, categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
router.put("/:id/toggle-active", categoryController.toggleActive);
module.exports = router;
