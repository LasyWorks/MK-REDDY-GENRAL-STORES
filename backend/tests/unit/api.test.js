const request = require('supertest');
const app = require('../../src/app');

describe('API Integration Tests', () => {

  describe('Health Check Endpoint', () => {
    test('GET /api/v1/health should return status 200 and success true', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('API is running');
    });

    test('GET / should return basic info about the API', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'MK Kirana Stores Backend API');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });
  });

  describe('Global 404 Handler', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

});
