const { get, all, run } = require('../database');

class Player {
  static async createPlayer(discordId, username) {
    const id = discordId;
    const sql = `INSERT OR IGNORE INTO players (id, username, discord_id) VALUES (?, ?, ?)`;
    await run(sql, [id, username, discordId]);

    // Busca o jogador criado
    return await this.getPlayerById(id);
  }

  static async getPlayerById(id) {
    const sql = `SELECT * FROM players WHERE id = ?`;
    return await get(sql, [id]);
  }

  static async getPlayerByDiscordId(discordId) {
    const sql = `SELECT * FROM players WHERE discord_id = ?`;
    return await get(sql, [discordId]);
  }

  static async updatePlayer(id, data) {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const sql = `UPDATE players SET ${fields} WHERE id = ?`;
    await run(sql, [...values, id]);
    return await this.getPlayerById(id);
  }

  static async getAllPlayers() {
    const sql = `SELECT * FROM players ORDER BY elo DESC`;
    return await all(sql);
  }

  static async getTopPlayers(limit = 10) {
    const sql = `SELECT * FROM players ORDER BY elo DESC LIMIT ?`;
    return await all(sql, [limit]);
  }

  static async addWin(playerId) {
    const sql = `UPDATE players SET wins = wins + 1, games_played = games_played + 1, elo = elo + 3 WHERE id = ?`;
    await run(sql, [playerId]);
  }

  static async addLoss(playerId) {
    const sql = `UPDATE players SET losses = losses + 1, games_played = games_played + 1, elo = elo + 1 WHERE id = ?`;
    await run(sql, [playerId]);
  }

  static async resetPlayer(playerId) {
    const sql = `UPDATE players SET elo = 0, wins = 0, losses = 0, games_played = 0 WHERE id = ?`;
    await run(sql, [playerId]);
  }

  static async getPlayerStats(playerId) {
    const sql = `SELECT * FROM players WHERE id = ?`;
    const player = await get(sql, [playerId]);

    if (!player) return null;

    const winRate = player.games_played > 0 ? (player.wins / player.games_played * 100).toFixed(1) : 0;

    return {
      ...player,
      winRate: `${winRate}%`
    };
  }
}

module.exports = Player;