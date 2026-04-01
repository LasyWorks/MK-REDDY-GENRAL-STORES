/**
 * Runtime stock alert policy.
 *
 * This file is intentionally executable config (not markdown) so both
 * application code and code-generation tools read/enforce the same rules.
 */
module.exports = {
  timezone: "Asia/Kolkata",
  emailSlots: [
    { hour: 7, minute: 30, label: "store-start" },
    { hour: 22, minute: 30, label: "store-end" },
  ],
  notificationWindows: [
    { startHour: 10, endHour: 11, label: "window-10-11" },
    { startHour: 14, endHour: 17, label: "window-14-17" },
    { startHour: 21, endHour: 23, label: "window-21-23" },
  ],
  // Order notifications must remain immediate and are not rate-limited here.
  enforceImmediateOrderNotifications: true,
  schedulerIntervalMs: 60 * 1000,
};
