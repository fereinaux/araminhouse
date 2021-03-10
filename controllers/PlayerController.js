const playerModel = require('../models/Player')
const helper = require('../helper.json')
const { MessageEmbed } = require('discord.js')
const utilsBot = require('../utils/bot')
const utilsRiot = require('../utils/riot')
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

  const players = await getPlayersRanked()

  const image = getImageByPlayers(player, players)

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

  let position;

  if (player.summoner && player.summoner.id) {
    const positions = await utilsRiot.searchSummonerLeague(player.summoner.id);
    position = positions.find(p => p.queueType == 'RANKED_SOLO_5x5');
  }

  const msg = new MessageEmbed()
    .setDescription(`
    ${getEmojiByPlayer(player, players)} **${player.name}**

      Jogos: ${games.length}
      Vitórias: ${player1Wins}
      Derrotas: ${games.length - player1Wins}
      Punições: ${player.punicoes ? player.punicoes : 0}
      Elo: ${player.elo}        
      
      ${player.summoner.name && position ?

        `${utilsBot.getEmojiByName(position.tier.toLowerCase())} **${player.summoner.name}**

        ${position.tier.substr(0, 1)}${position.tier.substr(1, 100).toLowerCase()} ${position.rank}       
        Jogos: ${position.wins + position.losses}
        Vitórias: ${position.wins}
        Derrotas: ${position.losses} 
        `
        : ''}     
      `)
    .setColor(helper.infoColor)


  message.channel.send(msg)

}

function getImageByName(name) {
  if (name.toLowerCase().includes('iron')) {
    return 'https://emoji.gg/assets/emoji/9421_Iron.png'
  }
  else if (name.toLowerCase().includes('bronze')) {
    return 'https://emoji.gg/assets/emoji/8300_Bronze.png'
  } else if (name.toLowerCase().includes('silver')) {
    return 'https://emoji.gg/assets/emoji/5633_Silver.png'
  } else if (name.toLowerCase().includes('gold')) {
    return 'https://www.boostroyal.com.br/assets/images/divisions/gold.png'
  } else if (name.toLowerCase().includes('platinum')) {
    return 'https://i.pinimg.com/originals/d7/47/1e/d7471e2ef48175986e9b75b566f61408.png'
  } else if (name.toLowerCase().includes('diamond')) {
    return 'https://emoji.gg/assets/emoji/6018_Diamond.png'
  } else if (name.toLowerCase().includes('master')) {
    return 'https://i.pinimg.com/originals/69/61/ab/6961ab1af799f02df28fa74278d78120.png'
  } else if (name.toLowerCase().includes('grandmaster')) {
    return 'https://emoji.gg/assets/emoji/2647_Grandmaster.png'
  } else if (name.toLowerCase().includes('challenger')) {
    return 'https://i.pinimg.com/originals/90/8f/95/908f95127caf7f739877f9f555807361.png'
  }
}

function getImageByPlayers(player, players) {
  if (players[0].id == player.id) {
    return 'https://i.pinimg.com/originals/90/8f/95/908f95127caf7f739877f9f555807361.png'
  } else {
    helper.roles.sort(function (a, b) {
      return a.pontos - b.pontos;
    })
    const role = helper.roles.find(roleFilter => roleFilter.pontos > player.elo || (
      roleFilter.pontos < player.elo &&
      roleFilter.name == helper.roles.sort(s => s.pontos)[helper.roles.length - 1].name))

    if (role.name.toLowerCase().includes('iron')) {
      return 'https://emoji.gg/assets/emoji/9421_Iron.png'
    }
    else if (role.name.toLowerCase().includes('bronze')) {
      return 'https://emoji.gg/assets/emoji/8300_Bronze.png'
    } else if (role.name.toLowerCase().includes('prata')) {
      return 'https://emoji.gg/assets/emoji/5633_Silver.png'
    } else if (role.name.toLowerCase().includes('ouro')) {
      return 'https://www.boostroyal.com.br/assets/images/divisions/gold.png'
    } else if (role.name.toLowerCase().includes('platina')) {
      return 'https://i.pinimg.com/originals/d7/47/1e/d7471e2ef48175986e9b75b566f61408.png'
    } else if (role.name.toLowerCase().includes('diamante')) {
      return 'https://emoji.gg/assets/emoji/6018_Diamond.png'
    } else if (role.name.toLowerCase().includes('master')) {
      return 'https://i.pinimg.com/originals/69/61/ab/6961ab1af799f02df28fa74278d78120.png'
    } else if (role.name.toLowerCase().includes('grandmaster')) {
      return 'https://emoji.gg/assets/emoji/2647_Grandmaster.png'
    }
  }
}

function getEmojiByPlayer(player, players) {
  if (players[0].id == player.id) {
    return utilsBot.getEmojiByName('challenger')
  } else {
    helper.roles.sort(function (a, b) {
      return a.pontos - b.pontos;
    })
    const role = helper.roles.find(roleFilter => roleFilter.pontos > player.elo || (
      roleFilter.pontos < player.elo &&
      roleFilter.name == helper.roles.sort(s => s.pontos)[helper.roles.length - 1].name))

    if (role.name.toLowerCase().includes('iron')) {
      return utilsBot.getEmojiByName('iron')
    }
    else if (role.name.toLowerCase().includes('bronze')) {
      return utilsBot.getEmojiByName('bronze')
    } else if (role.name.toLowerCase().includes('prata')) {
      return utilsBot.getEmojiByName('silver')
    } else if (role.name.toLowerCase().includes('ouro')) {
      return utilsBot.getEmojiByName('gold')
    } else if (role.name.toLowerCase().includes('platina')) {
      return utilsBot.getEmojiByName('platinum')
    } else if (role.name.toLowerCase().includes('diamante')) {
      return utilsBot.getEmojiByName('diamond')
    } else if (role.name.toLowerCase().includes('master')) {
      return utilsBot.getEmojiByName('master')
    } else if (role.name.toLowerCase().includes('grandmaster')) {
      return utilsBot.getEmojiByName('grandmaster')
    }
  }
}

async function getPlayerById(id) {
  const playerExists = await playerModel.findOne({ id: id })
  return playerExists
}

async function getPlayersRanked() {
  const players = await playerModel.find({}, ['id', 'name', 'elo'], { sort: { elo: -1 } })
  return players
}
async function setRanking(message) {
  const players = await getPlayersRanked()
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
      if (!isNaN(pontos)) {
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
    utilsBot.noPermission(message)
  }
}

async function reset(message) {
  if (message.member.hasPermission("ADMINISTRATOR")) {
    const players = await playerModel.find()
    let arrPromises =[]
    players.map(p => arrPromises.push(playerModel.updateOne({ id: p.id }, { elo: 0, punicoes:0 })))
    Promise.all(arrPromises).then(result => setRanking(message))
  } else {
    utilsBot.noPermission(message)
  }
}

async function registerSummoner(message) {
  const summonerName = message.content.split('"')[1]
  const id = message.content.split(' ')[1].replace('<', '').replace('>', '').replace('@', '').replace('!', '')

  const summoner = await utilsRiot.searchBySummonerName(summonerName)

  if (summoner) {
    await playerModel.findOneAndUpdate({ id: id }, { summoner: { name: summoner.name, id: summoner.id, accountId: summoner.accountId } })
    const positions = await utilsRiot.searchSummonerLeague(summoner.id);
    const position = positions.find(p => p.queueType == 'RANKED_SOLO_5x5');

    if (position) {
      const msg = new MessageEmbed()
        .setDescription(`${utilsBot.getMenctionById(message.author.id)}
      Nome de Invocador: ${summoner.name}
    ${position.tier} ${position.rank}
    Vitórias: ${position.wins}
    Derrotas: ${position.losses}
    `)
        .setThumbnail(getImageByName(position.tier))
        .setColor(helper.infoColor)

      message.channel.send(msg)
    } else {
      const msg = new MessageEmbed()
        .setDescription(`${utilsBot.getMenctionById(message.author.id)}, você ainda não possui Elo nas Rankeadas essa season`)
        .setColor(helper.errColor)

      message.channel.send(msg)
    }
  } else {
    const msg = new MessageEmbed()
      .setDescription(`Invocador "${summonerName}" não foi encontrado`)
      .setColor(helper.errColor)

    message.channel.send(msg)
  }
}

module.exports = { setRanking, getPlayerById, handleRegister, playerExists, versus, info, punish, reset, registerSummoner }