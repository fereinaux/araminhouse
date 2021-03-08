const Discord = require('discord.js')
const mongoose = require('mongoose')
mongoose.connect('mongodb+srv://reinaux:reinaux09@cluster0.b1ikh.gcp.mongodb.net/inhouse?authSource=admin&replicaSet=Cluster0-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true', {
  useNewUrlParser: true
})
const errColor = 15158332;
const okColor = 3066993;
const infoColor = 3447003;
const Schema = mongoose.Schema

const playerSchema = new Schema({
  name: String,
  id: String,
  elo: Number
});

const queueSchema = new Schema({
  status: String,
  size: Number,
  winningTeam: Number,
  players: Array,
  teamOne: Array,
  teamTwo: Array,
});

const playerModel = mongoose.model("players", playerSchema)
const queueModel = mongoose.model("queues", queueSchema)
const bot = new Discord.Client()

const token = 'ODE4NDU1ODAyMzg5OTg3NDE5.YEYUXQ.10DcE0kfuH3t0CjQ7tDrnfdo69M'

const comandos = ['!register', '!join', '!queue', '!ranking', '!win']

async function queueExists() {
  const existsQueue = await queueModel.findOne({ $or: [{ status: 'aberta' }, { status: 'Em andamento' }] })
  return existsQueue;
}
async function queueEmAndamentoExists() {
  const existsQueue = await queueModel.findOne({ status: 'Em andamento' })
  return existsQueue;
}

async function playerExists(message) {
  const playerExists = await getPlayerById(message.author.id)
  return playerExists || message.author.bot;
}

async function getNicknameByMessage(message) {
  const member = await message.guild.member(message.author);
  return member && member.nickname ? member.nickname : message.author.username;
}

async function getPlayerById(id) {
  const playerExists = await playerModel.findOne({ id: id })
  return playerExists
}

function getMenctionById(id) {
  return bot.guilds.cache.map(g => g.members.cache.find(e => e.id == id))
}

function setEloById(id, elo) {
  const member = bot.guilds.cache.first().members.cache.find(e => e.id == id);
  
  member.setNickname(`[${elo}]${member.user.username}`);
}

async function setQueue(message) {
  const queueCreationExists = await queueExists();
  if (!queueCreationExists) {
    const queueEmbed = new Discord.MessageEmbed()
      .setTitle(`Criação de Queues`)
      .setDescription("Escolha um tamanho para a Queue")
      .setColor(infoColor)

    message.channel.send({ embed: queueEmbed }).then(embedMessage => {
      const reasonFilter = (reaction, user) => {
        return ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣'].includes(reaction.emoji.name) && user.id === message.author.id;
      };


      Promise.all([
        embedMessage.react('1⃣'),
        embedMessage.react('2⃣'),
        embedMessage.react('3⃣'),
        embedMessage.react('4⃣'),
        embedMessage.react('5⃣'),
      ]).then(() => {
        embedMessage.awaitReactions(reasonFilter, { max: 1, time: 120000 }).then(collected => {

          const reasonReaction = collected.first()

          let size = 5;
          switch (reasonReaction.emoji.name) {
            case '1⃣':
              size = 1
              break;
            case '2⃣':
              size = 2
              break;
            case '3⃣':
              size = 3
              break;
            case '4⃣':
              size = 4
              break;
            case '5⃣':
              size = 5
              break;
            default:
              break;
          }

          queueModel.create({ status: 'aberta', size: size })

          const queueCreated = new Discord.MessageEmbed()
            .setTitle(`Queue criada`)
            .setDescription(`**0/${size * 2}**`)
            .setColor(okColor)
          message.channel.send(queueCreated)
        })
      })
    })

  } else {
    const queueExists = new Discord.MessageEmbed()
      .setTitle(`Já existe uma Queue em andamento!`)
      .setColor(errColor)
    message.channel.send(queueExists)
  }
}

async function setJoin(message) {
  const queueJoinExists = await queueExists();
  if (!queueJoinExists) {
    const queueDoesntExists = new Discord.MessageEmbed()
      .setTitle(`Não existe uma Queue em andamento!`)
      .setColor(errColor)
    message.channel.send(queueDoesntExists)
  } else {
    if (queueJoinExists.players.length < (queueJoinExists.size * 2)) {
      let players = queueJoinExists.players;
      if (players.find(el => el.id == message.author.id)) {
        const playerDuplicated = new Discord.MessageEmbed()
          .setDescription(`${getMenctionById(message.author.id)} já está na Queue`)
          .setColor(errColor)
        message.channel.send(playerDuplicated)
      } else {

        players.push({ name: message.author.username, id: message.author.id })
        await queueModel.updateOne({ status: 'aberta' }, { players: players }, { new: true })

        if (queueJoinExists.players.length == (queueJoinExists.size * 2)) {
          const randomPlayers = queueJoinExists.players.sort(() => Math.random() - 0.5)

          const teamOne = randomPlayers.slice(0, queueJoinExists.size)
          const teamTwo = randomPlayers.slice(queueJoinExists.size, queueJoinExists.size * 2)
          await queueModel.updateOne({ status: 'aberta' }, { status: 'Em andamento', teamOne: teamOne, teamTwo: teamTwo });
          const teamsDescription = `
          **Time 1**
          
          ${teamOne.map(player => getMenctionById(player.id))}
          
          **Time 2**

          ${teamTwo.map(player => getMenctionById(player.id))}
          `;

          const teamEmbed = new Discord.MessageEmbed()
            .setTitle(`Queue fechada`)
            .setDescription(teamsDescription)
            .setColor(okColor)

          message.channel.send(teamEmbed)
        } else {
          const playerQueue = new Discord.MessageEmbed()
            .setDescription(`**${getMenctionById(message.author.id)} entrou na Queue**
            **${queueJoinExists.players.length}/${queueJoinExists.size * 2}**`)
            .setColor(okColor)
          message.channel.send(playerQueue)
        }
      }
    } else {
      const queueSize = new Discord.MessageEmbed()
        .setTitle(`Queue fechada`)
        .setColor(errColor)
      message.channel.send(queueSize)
    }
  }
}

async function setWin(message) {
  const queueCreationExists = await queueEmAndamentoExists();
  if (queueCreationExists) {
    const queueEmbed = new Discord.MessageEmbed()
      .setTitle(`Definição de Vitória`)
      .setDescription("Qual time ganhou?")
      .setColor(infoColor)

    message.channel.send({ embed: queueEmbed }).then(embedMessage => {
      const reasonFilter = (reaction, user) => {
        return ['1⃣', '2⃣'].includes(reaction.emoji.name) && user.id === message.author.id;
      };

      Promise.all([
        embedMessage.react('1⃣'),
        embedMessage.react('2⃣'),
      ]).then(() => {
        embedMessage.awaitReactions(reasonFilter, { max: 1, time: 120000 }).then(collected => {

          const reasonReaction = collected.first()
          const players1 = queueCreationExists.teamOne;
          const players2 = queueCreationExists.teamTwo;
          time = 1
          switch (reasonReaction.emoji.name) {
            case '1⃣':
              time = 1
              players2.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo - 5 })
                setEloById(p.id, player.elo - 5)
              })
              players1.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo + 10 })
                setEloById(p.id, player.elo + 10)
              })
              break;
            case '2⃣':
              time = 2
              players2.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo + 10 })
                setEloById(p.id, player.elo + 10)
              })
              players1.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo - 5 })
                setEloById(p.id, player.elo - 5)
              })
              break;
            default:
              break;
          }
          queueModel.updateOne({ status: 'Em andamento' }, { status: 'Concluída', winningTeam: time }).then();

          const queueCreated = new Discord.MessageEmbed()
            .setTitle(`Vitória associada ao Time ${time}`)
            .setColor(okColor)
          message.channel.send(queueCreated)
          setRanking(message)
        })
      })
    })

  } else {
    const queueExists = new Discord.MessageEmbed()
      .setTitle(`Não existe uma Queue em andamento!`)
      .setColor(errColor)
    message.channel.send(queueExists)
  }
}

async function setRanking(message) {
  const players = await playerModel.find({}, ['id'], { sort: { elo: -1 } })
  let rankDesc = '';
  players.map((p, i) => rankDesc += `${i + 1}º - ${getMenctionById(p.id)}\n`)

  const rankingEmbed = new Discord.MessageEmbed()
    .setTitle(`Ranking do InHouse`)
    .setDescription(rankDesc)
    .setColor(infoColor)

  message.channel.send(rankingEmbed)
}

bot.on('ready', async function () {
  await bot.guilds.cache.first().members.fetch({ cache: true })
})

bot.on('message', async message => {
  if (comandos.find(element => message.content)) {

    if (message.content === '!register') {
      const existsRegister = await playerExists(message);
      if (!(existsRegister)) {
        playerModel.create({ name: message.author.username, id: message.author.id,elo:0 })
        setEloById(message.author.id, 0)
        const registerUserEmbed = new Discord.MessageEmbed()
          .setDescription(`${getMenctionById(message.author.id)} registrado!`)
          .setColor(okColor)
        message.channel.send(registerUserEmbed)
      } else {
        const existsUserEmbed = new Discord.MessageEmbed()
          .setDescription(`${getMenctionById(message.author.id)} já estava previamente registrado`)
          .setColor(errColor)
        message.channel.send(existsUserEmbed)
      }
    } else {
      const registered = await playerExists(message);
      if (!(registered)) {
        const notRegisteredEmbed = new Discord.MessageEmbed()
          .setDescription(`**${getMenctionById(message.author.id)} não registrado**
          Registre-se como o comando !register`)
          .setColor(errColor)
        message.channel.send(notRegisteredEmbed)
      } else {
        switch (message.content) {
          case '!queue':
            await setQueue(message)
            break;
          case '!join':
            await setJoin(message)
            break;
          case '!ranking':
            await setRanking(message)
            break;
          case '!win':
            await setWin(message)
            break;
          default:
            break;
        }
      }
    }

  }
})

bot.login(token);

