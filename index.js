const discordController = require('./controllers/DiscordController')
const queueController = require('./controllers/QueueController')
const cron = require('node-cron');

cron.schedule("*/10 * * * * *", function() {
  queueController.handleCronCheck()
});

