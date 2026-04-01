const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { authenticate, authorize } = require("../middlewares/auth");

// Public — anyone (including guests) can fetch cart/billing settings
router.get("/public", settingsController.getPublicSettings);
router.get("/voice-dictionary", settingsController.getVoiceDictionary);

// Admin only — full settings management
router.get("/", authenticate, authorize("admin"), settingsController.getAllSettings);
router.put("/", authenticate, authorize("admin"), settingsController.updateSettings);
router.put(
	"/voice-dictionary",
	authenticate,
	authorize("admin"),
	settingsController.updateVoiceDictionary,
);
router.post(
	"/voice-dictionary/sync",
	authenticate,
	authorize("admin"),
	settingsController.syncVoiceDictionaryFromDb,
);

module.exports = router;
