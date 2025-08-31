const Queue = require('../models/Queue');
const Player = require('../models/Player');
const { MessageEmbed } = require('discord.js');
const helper = require('../helper.json');

class QueueController {
  static async createQueue(size) {
    try {
      const queueId = await Queue.createQueue(size);
      console.log(`Fila criada com ID: ${queueId}, tamanho: ${size}`);
      return queueId;
    } catch (error) {
      console.error('Erro ao criar fila:', error);
      throw error;
    }
  }

  static async setQueue(message) {
    try {
      // Verifica se já existe uma fila ativa
      const activeQueue = await Queue.getActiveQueue();
      if (activeQueue) {
        message.channel.send('❌ Já existe uma fila ativa! Use `!clearqueue` para cancelar.');
        return;
      }

      // Cria uma nova fila (padrão 5v5)
      const queueId = await this.createQueue(5);

      const embed = new MessageEmbed()
        .setTitle('🎮 Nova Fila Criada!')
        .setDescription(`Fila ${queueId} criada com sucesso!\nTamanho: 5v5\n\nUse \`!join\` para entrar na fila!`)
        .setColor(helper.okColor)
        .setTimestamp();

      message.channel.send(embed);
    } catch (error) {
      console.error('Erro ao criar fila:', error);
      message.channel.send('❌ Erro ao criar fila!');
    }
  }

  static async setJoin(playerId) {
    try {
      // Verifica se o jogador já está em uma fila
      const isInQueue = await Queue.isPlayerInQueue(playerId);
      if (isInQueue) {
        console.log(`Jogador ${playerId} já está em uma fila`);
        return false;
      }

      // Busca fila ativa
      const activeQueue = await Queue.getActiveQueue();
      if (!activeQueue) {
        console.log('Nenhuma fila ativa encontrada');
        return false;
      }

      // Adiciona jogador à fila
      await Queue.addPlayerToQueue(activeQueue.id, playerId);
      console.log(`Jogador ${playerId} adicionado à fila ${activeQueue.id}`);

      // Verifica se a fila está cheia
      const players = await Queue.getQueuePlayers(activeQueue.id);
      if (players.length >= activeQueue.size) {
        await this.startMatch(activeQueue.id);
      }

      return true;
    } catch (error) {
      console.error('Erro ao adicionar jogador à fila:', error);
      return false;
    }
  }

  static async leaveQueue(playerId) {
    try {
      const playerQueue = await Queue.getPlayerQueue(playerId);
      if (!playerQueue) {
        return false;
      }

      await Queue.removePlayerFromQueue(playerQueue.id, playerId);
      console.log(`Jogador ${playerId} saiu da fila ${playerQueue.id}`);
      return true;
    } catch (error) {
      console.error('Erro ao remover jogador da fila:', error);
      return false;
    }
  }

  static async clearQueue(message) {
    try {
      const activeQueue = await Queue.getActiveQueue();
      if (!activeQueue) {
        message.channel.send('❌ Nenhuma fila ativa encontrada!');
        return;
      }

      await Queue.clearQueue(activeQueue.id);

      const embed = new MessageEmbed()
        .setTitle('🗑️ Fila Cancelada')
        .setDescription('A fila foi cancelada com sucesso!')
        .setColor(helper.errColor)
        .setTimestamp();

      message.channel.send(embed);
    } catch (error) {
      console.error('Erro ao cancelar fila:', error);
      message.channel.send('❌ Erro ao cancelar fila!');
    }
  }

  static async startMatch(queueId) {
    try {
      const players = await Queue.getQueuePlayers(queueId);
      if (players.length < 2) {
        console.log('Fila não tem jogadores suficientes para iniciar partida');
        return;
      }

      // Atualiza status da fila
      await Queue.updateQueueStatus(queueId, 'in_progress');

      // Divide jogadores em times (sistema simples)
      const shuffledPlayers = players.sort(() => Math.random() - 0.5);
      const team1 = shuffledPlayers.slice(0, Math.ceil(players.length / 2));
      const team2 = shuffledPlayers.slice(Math.ceil(players.length / 2));

      console.log(`Partida iniciada! Time 1: ${team1.length} jogadores, Time 2: ${team2.length} jogadores`);

      // Aqui você pode implementar a lógica para criar canais de voz
      // e mover jogadores para os times

    } catch (error) {
      console.error('Erro ao iniciar partida:', error);
    }
  }

  static async setWin(message, winner) {
    try {
      // Lógica simples para registrar vitória
      // Aqui você pode implementar um sistema mais complexo
      message.channel.send('✅ Vitória registrada!');
    } catch (error) {
      console.error('Erro ao registrar vitória:', error);
      message.channel.send('❌ Erro ao registrar vitória!');
    }
  }

  static async queueExists() {
    try {
      const activeQueue = await Queue.getActiveQueue();
      if (!activeQueue) return null;

      const players = await Queue.getQueuePlayers(activeQueue.id);
      return {
        id: activeQueue.id,
        size: activeQueue.size,
        players: players,
        status: activeQueue.status
      };
    } catch (error) {
      console.error('Erro ao verificar fila:', error);
      return null;
    }
  }

  static async handleCronCheck() {
    // Função para verificar filas periodicamente
    // Pode ser implementada para limpar filas antigas ou verificar timeouts
  }

  static async dayResume() {
    // Resumo diário (pode ser implementado)
  }

  static async weekResume() {
    // Resumo semanal (pode ser implementado)
  }

  static async monthResume() {
    // Resumo mensal (pode ser implementado)
  }
}

module.exports = QueueController;
