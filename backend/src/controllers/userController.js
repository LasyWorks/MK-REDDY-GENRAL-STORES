const { UserService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { role, user_type, is_active, search } = req.query;
  const result = await UserService.getAll({
    page,
    limit,
    role,
    userType: user_type,
    isActive: is_active !== undefined ? is_active === 'true' : null,
    search,
  });
  ApiResponse.paginated(res, result.users, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getUser = asyncHandler(async (req, res) => {
  const user = await UserService.getById(req.params.id);
  ApiResponse.success(res, user);
});
const updateUser = asyncHandler(async (req, res) => {
  const { name, address, email } = req.body;
  const userId = req.params.id;
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id === userId;
  if (!isAdmin && !isSelf) {
    return ApiResponse.error(res, 'Not authorized', 403);
  }
  const user = await UserService.update(
    userId,
    { name, address, email },
    isAdmin && !isSelf ? req.user.id : null
  );
  ApiResponse.success(res, user, 'User updated successfully');
});
const deleteUser = asyncHandler(async (req, res) => {
  await UserService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, 'User deleted successfully');
});
const blockUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await UserService.block(req.params.id, reason, req.user.id);
  ApiResponse.success(res, result);
});
const unblockUser = asyncHandler(async (req, res) => {
  const result = await UserService.unblock(req.params.id, req.user.id);
  ApiResponse.success(res, result);
});
const activateUser = asyncHandler(async (req, res) => {
  const result = await UserService.activate(req.params.id, req.user.id);
  ApiResponse.success(res, result);
});
const deactivateUser = asyncHandler(async (req, res) => {
  const result = await UserService.deactivate(req.params.id, req.user.id);
  ApiResponse.success(res, result);
});
const getCustomerCount = asyncHandler(async (req, res) => {
  const result = await UserService.getCustomerCount();
  ApiResponse.success(res, result);
});
const getUserStats = asyncHandler(async (req, res) => {
  const result = await UserService.getStatistics();
  ApiResponse.success(res, result);
});
const createUser = asyncHandler(async (req, res) => {
  const { name, phone, email, user_type, address, role_id, password } = req.body;
  const user = await UserService.create({
    name,
    phone,
    email,
    user_type: user_type || 'retail',
    address,
    role_id: role_id || undefined, 
    password,
  });
  ApiResponse.created(res, user, 'User created successfully');
});
const updateCustomerType = asyncHandler(async (req, res) => {
  const { customer_type } = req.body;
  const user = await UserService.updateCustomerType(req.params.id, customer_type, req.user.id);
  ApiResponse.success(res, user, 'Customer type updated successfully');
});
const getUserOrders = asyncHandler(async (req, res) => {
  const { OrderService } = require('../services');
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const result = await OrderService.getUserOrders(req.params.id, { page, limit });
  ApiResponse.paginated(res, result.orders, {
    page,
    limit,
    totalItems: result.total,
  });
});
module.exports = {
  getAllUsers: getUsers,
  getUserById: getUser,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  activateUser,
  deactivateUser,
  updateCustomerType,
  getUserOrders,
  getCustomerCount,
};