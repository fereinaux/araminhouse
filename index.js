const discordController = require('./controllers/DiscordController')
const queueController = require('./controllers/QueueController')
const app = require('./appHandler')
const cron = require('node-cron');

cron.schedule("*/10 * * * * *", function() {
  queueController.handleCronCheck()
});

cron.schedule("0 3 * * *", function(){
  queueController.dayResume()
})

cron.schedule("0 3 * * 1", function(){
  queueController.weekResume()
})

cron.schedule("0 3 1 * 0", function(){
  queueController.monthResume()
})

