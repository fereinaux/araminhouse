"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const DatabaseService_1 = require("../services/DatabaseService");
const TeamBalancerService_1 = require("../services/TeamBalancerService");
class Queue {
    static async createQueue(size) {
        await this.db.run(`UPDATE queues SET status = 'cancelled' WHERE status IN ('waiting', 'forming')`);
        const sql = `INSERT INTO queues (size, status) VALUES (?, 'waiting')`;
        const result = await this.db.run(sql, [size]);
        return result.id;
    }
    static async addPlayerToQueue(queueId, playerId) {
        const sql = `INSERT INTO queue_players (queue_id, player_id) VALUES (?, ?)`;
        await this.db.run(sql, [queueId, playerId]);
    }
    static async removePlayerFromQueue(queueId, playerId) {
        const sql = `DELETE FROM queue_players WHERE queue_id = ? AND player_id = ?`;
        await this.db.run(sql, [queueId, playerId]);
    }
    static async getQueuePlayers(queueId) {
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
    static async getActiveQueue() {
        const sql = `SELECT * FROM queues WHERE status = 'waiting' ORDER BY created_at DESC LIMIT 1`;
        const queue = await this.db.get(sql);
        if (!queue)
            return null;
        const players = await this.getQueuePlayers(queue.id);
        return {
            id: queue.id,
            size: queue.size,
            status: queue.status,
            createdAt: new Date(queue.created_at),
            startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
            endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
            players,
        };
    }
    static async getActiveMatch() {
        const sql = `SELECT * FROM queues WHERE status = 'forming' ORDER BY created_at DESC LIMIT 1`;
        const queue = await this.db.get(sql);
        if (!queue)
            return null;
        const players = await this.getQueuePlayers(queue.id);
        return {
            id: queue.id,
            size: queue.size,
            status: queue.status,
            createdAt: new Date(queue.created_at),
            startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
            endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
            players,
        };
    }
    static async getQueueById(queueId) {
        const sql = `SELECT * FROM queues WHERE id = ?`;
        const queue = await this.db.get(sql, [queueId]);
        if (!queue)
            return null;
        const players = await this.getQueuePlayers(queue.id);
        return {
            id: queue.id,
            size: queue.size,
            status: queue.status,
            createdAt: new Date(queue.created_at),
            startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
            endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
            players,
        };
    }
    static async updateQueueStatus(queueId, status) {
        const sql = `UPDATE queues SET status = ? WHERE id = ?`;
        await this.db.run(sql, [status, queueId]);
        if (status === "forming" || status === "ready") {
            await this.db.run(`UPDATE queues SET started_at = CURRENT_TIMESTAMP WHERE id = ?`, [queueId]);
        }
        else if (status === "completed" || status === "cancelled") {
            await this.db.run(`UPDATE queues SET ended_at = CURRENT_TIMESTAMP WHERE id = ?`, [queueId]);
        }
    }
    static async clearQueue(queueId) {
        const sql = `DELETE FROM queue_players WHERE queue_id = ?`;
        await this.db.run(sql, [queueId]);
        await this.updateQueueStatus(queueId, "cancelled");
    }
    static async isPlayerInQueue(playerId) {
        const sql = `
      SELECT COUNT(*) as count FROM queue_players qp 
      INNER JOIN queues q ON qp.queue_id = q.id 
      WHERE qp.player_id = ? AND q.status = 'waiting'
    `;
        const result = await this.db.get(sql, [playerId]);
        return result.count > 0;
    }
    static async getPlayerQueue(playerId) {
        const sql = `
      SELECT q.* FROM queues q 
      INNER JOIN queue_players qp ON q.id = qp.queue_id 
      WHERE qp.player_id = ? AND q.status = 'waiting'
    `;
        const queue = await this.db.get(sql, [playerId]);
        if (!queue)
            return null;
        const players = await this.getQueuePlayers(queue.id);
        return {
            id: queue.id,
            size: queue.size,
            status: queue.status,
            createdAt: new Date(queue.created_at),
            startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
            endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
            players,
        };
    }
    static async isQueueReady(queueId) {
        const queue = await this.getQueueById(queueId);
        if (!queue)
            return false;
        return queue.players.length === 10;
    }
    static async formTeams(queueId) {
        const queue = await this.getQueueById(queueId);
        if (!queue || !this.isQueueReady(queueId))
            return null;
        const actualTeamSize = Math.floor(queue.players.length / 2);
        const teams = TeamBalancerService_1.TeamBalancerService.balanceTeams(queue.players, actualTeamSize);
        if (!teams || teams.length !== 2 || !teams[0] || !teams[1]) {
            throw new Error("Falha ao formar times balanceados");
        }
        const balanceStats = TeamBalancerService_1.TeamBalancerService.getBalanceStats(teams[0], teams[1]);
        await this.updateQueueStatus(queueId, "forming");
        return {
            team1: teams[0],
            team2: teams[1],
            balanceStats,
        };
    }
    static async canFormTeamsFlexible(queueId) {
        const queue = await this.getQueueById(queueId);
        if (!queue)
            return false;
        if (queue.players.length < 4)
            return false;
        if (queue.players.length % 2 !== 0)
            return false;
        return true;
    }
    static async getQueueStats(queueId) {
        const queue = await this.getQueueById(queueId);
        if (!queue)
            return null;
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
        const roleDistribution = {};
        players.forEach((player) => {
            player.preferredRoles.forEach((role) => {
                roleDistribution[role] = (roleDistribution[role] || 0) + 1;
            });
        });
        const estimatedWaitTime = Math.max(0, (queue.size - totalPlayers) * 2);
        return {
            totalPlayers,
            averageMmr,
            mmrRange,
            roleDistribution,
            estimatedWaitTime,
        };
    }
    static async getQueueHistory(limit = 20) {
        const sql = `
      SELECT * FROM queues 
      WHERE status IN ('completed', 'cancelled')
      ORDER BY created_at DESC 
      LIMIT ?
    `;
        const queues = await this.db.all(sql, [limit]);
        const result = [];
        for (const queue of queues) {
            const players = await this.getQueuePlayers(queue.id);
            result.push({
                id: queue.id,
                size: queue.size,
                status: queue.status,
                createdAt: new Date(queue.created_at),
                startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
                endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
                players,
            });
        }
        return result;
    }
    static async getQueuesByStatus(status) {
        const sql = `SELECT * FROM queues WHERE status = ? ORDER BY created_at DESC`;
        const queues = await this.db.all(sql, [status]);
        const result = [];
        for (const queue of queues) {
            const players = await this.getQueuePlayers(queue.id);
            result.push({
                id: queue.id,
                size: queue.size,
                status: queue.status,
                createdAt: new Date(queue.created_at),
                startedAt: queue.started_at ? new Date(queue.started_at) : undefined,
                endedAt: queue.ended_at ? new Date(queue.ended_at) : undefined,
                players,
            });
        }
        return result;
    }
    static async removeInactivePlayers(queueId, maxInactiveMinutes = 10) {
        const sql = `
      DELETE FROM queue_players 
      WHERE queue_id = ? 
      AND joined_at < datetime('now', '-${maxInactiveMinutes} minutes')
    `;
        const result = await this.db.run(sql, [queueId]);
        return result.changes;
    }
    static async getLongWaitingPlayers(queueId, maxWaitMinutes = 15) {
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
exports.Queue = Queue;
Queue.db = DatabaseService_1.DatabaseService.getInstance();
//# sourceMappingURL=Queue.js.map