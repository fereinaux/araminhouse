"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerController = void 0;
const Player_1 = require("../models/Player");
const Match_1 = require("../models/Match");
const MMRService_1 = require("../services/MMRService");
class PlayerController {
    async createPlayer(discordId, username) {
        try {
            const player = await Player_1.Player.createPlayer(discordId, username);
            return {
                success: true,
                player,
                message: "Jogador criado com sucesso!",
            };
        }
        catch (error) {
            console.error("Erro ao criar jogador:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async getPlayerProfile(discordId) {
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                return {
                    success: false,
                    error: "Jogador não encontrado",
                };
            }
            const stats = await Player_1.Player.getPlayerStats(player.id);
            if (!stats) {
                return {
                    success: false,
                    error: "Erro ao obter estatísticas do jogador",
                };
            }
            const matchHistory = await Match_1.Match.getPlayerMatchHistory(player.id, 10);
            return {
                success: true,
                player,
                stats,
                matchHistory,
            };
        }
        catch (error) {
            console.error("Erro ao obter perfil do jogador:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async updatePlayer(discordId, data) {
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                return {
                    success: false,
                    error: "Jogador não encontrado",
                };
            }
            const updatedPlayer = await Player_1.Player.updatePlayer(player.id, data);
            if (!updatedPlayer) {
                return {
                    success: false,
                    error: "Erro ao atualizar jogador",
                };
            }
            return {
                success: true,
                player: updatedPlayer,
                message: "Jogador atualizado com sucesso!",
            };
        }
        catch (error) {
            console.error("Erro ao atualizar jogador:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async updatePreferredRoles(discordId, roles) {
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                return {
                    success: false,
                    error: "Jogador não encontrado",
                };
            }
            await Player_1.Player.updatePreferredRoles(player.id, roles);
            return {
                success: true,
                message: "Roles preferidas atualizadas com sucesso!",
                roles,
            };
        }
        catch (error) {
            console.error("Erro ao atualizar roles preferidas:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async getPlayerRanking(limit = 25, offset = 0) {
        try {
            const allPlayers = await Player_1.Player.getAllPlayers();
            const totalPlayers = allPlayers.length;
            const players = allPlayers.slice(offset, offset + limit);
            const playersWithRank = players.map((player, index) => {
                const rank = offset + index + 1;
                const percentile = MMRService_1.MMRService.calculatePercentile(player, allPlayers);
                const mmrConfidence = MMRService_1.MMRService.calculateMMRConfidence(player);
                return {
                    ...player,
                    rank,
                    percentile,
                    mmrConfidence,
                };
            });
            return {
                success: true,
                players: playersWithRank,
                pagination: {
                    total: totalPlayers,
                    limit,
                    offset,
                    hasMore: offset + limit < totalPlayers,
                },
            };
        }
        catch (error) {
            console.error("Erro ao obter ranking de jogadores:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async getPlayersByMMRRange(minMmr, maxMmr) {
        try {
            const players = await Player_1.Player.getPlayersByMMRRange(minMmr, maxMmr);
            if (players.length === 0) {
                return {
                    success: true,
                    players: [],
                    message: "Nenhum jogador encontrado nesta faixa de MMR",
                };
            }
            return {
                success: true,
                players,
                count: players.length,
                mmrRange: { min: minMmr, max: maxMmr },
            };
        }
        catch (error) {
            console.error("Erro ao obter jogadores por faixa de MMR:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async getActivePlayers(daysActive = 30) {
        try {
            const activePlayers = await Player_1.Player.getActivePlayers();
            return {
                success: true,
                players: activePlayers,
                count: activePlayers.length,
                daysActive,
            };
        }
        catch (error) {
            console.error("Erro ao obter jogadores ativos:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async resetPlayerStats(discordId) {
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                return {
                    success: false,
                    error: "Jogador não encontrado",
                };
            }
            await Player_1.Player.resetPlayer(player.id);
            return {
                success: true,
                message: "Estatísticas do jogador resetadas com sucesso!",
            };
        }
        catch (error) {
            console.error("Erro ao resetar estatísticas do jogador:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async getPlayerPerformanceStats(discordId) {
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                return {
                    success: false,
                    error: "Jogador não encontrado",
                };
            }
            const stats = await Player_1.Player.getPlayerStats(player.id);
            if (!stats) {
                return {
                    success: false,
                    error: "Erro ao obter estatísticas do jogador",
                };
            }
            const winRate = player.gamesPlayed > 0 ? player.wins / player.gamesPlayed : 0;
            const mmrTrend = this.calculateMMRTrend(player);
            const consistency = this.calculateConsistency(player);
            return {
                success: true,
                player,
                stats,
                performance: {
                    winRate,
                    mmrTrend,
                    consistency,
                    overallScore: (winRate + mmrTrend + consistency) / 3,
                },
            };
        }
        catch (error) {
            console.error("Erro ao obter estatísticas de performance:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    async getPlayerMMRHistory(discordId, limit = 50) {
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                return {
                    success: false,
                    error: "Jogador não encontrado",
                };
            }
            return {
                success: true,
                player,
                mmrHistory: [],
                message: "Histórico de MMR não implementado ainda",
            };
        }
        catch (error) {
            console.error("Erro ao obter histórico de MMR:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
    calculateMMRTrend(player) {
        if (player.gamesPlayed < 10)
            return 0.5;
        const winRate = player.wins / player.gamesPlayed;
        if (winRate > 0.6)
            return 0.8;
        if (winRate > 0.5)
            return 0.6;
        if (winRate > 0.4)
            return 0.4;
        return 0.2;
    }
    calculateConsistency(player) {
        if (player.gamesPlayed < 5)
            return 0.5;
        const maxStreak = Math.max(player.currentStreak, player.bestStreak);
        const consistency = Math.min(1, maxStreak / 10);
        return consistency;
    }
    async getPlayerComparison(player1Id, player2Id) {
        try {
            const [player1, player2] = await Promise.all([
                Player_1.Player.getPlayerById(player1Id),
                Player_1.Player.getPlayerById(player2Id),
            ]);
            if (!player1 || !player2) {
                return {
                    success: false,
                    error: "Um ou ambos os jogadores não encontrados",
                };
            }
            const [stats1, stats2] = await Promise.all([
                Player_1.Player.getPlayerStats(player1Id),
                Player_1.Player.getPlayerStats(player2Id),
            ]);
            if (!stats1 || !stats2) {
                return {
                    success: false,
                    error: "Erro ao obter estatísticas dos jogadores",
                };
            }
            const comparison = {
                mmr: {
                    player1: player1.mmr,
                    player2: player2.mmr,
                    difference: Math.abs(player1.mmr - player2.mmr),
                },
                winRate: {
                    player1: parseFloat(stats1.winRate),
                    player2: parseFloat(stats2.winRate),
                    difference: Math.abs(parseFloat(stats1.winRate) - parseFloat(stats2.winRate)),
                },
                gamesPlayed: {
                    player1: player1.gamesPlayed,
                    player2: player2.gamesPlayed,
                    difference: Math.abs(player1.gamesPlayed - player2.gamesPlayed),
                },
                percentile: {
                    player1: stats1.percentile,
                    player2: stats2.percentile,
                    difference: Math.abs(stats1.percentile - stats2.percentile),
                },
            };
            return {
                success: true,
                player1: { ...player1, stats: stats1 },
                player2: { ...player2, stats: stats2 },
                comparison,
            };
        }
        catch (error) {
            console.error("Erro ao comparar jogadores:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };
        }
    }
}
exports.PlayerController = PlayerController;
//# sourceMappingURL=PlayerController.js.map