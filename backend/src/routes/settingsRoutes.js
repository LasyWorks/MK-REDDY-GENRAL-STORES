const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { authenticate, authorize } = require("../middlewares/auth");

// Public — anyone (including guests) can fetch cart/billing settings
router.get("/public", settingsController.getPublicSettings);

// Admin only — full settings management
router.get("/", authenticate, authorize("admin"), settingsController.getAllSettings);
router.put("/", authenticate, authorize("admin"), settingsController.updateSettings);

module.exports = router;
