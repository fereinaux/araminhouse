const { bot, setRoles, setChannels, checkDM } = require('../utils/bot')
const { MessageEmbed } = require('discord.js')
const helper = require('../helper.json')
const connections = require('../connections.json')
const playerController = require('./PlayerController')
const queueController = require('./QueueController')
const Bull = require("bull");
const Queue = new Bull("Queue", {
  redis:
  {
    port: connections.redisPort,
    host: connections.redisHost,
    password: connections.redisPswd
  }
});

bot.on('ready', async function () {
  await bot.guilds.cache.first().members.fetch({ cache: true })
  await setRoles();
  await setChannels();
})

bot.on('message', async message => {
  if (!checkDM(message)) {
    const arrMsg = message.content.split(' ')
    switch (arrMsg[0]) {
      case '!queue':
        await queueController.setQueue(message)
        break;
      case '!join':
        Queue.add(message);
        break;
      case '!ranking':
        await playerController.setRanking()
        break;
      case '!clearqueue':
        await queueController.ClearQueue()
        break
      case '!versus':
        if (arrMsg.length == 3) {
          await playerController.versus(message, arrMsg[1], arrMsg[2])
        }
        break
      case '!info':
        await playerController.info(message, arrMsg[1])
        break
      case '!reset':
        await playerController.reset(message)
        break
      case '!punish':
        if (arrMsg.length == 3) {
          await playerController.punish(message)
        }
        break
      case '!summoner':
        await playerController.registerSummoner(message)
        break
      default:
        break;
    }
  } else {
    const arrMsg = message.content.split(' ')
    switch (arrMsg[0]) {

      case '!info':
        await playerController.info(message)
        break;

      default:
        await playerController.handleSummoner(message)
        break;

    }
  }
})

bot.on('guildMemberAdd', member => {
  playerController.handleRegister(member)
});

Queue.process(async (job) => {
  return await queueController.setJoin(job.data)
});

bot.login(connections.token);
