const Player = require('../models/Player');
const Queue = require('../models/Queue');
const { MessageEmbed } = require('discord.js');
const helper = require('../helper.json');

class PlayerController {
  static async handleRegister(member) {
    try {
      const player = await Player.createPlayer(member.id, member.user.username);
      console.log(`Jogador registrado: ${player.username}`);
    } catch (error) {
      console.error('Erro ao registrar jogador:', error);
    }
  }

  static async setRanking() {
    try {
      const players = await Player.getTopPlayers(10);
      const embed = new MessageEmbed()
        .setTitle('🏆 Ranking dos Jogadores')
        .setColor(helper.infoColor)
        .setTimestamp();

      players.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        embed.addField(
          `${medal} ${player.username}`,
          `Elo: ${player.elo} | Vitórias: ${player.wins} | Derrotas: ${player.losses} | Win Rate: ${player.winRate || '0%'}`
        );
      });

      return embed;
    } catch (error) {
      console.error('Erro ao gerar ranking:', error);
      return null;
    }
  }

  static async info(message, targetId = null) {
    try {
      const playerId = targetId || message.author.id;
      const player = await Player.getPlayerById(playerId);
      
      if (!player) {
        message.channel.send('❌ Jogador não encontrado!');
        return;
      }

      const embed = new MessageEmbed()
        .setTitle(`📊 Informações de ${player.username}`)
        .setColor(helper.infoColor)
        .addField('Elo', player.elo.toString(), true)
        .addField('Vitórias', player.wins.toString(), true)
        .addField('Derrotas', player.losses.toString(), true)
        .addField('Jogos', player.games_played.toString(), true)
        .addField('Win Rate', player.winRate || '0%', true)
        .setTimestamp();

      message.channel.send(embed);
    } catch (error) {
      console.error('Erro ao buscar informações:', error);
      message.channel.send('❌ Erro ao buscar informações do jogador!');
    }
  }

  static async versus(message, player1Id, player2Id) {
    try {
      const player1 = await Player.getPlayerById(player1Id);
      const player2 = await Player.getPlayerById(player2Id);

      if (!player1 || !player2) {
        message.channel.send('❌ Um ou ambos os jogadores não foram encontrados!');
        return;
      }

      const embed = new MessageEmbed()
        .setTitle('⚔️ Comparação de Jogadores')
        .setColor(helper.infoColor)
        .addField(
          `${player1.username}`,
          `Elo: ${player1.elo} | Vitórias: ${player1.wins} | Win Rate: ${player1.winRate || '0%'}`,
          true
        )
        .addField(
          `${player2.username}`,
          `Elo: ${player2.elo} | Vitórias: ${player2.wins} | Win Rate: ${player2.winRate || '0%'}`,
          true
        )
        .setTimestamp();

      message.channel.send(embed);
    } catch (error) {
      console.error('Erro na comparação:', error);
      message.channel.send('❌ Erro ao comparar jogadores!');
    }
  }

  static async reset(message) {
    try {
      const player = await Player.getPlayerById(message.author.id);
      if (!player) {
        message.channel.send('❌ Você não está registrado!');
        return;
      }

      await Player.resetPlayer(message.author.id);
      message.channel.send('✅ Seu perfil foi resetado com sucesso!');
    } catch (error) {
      console.error('Erro ao resetar jogador:', error);
      message.channel.send('❌ Erro ao resetar perfil!');
    }
  }

  static async punish(message) {
    try {
      // Lógica simples para punir jogador (pode ser implementada depois)
      message.channel.send('⚠️ Sistema de punições em desenvolvimento!');
    } catch (error) {
      console.error('Erro ao punir jogador:', error);
      message.channel.send('❌ Erro ao aplicar punição!');
    }
  }

  static async handleCommands(discordId) {
    const commands = helper.comandos.join('\n');
    return `📋 **Comandos disponíveis:**\n${commands}`;
  }

  static async playersRankedPortal() {
    try {
      return await Player.getAllPlayers();
    } catch (error) {
      console.error('Erro ao buscar jogadores:', error);
      return [];
    }
  }

  static async getObjPlayer(id) {
    try {
      return await Player.getPlayerById(id);
    } catch (error) {
      console.error('Erro ao buscar jogador:', error);
      return null;
    }
  }

  static async getPlayerByDiscordToken(discordId) {
    try {
      return await Player.getPlayerByDiscordId(discordId);
    } catch (error) {
      console.error('Erro ao buscar jogador por Discord ID:', error);
      return null;
    }
  }
}

module.exports = PlayerController;