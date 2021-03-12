const queueModel = require('../models/Queue')
const helper = require('../helper.json')
const {
  getQueueChannel,
  getMenctionById,
  getTeamOneChannel,
  getTeamTwoChannel,
  sendAllGeral,
  getEmojiByName,
  getGeralTextChannel
} = require('../utils/bot')
const { MessageEmbed } = require('discord.js')
const { setRanking, getPlayerById } = require('./PlayerController')
const playerModel = require('../models/Player')
const utilsRiot = require('../utils/riot')

async function queueExists() {
  const existsQueue = await queueModel.findOne({ $or: [{ status: 'aberta' }, { status: 'Em andamento' }] })
  return existsQueue;
}
async function queueEmAndamentoExists() {
  const existsQueue = await queueModel.findOne({ status: 'Em andamento' })
  return existsQueue;
}

async function createQueue(message, size) {
  await queueModel.create({ status: 'aberta', size: size, date: new Date() })

  const queueCreated = new MessageEmbed()
    .setTitle(`Queue criada`)
    .setDescription(`**0/${size * 2}**`)
    .setColor(helper.okColor)
  getGeralTextChannel().send(queueCreated)
}

async function setQueue(message) {
  const queueCreationExists = await queueExists();
  if (!queueCreationExists) {
    const arrMsg = message.content.split(' ');
    if (arrMsg.length > 1) {
      let size = parseInt(arrMsg[1])
      if (size > 2 && size < 6) {
        createQueue(message, size)
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
            createQueue(message, size)
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

async function msgQueueNotExists() {
  const queueDoesntExists = new MessageEmbed()
    .setTitle(`Não existe uma Queue em andamento!`)
    .setColor(helper.errColor)
  getGeralTextChannel().send(queueDoesntExists)
}

async function setJoin(message) {
  const queueJoinExists = await queueExists();
  if (!queueJoinExists) {
    msgQueueNotExists()
  } else {
    if (queueJoinExists.players.length < (queueJoinExists.size * 2)) {
      let players = queueJoinExists.players;
      if (players.find(el => el.id == message.authorID)) {
        const playerDuplicated = new MessageEmbed()
        .setDescription(`${getMenctionById(message.author.id)} já está na Queue`)
        .setColor(helper.errColor)
        getGeralTextChannel().send(playerDuplicated)
      } else {
        const player = await playerModel.findOne({ id: message.authorID })
        players.push({ name: player.name, id: message.authorID, summoner: player.summoner })
        await queueModel.updateOne({ status: 'aberta' }, { players: players }, { new: true })

        if (queueJoinExists.players.length == (queueJoinExists.size * 2)) {
          const randomPlayers = queueJoinExists.players.sort(() => Math.random() - 0.5)

          const teamOneChannel = await getTeamOneChannel()
          const teamTwoChannel = await getTeamTwoChannel()
          const teamOne = randomPlayers.slice(0, queueJoinExists.size)
          const teamTwo = randomPlayers.slice(queueJoinExists.size, queueJoinExists.size * 2)
          let arrElo = []
          let arrPromises = []
          let arrSubPromises = []
          teamOne.map(async p => {
            arrPromises.push(playerModel.findOne({ id: p.id })
              .then(pm => {
                if (pm.summoner && pm.summoner.id) {
                  arrSubPromises.push(utilsRiot.searchSummonerLeague(pm.summoner.id).then(result => {
                    const position = result.find(p => p.queueType == 'RANKED_SOLO_5x5')
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
                  ))
                }
              }))
          })
          teamTwo.map(async p => {
            arrPromises.push(playerModel.findOne({ id: p.id })
              .then(pm => {
                if (pm.summoner && pm.summoner.id) {
                  arrSubPromises.push(utilsRiot.searchSummonerLeague(pm.summoner.id).then(result => {
                    const position = result.find(p => p.queueType == 'RANKED_SOLO_5x5')
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
                  ))
                }
              }))
          })
          Promise.all(arrPromises).then(r1 => Promise.all(arrSubPromises).then(r2 => {

            function getElo(player) {
              const elo = arrElo.find(a => a.id == player.id)
              if (elo) {
                return `- ${elo.summonerName} ${getEmojiByName(elo.tier.toLowerCase())} ${elo.tier.substr(0, 1)}${elo.tier.substr(1, 100).toLowerCase()} ${elo.rank}  W:${elo.wins}  L:${elo.losses}`
              } else {
                return ''
              }

            }

            queueModel.updateOne({ status: 'aberta' }, { status: 'Em andamento', teamOne: teamOne, teamTwo: teamTwo }).then(result => {


              const teamsDescription = `
            **Time 1**
            
            ${decodeURI(teamOne.map(player => {
                const member = getMenctionById(player.id)
                if (helper.splitTeams) {
                  member.voice.setChannel(teamOneChannel)
                }
                return `${member} ${getElo(player)}`
              }).join('%0D%0A'))}
            
            **Time 2**
  
            ${decodeURI(teamTwo.map(player => {
                const member = getMenctionById(player.id)
                if (helper.splitTeams) {
                  member.voice.setChannel(teamTwoChannel)
                }
                return `${member} ${getElo(player)}`
              }).join('%0D%0A'))}
            `;

              const teamEmbed = new MessageEmbed()
                .setTitle(`Queue fechada`)
                .setDescription(teamsDescription)
                .setColor(helper.okColor)

              getGeralTextChannel().send(teamEmbed)
            });
          }))

        } else {
          const queueChannel = await getQueueChannel()          
          if (helper.splitTeams)
            message.member.voice.setChannel(queueChannel)
          const playerQueue = new MessageEmbed()
            .setDescription(`**${getMenctionById(message.authorID)} entrou na Queue**
            **${queueJoinExists.players.length}/${queueJoinExists.size * 2}**`)
            .setColor(helper.okColor)
          getGeralTextChannel().send(playerQueue)
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

async function ClearQueue() {
  const queue = await queueExists();
  if (queue) {
    await queueModel.updateOne({ $or: [{ status: 'aberta' }, { status: 'Em andamento' }] }, { status: 'Canelada' });
    const msg = new MessageEmbed()
      .setTitle(`Queue cancelada!`)
      .setColor(helper.errColor)

    getGeralTextChannel().send(msg)
  } else {
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
    queueStreak = queueStreak.filter(x => x.players.find(y => y.id == id))

    let streak = 1
    for (let i = 1; i < queueStreak.length; i++) {
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
  const arrPromises = []
  const arrSubPromises = []
  queue.players.map(p => {

    const win = p.stats.win
    const queuePoints = getPointsByQueueSize(queue.size)
    arrPromises.push(playerModel.findOneAndUpdate({ id: p.id }, { $inc: { elo: win ? queuePoints.win : - (queuePoints.loss) } }, { new: true }).then(result => {
      arrSubPromises.push(getStreak(p.id, win).then(streak => {
        const pvtMsg = new MessageEmbed()
          .setTitle(`Informações da Partida`)
          .setThumbnail(utilsRiot.getImageByChampionPath(p.champion.path))
          .setDescription(`**${win ? 'Vitória' : 'Derrota'}**
        Dano: ${Math.floor(p.stats.damage / 1000)}K
        KDA: ${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}
        Gold: ${Math.floor(p.stats.gold / 1000)}K   
        Pontos: ${result.elo}     
        ${win ? 'Winning' : 'Losing'} Streak: ${streak}
      `)
          .setColor(win ? helper.okColor : helper.errColor)

        getMenctionById(p.id).send(pvtMsg)
      }))
    }))
  })

  Promise.all(arrPromises).then(r1 => Promise.all(arrSubPromises).then(r2 => r2))
}

async function updateQueue(time) {
  queueModel.updateOne({ status: 'Em andamento' }, { status: 'Concluída', winningTeam: time }).then(result => {
    // sendAllGeral()
    const queueCreated = new MessageEmbed()
      .setTitle(`Vitória associada ao Time ${time}`)
      .setColor(helper.okColor)
    getGeralTextChannel().send(queueCreated)
    setRanking()
  }
  )
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
      damage: partcipantStats.totalDamageDealtToChampions,

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
  const kdaPlayer = queue.players.sort((a, b) => b.kda - a.kda)[0];
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
  await updateQueue(time)
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

module.exports = { setJoin, setQueue, queueExists, queueEmAndamentoExists, ClearQueue, handleCronCheck }
