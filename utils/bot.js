const Discord = require('discord.js')
const bot = new Discord.Client()
const helper = require('../helper.json')

function getMenctionById(id) {
  return bot.guilds.cache.map(g => g.members.cache.find(e => e.id == id))
}

async function SetPlayerRoleByRanking(player) {
  const roleHelper = helper.roles.filter(roleFilter => roleFilter.pontos > player.elo || (
    roleFilter.pontos < player.elo &&
    roleFilter.name == helper.roles[helper.roles.length - 1].name))[0]
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
  if (!(roles.find(e => e.name == '1 - Diamante'))) {
    helper.roles.map(role => createRole(role.name, role.color))
  }
}

function createRole(role, color) {
  bot.guilds.cache.first().roles.create({
    data: {
      name: role,
      color: color,
      hoist: true
    }
  })

}

function getMemberById(id) {
  return bot.guilds.cache.first().members.cache.find(e => e.id == id);
}

function setEloById(player) {
  const member = getMemberById(player.id);

  member.setNickname(`[${player.elo}]${member.user.username}`);
}

async function getNicknameByMessage(message) {
  const member = await message.guild.member(message.author);
  return member && member.nickname ? member.nickname : message.author.username;
}

module.exports = { getMenctionById, setEloById, getNicknameByMessage, bot, setRoles, SetPlayerRoleByRanking }