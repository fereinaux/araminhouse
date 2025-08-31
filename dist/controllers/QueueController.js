"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueController = void 0;
const Queue_1 = require("../models/Queue");
const Match_1 = require("../models/Match");
const TeamBalancerService_1 = require("../services/TeamBalancerService");
class QueueController {
    async createQueue(size) {
        return await Queue_1.Queue.createQueue(size);
    }
    async addPlayerToQueue(queueId, playerId) {
        await Queue_1.Queue.addPlayerToQueue(queueId, playerId);
    }
    async removePlayerFromQueue(queueId, playerId) {
        await Queue_1.Queue.removePlayerFromQueue(queueId, playerId);
    }
    async getQueueStatus(queueId) {
        const queue = await Queue_1.Queue.getQueueById(queueId);
        if (!queue)
            return null;
        const stats = await Queue_1.Queue.getQueueStats(queueId);
        if (!stats)
            return null;
        return {
            queue,
            stats,
            isReady: await Queue_1.Queue.isQueueReady(queueId),
        };
    }
    async formTeams(queueId) {
        const teams = await Queue_1.Queue.formTeams(queueId);
        if (!teams)
            return null;
        await Queue_1.Queue.updateQueueStatus(queueId, "forming");
        return teams;
    }
    async processCompleteQueue(queueId) {
        try {
            const teams = await this.formTeams(queueId);
            if (!teams) {
                throw new Error("Não foi possível formar times");
            }
            const matchId = await Match_1.Match.createMatch(queueId, teams.team1, teams.team2);
            await Queue_1.Queue.updateQueueStatus(queueId, "ready");
            return {
                matchId,
                teams,
                balanceStats: teams.balanceStats,
            };
        }
        catch (error) {
            console.error("Erro ao processar fila completa:", error);
            await Queue_1.Queue.updateQueueStatus(queueId, "cancelled");
            throw error;
        }
    }
    async getAllQueueStats() {
        const activeQueues = await Queue_1.Queue.getQueuesByStatus("waiting");
        const formingQueues = await Queue_1.Queue.getQueuesByStatus("forming");
        const readyQueues = await Queue_1.Queue.getQueuesByStatus("ready");
        const allQueues = [...activeQueues, ...formingQueues, ...readyQueues];
        const stats = [];
        for (const queue of allQueues) {
            const queueStats = await Queue_1.Queue.getQueueStats(queue.id);
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
    async cleanupOldQueues(maxAgeHours = 24) {
        const oldQueues = await Queue_1.Queue.getQueueHistory(100);
        let cleanedCount = 0;
        for (const queue of oldQueues) {
            const ageHours = (Date.now() - queue.createdAt.getTime()) / (1000 * 60 * 60);
            if (ageHours > maxAgeHours && queue.status === "waiting") {
                await Queue_1.Queue.clearQueue(queue.id);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    async getLongWaitingPlayers(queueId, maxWaitMinutes = 15) {
        return await Queue_1.Queue.getLongWaitingPlayers(queueId, maxWaitMinutes);
    }
    async removeInactivePlayers(queueId, maxInactiveMinutes = 10) {
        return await Queue_1.Queue.removeInactivePlayers(queueId, maxInactiveMinutes);
    }
    async getBalanceRecommendations(queueId) {
        const queue = await Queue_1.Queue.getQueueById(queueId);
        if (!queue)
            return null;
        if (queue.players.length < queue.size) {
            return {
                type: "waiting",
                message: `Aguardando mais ${queue.size - queue.players.length} jogadores`,
                estimatedWaitTime: (queue.size - queue.players.length) * 2,
            };
        }
        const teams = TeamBalancerService_1.TeamBalancerService.balanceTeams(queue.players, queue.size / 2);
        if (!teams || teams.length !== 2 || !teams[0] || !teams[1]) {
            throw new Error("Falha ao formar times balanceados");
        }
        const balanceStats = TeamBalancerService_1.TeamBalancerService.getBalanceStats(teams[0], teams[1]);
        return {
            type: "ready",
            message: "Fila pronta para formar times",
            balanceStats,
            teams: {
                team1: {
                    players: teams[0].players.map((p) => ({
                        id: p.id,
                        username: p.username,
                        mmr: p.mmr,
                    })),
                    averageMmr: teams[0].averageMmr,
                },
                team2: {
                    players: teams[1].players.map((p) => ({
                        id: p.id,
                        username: p.username,
                        mmr: p.mmr,
                    })),
                    averageMmr: teams[1].averageMmr,
                },
            },
        };
    }
    async getPlayerQueueHistory(playerId, limit = 20) {
        const allQueues = await Queue_1.Queue.getQueueHistory(100);
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
            if (playerQueues.length >= limit)
                break;
        }
        return playerQueues;
    }
    async getQueuePerformanceStats(queueId) {
        const queue = await Queue_1.Queue.getQueueById(queueId);
        if (!queue)
            return null;
        const stats = await Queue_1.Queue.getQueueStats(queueId);
        if (!stats)
            return null;
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
    calculateMMRVariance(players) {
        if (players.length < 2)
            return 1;
        const mmrs = players.map((p) => p.mmr);
        const mean = mmrs.reduce((sum, mmr) => sum + mmr, 0) / mmrs.length;
        const variance = mmrs.reduce((sum, mmr) => sum + Math.pow(mmr - mean, 2), 0) / mmrs.length;
        const maxVariance = Math.pow(200, 2);
        return Math.max(0, 1 - variance / maxVariance);
    }
    calculateRoleBalance(players) {
        const roleCounts = {};
        players.forEach((player) => {
            player.preferredRoles.forEach((role) => {
                roleCounts[role] = (roleCounts[role] || 0) + 1;
            });
        });
        if (Object.keys(roleCounts).length === 0)
            return 0.5;
        const counts = Object.values(roleCounts);
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);
        return Math.max(0, 1 - (maxCount - minCount) / players.length);
    }
    calculateWaitTimeEfficiency(queue) {
        const now = new Date();
        const ageMinutes = (now.getTime() - queue.createdAt.getTime()) / (1000 * 60);
        const optimalWaitTime = 5;
        const maxWaitTime = 30;
        if (ageMinutes <= optimalWaitTime)
            return 1;
        if (ageMinutes >= maxWaitTime)
            return 0;
        return 1 - (ageMinutes - optimalWaitTime) / (maxWaitTime - optimalWaitTime);
    }
}
exports.QueueController = QueueController;
//# sourceMappingURL=QueueController.js.map