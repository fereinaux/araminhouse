const playerModel = require('../models/Player')
const helper = require('../helper.json')
const { MessageEmbed } = require('discord.js')
const utilsBot = require('../utils/bot')

async function playerExists(message) {
  const playerExists = await getPlayerById(message.author.id)
  return playerExists || message.author.bot;
}

async function handleRegister(message) {
  const existsRegister = await playerExists(message);
  if (!(existsRegister)) {
    const player = {name: message.author.username, id: message.author.id, elo: 0}
    playerModel.create(player)
    utilsBot.setEloById(player)
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

async function getPlayerById(id) {
  const playerExists = await playerModel.findOne({ id: id })
  return playerExists
}

async function setRanking(message) {
  const players = await playerModel.find({}, ['id', 'name', 'elo'], { sort: { elo: -1 } })
  let rankDesc = '';
  players.map(async (p, i) => {
    utilsBot.setEloById(p)
    utilsBot.SetPlayerRoleByRanking(p).then(rankDesc += `${i + 1}º - [${p.elo}] ${p.name} \n`)    
  })

  const rankingEmbed = new MessageEmbed()
    .setTitle(`Ranking do InHouse`)
    .setDescription(rankDesc)
    .setColor(helper.infoColor)

  message.channel.send(rankingEmbed)
}

module.exports = { setRanking, getPlayerById, handleRegister, playerExists }