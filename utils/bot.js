const Discord = require('discord.js')
const bot = new Discord.Client()
const helper = require('../helper.json')

function checkDM(message) {
  return message.channel.type == 'dm' && !message.author.bot
}

function isAdm(member) {
  return member.hasPermission("ADMINISTRATOR")
}

function getMenctionById(id) {
  return bot.guilds.cache.first().members.cache.find(e => e.id == id)
}

function getEmojiByName(name) {
  return bot.guilds.cache.first().emojis.cache.find(e => e.name == name)
}

function noPermission(message) {
  const msg = new Discord.MessageEmbed()
    .setDescription(`${getMenctionById(message.author.id)}, você não permissão para fazer isso`)
    .setColor(helper.errColor)

  message.channel.send(msg)
}

function setRegisteredRole(member) {
  const role = bot.guilds.cache.first().roles.cache.find(e => e.name == "Registrado")
  member.roles.add(role);
}

async function SetPlayerRoleByRanking(player, top1) {
  helper.roles.sort(function (a, b) {
    return a.pontos - b.pontos;
  })
  const roleHelper = top1 ?
    helper.roles.find(roleFilter => roleFilter.name == '6 - Top 1')
    : helper.roles.find(roleFilter => roleFilter.pontos > player.elo || (
      roleFilter.pontos < player.elo &&
      roleFilter.name == helper.roles[helper.roles.length - 1].name))
  const roles = await getRoles();
  const role = roles.find(e => e.name == roleHelper.name);
  const member = getMemberById(player.id);
  const oldRoles = helper.roles.filter(roleFilter => roleFilter.name !== role.name)
  oldRoles.map(or => {
    const removeRole = member.roles.cache.find(e => e.name == or.name)
    if (removeRole) {
      member.roles.remove(removeRole)
    }
  })
  member.roles.add(role);
}

async function getRoles() {
  return await bot.guilds.cache.first().roles.cache
}

async function setRoles() {
  await bot.guilds.cache.first().roles.fetch({ cache: true })
  const roles = await getRoles();
  if (!(roles.find(e => e.name == '5 - Diamante'))) {
    helper.roles.map(role => createRole(role.name, role.color))
  }
  if (!(roles.find(e => e.name == 'Registrado'))) {
    helper.specialRoles.map(role => createSpecialRole(role.name, role.permissions))
  }
}

function muteAll(message, mute) {
  if (isAdm(message.member)) {
    const members = bot.guilds.cache.first().members.cache
    for (let member of members) {
      if (!isAdm(member[1])) {
        if (member[1].voice.channel == message.member.voice.channel) {
          member[1].voice.setMute(mute)
        }
      }
    }
  } else {
    noPermission(message)
  }
}

function createSpecialRole(role, permissions) {
  bot.guilds.cache.first().roles.create({
    data: {
      name: role,
      permissions: permissions
    }
  })
}

function createRole(role, color) {
  bot.guilds.cache.first().roles.create({
    data: {
      name: role,
      color: color,
      hoist: true,
      permissions: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'CONNECT']
    }
  })

}

async function getChannels() {
  return await bot.guilds.cache.first().channels.cache
}

async function setChannels() {
  const channels = await getChannels();
  if (!(channels.find(e => e.name == 'Aram'))) {
    const aramHelper = helper.channels.find(e => e.name == 'Aram')
    let aramChannel = await createChannel(aramHelper.name, aramHelper.options)
    helper.channels.filter(e => e.name !== 'Aram')
      .map(ch => {
        ch.options.parent = aramChannel
        createChannel(ch.name, ch.options)
      })
  }
}

function getGeralTextChannel() {
  return bot.guilds.cache.first().channels.cache.find(e => e.name == 'geral')
}

async function getQueueChannel() {
  return await bot.guilds.cache.first().channels.cache.find(e => e.name == 'Queue')
}

async function getTeamOneChannel() {
  return await bot.guilds.cache.first().channels.cache.find(e => e.name == 'Time 1')
}

async function getTeamTwoChannel() {
  return await bot.guilds.cache.first().channels.cache.find(e => e.name == 'Time 2')
}

async function sendAllGeral() {
  const geralChannel = await bot.guilds.cache.first().channels.cache.find(e => e.name == 'Geral')

  bot.guilds.cache.first().members.cache.map(member => member.voice.setChannel(geralChannel))
}


async function createChannel(name, options) {
  return await bot.guilds.cache.first().channels.create(name, options)
}

function getMemberById(id) {
  return bot.guilds.cache.first().members.cache.find(e => e.id == id);
}

function setEloByPlayer(player) {
  const member = getMemberById(player.id);

  if (!member.hasPermission("ADMINISTRATOR")) {
    member.setNickname(`[${player.elo}]${member.user.username}`);
  }
}

async function getNicknameByMessage(message) {
  const member = await message.guild.member(message.author);
  return member && member.nickname ? member.nickname : message.author.username;
}

module.exports = {
  getMenctionById,
  setEloByPlayer,
  getNicknameByMessage,
  bot,
  isAdm,
  setRoles,
  setChannels,
  SetPlayerRoleByRanking,
  getQueueChannel,
  getTeamOneChannel,
  getTeamTwoChannel,
  sendAllGeral,
  getEmojiByName,
  noPermission,
  getGeralTextChannel,
  checkDM,
  setRegisteredRole,
  muteAll  
}