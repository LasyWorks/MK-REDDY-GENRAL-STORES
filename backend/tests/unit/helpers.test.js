const helpers = require('../../src/utils/helpers');
describe('Helper Utilities Unit Tests', () => {
  describe('generateOTP', () => {
    test('should generate a 6-digit OTP by default', () => {
      const otp = helpers.generateOTP();
      expect(otp).toHaveLength(6);
      expect(Number(otp)).not.toBeNaN();
    });
    test('should generate an OTP of custom length', () => {
      const otp = helpers.generateOTP(4);
      expect(otp).toHaveLength(4);
    });
  });
  describe('sanitizePhone', () => {
    test('should strip non-digit characters', () => {
      const sanitized = helpers.sanitizePhone('+91-999-555-1111');
      expect(sanitized).toBe('+919995551111');
    });
    test('should handle empty input', () => {
      expect(helpers.sanitizePhone('')).toBe('');
      expect(helpers.sanitizePhone(null)).toBe('');
    });
  });
  describe('calculateGST', () => {
    test('should calculate 18% GST correctly', () => {
      const result = helpers.calculateGST(100, 18);
      expect(result.totalGst).toBe(18);
      expect(result.totalAmount).toBe(118);
      expect(result.cgst).toBe(9);
      expect(result.sgst).toBe(9);
    });
    test('should handle zero decimals correctly', () => {
      const result = helpers.calculateGST(99.99, 5);
      expect(result.totalGst).toBe(5);
      expect(result.totalAmount).toBe(104.99);
    });
  });
  describe('generateInvoiceNumber', () => {
    test('should return formatted invoice number', () => {
      const inv = helpers.generateInvoiceNumber();
      expect(inv).toMatch(/^INV-\d{8}-\d{5}$/);
    });
  });
  describe('formatPrice', () => {
    if (helpers.formatPrice) {
      test('should format price as INR', () => {
        expect(helpers.formatPrice(100)).toBe('₹100.00');
      });
    }
  });
});