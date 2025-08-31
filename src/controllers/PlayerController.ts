import { Player as PlayerModel } from "../models/Player";
import { Match } from "../models/Match";
import { MMRService } from "../services/MMRService";

export class PlayerController {
  /**
   * Cria um novo jogador
   */
  async createPlayer(discordId: string, username: string): Promise<any> {
    try {
      const player = await PlayerModel.createPlayer(discordId, username);
      return {
        success: true,
        player,
        message: "Jogador criado com sucesso!",
      };
    } catch (error) {
      console.error("Erro ao criar jogador:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Obtém perfil completo de um jogador
   */
  async getPlayerProfile(discordId: string): Promise<any> {
    try {
      const player = await PlayerModel.getPlayerByDiscordId(discordId);
      if (!player) {
        return {
          success: false,
          error: "Jogador não encontrado",
        };
      }

      const stats = await PlayerModel.getPlayerStats(player.id);
      if (!stats) {
        return {
          success: false,
          error: "Erro ao obter estatísticas do jogador",
        };
      }

      // Obtém histórico de partidas
      const matchHistory = await Match.getPlayerMatchHistory(player.id, 10);

      return {
        success: true,
        player,
        stats,
        matchHistory,
      };
    } catch (error) {
      console.error("Erro ao obter perfil do jogador:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Atualiza dados de um jogador
   */
  async updatePlayer(discordId: string, data: any): Promise<any> {
    try {
      const player = await PlayerModel.getPlayerByDiscordId(discordId);
      if (!player) {
        return {
          success: false,
          error: "Jogador não encontrado",
        };
      }

      const updatedPlayer = await PlayerModel.updatePlayer(player.id, data);
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
    } catch (error) {
      console.error("Erro ao atualizar jogador:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Atualiza roles preferidas de um jogador
   */
  async updatePreferredRoles(discordId: string, roles: string[]): Promise<any> {
    try {
      const player = await PlayerModel.getPlayerByDiscordId(discordId);
      if (!player) {
        return {
          success: false,
          error: "Jogador não encontrado",
        };
      }

      await PlayerModel.updatePreferredRoles(player.id, roles);

      return {
        success: true,
        message: "Roles preferidas atualizadas com sucesso!",
        roles,
      };
    } catch (error) {
      console.error("Erro ao atualizar roles preferidas:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Obtém ranking de jogadores
   */
  async getPlayerRanking(limit: number = 25, offset: number = 0): Promise<any> {
    try {
      const allPlayers = await PlayerModel.getAllPlayers();
      const totalPlayers = allPlayers.length;

      const players = allPlayers.slice(offset, offset + limit);

      // Calcula posições no ranking
      const playersWithRank = players.map((player, index) => {
        const rank = offset + index + 1;
        const percentile = MMRService.calculatePercentile(player, allPlayers);
        const mmrConfidence = MMRService.calculateMMRConfidence(player);

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
    } catch (error) {
      console.error("Erro ao obter ranking de jogadores:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Obtém jogadores por faixa de MMR
   */
  async getPlayersByMMRRange(minMmr: number, maxMmr: number): Promise<any> {
    try {
      const players = await PlayerModel.getPlayersByMMRRange(minMmr, maxMmr);

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
    } catch (error) {
      console.error("Erro ao obter jogadores por faixa de MMR:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Obtém jogadores ativos
   */
  async getActivePlayers(daysActive: number = 30): Promise<any> {
    try {
      const activePlayers = await PlayerModel.getActivePlayers();

      return {
        success: true,
        players: activePlayers,
        count: activePlayers.length,
        daysActive,
      };
    } catch (error) {
      console.error("Erro ao obter jogadores ativos:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Reseta estatísticas de um jogador
   */
  async resetPlayerStats(discordId: string): Promise<any> {
    try {
      const player = await PlayerModel.getPlayerByDiscordId(discordId);
      if (!player) {
        return {
          success: false,
          error: "Jogador não encontrado",
        };
      }

      await PlayerModel.resetPlayer(player.id);

      return {
        success: true,
        message: "Estatísticas do jogador resetadas com sucesso!",
      };
    } catch (error) {
      console.error("Erro ao resetar estatísticas do jogador:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Obtém estatísticas de performance de um jogador
   */
  async getPlayerPerformanceStats(discordId: string): Promise<any> {
    try {
      const player = await PlayerModel.getPlayerByDiscordId(discordId);
      if (!player) {
        return {
          success: false,
          error: "Jogador não encontrado",
        };
      }

      const stats = await PlayerModel.getPlayerStats(player.id);
      if (!stats) {
        return {
          success: false,
          error: "Erro ao obter estatísticas do jogador",
        };
      }

      // Calcula métricas adicionais
      const winRate =
        player.gamesPlayed > 0 ? player.wins / player.gamesPlayed : 0;
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
    } catch (error) {
      console.error("Erro ao obter estatísticas de performance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Obtém histórico de MMR de um jogador
   */
  async getPlayerMMRHistory(
    discordId: string,
    limit: number = 50
  ): Promise<any> {
    try {
      const player = await PlayerModel.getPlayerByDiscordId(discordId);
      if (!player) {
        return {
          success: false,
          error: "Jogador não encontrado",
        };
      }

      // Aqui você implementaria a lógica para obter histórico de MMR
      // Por enquanto, retorna dados básicos
      return {
        success: true,
        player,
        mmrHistory: [],
        message: "Histórico de MMR não implementado ainda",
      };
    } catch (error) {
      console.error("Erro ao obter histórico de MMR:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Calcula tendência de MMR de um jogador
   */
  private calculateMMRTrend(player: any): number {
    // Implementação simplificada - você pode expandir isso
    // baseado no histórico de partidas
    if (player.gamesPlayed < 10) return 0.5;

    const winRate = player.wins / player.gamesPlayed;
    if (winRate > 0.6) return 0.8;
    if (winRate > 0.5) return 0.6;
    if (winRate > 0.4) return 0.4;
    return 0.2;
  }

  /**
   * Calcula consistência de um jogador
   */
  private calculateConsistency(player: any): number {
    if (player.gamesPlayed < 5) return 0.5;

    // Baseado na sequência de vitórias/derrotas
    const maxStreak = Math.max(player.currentStreak, player.bestStreak);
    const consistency = Math.min(1, maxStreak / 10);

    return consistency;
  }

  /**
   * Obtém estatísticas comparativas entre jogadores
   */
  async getPlayerComparison(
    player1Id: string,
    player2Id: string
  ): Promise<any> {
    try {
      const [player1, player2] = await Promise.all([
        PlayerModel.getPlayerById(player1Id),
        PlayerModel.getPlayerById(player2Id),
      ]);

      if (!player1 || !player2) {
        return {
          success: false,
          error: "Um ou ambos os jogadores não encontrados",
        };
      }

      const [stats1, stats2] = await Promise.all([
        PlayerModel.getPlayerStats(player1Id),
        PlayerModel.getPlayerStats(player2Id),
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
          difference: Math.abs(
            parseFloat(stats1.winRate) - parseFloat(stats2.winRate)
          ),
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
    } catch (error) {
      console.error("Erro ao comparar jogadores:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }
}
