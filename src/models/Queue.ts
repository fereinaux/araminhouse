import { Queue as QueueType, Player, Team, QueueStatus } from "../types";
import { DatabaseService } from "../services/DatabaseService";
import { TeamBalancerService } from "../services/TeamBalancerService";
import { MMRService } from "../services/MMRService";

export class Queue {
  private static db = DatabaseService.getInstance();

  /**
   * Cria uma nova fila (desativa outras filas primeiro)
   */
  static async createQueue(size: number): Promise<number> {
    // Desativa todas as filas existentes
    await this.db.run(
      `UPDATE queues SET status = 'cancelled' WHERE status IN ('waiting', 'forming')`
    );

    // Cria nova fila
    const sql = `INSERT INTO queues (size, status) VALUES (?, 'waiting')`;
    const result = await this.db.run(sql, [size]);
    return result.id;
  }

  /**
   * Adiciona um jogador à fila
   */
  static async addPlayerToQueue(
    queueId: number,
    playerId: string
  ): Promise<void> {
    const sql = `INSERT INTO queue_players (queue_id, player_id) VALUES (?, ?)`;
    await this.db.run(sql, [queueId, playerId]);
  }

  /**
   * Remove um jogador da fila
   */
  static async removePlayerFromQueue(
    queueId: number,
    playerId: string
  ): Promise<void> {
    const sql = `DELETE FROM queue_players WHERE queue_id = ? AND player_id = ?`;
    await this.db.run(sql, [queueId, playerId]);
  }

  /**
   * Obtém todos os jogadores de uma fila
   */
  static async getQueuePlayers(queueId: number): Promise<Player[]> {
    const sql = `
      SELECT p.* FROM players p 
      INNER JOIN queue_players qp ON p.id = qp.player_id 
      WHERE qp.queue_id = ?
    `;

    const players = await this.db.all(sql, [queueId]);

    return players.map((player) => ({
      ...player,
      createdAt: new Date(player.created_at),
      lastGameAt: player.last_game_at
        ? new Date(player.last_game_at)
        : undefined,
      preferredRoles: player.preferred_roles
        ? JSON.parse(player.preferred_roles)
        : [],
      averageKDA: player.average_kda || undefined,
    }));
  }

  /**
   * Obtém a fila ativa
   */
  static async getActiveQueue(): Promise<QueueType | null> {
    const sql = `SELECT * FROM queues WHERE status = 'waiting' ORDER BY created_at DESC LIMIT 1`;
    const queue = await this.db.get(sql);

    if (!queue) return null;

    const players = await this.getQueuePlayers(queue.id);

    return {
      id: queue.id,
      size: queue.size,
      status: queue.status as QueueStatus,
      createdAt: new Date(queue.created_at),
      startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
      endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
      players,
    } as QueueType;
  }

  /**
   * Obtém a partida ativa (status 'forming')
   */
  static async getActiveMatch(): Promise<QueueType | null> {
    const sql = `SELECT * FROM queues WHERE status = 'forming' ORDER BY created_at DESC LIMIT 1`;
    const queue = await this.db.get(sql);

    if (!queue) return null;

    const players = await this.getQueuePlayers(queue.id);

    return {
      id: queue.id,
      size: queue.size,
      status: queue.status as QueueStatus,
      createdAt: new Date(queue.created_at),
      startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
      endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
      players,
    } as QueueType;
  }

  /**
   * Obtém uma fila por ID
   */
  static async getQueueById(queueId: number): Promise<QueueType | null> {
    const sql = `SELECT * FROM queues WHERE id = ?`;
    const queue = await this.db.get(sql, [queueId]);

    if (!queue) return null;

    const players = await this.getQueuePlayers(queue.id);

    return {
      id: queue.id,
      size: queue.size,
      status: queue.status as QueueStatus,
      createdAt: new Date(queue.created_at),
      startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
      endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
      players,
    } as QueueType;
  }

  /**
   * Atualiza o status de uma fila
   */
  static async updateQueueStatus(
    queueId: number,
    status: QueueStatus
  ): Promise<void> {
    const sql = `UPDATE queues SET status = ? WHERE id = ?`;
    await this.db.run(sql, [status, queueId]);

    // Atualiza timestamps baseado no status
    if (status === "forming" || status === "ready") {
      await this.db.run(
        `UPDATE queues SET started_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [queueId]
      );
    } else if (status === "completed" || status === "cancelled") {
      await this.db.run(
        `UPDATE queues SET ended_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [queueId]
      );
    }
  }

  /**
   * Limpa uma fila
   */
  static async clearQueue(queueId: number): Promise<void> {
    // Remove todos os jogadores da fila
    const sql = `DELETE FROM queue_players WHERE queue_id = ?`;
    await this.db.run(sql, [queueId]);

    // Atualiza status da fila
    await this.updateQueueStatus(queueId, "cancelled");
  }

  /**
   * Verifica se um jogador está em alguma fila
   */
  static async isPlayerInQueue(playerId: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM queue_players qp 
      INNER JOIN queues q ON qp.queue_id = q.id 
      WHERE qp.player_id = ? AND q.status = 'waiting'
    `;
    const result = await this.db.get(sql, [playerId]);
    return result.count > 0;
  }

  /**
   * Obtém a fila em que um jogador está
   */
  static async getPlayerQueue(playerId: string): Promise<QueueType | null> {
    const sql = `
      SELECT q.* FROM queues q 
      INNER JOIN queue_players qp ON q.id = qp.queue_id 
      WHERE qp.player_id = ? AND q.status = 'waiting'
    `;
    const queue = await this.db.get(sql, [playerId]);

    if (!queue) return null;

    const players = await this.getQueuePlayers(queue.id);

    return {
      id: queue.id,
      size: queue.size,
      status: queue.status as QueueStatus,
      createdAt: new Date(queue.created_at),
      startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
      endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
      players,
    } as QueueType;
  }

  /**
   * Verifica se uma fila está pronta para formar times
   * NOTA: Agora só retorna true com exatamente 10 jogadores
   * Para outros números, use comandos admin para iniciar partida
   */
  static async isQueueReady(queueId: number): Promise<boolean> {
    const queue = await this.getQueueById(queueId);
    if (!queue) return false;

    // A fila só está pronta com exatamente 10 jogadores (5v5)
    // Para outros números, use comandos admin para iniciar partida
    return queue.players.length === 10;
  }

  /**
   * Forma times balanceados a partir de uma fila
   */
  static async formTeams(
    queueId: number
  ): Promise<{ team1: Team; team2: Team; balanceStats: any } | null> {
    const queue = await this.getQueueById(queueId);
    if (!queue || !this.isQueueReady(queueId)) return null;

    // Calcula o tamanho do time baseado no número de jogadores disponíveis
    const actualTeamSize = Math.floor(queue.players.length / 2);

    // Forma times balanceados
    const teams = TeamBalancerService.balanceTeams(
      queue.players,
      actualTeamSize
    );

    if (!teams || teams.length !== 2 || !teams[0] || !teams[1]) {
      throw new Error("Falha ao formar times balanceados");
    }

    const balanceStats = TeamBalancerService.getBalanceStats(
      teams[0],
      teams[1]
    );

    // Atualiza status da fila
    await this.updateQueueStatus(queueId, "forming");

    return {
      team1: teams[0]!,
      team2: teams[1]!,
      balanceStats,
    };
  }

  /**
   * Verifica se uma fila pode formar times com qualquer número par (para comandos admin)
   */
  static async canFormTeamsFlexible(queueId: number): Promise<boolean> {
    const queue = await this.getQueueById(queueId);
    if (!queue) return false;

    // Verifica se há pelo menos 4 jogadores para formar times (2v2 mínimo)
    if (queue.players.length < 4) return false;

    // Verifica se há número par de jogadores
    if (queue.players.length % 2 !== 0) return false;

    // Para comandos admin, aceita qualquer número par >= 4
    return true;
  }

  /**
   * Obtém estatísticas de uma fila
   */
  static async getQueueStats(queueId: number): Promise<{
    totalPlayers: number;
    averageMmr: number;
    mmrRange: { min: number; max: number };
    roleDistribution: Record<string, number>;
    estimatedWaitTime: number;
  } | null> {
    const queue = await this.getQueueById(queueId);
    if (!queue) return null;

    const players = queue.players;
    const totalPlayers = players.length;

    if (totalPlayers === 0) {
      return {
        totalPlayers: 0,
        averageMmr: 0,
        mmrRange: { min: 0, max: 0 },
        roleDistribution: {},
        estimatedWaitTime: 0,
      };
    }

    const mmrs = players.map((p) => p.mmr);
    const averageMmr = mmrs.reduce((sum, mmr) => sum + mmr, 0) / totalPlayers;
    const mmrRange = {
      min: Math.min(...mmrs),
      max: Math.max(...mmrs),
    };

    // Calcula distribuição de roles
    const roleDistribution: Record<string, number> = {};
    players.forEach((player) => {
      player.preferredRoles.forEach((role) => {
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });
    });

    // Estima tempo de espera baseado no número de jogadores
    const estimatedWaitTime = Math.max(0, (queue.size - totalPlayers) * 2); // 2 minutos por jogador faltando

    return {
      totalPlayers,
      averageMmr,
      mmrRange,
      roleDistribution,
      estimatedWaitTime,
    };
  }

  /**
   * Obtém histórico de filas
   */
  static async getQueueHistory(limit: number = 20): Promise<QueueType[]> {
    const sql = `
      SELECT * FROM queues 
      WHERE status IN ('completed', 'cancelled')
      ORDER BY created_at DESC 
      LIMIT ?
    `;

    const queues = await this.db.all(sql, [limit]);

    const result: QueueType[] = [];

    for (const queue of queues) {
      const players = await this.getQueuePlayers(queue.id);

      result.push({
        id: queue.id,
        size: queue.size,
        status: queue.status as QueueStatus,
        createdAt: new Date(queue.created_at),
        startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
        endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
        players,
      } as QueueType);
    }

    return result;
  }

  /**
   * Obtém filas por status
   */
  static async getQueuesByStatus(status: QueueStatus): Promise<QueueType[]> {
    const sql = `SELECT * FROM queues WHERE status = ? ORDER BY created_at DESC`;
    const queues = await this.db.all(sql, [status]);

    const result: QueueType[] = [];

    for (const queue of queues) {
      const players = await this.getQueuePlayers(queue.id);

      result.push({
        id: queue.id,
        size: queue.size,
        status: queue.status as QueueStatus,
        createdAt: new Date(queue.created_at),
        startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
        endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
        players,
      } as QueueType);
    }

    return result;
  }

  /**
   * Remove jogadores inativos da fila
   */
  static async removeInactivePlayers(
    queueId: number,
    maxInactiveMinutes: number = 10
  ): Promise<number> {
    const sql = `
      DELETE FROM queue_players 
      WHERE queue_id = ? 
      AND joined_at < datetime('now', '-${maxInactiveMinutes} minutes')
    `;

    const result = await this.db.run(sql, [queueId]);
    return result.changes;
  }

  /**
   * Obtém jogadores que estão há muito tempo na fila
   */
  static async getLongWaitingPlayers(
    queueId: number,
    maxWaitMinutes: number = 15
  ): Promise<Player[]> {
    const sql = `
      SELECT p.* FROM players p 
      INNER JOIN queue_players qp ON p.id = qp.player_id 
      WHERE qp.queue_id = ? 
      AND qp.joined_at < datetime('now', '-${maxWaitMinutes} minutes')
    `;

    const players = await this.db.all(sql, [queueId]);

    return players.map((player) => ({
      ...player,
      createdAt: new Date(player.created_at),
      lastGameAt: player.last_game_at
        ? new Date(player.last_game_at)
        : undefined,
      preferredRoles: player.preferred_roles
        ? JSON.parse(player.preferred_roles)
        : [],
      averageKDA: player.average_kda || undefined,
    }));
  }
}
