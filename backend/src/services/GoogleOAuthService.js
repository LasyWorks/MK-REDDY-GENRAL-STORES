const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

class GoogleOAuthService {
  constructor() {
    if (!config.google.clientId) {
      logger.warn('Google Client ID not configured. OAuth login will not be available.');
      this.client = null;
    } else {
      this.client = new OAuth2Client(config.google.clientId);
    }
  }

  // Check if Google login token is real and get user info
  async verifyIdToken(idToken) {
    if (!this.client) {
      throw ApiError.internal('Google OAuth is not configured');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      
      // Extract user information
      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
        givenName: payload.given_name,
        familyName: payload.family_name,
      };
    } catch (error) {
      logger.error('Google token verification failed:', error);
      throw ApiError.unauthorized('Invalid Google token');
    }
  }

  // Check if token is valid (returns true or false)
  async validateToken(idToken) {
    try {
      await this.verifyIdToken(idToken);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new GoogleOAuthService();
