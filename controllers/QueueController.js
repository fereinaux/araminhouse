const queueModel = require('../models/Queue')
const helper = require('../helper.json')
const { MessageEmbed } = require('discord.js')

async function queueExists() {
  const existsQueue = await queueModel.findOne({ $or: [{ status: 'aberta' }, { status: 'Em andamento' }] })
  return existsQueue;
}
async function queueEmAndamentoExists() {
  const existsQueue = await queueModel.findOne({ status: 'Em andamento' })
  return existsQueue;
}

async function setQueue(message) {
  const queueCreationExists = await queueExists();
  if (!queueCreationExists) {
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

          queueModel.create({ status: 'aberta', size: size })

          const queueCreated = new MessageEmbed()
            .setTitle(`Queue criada`)
            .setDescription(`**0/${size * 2}**`)
            .setColor(helper.okColor)
          message.channel.send(queueCreated)
        })
      })
    })

  } else {
    const queueExists = new MessageEmbed()
      .setTitle(`Já existe uma Queue em andamento!`)
      .setColor(helper.errColor)
    message.channel.send(queueExists)
  }
}


async function setJoin(message) {
  const queueJoinExists = await queueExists();
  if (!queueJoinExists) {
    const queueDoesntExists = new MessageEmbed()
      .setTitle(`Não existe uma Queue em andamento!`)
      .setColor(helper.errColor)
    message.channel.send(queueDoesntExists)
  } else {
    if (queueJoinExists.players.length < (queueJoinExists.size * 2)) {
      let players = queueJoinExists.players;
      if (players.find(el => el.id == message.author.id)) {
        const playerDuplicated = new MessageEmbed()
          .setDescription(`${getMenctionById(message.author.id)} já está na Queue`)
          .setColor(helper.errColor)
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

          const teamEmbed = new MessageEmbed()
            .setTitle(`Queue fechada`)
            .setDescription(teamsDescription)
            .setColor(helper.okColor)

          message.channel.send(teamEmbed)
        } else {
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
    await queueModel.updateOne({ status: 'aberta' }, { status: 'Canelada' });
    const msg = new MessageEmbed()
      .setTitle(`Queue cancelada!`)
      .setColor(helper.errColor)

    message.channel.send(msg)
  }
}

async function setWin(message) {
  const queueCreationExists = await queueEmAndamentoExists();
  if (queueCreationExists) {
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
          const players1 = queueCreationExists.teamOne;
          const players2 = queueCreationExists.teamTwo;
          time = 1
          switch (reasonReaction.emoji.name) {
            case '1⃣':
              time = 1
              players2.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo - 5 })
              })
              players1.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo + 10 })
              })
              break;
            case '2⃣':
              time = 2
              players2.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo + 10 })
              })
              players1.map(async p => {
                const player = await getPlayerById(p.id);
                await playerModel.updateOne({ id: p.id }, { elo: player.elo - 5 })
              })
              break;
            default:
              break;
          }
          queueModel.updateOne({ status: 'Em andamento' }, { status: 'Concluída', winningTeam: time }).then();

          const queueCreated = new MessageEmbed()
            .setTitle(`Vitória associada ao Time ${time}`)
            .setColor(helper.okColor)
          message.channel.send(queueCreated)
          setRanking(message)
        })
      })
    })

  } else {
    const queueExists = new MessageEmbed()
      .setTitle(`Não existe uma Queue em andamento!`)
      .setColor(helper.errColor)
    message.channel.send(queueExists)
  }
}


module.exports = { setWin, setJoin, setQueue, queueExists, queueEmAndamentoExists, ClearQueue }