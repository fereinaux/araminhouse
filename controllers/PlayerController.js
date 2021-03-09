const playerModel = require('../models/Player')
const helper = require('../helper.json')
const { MessageEmbed } = require('discord.js')
const utilsBot = require('../utils/bot')
const queueModel = require('../models/Queue')

async function playerExists(message) {
  const playerExists = await getPlayerById(message.author.id)
  return playerExists || message.author.bot;
}

async function handleRegister(message) {
  const existsRegister = await playerExists(message);
  if (!(existsRegister)) {
    const player = { name: message.author.username, id: message.author.id, elo: 0, punicoes: 0 }
    playerModel.create(player)
    utilsBot.setEloByPlayer(player)
    const registerUserEmbed = new MessageEmbed()
      .setDescription(`${utilsBot.getMenctionById(message.author.id)} registrado!`)
      .setColor(helper.okColor)
    message.channel.send(registerUserEmbed)
  } else {
    const existsUserEmbed = new MessageEmbed()
      .setDescription(`${utilsBot.getMenctionById(message.author.id)} já estava previamente registrado`)
      .setColor(helper.errColor)
    message.channel.send(existsUserEmbed)
  }
}

async function versus(message, player1, player2) {
  const id1 = player1.replace('<', '').replace('>', '').replace('@', '').replace('!', '')
  const id2 = player2.replace('<', '').replace('>', '').replace('@', '').replace('!', '')

  const gamesquery = await queueModel.find()
  const games = gamesquery.filter(
    x =>
      (
        x.teamOne.find(y => y.id == id1) &&
        x.teamTwo.find(y => y.id == id2)) ||
      (x.teamOne.find(y => y.id == id2) &&
        x.teamTwo.find(y => y.id == id1))
  )

  let player1Wins = 0
  let player2Wins = 0

  games.map(game => {
    if (game.winningTeam == 1) {
      if (game.teamOne.find(player => player.id == id1)) {
        player1Wins++
      } else {
        player2Wins++
      }
    } else {
      if (game.teamTwo.find(player => player.id == id1)) {
        player1Wins++
      } else {
        player2Wins++
      }
    }
  })

  const msg = new MessageEmbed()

    .setDescription(`
    **${utilsBot.getMenctionById(id1)} VS ${utilsBot.getMenctionById(id2)}**

    Jogos: ${games.length}
      Vitórias ${utilsBot.getMenctionById(id1)}: ${player1Wins}
      Vitórias ${utilsBot.getMenctionById(id2)}: ${player2Wins}
      `)
    .setColor(helper.infoColor)
  message.channel.send(msg)
}

async function info(message, id) {
  id = id.replace('<', '').replace('>', '').replace('@', '').replace('!', '')
  const player = await getPlayerById(id)

  const gamesquery = await queueModel.find()
  const games = gamesquery.filter(
    x =>
      (x.teamOne.find(y => y.id == id)) ||
      (x.teamTwo.find(y => y.id == id))
  )

  let player1Wins = 0

  games.map(game => {
    if (game.winningTeam == 1) {
      if (game.teamOne.find(player => player.id == id)) {
        player1Wins++
      }
    } else {
      if (game.teamTwo.find(player => player.id == id)) {
        player1Wins++
      }
    }
  })

  const msg = new MessageEmbed()

    .setDescription(`
    **${utilsBot.getMenctionById(id)}**

      Jogos: ${games.length}
      Vitórias: ${player1Wins}
      Derrotas: ${games.length - player1Wins}
      Punições: 0
      Elo: ${player.elo}
      `)
    .setColor(helper.infoColor)
  message.channel.send(msg)

}

async function getPlayerById(id) {
  const playerExists = await playerModel.findOne({ id: id })
  return playerExists
}

async function setRanking(message) {
  const players = await playerModel.find({}, ['id', 'name', 'elo'], { sort: { elo: -1 } })
  let rankDesc = '';
  players.map(async (p, i) => {
    utilsBot.setEloByPlayer(p)
    utilsBot.SetPlayerRoleByRanking(p, i == 0).then(rankDesc += `${i + 1}º - [${p.elo}] ${p.name} \n`)
  })

  const rankingEmbed = new MessageEmbed()
    .setTitle(`Ranking do InHouse`)
    .setDescription(rankDesc)
    .setColor(helper.infoColor)

  message.channel.send(rankingEmbed)
}

async function punish(message) {
  if (message.member.hasPermission("ADMINISTRATOR")) {
    const arrMsg = message.content.split(' ');
    if (arrMsg.length > 1) {
      let pontos = parseInt(arrMsg[2])
      const id = arrMsg[1].replace('<', '').replace('>', '').replace('@', '').replace('!', '')
      if (pontos) {
        const player = await playerModel.findOneAndUpdate({ id: id }, { $inc: { elo: -pontos, punicoes: 1 } }, { new: true })
        utilsBot.setEloByPlayer(player)
        const msg = new MessageEmbed()
          .setDescription(`${utilsBot.getMenctionById(id)} punido em ${pontos} pontos`)
          .setColor(helper.okColor)

        message.channel.send(msg)
      }
    } else {
      const msg = new MessageEmbed()
        .setDescription(`Comando incorreto
      Ex: !punish @membro 5`)
        .setColor(helper.errColor)
    }
  } else {
    const msg = new MessageEmbed()
      .setDescription(`${utilsBot.getMenctionById(message.author.id)}, você não permissão para fazer isso`)
      .setColor(helper.errColor)

    message.channel.send(msg)
  }
}

module.exports = { setRanking, getPlayerById, handleRegister, playerExists, versus, info, punish }