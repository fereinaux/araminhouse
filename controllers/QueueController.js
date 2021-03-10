const queueModel = require('../models/Queue')
const helper = require('../helper.json')
const { getQueueChannel, getMenctionById, getTeamOneChannel, getTeamTwoChannel, sendAllGeral, getEmojiByName } = require('../utils/bot')
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
  message.channel.send(queueCreated)
}

async function setQueue(message) {
  const queueCreationExists = await queueExists();
  if (!queueCreationExists) {
    const arrMsg = message.content.split(' ');
    if (arrMsg.length > 1) {
      let size = parseInt(arrMsg[1])
      if (size && size < 6) {
        createQueue(message, size)
      } else {
        const msg = new MessageEmbed()
          .setTitle(`Tamanho da Queue não suportado`)
          .setColor(helper.errColor)
        message.channel.send(msg)
      }
    } else {
      const queueEmbed = new MessageEmbed()
        .setTitle(`Criação de Queues`)
        .setDescription("Escolha um tamanho para a Queue")
        .setColor(helper.infoColor)

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
            createQueue(message, size)
          })
        })
      })
    }
  } else {
    const queueExists = new MessageEmbed()
      .setTitle(`Já existe uma Queue em andamento!`)
      .setColor(helper.errColor)
    message.channel.send(queueExists)
  }
}

async function msgQueueNotExists(message) {
  const queueDoesntExists = new MessageEmbed()
    .setTitle(`Não existe uma Queue em andamento!`)
    .setColor(helper.errColor)
  message.channel.send(queueDoesntExists)
}

async function setJoin(message) {
  const queueJoinExists = await queueExists();
  if (!queueJoinExists) {
    msgQueueNotExists(message)
  } else {
    if (queueJoinExists.players.length < (queueJoinExists.size * 2)) {
      let players = queueJoinExists.players;
      if (players.find(el => el.id == message.author.id)) {
        const playerDuplicated = new MessageEmbed()
          .setDescription(`${getMenctionById(message.author.id)} já está na Queue`)
          .setColor(helper.errColor)
        message.channel.send(playerDuplicated)
      } else {
        const player = await playerModel.findOne({ id: message.author.id })
        players.push({ name: message.author.username, id: message.author.id, summoner: player.summoner })
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

              message.channel.send(teamEmbed)
            });
          }))

        } else {
          const queueChannel = await getQueueChannel()
          if (helper.splitTeams)
            message.member.voice.setChannel(queueChannel)
          const playerQueue = new MessageEmbed()
            .setDescription(`**${getMenctionById(message.author.id)} entrou na Queue**
            **${queueJoinExists.players.length}/${queueJoinExists.size * 2}**`)
            .setColor(helper.okColor)
          message.channel.send(playerQueue)
        }
      }
    } else {
      const queueSize = new MessageEmbed()
        .setTitle(`Queue fechada`)
        .setColor(helper.errColor)
      message.channel.send(queueSize)
    }
  }
}

async function ClearQueue(message) {
  const queue = await queueExists();
  if (queue) {
    await queueModel.updateOne({ $or: [{ status: 'aberta' }, { status: 'Em andamento' }] }, { status: 'Canelada' });
    const msg = new MessageEmbed()
      .setTitle(`Queue cancelada!`)
      .setColor(helper.errColor)

    message.channel.send(msg)
  }
}

function setPoints(winningTeam, queue) {
  const players1 = queue.teamOne;
  const players2 = queue.teamTwo;
  const arrPromises = []

  if (winningTeam == 1) {
    players2.map(async p => {
      arrPromises.push(playerModel.updateOne({ id: p.id }, { $inc: { elo: -4 } }))
    })
    players1.map(async p => {
      arrPromises.push(playerModel.updateOne({ id: p.id }, { $inc: { elo: 7 } }))
    })
  } else {
    players2.map(async p => {
      arrPromises.push(playerModel.updateOne({ id: p.id }, { $inc: { elo: 7 } }))
    })
    players1.map(async p => {
      arrPromises.push(playerModel.updateOne({ id: p.id }, { $inc: { elo: -4 } }))
    })
  }
  return arrPromises;
}

async function setWin(message) {
  const queueCreationExists = await queueEmAndamentoExists();
  if (queueCreationExists) {
    const arrMsg = message.content.split(' ');
    if (arrMsg.length > 1) {
      let time = parseInt(arrMsg[1])
      if (time && time < 3) {
        const arrPromises = setPoints(time, queueCreationExists)
        Promise.all(arrPromises).then(e => updateQueue(message, time))
      } else {
        const msg = new MessageEmbed()
          .setTitle(`Escolha entre os times 1 e 2`)
          .setColor(helper.errColor)
        message.channel.send(msg)
      }
    }
    else {
      const queueEmbed = new MessageEmbed()
        .setTitle(`Definição de Vitória`)
        .setDescription("Qual time ganhou?")
        .setColor(helper.infoColor)

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

            time = 1
            let arrPromises = []
            switch (reasonReaction.emoji.name) {
              case '1⃣':
                time = 1
                arrPromises = setPoints(1, queueCreationExists)
                break;
              case '2⃣':
                time = 2
                arrPromises = setPoints(2, queueCreationExists)

                break;
              default:
                break;
            }

            Promise.all(arrPromises).then(e => updateQueue(message, time))
          })
        })
      })
    }

  } else {
    const queueExists = new MessageEmbed()
      .setTitle(`Não existe uma Queue em andamento!`)
      .setColor(helper.errColor)
    message.channel.send(queueExists)
  }
}

async function updateQueue(message, time) {
  queueModel.updateOne({ status: 'Em andamento' }, { status: 'Concluída', winningTeam: time }).then(result => {
    sendAllGeral()
    const queueCreated = new MessageEmbed()
      .setTitle(`Vitória associada ao Time ${time}`)
      .setColor(helper.okColor)
    message.channel.send(queueCreated)
    setRanking(message)
  }
  )
}


async function check(message) {
  const queue = await queueModel.findOne({ status: 'Em andamento' })

  if (queue) {

    if (queue.matchId) {

      const player = queue.players.find(e => e.summoner && e.summoner.accountId)
      const response = await utilsRiot.getMatchById(queue.matchId)
      // const response = await utilsRiot.getMatchById('2208131182')
      if (response) {
        response.participants.sort(function (a, b) {
          return b.stats.totalDamageDealtToChampions - a.stats.totalDamageDealtToChampions;
        })

        const mostDamage = { player: queue.players[response.participants[0].participantId - 1], damage: response.participants[0].stats.totalDamageDealtToChampions }

        response.participants.sort(function (a, b) {
          return ((b.stats.kills + b.stats.assists) / b.stats.deaths > 0 ? b.stats.deaths : 1) - ((a.stats.kills + a.stats.assists) / a.stats.deaths > 0 ? a.stats.deaths : 1);
        })
        const kdaParticipant = response.participants[0]
        const kdaPlayer = { player: queue.players[response.participants[0].participantId - 1], kda: ((kdaParticipant.stats.kills + kdaParticipant.stats.assists) / kdaParticipant.stats.deaths > 0 ? kdaParticipant.stats.deaths : 1) }

        const msg = new MessageEmbed()
          .setDescription(`**Partida Finalizada** 

        **Time ${response.teams[0].win == 'Win' ? 1 : 2} Venceu**
        Top Damage: ${getMenctionById(mostDamage.player.id)} - ${Math.floor(mostDamage.damage / 1000)}K
        KDA Player: ${getMenctionById(kdaPlayer.player.id)} - ${kdaPlayer.kda} `)
          .setColor(helper.okColor)
        message.channel.send(msg)
        const time = response.teams[0].win == 'Win' ? 1 : 2    
        const arrPromises = setPoints(time, queue)
        Promise.all(arrPromises).then(e => updateQueue(message, time))
      } else {
        const msg = new MessageEmbed()
          .setTitle(`A partida ainda está em andamento`)
          .setColor(helper.errColor)
        message.channel.send(msg)
      }
    } else {
      const player = queue.players.find(e => e.summoner && e.summoner.accountId)
      const response = await utilsRiot.searchActiveMatch(player.summoner.id)
      if (response) {
        const newArrPlayers = []
        response.participants.map(e => {
          newArrPlayers.push(queue.players.find(p => p.summoner.id == e.summonerId))
        })
        await queueModel.updateOne({ status: 'Em andamento' }, { matchId: response.gameId, players: newArrPlayers })
        const msg = new MessageEmbed()
          .setDescription(`**Partida encontrada** 
          Ao finaliza-la executar o comando !check novamente`)
          .setColor(helper.okColor)
        message.channel.send(msg)
      } else {
        const msg = new MessageEmbed()
          .setTitle(`partida não encontrada`)
          .setColor(helper.errColor)
        message.channel.send(msg)
      }

    }





  } else {
    msgQueueNotExists(message)
  }
}

module.exports = { setWin, setJoin, setQueue, queueExists, queueEmAndamentoExists, ClearQueue, check }