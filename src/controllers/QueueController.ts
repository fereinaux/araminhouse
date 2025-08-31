import { Queue as QueueModel } from "../models/Queue";
import { Player } from "../models/Player";
import { Match } from "../models/Match";
import { TeamBalancerService } from "../services/TeamBalancerService";
import { MMRService } from "../services/MMRService";

export class QueueController {
  /**
   * Cria uma nova fila
   */
  async createQueue(size: number): Promise<number> {
    return await QueueModel.createQueue(size);
  }

  /**
   * Adiciona um jogador à fila
   */
  async addPlayerToQueue(queueId: number, playerId: string): Promise<void> {
    await QueueModel.addPlayerToQueue(queueId, playerId);
  }

  /**
   * Remove um jogador da fila
   */
  async removePlayerFromQueue(
    queueId: number,
    playerId: string
  ): Promise<void> {
    await QueueModel.removePlayerFromQueue(queueId, playerId);
  }

  /**
   * Obtém o status de uma fila
   */
  async getQueueStatus(queueId: number): Promise<any> {
    const queue = await QueueModel.getQueueById(queueId);
    if (!queue) return null;

    const stats = await QueueModel.getQueueStats(queueId);
    if (!stats) return null;

    return {
      queue,
      stats,
      isReady: await QueueModel.isQueueReady(queueId),
    };
  }

  /**
   * Forma times a partir de uma fila
   */
  async formTeams(queueId: number): Promise<any> {
    const teams = await QueueModel.formTeams(queueId);
    if (!teams) return null;

    // Atualiza status da fila
    await QueueModel.updateQueueStatus(queueId, "forming");

    return teams;
  }

  /**
   * Processa uma fila completa
   */
  async processCompleteQueue(queueId: number): Promise<any> {
    try {
      // Forma times
      const teams = await this.formTeams(queueId);
      if (!teams) {
        throw new Error("Não foi possível formar times");
      }

      // Cria partida
      const matchId = await Match.createMatch(
        queueId,
        teams.team1,
        teams.team2
      );

      // Atualiza status da fila
      await QueueModel.updateQueueStatus(queueId, "ready");

      return {
        matchId,
        teams,
        balanceStats: teams.balanceStats,
      };
    } catch (error) {
      console.error("Erro ao processar fila completa:", error);

      // Em caso de erro, cancela a fila
      await QueueModel.updateQueueStatus(queueId, "cancelled");

      throw error;
    }
  }

  /**
   * Obtém estatísticas de todas as filas
   */
  async getAllQueueStats(): Promise<any[]> {
    const activeQueues = await QueueModel.getQueuesByStatus("waiting");
    const formingQueues = await QueueModel.getQueuesByStatus("forming");
    const readyQueues = await QueueModel.getQueuesByStatus("ready");

    const allQueues = [...activeQueues, ...formingQueues, ...readyQueues];
    const stats = [];

    for (const queue of allQueues) {
      const queueStats = await QueueModel.getQueueStats(queue.id);
      if (queueStats) {
        stats.push({
          queueId: queue.id,
          status: queue.status,
          size: queue.size,
          players: queue.players.length,
          stats: queueStats,
          createdAt: queue.createdAt,
        });
      }
    }

    return stats;
  }

  /**
   * Limpa filas antigas
   */
  async cleanupOldQueues(maxAgeHours: number = 24): Promise<number> {
    const oldQueues = await QueueModel.getQueueHistory(100);
    let cleanedCount = 0;

    for (const queue of oldQueues) {
      const ageHours =
        (Date.now() - queue.createdAt.getTime()) / (1000 * 60 * 60);

      if (ageHours > maxAgeHours && queue.status === "waiting") {
        await QueueModel.clearQueue(queue.id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Obtém jogadores que estão há muito tempo na fila
   */
  async getLongWaitingPlayers(
    queueId: number,
    maxWaitMinutes: number = 15
  ): Promise<any[]> {
    return await QueueModel.getLongWaitingPlayers(queueId, maxWaitMinutes);
  }

  /**
   * Remove jogadores inativos
   */
  async removeInactivePlayers(
    queueId: number,
    maxInactiveMinutes: number = 10
  ): Promise<number> {
    return await QueueModel.removeInactivePlayers(queueId, maxInactiveMinutes);
  }

  /**
   * Obtém recomendações de balanceamento para uma fila
   */
  async getBalanceRecommendations(queueId: number): Promise<any> {
    const queue = await QueueModel.getQueueById(queueId);
    if (!queue) return null;

    if (queue.players.length < queue.size) {
      return {
        type: "waiting",
        message: `Aguardando mais ${
          queue.size - queue.players.length
        } jogadores`,
        estimatedWaitTime: (queue.size - queue.players.length) * 2,
      };
    }

    // Simula formação de times para análise
    const teams = TeamBalancerService.balanceTeams(
      queue.players,
      queue.size / 2
    );

    if (!teams || teams.length !== 2 || !teams[0] || !teams[1]) {
      throw new Error("Falha ao formar times balanceados");
    }

    const balanceStats = TeamBalancerService.getBalanceStats(
      teams[0],
      teams[1]
    );

    return {
      type: "ready",
      message: "Fila pronta para formar times",
      balanceStats,
      teams: {
        team1: {
          players: teams[0]!.players.map((p) => ({
            id: p.id,
            username: p.username,
            mmr: p.mmr,
          })),
          averageMmr: teams[0]!.averageMmr,
        },
        team2: {
          players: teams[1]!.players.map((p) => ({
            id: p.id,
            username: p.username,
            mmr: p.mmr,
          })),
          averageMmr: teams[1]!.averageMmr,
        },
      },
    };
  }

  /**
   * Obtém histórico de filas de um jogador
   */
  async getPlayerQueueHistory(
    playerId: string,
    limit: number = 20
  ): Promise<any[]> {
    const allQueues = await QueueModel.getQueueHistory(100);
    const playerQueues = [];

    for (const queue of allQueues) {
      const isPlayerInQueue = queue.players.some((p) => p.id === playerId);
      if (isPlayerInQueue) {
        playerQueues.push({
          queueId: queue.id,
          status: queue.status,
          size: queue.size,
          players: queue.players.length,
          createdAt: queue.createdAt,
          endedAt: queue.endedAt,
        });
      }

      if (playerQueues.length >= limit) break;
    }

    return playerQueues;
  }

  /**
   * Obtém estatísticas de performance da fila
   */
  async getQueuePerformanceStats(queueId: number): Promise<any> {
    const queue = await QueueModel.getQueueById(queueId);
    if (!queue) return null;

    const stats = await QueueModel.getQueueStats(queueId);
    if (!stats) return null;

    // Calcula métricas de performance
    const mmrVariance = this.calculateMMRVariance(queue.players);
    const roleBalance = this.calculateRoleBalance(queue.players);
    const waitTimeEfficiency = this.calculateWaitTimeEfficiency(queue);

    return {
      queueId,
      basicStats: stats,
      performanceMetrics: {
        mmrVariance,
        roleBalance,
        waitTimeEfficiency,
        overallScore: (mmrVariance + roleBalance + waitTimeEfficiency) / 3,
      },
    };
  }

  /**
   * Calcula variância do MMR na fila
   */
  private calculateMMRVariance(players: any[]): number {
    if (players.length < 2) return 1;

    const mmrs = players.map((p) => p.mmr);
    const mean = mmrs.reduce((sum, mmr) => sum + mmr, 0) / mmrs.length;
    const variance =
      mmrs.reduce((sum, mmr) => sum + Math.pow(mmr - mean, 2), 0) / mmrs.length;

    // Normaliza para 0-1 (menor variância = melhor)
    const maxVariance = Math.pow(200, 2); // MMR máximo esperado
    return Math.max(0, 1 - variance / maxVariance);
  }

  /**
   * Calcula balanceamento de roles
   */
  private calculateRoleBalance(players: any[]): number {
    const roleCounts: Record<string, number> = {};

    players.forEach((player) => {
      player.preferredRoles.forEach((role: string) => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
    });

    if (Object.keys(roleCounts).length === 0) return 0.5;

    const counts = Object.values(roleCounts);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);

    // Score baseado na distribuição (mais equilibrado = melhor)
    return Math.max(0, 1 - (maxCount - minCount) / players.length);
  }

  /**
   * Calcula eficiência do tempo de espera
   */
  private calculateWaitTimeEfficiency(queue: any): number {
    const now = new Date();
    const ageMinutes =
      (now.getTime() - queue.createdAt.getTime()) / (1000 * 60);

    // Score baseado no tempo de espera (mais rápido = melhor)
    const optimalWaitTime = 5; // 5 minutos é o tempo ideal
    const maxWaitTime = 30; // 30 minutos é o tempo máximo aceitável

    if (ageMinutes <= optimalWaitTime) return 1;
    if (ageMinutes >= maxWaitTime) return 0;

    return 1 - (ageMinutes - optimalWaitTime) / (maxWaitTime - optimalWaitTime);
  }
}
