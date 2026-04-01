const logger = require('../utils/logger');
const birthdayOfferService = require('./birthdayOfferService');
const emailService = require('./emailService');

async function runDailyCampaign(now = new Date()) {
  const result = await birthdayOfferService.runDailyBirthdayPipeline({
    now,
    emailService,
  });

  logger.info(
    `[birthday-campaign] Daily run complete: ${JSON.stringify(result)}`,
  );

  return {
    enabled: true,
    totalSent: (result.stages || []).reduce((acc, item) => acc + Number(item.affected || 0), 0),
    stages: result.stages || [],
    expired: result.expired || 0,
  };
}

module.exports = {
  runDailyCampaign,
};
