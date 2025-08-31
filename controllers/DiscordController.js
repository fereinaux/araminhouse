const { bot, setRoles, setChannels, checkDM, muteAll } = require('../utils/bot')
const { MessageEmbed } = require('discord.js')
const helper = require('../helper.json')
const connections = require('../connections.json')
const playerController = require('./PlayerController')
const queueController = require('./QueueController')

bot.on('ready', async function () {
  await bot.guilds.cache.first().members.fetch({ cache: true })
  await setRoles();
  await setChannels();
  console.log('Bot do Discord está online!');
})

bot.on('message', async message => {
  if (!checkDM(message)) {
    const arrMsg = message.content.split(' ')
    switch (arrMsg[0].toLowerCase()) {
      case '!win':
        await queueController.setWin(message, arrMsg[1])
        break;
      case '!mute':
        await muteAll(message, true)
        break
      case '!unmute':
        await muteAll(message, false)
        break
      case '!queue':
        await queueController.setQueue(message)
        break;
      case '!join':
        await queueController.setJoin(message.author.id)
        message.channel.send('✅ Você entrou na fila!')
        break;
      case '!ranking':
        const rankingEmbed = await playerController.setRanking()
        if (rankingEmbed) {
          message.channel.send(rankingEmbed)
        }
        break;
      case '!leave':
        const left = await queueController.leaveQueue(message.author.id)
        if (left) {
          message.channel.send('✅ Você saiu da fila!')
        } else {
          message.channel.send('❌ Você não estava em nenhuma fila!')
        }
        break
      case '!clearqueue':
        await queueController.clearQueue(message)
        break;
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
      default:
        break;
    }
  } else {
    const arrMsg = message.content.split(' ')
    switch (arrMsg[0].toLowerCase()) {
      case '!info':
        await playerController.info(message)
        break;
      case '!commands':
        const commands = await playerController.handleCommands(message.author.id)
        message.channel.send(commands)
        break;
      default:
        const defaultCommands = await playerController.handleCommands(message.author.id)
        message.channel.send(defaultCommands)
        break;
    }
  }
})

bot.on('guildMemberAdd', member => {
  playerController.handleRegister(member)
});

// Sistema simples de filas em memória (substitui Redis/Bull)
const queueProcessor = {
  isProcessing: false,
  
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const activeQueue = await queueController.queueExists();
      if (activeQueue && activeQueue.players.length >= activeQueue.size) {
        await queueController.startMatch(activeQueue.id);
      }
    } catch (error) {
      console.error('Erro ao processar fila:', error);
    } finally {
      this.isProcessing = false;
    }
  }
};

// Processa filas a cada 5 segundos
setInterval(() => {
  queueProcessor.processQueue();
}, 5000);

module.exports = {
  bot,
  Queue: {
    add: async (data) => {
      await queueController.setJoin(data.id);
    }
  }
};