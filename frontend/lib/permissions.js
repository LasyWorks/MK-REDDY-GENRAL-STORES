import secureStorage from "./secureStorage";

/**
 * Get the current user's role from storage
 * @returns {string|null} The user's role or null if not authenticated
 */
export const getUserRole = () => {
  if (typeof window === "undefined") return null;
  
  try {
    const user = secureStorage.getItem("user");
    return user?.role || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

/**
 * Check if the current user has one of the required roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} True if user has permission, false otherwise
 */
export const hasPermission = (allowedRoles) => {
  const userRole = getUserRole();
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Check if the current user is an admin
 * @returns {boolean} True if user is admin, false otherwise
 */
export const isAdmin = () => {
  return getUserRole() === "admin";
};

/**
 * Check if the current user is a customer (retail or wholesale)
 * @returns {boolean} True if user is a customer, false otherwise
 */
export const isCustomer = () => {
  const role = getUserRole();
  return role === "retail_customer" || role === "wholesale_customer";
};

/**
 * Check if the current user is a retail customer
 * @returns {boolean} True if user is retail customer, false otherwise
 */
export const isRetailCustomer = () => {
  return getUserRole() === "retail_customer";
};

/**
 * Check if the current user is a wholesale customer
 * @returns {boolean} True if user is wholesale customer, false otherwise
 */
export const isWholesaleCustomer = () => {
  return getUserRole() === "wholesale_customer";
};

/**
 * Get a user-friendly error message for permission errors
 * @param {string[]} requiredRoles - Array of required roles
 * @returns {string} User-friendly error message
 */
export const getPermissionErrorMessage = (requiredRoles) => {
  const userRole = getUserRole();
  
  if (!userRole) {
    return "You must be logged in to perform this action.";
  }
  
  if (requiredRoles.includes("admin")) {
    return "This action requires administrator privileges.";
  }
  
  if (requiredRoles.includes("retail_customer") || requiredRoles.includes("wholesale_customer")) {
    return "This action is only available to customers.";
  }
  
  return `You do not have permission to perform this action. Required role(s): ${requiredRoles.join(", ")}. Your role: ${userRole}`;
};

/**
 * Role-based route protection helper
 * @param {string[]} allowedRoles - Array of allowed roles for the route
 * @returns {{hasAccess: boolean, redirectTo: string|null, message: string|null}}
 */
export const checkRouteAccess = (allowedRoles) => {
  const userRole = getUserRole();
  
  if (!userRole) {
    return {
      hasAccess: false,
      redirectTo: "/login",
      message: "Please log in to access this page.",
    };
  }
  
  if (!allowedRoles.includes(userRole)) {
    return {
      hasAccess: false,
      redirectTo: "/",
      message: getPermissionErrorMessage(allowedRoles),
    };
  }
  
  return {
    hasAccess: true,
    redirectTo: null,
    message: null,
  };
};
