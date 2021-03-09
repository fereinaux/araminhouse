const { bot, setRoles, setChannels } = require('../utils/bot')
const helper = require('../helper.json')
const playerController = require('./PlayerController')
const queueController = require('./QueueController')

bot.on('ready', async function () {
  await bot.guilds.cache.first().members.fetch({ cache: true })
  await setRoles();
  await setChannels();
})

bot.on('message', async message => {
  if (helper.comandos.find(element => message.content)) {
    if (message.content === '!register') {
      playerController.handleRegister(message)
    } else {
      const registered = await playerController.playerExists(message);
      if (!(registered)) {
        const notRegisteredEmbed = new Discord.MessageEmbed()
          .setDescription(`**${getMenctionById(message.author.id)} não registrado**
          Registre-se como o comando !register`)
          .setColor(helper.errColor)
        message.channel.send(notRegisteredEmbed)
      } else {
        switch (message.content) {
          case '!queue':
            await queueController.setQueue(message)
            break;
          case '!join':
            await queueController.setJoin(message)
            break;
          case '!ranking':
            await playerController.setRanking(message)
            break;
          case '!win':
            await queueController.setWin(message)
            break;
          case '!clearqueue':
            await queueController.ClearQueue(message)
            break
          default:
            break;
        }
      }
    }

  }
})

bot.login(helper.token);
