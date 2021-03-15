const playerModel = require('../models/Player')
const queueModel = require('../models/Queue')
const helper = require('../helper.json')
const { MessageEmbed } = require('discord.js')
const { getGeralTextChannel } = require('../utils/bot')
const utilsBot = require('../utils/bot')
const utilsRiot = require('../utils/riot')
const moment = require('moment')

async function handleRegister(member) {
  const existsRegister = await getPlayerById(member.user.id)
  if (!(existsRegister)) {
    const player = { name: member.user.username, id: member.user.id, elo: 0, maxElo: 0, punicoes: 0 }
    playerModel.create(player)
    utilsBot.setEloByPlayer(player)
    const msgWelcome = new MessageEmbed()
      .setDescription(`Bem-Vindo, ${utilsBot.getMenctionById(member.user.id)}.
      
      Eu sou o Bot do Aram Inhouse, e vou te ajudar a ficar por dentro de como funciona o nosso servidor

      Para começar, digite o seu nome de Invocador para que possamos manter nossas estatísticas atualizadas

      `)
    const registerUserEmbed = new MessageEmbed()
      .setDescription(`${utilsBot.getMenctionById(member.user.id)} registrado!`)
      .setColor(helper.okColor)
    member.send(msgWelcome)
    utilsBot.setRegisteredRole(member)
    getGeralTextChannel().send(registerUserEmbed)
  } else {
    const existsUserEmbed = new MessageEmbed()
      .setDescription(`${utilsBot.getMenctionById(member.user.id)} já estava previamente registrado`)
      .setColor(helper.errColor)
    getGeralTextChannel().send(existsUserEmbed)
  }
}

async function versus(message, player1, player2) {
  const id1 = player1.replace('<', '').replace('>', '').replace('@', '').replace('!', '')
  const id2 = player2.replace('<', '').replace('>', '').replace('@', '').replace('!', '')

  const gamesquery = await queueModel.find({status: 'Concluída'})
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
    const playingGame = game.players.find(player => player && player.id == id1)
    if (playingGame) {
      if (playingGame.stats && playingGame.stats.win) {
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
  getGeralTextChannel().send(msg)
}

async function getLastQueue(id) {
  let queues = await queueModel.find({ status: "Concluída" }, ['players'], { sort: { date: -1 } })
  queues = queues.filter(x => x.players.find(y => y && y.id == id))
  return queues[0]
}

async function getStreak(id) {
  let queueStreak = await queueModel.find({ status: "Concluída" }, ['players'], { sort: { date: -1 } })
  queueStreak = queueStreak.filter(x => x.players.find(y => y && y.id == id))

  let streak = 1
  if (queueStreak.length > 0 && queueStreak[0].players.find(y => y.id == id).stats) {

    const win = queueStreak[0].players.find(y => y.id == id).stats.win
    for (let i = 1; i < queueStreak.length; i++) {
      const queue = queueStreak[i];
      const playerQueue = queue.players.find(y => y.id == id)
      if (playerQueue.stats && playerQueue.stats.win == win) {
        streak++
      } else {
        break
      }
    }
    return {
      win, streak
    };
  } else
    return {
      win: true, streak: 0
    }


}

async function info(message, id) {
  id = id ? id.replace('<', '').replace('>', '').replace('@', '').replace('!', '') : message.author.id
  const player = await getPlayerById(id)

  const gamesquery = await queueModel.find({status: 'Concluída'})

  const games = gamesquery.filter(
    x =>
      (x.teamOne.find(y => y.id == id)) ||
      (x.teamTwo.find(y => y.id == id))
  )

  const players = await getPlayersRanked()

  const image = getImageByPlayers(player, players)

  let player1Wins = 0
  let player1Losses = 0

  games.map(game => {
    const playingGame = game.players.find(player => player && player.id == id)
    if (playingGame) {
      if (playingGame.stats && playingGame.stats.win) {
        player1Wins++
      } else if (playingGame.stats && !playingGame.stats.win) {
        player1Losses++
      }
    }
  }) 

  let position;

  if (player.summoner && player.summoner.id) {
    const positions = await utilsRiot.searchSummonerLeague(player.summoner.id);
    position = positions.find(p => p.queueType == 'RANKED_SOLO_5x5');
  }

  const streak = await getStreak(id)
  const lastQueue = await getLastQueue(id)

  const msg = new MessageEmbed()
    .setDescription(`
    ${getEmojiByPlayer(player, players)} **${player.name}**

      Jogos: ${games.length}
      Vitórias: ${player1Wins}
      Derrotas: ${player1Losses}
      Punições: ${player.punicoes ? player.punicoes : 0}
      Rating: ${player.elo}   
      Maior Rating: ${player.maxElo ? player.maxElo : 0}   
      ${streak.win ? 'Winning' : 'Losing'} Streak: ${streak.streak}     
      ${lastQueue ? `Última Partida: ${moment(lastQueue.date).format('DD/MM/YYYY HH:mm')}` : ''}
      
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

  if (!utilsBot.checkDM(message))
    getGeralTextChannel().send(msg)
  else
    utilsBot.getMenctionById(message.author.id).send(msg)
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
  const players = await playerModel.find({}, ['id', 'name', 'elo', 'maxElo'], { sort: { elo: -1 } })
  return players
}
async function setRanking() {
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

  getGeralTextChannel().send(rankingEmbed)
}

async function punish(message) {
  if (utilsBot.isAdm(message.member)) {
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

        getGeralTextChannel().send(msg)
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
  if (utilsBot.isAdm(message.member)) {
    const players = await playerModel.find()
    await queueModel.remove()
    for (const [idx, p] of players.entries()) {
      await playerModel.updateOne({ id: p.id }, { elo: 0, maxElo: 0, punicoes: 0 })
    }
    const msg = new MessageEmbed()
      .setDescription(`As partidas do servidor foram resetadas`)
      .setColor(helper.okColor)

    message.channel.send(msg)
    setRanking(message)
  } else {
    utilsBot.noPermission(message)
  }
}

async function registerSummoner(message) {
  if (utilsBot.isAdm(message.member)) {

    const summonerName = message.content.split('"')[1]
    const id = message.content.split(' ')[1].replace('<', '').replace('>', '').replace('@', '').replace('!', '')

    handleRegisterSummoner(id, message, summonerName)
  } else {
    utilsBot.noPermission(message)
  }
}

async function handleRegisterSummoner(id, message, summonerName, newRegister) {
  const summoner = await utilsRiot.searchBySummonerName(summonerName)
  const whoTo = utilsBot.checkDM(message) ? utilsBot.getMenctionById(message.author.id) : getGeralTextChannel()
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

      whoTo.send(msg)

      if (utilsBot.checkDM(message) && newRegister) {
        const msgCommands = new MessageEmbed()
          .setDescription(`Agora que teu cadastro está finalizado, vou te apresentar rapidamente os comandos do servidors e para que servem.`)
          .setColor(helper.infoColor)

        whoTo.send(msgCommands)
        handleCommands(message.author.id)
      }

    } else {
      const msg = new MessageEmbed()
        .setDescription(`${utilsBot.getMenctionById(message.author.id)}, você ainda não possui Elo nas Rankeadas essa season`)
        .setColor(helper.errColor)

      whoTo.send(msg)
    }
  } else {
    const msg = new MessageEmbed()
      .setDescription(`Invocador "${summonerName}" não foi encontrado`)
      .setColor(helper.errColor)

    whoTo.send(msg)
  }
}

function handleCommands(id) {
  const member = utilsBot.getMenctionById(id)
  const msgCommands2 = new MessageEmbed()
    .setTitle(`Comandos Gerais (Podem ser usados no chat geral do servidor ou no chat privado do Bot)`)
    .addField('!info ou !info @User', `
          *Versão Chat Privado*
            - Exibe suas próprias informações atuais no servidor e nas Rankeadas Solo/Duo

            *Versão Chat Geral do Servidor*
            - Exibe as informações atuais no servidor e nas Rankeadas Solo/Duo do usuário mencionado no @`)
    .setColor(helper.infoColor)

  const msgCommands3 = new MessageEmbed()
    .setTitle(`Comandos do Servidor (Só podem ser usados em um canal do servidor)`)
    .addField('!ranking', `
          - Exibe o ranking dos jogadores do servidor`)
    .addField('!queue ou !queue X', `
          - Em sua primeira versão, pergunta ao usuário o tamanho da queue, o mesmo deve Reagir com um dos Emojis: 3⃣, 4⃣ ou 5⃣
          - Em sua segunda versão, criará a Queue com o número representado pelo "X"`)
    .addField('!clearqueue', `
          - Caso você seja o dono da queue que está aberta, cancelará a mesma`)
    .addField('!leavequeue', `
          - Caso você esteja em uma queue, sairá da mesma`)
    .addField('!join', `
          - Se junta a queue em andamento`)
    .addField('!versus @User1 @User2', `
          - Trás um resumo do confronto entre os usuários mencionados entre os "@"s'`)
    .setColor(helper.infoColor)

  const msgCommands4 = new MessageEmbed()
    .setTitle(`**Comandos Privados (Só podem ser usados no chat privado com o Bot)**`)
    .addField('!summoner "Nome de Invocador"', `
          - Altera o Invocador do seu registro no servidor para aquele mencionado entre aspas`)
    .addField('!commands', `
          - Exibe os comandos do bot`)
    // .addField('!rules', `
    //       - Exibe as regras do servidor`)
    .setColor(helper.infoColor)
  member.send(msgCommands2)
  member.send(msgCommands3)
  member.send(msgCommands4)
}

async function handleSummoner(message) {
  const player = await playerModel.findOne({ id: message.author.id })

  if (player && !player.summoner.id) {
    handleRegisterSummoner(message.author.id, message, message.content, true)

  }
}

module.exports = { setRanking, handleRegisterSummoner, getPlayerById, handleRegister, handleCommands, versus, info, punish, reset, registerSummoner, handleSummoner }