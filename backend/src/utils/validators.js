const { body, param, query, validationResult } = require("express-validator");
const ApiError = require("./ApiError");
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Transform validation errors into consistent API error format
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    throw ApiError.badRequest("Validation failed", extractedErrors);
  }
  next();
};
const commonRules = {
  id: (field = "id") =>
    param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  uuid: (field = "id") =>
    param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  bodyUuid: (field) =>
    body(field).isUUID().withMessage(`${field} must be a valid UUID`),
  phone: (field = "phone") =>
    body(field)
      .trim()
      // Indian mobile format: starts with 6-9, followed by 9 more digits
      .matches(/^[6-9]\d{9}$/)
      .withMessage(
        "Phone number must be a valid 10-digit Indian mobile number",
      ),
  email: (field = "email") =>
    body(field)
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
  otp: (field = "otp") =>
    body(field)
      .trim()
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("OTP must be a 6-digit number"),
  password: (field = "password") =>
    body(field)
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      // Enforce strong passwords to protect customer accounts
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "Password must contain uppercase, lowercase, number, and special character",
      ),
  name: (field = "name", minLength = 2, maxLength = 100) =>
    body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(
        `${field} must be between ${minLength} and ${maxLength} characters`,
      )
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage(`${field} can only contain letters and spaces`),
  nameTelugu: (field = "name_te") =>
    body(field)
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage(`${field} must be between 2 and 200 characters`),
  string: (field, minLength = 1, maxLength = 255) =>
    body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(
        `${field} must be between ${minLength} and ${maxLength} characters`,
      ),
  optionalString: (field, maxLength = 255) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must not exceed ${maxLength} characters`),
  number: (field, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    body(field)
      .isFloat({ min, max })
      .withMessage(`${field} must be a number between ${min} and ${max}`),
  integer: (field, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    body(field)
      .isInt({ min, max })
      .withMessage(`${field} must be an integer between ${min} and ${max}`),
  boolean: (field) =>
    body(field).isBoolean().withMessage(`${field} must be a boolean`),
  enum: (field, values) =>
    body(field)
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(", ")}`),
  optionalEnum: (field, values) =>
    body(field)
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(", ")}`),
  array: (field, minLength = 1) =>
    body(field)
      .isArray({ min: minLength })
      .withMessage(
        `${field} must be an array with at least ${minLength} item(s)`,
      ),
  date: (field) =>
    body(field)
      .isISO8601()
      .toDate()
      .withMessage(`${field} must be a valid date`),
  page: () =>
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
  limit: () =>
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  language: () =>
    query("lang")
      .optional()
      .isIn(["en", "te"])
      .withMessage("Language must be en or te"),
  price: (field = "price") =>
    body(field)
      .isFloat({ min: 0.01 })
      .withMessage(`${field} must be a positive number`),
  quantity: (field = "quantity") =>
    body(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`),
  stock: (field = "stock_quantity") =>
    body(field)
      .isInt({ min: 0 })
      .withMessage(`${field} must be a non-negative integer`),
  gstPercentage: (field = "gst_percentage") =>
    body(field)
      .isFloat({ min: 0, max: 28 })
      .withMessage(`${field} must be between 0 and 28`),
  unitType: (field = "unit_type") =>
    body(field)
      .isIn(["kg", "piece", "case", "litre", "gram", "pack"])
      .withMessage(
        `${field} must be one of: kg, piece, case, litre, gram, pack`,
      ),
};
const userValidation = {
  create: [
    commonRules.name("name"),
    commonRules.phone("phone"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email address"),
    body("user_type")
      .optional()
      .isIn(["retail", "wholesale", "admin"])
      .withMessage("User type must be retail, wholesale, or admin"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must not exceed 500 characters"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role_id")
      .optional()
      .isUUID()
      .withMessage("Role ID must be a valid UUID"),
    validate,
  ],
  register: [
    commonRules.name("name"),
    commonRules.phone("phone"),
    body("user_type")
      .isIn(["retail", "wholesale"])
      .withMessage("User type must be retail or wholesale"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must not exceed 500 characters"),
    validate,
  ],
  sendOtp: [commonRules.phone("phone"), validate],
  verifyOtp: [commonRules.phone("phone"), commonRules.otp("otp"), validate],
  adminLogin: [
    commonRules.email("email"),
    commonRules.phone("phone"),
    validate,
  ],
  update: [
    commonRules.name("name").optional(),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must not exceed 500 characters"),
    validate,
  ],
};
const categoryValidation = {
  create: [
    commonRules.string("name_en", 2, 100),
    commonRules.nameTelugu("name_te"),
    body("parent_id")
      .optional({ nullable: true })
      .isUUID()
      .withMessage("parent_id must be a valid UUID"),
    body("description_en").optional().trim().isLength({ max: 500 }),
    body("description_te").optional().trim().isLength({ max: 500 }),
    body("is_active").optional().isBoolean(),
    validate,
  ],
  update: [
    commonRules.string("name_en", 2, 100).optional(),
    commonRules.nameTelugu("name_te"),
    body("parent_id")
      .optional({ nullable: true })
      .isUUID()
      .withMessage("parent_id must be a valid UUID"),
    body("description_en").optional().trim().isLength({ max: 500 }),
    body("description_te").optional().trim().isLength({ max: 500 }),
    body("is_active").optional().isBoolean(),
    validate,
  ],
};
const productValidation = {
  create: [
    commonRules.string("name_en", 2, 200),
    commonRules.nameTelugu("name_te"),
    commonRules.bodyUuid("category_id"),
    commonRules.unitType("unit_type").optional(),
    commonRules.price("price"),
    commonRules.gstPercentage("gst_percentage").optional(),
    commonRules.stock("stock_quantity").optional(),
    body("description_en").optional().trim().isLength({ max: 1000 }),
    body("description_te").optional().trim().isLength({ max: 1000 }),
    body("sku").optional().trim().isLength({ max: 50 }),
    body("is_active").optional().isBoolean(),
    validate,
  ],
  update: [
    commonRules.string("name_en", 2, 200).optional(),
    commonRules.nameTelugu("name_te"),
    commonRules.bodyUuid("category_id").optional(),
    commonRules.unitType("unit_type").optional(),
    commonRules.price("price").optional(),
    commonRules.gstPercentage("gst_percentage").optional(),
    commonRules.stock("stock_quantity").optional(),
    body("description_en").optional().trim().isLength({ max: 1000 }),
    body("description_te").optional().trim().isLength({ max: 1000 }),
    body("is_active").optional().isBoolean(),
    validate,
  ],
};
const cartValidation = {
  addItem: [
    commonRules.bodyUuid("product_id"),
    commonRules.quantity("quantity"),
    validate,
  ],
  updateItem: [commonRules.quantity("quantity"), validate],
};
const orderValidation = {
  create: [
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must not exceed 500 characters"),
    validate,
  ],
  updateStatus: [
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "ready_for_pickup",
        "picked_up",
        "cancelled",
      ])
      .withMessage("Invalid order status"),
    body("notes").optional().trim().isLength({ max: 500 }),
    validate,
  ],
};
const paginationValidation = [
  commonRules.page(),
  commonRules.limit(),
  commonRules.language(),
  validate,
];
const authValidation = {
  sendOTP: [commonRules.phone("phone"), validate],
  verifyOTP: [commonRules.phone("phone"), commonRules.otp("otp"), validate],
  register: [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    commonRules.phone("phone"),
    body("user_type")
      .optional()
      .isIn(["retail", "wholesale"])
      .withMessage("User type must be retail or wholesale"),
    body("address").optional().trim().isLength({ max: 500 }),
    validate,
  ],
  adminLogin: [
    body("identifier")
      .trim()
      .notEmpty()
      .withMessage("Email or phone is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  refreshToken: [
    body("refresh_token").notEmpty().withMessage("Refresh token is required"),
    validate,
  ],
  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters"),
    validate,
  ],
};
const invoiceValidation = {
  markAsPaid: [
    body("payment_method")
      .optional()
      .isIn(["cash", "card", "upi", "bank_transfer"])
      .withMessage("Invalid payment method"),
    body("payment_reference").optional().trim().isLength({ max: 100 }),
    body("notes").optional().trim().isLength({ max: 500 }),
    validate,
  ],
};
const adminValidation = {
  systemConfig: [
    body("key").trim().notEmpty().withMessage("Config key is required"),
    body("value").notEmpty().withMessage("Config value is required"),
    body("category").optional().trim(),
    body("description").optional().trim().isLength({ max: 255 }),
    validate,
  ],
  gstConfig: [
    body("category_name").optional().trim().isLength({ min: 2, max: 100 }),
    body("hsn_code").optional().trim(),
    body("cgst_rate").optional().isFloat({ min: 0, max: 50 }),
    body("sgst_rate").optional().isFloat({ min: 0, max: 50 }),
    body("igst_rate").optional().isFloat({ min: 0, max: 50 }),
    body("is_active").optional().isBoolean(),
    validate,
  ],
};
const validateSendOTP = authValidation.sendOTP;
const validateVerifyOTP = authValidation.verifyOTP;
const validateRegister = authValidation.register;
const validateAdminLogin = authValidation.adminLogin;
const validateRefreshToken = authValidation.refreshToken;
const validateCreateUser = userValidation.create;
const validateUpdateUser = userValidation.update;
const validateCreateCategory = categoryValidation.create;
const validateUpdateCategory = categoryValidation.update;
const validateCreateProduct = productValidation.create;
const validateUpdateProduct = productValidation.update;
const validateStockUpdate = [
  commonRules.integer("quantity", 0),
  body("operation")
    .isIn(["add", "subtract", "set"])
    .withMessage("Operation must be add, subtract, or set"),
  validate,
];
const validateAddToCart = cartValidation.addItem;
const validateUpdateCartItem = cartValidation.updateItem;
const validateCreateOrder = orderValidation.create;
const validateUpdateOrderStatus = orderValidation.updateStatus;
const validateCancelOrder = [
  body("reason").optional().trim().isLength({ max: 500 }),
  validate,
];
const validateMarkAsPaid = invoiceValidation.markAsPaid;
const validateSystemConfig = adminValidation.systemConfig;
const validateGSTConfig = adminValidation.gstConfig;
module.exports = {
  validate,
  commonRules,
  userValidation,
  categoryValidation,
  productValidation,
  cartValidation,
  orderValidation,
  paginationValidation,
  authValidation,
  invoiceValidation,
  adminValidation,
  validateSendOTP,
  validateVerifyOTP,
  validateRegister,
  validateAdminLogin,
  validateRefreshToken,
  validateCreateUser,
  validateUpdateUser,
  validateCreateCategory,
  validateUpdateCategory,
  validateCreateProduct,
  validateUpdateProduct,
  validateStockUpdate,
  validateAddToCart,
  validateUpdateCartItem,
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateCancelOrder,
  validateMarkAsPaid,
  validateSystemConfig,
  validateGSTConfig,
};
