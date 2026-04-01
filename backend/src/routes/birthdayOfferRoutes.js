const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth");
const birthdayOfferController = require("../controllers/birthdayOfferController");

router.use(authenticate);

router.get(
  "/templates",
  authorize("admin"),
  birthdayOfferController.getBirthDayTemplates,
);
router.get(
  "/upcoming-users",
  authorize("admin"),
  birthdayOfferController.getBirthDayUpcomingUsers,
);
router.post(
  "/assign",
  authorize("admin"),
  birthdayOfferController.assignBirthDayOffer,
);

router.post(
  "/bulk-assign",
  authorize("admin"),
  birthdayOfferController.bulkAssignBirthdayOffer,
);

router.get(
  "/my-offer",
  authorize("retail_customer", "wholesale_customer", "admin"),
  birthdayOfferController.getMyBirthDayOffer,
);

module.exports = router;
