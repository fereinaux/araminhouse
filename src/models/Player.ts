import { Player as PlayerType, MMRCalculation } from "../types";
import { MMRService } from "../services/MMRService";
import { DatabaseService } from "../services/DatabaseService";

export class Player {
  private static db = DatabaseService.getInstance();

  /**
   * Cria um novo jogador
   */
  static async createPlayer(
    discordId: string,
    username: string
  ): Promise<PlayerType> {
    const id = discordId;
    const initialMmr = MMRService.calculateInitialMMR();

    const sql = `
      INSERT OR IGNORE INTO players (
        id, username, discord_id, mmr, wins, losses, games_played, 
        current_streak, best_streak, created_at, last_game_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, NULL)
    `;

    await this.db.run(sql, [id, username, discordId, initialMmr]);

    const result = await this.getPlayerById(id);
    if (!result) {
      throw new Error("Falha ao criar jogador");
    }
    return result;
  }

  /**
   * Obtém um jogador por ID
   */
  static async getPlayerById(id: string): Promise<PlayerType | null> {
    const sql = `
      SELECT 
        id, username, discord_id as discordId, mmr, wins, losses, 
        games_played as gamesPlayed, created_at as createdAt, 
        last_game_at as lastGameAt, current_streak as currentStreak,
        best_streak as bestStreak, average_kda as averageKDA,
        preferred_roles as preferredRoles
      FROM players 
      WHERE id = ?
    `;

    const player = await this.db.get(sql, [id]);

    if (!player) return null;

    return {
      ...player,
      createdAt: new Date(player.createdAt),
      lastGameAt: player.lastGameAt ? new Date(player.lastGameAt) : undefined,
      preferredRoles: player.preferredRoles
        ? JSON.parse(player.preferredRoles)
        : [],
      averageKDA: player.averageKDA || undefined,
    };
  }

  /**
   * Obtém um jogador por Discord ID
   */
  static async getPlayerByDiscordId(
    discordId: string
  ): Promise<PlayerType | null> {
    const sql = `
      SELECT 
        id, username, discord_id as discordId, mmr, wins, losses, 
        games_played as gamesPlayed, created_at as createdAt, 
        last_game_at as lastGameAt, current_streak as currentStreak,
        best_streak as bestStreak, average_kda as averageKDA,
        preferred_roles as preferredRoles
      FROM players 
      WHERE discord_id = ?
    `;

    const player = await this.db.get(sql, [discordId]);

    if (!player) return null;

    return {
      ...player,
      createdAt: new Date(player.createdAt),
      lastGameAt: player.lastGameAt ? new Date(player.lastGameAt) : undefined,
      preferredRoles: player.preferredRoles
        ? JSON.parse(player.preferredRoles)
        : [],
      averageKDA: player.averageKDA || undefined,
    };
  }

  /**
   * Atualiza dados de um jogador
   */
  static async updatePlayer(
    id: string,
    data: Partial<PlayerType>
  ): Promise<PlayerType | null> {
    const fields = Object.keys(data)
      .filter((key) => key !== "id" && key !== "createdAt")
      .map((key) => {
        // Mapeia campos camelCase para snake_case
        const fieldMap: Record<string, string> = {
          discordId: "discord_id",
          gamesPlayed: "games_played",
          lastGameAt: "last_game_at",
          currentStreak: "current_streak",
          bestStreak: "best_streak",
          averageKDA: "average_kda",
          preferredRoles: "preferred_roles",
        };
        return fieldMap[key] || key;
      })
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = Object.entries(data)
      .filter(([key]) => key !== "id" && key !== "createdAt")
      .map(([key, value]) => {
        if (key === "preferredRoles" && Array.isArray(value)) {
          return JSON.stringify(value);
        }
        if (key === "lastGameAt" && value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });

    const sql = `UPDATE players SET ${fields} WHERE id = ?`;
    await this.db.run(sql, [...values, id]);

    return await this.getPlayerById(id);
  }

  /**
   * Obtém todos os jogadores ordenados por MMR
   */
  static async getAllPlayers(): Promise<PlayerType[]> {
    const sql = `
      SELECT 
        id, username, discord_id as discordId, mmr, wins, losses, 
        games_played as gamesPlayed, created_at as createdAt, 
        last_game_at as lastGameAt, current_streak as currentStreak,
        best_streak as bestStreak, average_kda as averageKDA,
        preferred_roles as preferredRoles
      FROM players 
      ORDER BY mmr DESC
    `;

    const players = await this.db.all(sql);

    return players.map((player) => ({
      ...player,
      createdAt: new Date(player.createdAt),
      lastGameAt: player.lastGameAt ? new Date(player.lastGameAt) : undefined,
      preferredRoles: player.preferredRoles
        ? JSON.parse(player.preferredRoles)
        : [],
      averageKDA: player.averageKDA || undefined,
    }));
  }

  /**
   * Obtém os top jogadores
   */
  static async getTopPlayers(limit: number = 10): Promise<PlayerType[]> {
    const sql = `
      SELECT 
        id, username, discord_id as discordId, mmr, wins, losses, 
        games_played as gamesPlayed, created_at as createdAt, 
        last_game_at as lastGameAt, current_streak as currentStreak,
        best_streak as bestStreak, average_kda as averageKDA,
        preferred_roles as preferredRoles
      FROM players 
      ORDER BY mmr DESC 
      LIMIT ?
    `;

    const players = await this.db.all(sql, [limit]);

    return players.map((player) => ({
      ...player,
      createdAt: new Date(player.createdAt),
      lastGameAt: player.lastGameAt ? new Date(player.lastGameAt) : undefined,
      preferredRoles: player.preferredRoles
        ? JSON.parse(player.preferredRoles)
        : [],
      averageKDA: player.averageKDA || undefined,
    }));
  }

  /**
   * Atualiza MMR e estatísticas após vitória
   */
  static async addWin(playerId: string, mmrChange: number): Promise<void> {
    const player = await this.getPlayerById(playerId);
    if (!player) return;

    const newStreak = player.currentStreak + 1;
    const newBestStreak = Math.max(player.bestStreak, newStreak);

    const sql = `
      UPDATE players 
      SET wins = wins + 1, 
          games_played = games_played + 1, 
          mmr = mmr + ?, 
          current_streak = ?,
          best_streak = ?,
          last_game_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db.run(sql, [mmrChange, newStreak, newBestStreak, playerId]);
  }

  /**
   * Atualiza MMR e estatísticas após derrota
   */
  static async addLoss(playerId: string, mmrChange: number): Promise<void> {
    const player = await this.getPlayerById(playerId);
    if (!player) return;

    const newStreak = 0; // Reset streak on loss

    const sql = `
      UPDATE players 
      SET losses = losses + 1, 
          games_played = games_played + 1, 
          mmr = mmr + ?, 
          current_streak = ?,
          last_game_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db.run(sql, [mmrChange, newStreak, playerId]);
  }

  /**
   * Reseta estatísticas de um jogador
   */
  static async resetPlayer(playerId: string): Promise<void> {
    const initialMmr = MMRService.calculateInitialMMR();

    const sql = `
      UPDATE players 
      SET mmr = ?, wins = 0, losses = 0, games_played = 0, 
          current_streak = 0, best_streak = 0
      WHERE id = ?
    `;

    await this.db.run(sql, [initialMmr, playerId]);
  }

  /**
   * Obtém estatísticas completas de um jogador
   */
  static async getPlayerStats(playerId: string): Promise<
    | (PlayerType & {
        winRate: string;
        percentile: number;
        mmrConfidence: number;
      })
    | null
  > {
    const player = await this.getPlayerById(playerId);
    if (!player) return null;

    const allPlayers = await this.getAllPlayers();
    const winRate =
      player.gamesPlayed > 0
        ? ((player.wins / player.gamesPlayed) * 100).toFixed(1)
        : "0.0";
    const percentile = MMRService.calculatePercentile(player, allPlayers);
    const mmrConfidence = MMRService.calculateMMRConfidence(player);

    return {
      ...player,
      winRate: `${winRate}%`,
      percentile,
      mmrConfidence,
    };
  }

  /**
   * Atualiza roles preferidas de um jogador
   */
  static async updatePreferredRoles(
    playerId: string,
    roles: string[]
  ): Promise<void> {
    const sql = `UPDATE players SET preferred_roles = ? WHERE id = ?`;
    await this.db.run(sql, [JSON.stringify(roles), playerId]);
  }

  /**
   * Atualiza KDA médio de um jogador
   */
  static async updateAverageKDA(playerId: string, kda: number): Promise<void> {
    const player = await this.getPlayerById(playerId);
    if (!player) return;

    const currentKDA = player.averageKDA || 0;
    const gamesCount = player.gamesPlayed;

    // Calcula média ponderada
    const newAverageKDA = (currentKDA * (gamesCount - 1) + kda) / gamesCount;

    const sql = `UPDATE players SET average_kda = ? WHERE id = ?`;
    await this.db.run(sql, [newAverageKDA, playerId]);
  }

  /**
   * Obtém jogadores por faixa de MMR
   */
  static async getPlayersByMMRRange(
    minMmr: number,
    maxMmr: number
  ): Promise<PlayerType[]> {
    const sql = `
      SELECT 
        id, username, discord_id as discordId, mmr, wins, losses, 
        games_played as gamesPlayed, created_at as createdAt, 
        last_game_at as lastGameAt, current_streak as currentStreak,
        best_streak as bestStreak, average_kda as averageKDA,
        preferred_roles as preferredRoles
      FROM players 
      WHERE mmr BETWEEN ? AND ?
      ORDER BY mmr DESC
    `;

    const players = await this.db.all(sql, [minMmr, maxMmr]);

    return players.map((player) => ({
      ...player,
      createdAt: new Date(player.createdAt),
      lastGameAt: player.lastGameAt ? new Date(player.lastGameAt) : undefined,
      preferredRoles: player.preferredRoles
        ? JSON.parse(player.preferredRoles)
        : [],
      averageKDA: player.averageKDA || undefined,
    }));
  }

  /**
   * Atualiza o MMR de um jogador (para punições administrativas)
   */
  static async updatePlayerMMR(
    discordId: string,
    newMmr: number
  ): Promise<void> {
    const sql = `UPDATE players SET mmr = ? WHERE discord_id = ?`;
    await this.db.run(sql, [newMmr, discordId]);
  }

  /**
   * Obtém a posição de um jogador no ranking por MMR
   */
  static async getPlayerRankingPosition(
    discordId: string
  ): Promise<number | null> {
    const sql = `
      SELECT position
      FROM (
        SELECT 
          discord_id,
          ROW_NUMBER() OVER (ORDER BY mmr DESC, created_at ASC) as position
        FROM players
      ) ranked
      WHERE discord_id = ?
    `;

    const result = await this.db.get(sql, [discordId]);
    return result ? result.position : null;
  }

  /**
   * Obtém o total de jogadores no sistema
   */
  static async getTotalPlayers(): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM players`;
    const result = await this.db.get(sql);
    return result ? result.count : 0;
  }

  /**
   * Obtém jogadores ativos (que jogaram nos últimos 30 dias)
   */
  static async getActivePlayers(): Promise<PlayerType[]> {
    const sql = `
      SELECT 
        id, username, discord_id as discordId, mmr, wins, losses, 
        games_played as gamesPlayed, created_at as createdAt, 
        last_game_at as lastGameAt, current_streak as currentStreak,
        best_streak as bestStreak, average_kda as averageKDA,
        preferred_roles as preferredRoles
      FROM players 
      WHERE last_game_at > datetime('now', '-30 days')
      ORDER BY mmr DESC
    `;

    const players = await this.db.all(sql);

    return players.map((player) => ({
      ...player,
      createdAt: new Date(player.createdAt),
      lastGameAt: player.lastGameAt ? new Date(player.lastGameAt) : undefined,
      preferredRoles: player.preferredRoles
        ? JSON.parse(player.preferredRoles)
        : [],
      averageKDA: player.averageKDA || undefined,
    }));
  }
}
