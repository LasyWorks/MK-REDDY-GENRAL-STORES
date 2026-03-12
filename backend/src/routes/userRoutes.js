const express = require("express");
const router = express.Router();
const { userController } = require("../controllers");
const { authenticate, authorize, superAdminOnly } = require("../middlewares/auth");
const {
  validateCreateUser,
  validateUpdateUser,
} = require("../utils/validators");
router.use(authenticate);
router.use(authorize("admin"));
router.get("/", userController.getAllUsers);
router.get("/stats", userController.getUserStats);
router.get("/deleted", userController.getDeletedUsers);
router.get("/count", userController.getCustomerCount);
router.get("/:id", userController.getUserById);
router.post("/", validateCreateUser, userController.createUser);
router.put("/:id", validateUpdateUser, userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.put("/:id/restore", userController.restoreUser);
router.put("/:id/block", userController.blockUser);
router.put("/:id/unblock", userController.unblockUser);
router.put("/:id/activate", userController.activateUser);
router.put("/:id/deactivate", userController.deactivateUser);
router.put("/:id/customer-type", userController.updateCustomerType);
router.get("/:id/orders", userController.getUserOrders);
module.exports = router;
