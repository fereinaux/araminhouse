"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const MMRService_1 = require("../services/MMRService");
const DatabaseService_1 = require("../services/DatabaseService");
class Player {
    static async createPlayer(discordId, username) {
        const id = discordId;
        const initialMmr = MMRService_1.MMRService.calculateInitialMMR();
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
    static async getPlayerById(id) {
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
        if (!player)
            return null;
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
    static async getPlayerByDiscordId(discordId) {
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
        if (!player)
            return null;
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
    static async updatePlayer(id, data) {
        const fields = Object.keys(data)
            .filter((key) => key !== "id" && key !== "createdAt")
            .map((key) => {
            const fieldMap = {
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
    static async getAllPlayers() {
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
    static async getTopPlayers(limit = 10) {
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
    static async addWin(playerId, mmrChange) {
        const player = await this.getPlayerById(playerId);
        if (!player)
            return;
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
    static async addLoss(playerId, mmrChange) {
        const player = await this.getPlayerById(playerId);
        if (!player)
            return;
        const newStreak = 0;
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
    static async resetPlayer(playerId) {
        const initialMmr = MMRService_1.MMRService.calculateInitialMMR();
        const sql = `
      UPDATE players 
      SET mmr = ?, wins = 0, losses = 0, games_played = 0, 
          current_streak = 0, best_streak = 0
      WHERE id = ?
    `;
        await this.db.run(sql, [initialMmr, playerId]);
    }
    static async getPlayerStats(playerId) {
        const player = await this.getPlayerById(playerId);
        if (!player)
            return null;
        const allPlayers = await this.getAllPlayers();
        const winRate = player.gamesPlayed > 0
            ? ((player.wins / player.gamesPlayed) * 100).toFixed(1)
            : "0.0";
        const percentile = MMRService_1.MMRService.calculatePercentile(player, allPlayers);
        const mmrConfidence = MMRService_1.MMRService.calculateMMRConfidence(player);
        return {
            ...player,
            winRate: `${winRate}%`,
            percentile,
            mmrConfidence,
        };
    }
    static async updatePreferredRoles(playerId, roles) {
        const sql = `UPDATE players SET preferred_roles = ? WHERE id = ?`;
        await this.db.run(sql, [JSON.stringify(roles), playerId]);
    }
    static async updateAverageKDA(playerId, kda) {
        const player = await this.getPlayerById(playerId);
        if (!player)
            return;
        const currentKDA = player.averageKDA || 0;
        const gamesCount = player.gamesPlayed;
        const newAverageKDA = (currentKDA * (gamesCount - 1) + kda) / gamesCount;
        const sql = `UPDATE players SET average_kda = ? WHERE id = ?`;
        await this.db.run(sql, [newAverageKDA, playerId]);
    }
    static async getPlayersByMMRRange(minMmr, maxMmr) {
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
    static async updatePlayerMMR(discordId, newMmr) {
        const sql = `UPDATE players SET mmr = ? WHERE discord_id = ?`;
        await this.db.run(sql, [newMmr, discordId]);
    }
    static async getPlayerRankingPosition(discordId) {
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
    static async getTotalPlayers() {
        const sql = `SELECT COUNT(*) as count FROM players`;
        const result = await this.db.get(sql);
        return result ? result.count : 0;
    }
    static async getActivePlayers() {
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
exports.Player = Player;
Player.db = DatabaseService_1.DatabaseService.getInstance();
//# sourceMappingURL=Player.js.map