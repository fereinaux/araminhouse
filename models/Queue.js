const { get, all, run } = require('../database');

class Queue {
  static async createQueue(size) {
    const sql = `INSERT INTO queues (size, status) VALUES (?, 'waiting')`;
    const result = await run(sql, [size]);
    return result.id;
  }

  static async addPlayerToQueue(queueId, playerId) {
    const sql = `INSERT INTO queue_players (queue_id, player_id) VALUES (?, ?)`;
    await run(sql, [queueId, playerId]);
  }

  static async removePlayerFromQueue(queueId, playerId) {
    const sql = `DELETE FROM queue_players WHERE queue_id = ? AND player_id = ?`;
    await run(sql, [queueId, playerId]);
  }

  static async getQueuePlayers(queueId) {
    const sql = `
      SELECT p.* FROM players p 
      INNER JOIN queue_players qp ON p.id = qp.player_id 
      WHERE qp.queue_id = ?
    `;
    return await all(sql, [queueId]);
  }

  static async getActiveQueue() {
    const sql = `SELECT * FROM queues WHERE status = 'waiting' ORDER BY created_at DESC LIMIT 1`;
    return await get(sql);
  }

  static async getQueueById(queueId) {
    const sql = `SELECT * FROM queues WHERE id = ?`;
    return await get(sql, [queueId]);
  }

  static async updateQueueStatus(queueId, status) {
    const sql = `UPDATE queues SET status = ? WHERE id = ?`;
    await run(sql, [status, queueId]);
  }

  static async clearQueue(queueId) {
    // Remove todos os jogadores da fila
    const sql = `DELETE FROM queue_players WHERE queue_id = ?`;
    await run(sql, [queueId]);

    // Atualiza status da fila
    await this.updateQueueStatus(queueId, 'cancelled');
  }

  static async isPlayerInQueue(playerId) {
    const sql = `
      SELECT COUNT(*) as count FROM queue_players qp 
      INNER JOIN queues q ON qp.queue_id = q.id 
      WHERE qp.player_id = ? AND q.status = 'waiting'
    `;
    const result = await get(sql, [playerId]);
    return result.count > 0;
  }

  static async getPlayerQueue(playerId) {
    const sql = `
      SELECT q.* FROM queues q 
      INNER JOIN queue_players qp ON q.id = qp.queue_id 
      WHERE qp.player_id = ? AND q.status = 'waiting'
    `;
    return await get(sql, [playerId]);
  }
}

module.exports = Queue;