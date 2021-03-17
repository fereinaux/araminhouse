const queueModel = require('../models/Queue')
const playerModel = require('../models/Player')
const moment = require('moment')
const helper = require('../helper.json')
const {
  isAdm,
  getMenctionById,
  getEmojiByName,
  getGeralTextChannel
} = require('../utils/bot')
const { MessageEmbed } = require('discord.js')
const { setRanking } = require('./PlayerController')
const utilsRiot = require('../utils/riot')

async function queueExists() {
  const existsQueue = await queueModel.findOne({ $or: [{ status: 'aberta' }, { status: 'Em andamento' }] })
  return existsQueue;
}
async function queueEmAndamentoExists() {
  const existsQueue = await queueModel.findOne({ status: 'Em andamento' })
  return existsQueue;
}

async function createQueue(ownerId, size, reopen) {
  await queueModel.create({ status: 'aberta', reopen: reopen, ownerId: ownerId, size: size, date: moment(new Date()).subtract(3,'hours').toDate() })

  if (reopen) {
    const openQueueDate = moment(new Date()).subtract(3,'hours').toDate()
    const queueCreated = new MessageEmbed()
      .setTitle(`Qeueue reaberta`)
      .setDescription(`**0/${size * 2}**
    Durante 2 minutos a prioridade é de quem já estava no game anterior, após esse tempo a qeueue estará aberta a entrada de qualquer pessoa    
    
    Hora da reabertura ${moment(openQueueDate).add(2, 'minutes').format('HH:mm')}
    `)
      .setColor(helper.infoColor)
    getGeralTextChannel().send(queueCreated)
  } else {

    const queueCreated = new MessageEmbed()
      .setTitle(`Queue criada`)
      .setDescription(`**0/${size * 2}**`)
      .setColor(helper.okColor)
    getGeralTextChannel().send(queueCreated)
  }
}

async function setQueue(message) {
  const queueCreationExists = await queueExists();
  if (!queueCreationExists) {
    const arrMsg = message.content.split(' ');
    if (arrMsg.length > 1) {
      let size = parseInt(arrMsg[1])
      if (size > 2 && size < 6) {
        await createQueue(message.author.id, size, false)
      } else {
        const msg = new MessageEmbed()
          .setTitle(`Tamanho da Queue não suportado`)
          .setColor(helper.errColor)
        getGeralTextChannel().send(msg)
      }
    } else {
      const queueEmbed = new MessageEmbed()
        .setTitle(`Criação de Queues`)
        .setDescription("Escolha um tamanho para a Queue")
        .setColor(helper.infoColor)

      getGeralTextChannel().send({ embed: queueEmbed }).then(embedMessage => {
        const reasonFilter = (reaction, user) => {
          return ['3⃣', '4⃣', '5⃣'].includes(reaction.emoji.name) && user.id === message.author.id;
        };

        Promise.all([
          embedMessage.react('3⃣'),
          embedMessage.react('4⃣'),
          embedMessage.react('5⃣'),
        ]).then(() => {
          embedMessage.awaitReactions(reasonFilter, { max: 1, time: 120000 }).then(collected => {

            const reasonReaction = collected.first()

            let size = 5;
            switch (reasonReaction.emoji.name) {
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
            createQueue(message.author.id, size, false)
          })
        })
      })
    }
  } else {
    const queueExists = new MessageEmbed()
      .setTitle(`Já existe uma Queue em andamento!`)
      .setColor(helper.errColor)
    getGeralTextChannel().send(queueExists)
  }
}

function msgQueueNotExists() {
  const queueDoesntExists = new MessageEmbed()
    .setTitle(`Não existe uma Queue em andamento!`)
    .setColor(helper.errColor)
  getGeralTextChannel().send(queueDoesntExists)
}

async function getArrElo(teamOne, teamTwo) {
  const arrElo = []
  for (const [idx, p] of teamOne.entries()) {
    await pushArrElo(p, arrElo)
  }

  for (const [idx, p] of teamTwo.entries()) {
    await pushArrElo(p, arrElo)
  }

  return arrElo
}

async function pushArrElo(p, arrElo) {
  const pm = await playerModel.findOne({ id: p.id })
  if (pm.summoner && pm.summoner.id) {
    const result = await utilsRiot.searchSummonerLeague(pm.summoner.id)
    const position = result.find(r => r.queueType == 'RANKED_SOLO_5x5')
    if (position) {

      arrElo.push({

        id: pm.id,
        summonerName: pm.summoner.name,
        rank: position.rank,
        tier: position.tier,
        wins: position.wins,
        losses: position.losses
      })
    }
  }
}

function getElo(player, arrElo) {
  const elo = arrElo.find(a => a.id == player.id)
  if (elo) {
    return `- ${elo.summonerName} ${getEmojiByName(elo.tier.toLowerCase())} ${elo.tier.substr(0, 1)}${elo.tier.substr(1, 100).toLowerCase()} ${elo.rank}  W:${elo.wins}  L:${elo.losses}`
  } else {
    return ''
  }
}

function mapTeam(team, arrElo) {
  return decodeURI(team.map(player => {
    const member = getMenctionById(player.id)
    return `${member} ${getElo(player, arrElo)}`
  }).join('%0D%0A'))
}

async function setJoin(message) {
  const queueJoinExists = await queueExists();
  if (!queueJoinExists)
    msgQueueNotExists()
  else {
    if (queueJoinExists.players.length < (queueJoinExists.size * 2)) {
      let players = queueJoinExists.players;
      if (players.find(el => el.id == message.authorID)) {
        const playerDuplicated = new MessageEmbed()
          .setDescription(`${getMenctionById(message.authorID)} já está na Queue`)
          .setColor(helper.errColor)
        getGeralTextChannel().send(playerDuplicated)
      } else {
        if (queueJoinExists.reopen) {
          const playersLastQueue = await queueModel.findOne({ status: "Concluída" }, ['players', 'date', 'endDate'], { sort: { date: -1 } })
          const startTime = moment(playersLastQueue.endDate);
          const endTime = moment(moment(new Date()).subtract(3,'hours').toDate());
          const duration = (endTime.diff(startTime))
          const minutes = parseInt(moment.duration(duration).asMinutes());
          const seconds = parseInt(moment.duration(duration).asSeconds());
          if (minutes < 2) {
            if (playersLastQueue.players.find(p => p.id === message.authorID)) {
              await handleJoinPlayerQueue(message, players, queueJoinExists)
            } else {
              const playerQueue = new MessageEmbed()
                .setDescription(`Ainda estamos em lista de prioridade por mais ${120 - seconds} segundos`)
                .setColor(helper.errColor)
              getGeralTextChannel().send(playerQueue)
            }
          } else {
            await handleJoinPlayerQueue(message, players, queueJoinExists)
          }
        } else {
          await handleJoinPlayerQueue(message, players, queueJoinExists)
        }
      }
    } else {
      const queueSize = new MessageEmbed()
        .setTitle(`Queue fechada`)
        .setColor(helper.errColor)
      getGeralTextChannel().send(queueSize)
    }
  }
}

async function handleJoinPlayerQueue(message, players, queueJoinExists) {
  const player = await playerModel.findOne({ id: message.authorID })
  players.push({ name: player.name, id: message.authorID, summoner: player.summoner })
  await queueModel.updateOne({ status: 'aberta' }, { players: players }, { new: true })
  await handleStart(queueJoinExists, message)
}

async function handleStart(queueJoinExists, message) {
  if (queueJoinExists.players.length == (queueJoinExists.size * 2)) {
    const randomPlayers = queueJoinExists.players.sort(() => Math.random() - 0.5)
    const teamOne = randomPlayers.slice(0, queueJoinExists.size)
    const teamTwo = randomPlayers.slice(queueJoinExists.size, queueJoinExists.size * 2)

    const arrElo = await getArrElo(teamOne, teamTwo)

    await queueModel.updateOne({ status: 'aberta' }, { status: 'Em andamento', teamOne: teamOne, teamTwo: teamTwo })
    const teamsDescription = `
            **Time 1**
            
            ${mapTeam(teamOne, arrElo)}                
            
            **Time 2**
  
            ${mapTeam(teamTwo, arrElo)}`

    const teamEmbed = new MessageEmbed()
      .setTitle(`Queue fechada`)
      .setDescription(teamsDescription)
      .setColor(helper.okColor)
    getGeralTextChannel().send(teamEmbed)

  } else {
    const playerQueue = new MessageEmbed()
      .setDescription(`**${getMenctionById(message.authorID)} entrou na Queue**
            **${queueJoinExists.players.length}/${queueJoinExists.size * 2}**`)
      .setColor(helper.okColor)
    getGeralTextChannel().send(playerQueue)
  }
}

async function leaveQueue(message) {
  const queue = await queueExists();
  if (queue && queue.status == 'aberta') {
    if (queue.players.find(p => p.id == message.author.id)) {
      if (queue.ownerId == message.author.id) {
        const msgCancelada = new MessageEmbed()
          .setTitle(`Queue cancelada!`)
          .setColor(helper.errColor)
        await queueModel.updateOne({ _id: queue._id }, { status: 'Canelada' })
        getGeralTextChannel().send(msgCancelada)
      } else {
        queue.players = queue.players.filter(p => p.id != message.author.id)

        await queueModel.updateOne({ _id: queue._id }, queue)

        const msgOk = new MessageEmbed()
          .setDescription(`**${getMenctionById(message.author.id)} saiu da Queue**
        **${queue.players.length}/${queue.size * 2}**`)
          .setColor(helper.okColor)
          .setColor(helper.okColor)
        getGeralTextChannel().send(msgOk)
      }
    } else {
      const msgNotInQueue = new MessageEmbed()
        .setTitle(`Você não está na Queue`)
        .setColor(helper.errColor)
      getGeralTextChannel().send(msgNotInQueue)
    }
  } else if (queue && queue.status == 'Em andamento') {
    const msgQueueStarted = new MessageEmbed()
      .setTitle(`Você não pode sair de uma queue depois que ela está formada, caso não jogue a partida, poderá ser punido conforme as regras do servidor`)
      .setColor(helper.errColor)
    getGeralTextChannel().send(msgQueueStarted)
  } else {
    msgQueueNotExists()
  }
}

async function clearQueue(message) {
  const queue = await queueExists();
  const msgCancelada = new MessageEmbed()
    .setTitle(`Queue cancelada!`)
    .setColor(helper.errColor)
  if (queue) {
    if (queue.status == 'aberta') {
      if (queue.ownerId == message.author.id || isAdm(message.member)) {
        await queueModel.updateOne({ status: 'aberta' }, { status: 'Canelada' });
        getGeralTextChannel().send(msgCancelada)
      } else {
        const msgNotOwner = new MessageEmbed()
          .setTitle(`Você não pode cancelar uma queue que não foi você que criou!`)
          .setColor(helper.errColor)
        getGeralTextChannel().send(msgNotOwner)
      }
    } else if (queue.status == 'Em andamento') {
      if (isAdm(message.member)) {
        await queueModel.updateOne({ status: 'Em andamento' }, { status: 'Canelada' });
        getGeralTextChannel().send(msgCancelada)
      } else {
        const msgAdm = new MessageEmbed()
          .setTitle(`Apenas administradores podem cancelar uma queue depois que ela é formada!`)
          .setColor(helper.errColor)
        getGeralTextChannel().send(msgAdm)
      }
    }
  }
  else {
    msgQueueNotExists()
  }
}

function getPointsByQueueSize(size) {

  const queueResult = helper.pointsConfig.find(x => x.size == size)

  return queueResult ? {
    win: queueResult.win,
    loss: queueResult.loss
  } : {
    win: 0,
    loss: 0
  }

}

async function getStreak(id, win) {
  return queueModel.find({ status: "Concluída" }, ['players'], { sort: { date: -1 } }).then(queueStreak => {
    queueStreak = queueStreak.filter(x => x.players.find(y => y && y.id == id))

    let streak = 1
    for (let i = 0; i < queueStreak.length; i++) {
      const queue = queueStreak[i];
      const playerQueue = queue.players.find(y => y.id == id)
      if (playerQueue.stats && playerQueue.stats.win == win) {
        streak++
      } else {
        break
      }
    }
    return streak;
  })
}

async function setPoints(queue) {
  for (const [idx, p] of queue.players.entries()) {
    const win = p.stats.win
    const queuePoints = getPointsByQueueSize(queue.size)
    const player = await playerModel.findOne({ id: p.id })
    player.elo = player.elo + (win ? queuePoints.win : - (queuePoints.loss))
    if (!player.maxElo || player.maxElo > player.elo)
      player.maxElo = player.elo

    await playerModel.findOneAndUpdate({ id: p.id }, player)
    const streak = await getStreak(p.id, win)
    const pvtMsg = new MessageEmbed()
      .setTitle(`Informações da Partida`)
      .setThumbnail(utilsRiot.getImageByChampionPath(p.champion.path))
      .setDescription(`**${win ? 'Vitória' : 'Derrota'}**
        Data da Partida: ${moment(new Date()).subtract(3,'hours').toDate().format('DD/MM/YYYY HH:mm')}
        Dano: ${Math.floor(p.stats.damage / 1000)}K
        KDA: ${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}
        Gold: ${Math.floor(p.stats.gold / 1000)}K
                 
        Rating: ${player.elo}
        Maior Rating: ${player.maxElo}
        ${win ? 'Winning' : 'Losing'} Streak: ${streak}
      `)
      .setColor(win ? helper.okColor : helper.errColor)

    const member = getMenctionById(p.id)
    member.send(pvtMsg)
  }
  await queueModel.updateOne({ status: 'Em andamento' }, { status: 'Concluída', endDate: moment(new Date()).subtract(3,'hours').toDate() })
}

async function handleCronCheck() {

  const queue = await queueModel.findOne({ status: 'Em andamento' })

  if (queue) {
    if (queue.matchId) {
      const response = await utilsRiot.getMatchById(queue.matchId)
      if (response) {
        handleQueueHasMatchId(queue, response)
      }
    } else {
      const player = queue.players.find(e => e.summoner && e.summoner.accountId)
      const response = await utilsRiot.searchActiveMatch(player.summoner.id)
      if (response) {
        await handlePlayerInGame(response, queue)
      }
    }
  }
}


async function handleQueueHasMatchId(queue, response) {
  const championsObj = await utilsRiot.getChampions()
  const champions = Object.keys(championsObj).map(key => { return championsObj[key] })
  queue.players.map((p, i) => {
    const partcipant = response.participants[i]
    const champion = champions.find(c => c.key == partcipant.championId)
    const partcipantStats = partcipant.stats
    p.stats =
    {
      kills: partcipantStats.kills,
      deaths: partcipantStats.deaths,
      assists: partcipantStats.assists,
      killParticipation: partcipantStats.kills + partcipantStats.assists,
      damage: partcipantStats.totalDamageDealtToChampions,
      damageDealtToObjectives: partcipantStats.damageDealtToObjectives,
      largestMultiKill: partcipantStats.largestMultiKill,
      gold: partcipantStats.goldEarned,
      minions: partcipantStats.totalMinionsKilled,
      win: partcipantStats.win,
      kda: (partcipantStats.kills + partcipantStats.assists) / (partcipantStats.deaths > 0 ? partcipantStats.deaths : 1)
    }
    p.champion = {
      name: champion.id,
      path: champion.image.full
    }
  })

  await queueModel.findOneAndUpdate({ status: 'Em andamento' }, queue)
  const mostDamage = queue.players.sort((a, b) => b.stats.damage - a.stats.damage)[0];
  const kdaPlayer = queue.players.sort(function (a, b) {
    return b.stats.kda - a.stats.kda;
  })[0];
  const feeder = queue.players.sort((a, b) => b.stats.deaths - a.stats.deaths)[0];

  const time = response.teams[0].win == 'Win' ? 1 : 2

  const msg = new MessageEmbed()
    .setDescription(`**Partida Finalizada** 
        **Time ${time == 'Win' ? 1 : 2} Venceu**
      `)
    .setColor(helper.okColor)

  const msgTopDamage = new MessageEmbed()
    .setTitle(`Top Damage`)
    .setThumbnail(utilsRiot.getImageByChampionPath(mostDamage.champion.path))
    .setDescription(`
    ${getMenctionById(mostDamage.id)} - ${Math.floor(mostDamage.stats.damage / 1000)}K de dano
    `)
    .setColor(helper.infoColor)

  const msgKDA = new MessageEmbed()
    .setTitle(`KDA Player`)
    .setThumbnail(utilsRiot.getImageByChampionPath(kdaPlayer.champion.path))
    .setDescription(`
    ${getMenctionById(kdaPlayer.id)} - ${kdaPlayer.stats.kills}/${kdaPlayer.stats.deaths}/${kdaPlayer.stats.assists}
    `)
    .setColor(helper.infoColor)

  const msgFeeder = new MessageEmbed()
    .setTitle(`Feeder`)
    .setThumbnail(utilsRiot.getImageByChampionPath(feeder.champion.path))
    .setDescription(`
    ${getMenctionById(feeder.id)} - ${feeder.stats.deaths} mortes
    `)
    .setColor(helper.infoColor)

  getGeralTextChannel().send(msg)
  getGeralTextChannel().send(msgTopDamage)
  getGeralTextChannel().send(msgKDA)
  getGeralTextChannel().send(msgFeeder)
  await setPoints(queue)
  setRanking()
  await createQueue(queue.ownerId, queue.size, true)
}

async function handlePlayerInGame(response, queue) {
  const newArrPlayers = []
  response.participants.map(e => {
    newArrPlayers.push(queue.players.find(p => p.summoner.id == e.summonerId))
  })
  await queueModel.updateOne({ status: 'Em andamento' }, { matchId: response.gameId, players: newArrPlayers })
  const msg = new MessageEmbed()
    .setDescription(`**Partida encontrada** 
          Os resultados serão atualizados quando a partida terminar`)
    .setColor(helper.okColor)
  getGeralTextChannel().send(msg)
}

var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

async function getResumeByDate(beginDate, endDate, type) {
  
  const queues = await queueModel.find({
    date: {
      $gte: moment(beginDate).add(3,'hours').toDate(),
      $lt: moment(endDate).add(3,'hours').toDate()
    },
    status: 'Concluída'
  })

  const arrPlayers = []
  const arrPlayersWins = []
  const arrPlayersLosses = []

  queues.map(q => q.players.map(p => {
    arrPlayers.push(p)
    if (p && p.stats) {
      if (p.stats.win) {
        arrPlayersWins.push(p)
      } else {
        arrPlayersLosses.push(p)
      }
    }
  }))

  const arrChampions = []
  const arrChampionsWins = []
  const arrChampionsLosses = []

  arrPlayers.map(p => {
    if (p && p.champion) {
      arrChampions.push(p.champion)
    }
  })
  arrPlayersWins.map(p => {
    if (p && p.champion) {
      arrChampionsWins.push(p.champion)
    }
  })
  arrPlayersLosses.map(p => {
    if (p && p.champion) {
      arrChampionsLosses.push(p.champion)
    }
  })  

  const monstLosePlayer = objToArray(groupBy(arrPlayersLosses, 'id')).sort((a, b) => b.length - a.length)[0]
  const mostWinsPlayer = objToArray(groupBy(arrPlayersWins, 'id')).sort((a, b) => b.length - a.length)[0]
  const mostUsedChamp = objToArray(groupBy(arrChampions, 'name')).sort((a, b) => b.length - a.length)[0]
  const mostWinChamp = objToArray(groupBy(arrChampionsWins, 'name')).sort((a, b) => b.length - a.length)[0]
  const mostLoseChamp = objToArray(groupBy(arrChampionsLosses, 'name')).sort((a, b) => b.length - a.length)[0]

  let title;
  switch (type) {
    case 'day':
      title = `**Resumo ${moment(endDate).format('DD/MM/YYYY')}**`
      break;
    case 'week':
      title = `**Resumo da Semana (${moment(beginDate).format('DD/MM/YYYY')} - ${moment(endDate).format('DD/MM/YYYY')})**`
      break;
    case 'month':
      title = `**Resumo do Mês ${moment(endDate).format('MM/YYYY')}**`
      break;
    default:
      break;
  }

  const msg1 = new MessageEmbed()
    .setTitle(title)
    .setDescription(
      `Total de Queues: ${queues.length}
      Top Wins: ${getMenctionById(mostWinsPlayer[0].id)} ${mostWinsPlayer.length} vitórias
      Top Loses: ${getMenctionById(monstLosePlayer[0].id)} ${monstLosePlayer.length} derrotas
      `)
    .setColor(helper.infoColor)
  const msg2 = new MessageEmbed()
    .setTitle(`**Campeão mais usado**`)
    .setThumbnail(utilsRiot.getImageByChampionPath(mostUsedChamp[0].path))
    .setDescription(
      `${mostUsedChamp.length} partidas`)
    .setColor(helper.infoColor)
  const msg3 = new MessageEmbed()
    .setTitle(`**Campeão mais vitorioso**`)
    .setThumbnail(utilsRiot.getImageByChampionPath(mostWinChamp[0].path))
    .setDescription(
      `${mostWinChamp.length} vitórias`)
    .setColor(helper.okColor)
  const msg4 = new MessageEmbed()
    .setTitle(`**Campeão mais derrotado**`)
    .setThumbnail(utilsRiot.getImageByChampionPath(mostLoseChamp[0].path))
    .setDescription(
      `${mostLoseChamp.length} derrotas`)
    .setColor(helper.errColor)
  getGeralTextChannel().send(msg1)
  getGeralTextChannel().send(msg2)
  getGeralTextChannel().send(msg3)
  getGeralTextChannel().send(msg4)

  function objToArray(obj) {
    array = []
    for (const key in obj) {
      if (Object.hasOwnProperty.call(obj, key)) {
        const element = obj[key]
        array.push(element)
      }
    }
    return array
  }
}

async function dayResume() {
  const date = moment().subtract(1, "days");
  await getResumeByDate(date.startOf('day').toDate(), date.endOf('day').toDate(), 'day')
}

async function weekResume() {
  const date = moment().subtract(1, "days");
  await getResumeByDate(date.startOf('isoWeek').toDate(), date.endOf('isoWeek').toDate(), 'week')
}

async function monthResume() {
  const date = moment().subtract(1, "days");
  await getResumeByDate(date.startOf('month').toDate(), date.endOf('month').toDate(), 'month')
}

module.exports = {
  monthResume,
  weekResume,
  dayResume,
  setJoin,
  setQueue,
  queueExists,
  queueEmAndamentoExists,
  clearQueue,
  leaveQueue,
  handleCronCheck
}
