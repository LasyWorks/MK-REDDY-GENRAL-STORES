const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize, superAdminOnly } = require("../middlewares/auth");

// All routes require auth + admin role + super admin privilege
router.use(authenticate);
router.use(authorize("admin"));
router.use(superAdminOnly);

router.get("/", userController.listAdmins);
router.post("/", userController.createAdminUser);
router.delete("/:id", userController.deleteAdminUser);

module.exports = router;
