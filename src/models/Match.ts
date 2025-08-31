import { Match as MatchType, MatchPlayer, Player, Team } from "../types";
import { DatabaseService } from "../services/DatabaseService";
import { MMRService } from "../services/MMRService";
import { Player as PlayerModel } from "./Player";

export class Match {
  private static db = DatabaseService.getInstance();

  /**
   * Cria uma nova partida
   */
  static async createMatch(
    queueId: number,
    team1: Team,
    team2: Team
  ): Promise<number> {
    const sql = `
      INSERT INTO matches (queue_id, winner_team, created_at) 
      VALUES (?, NULL, CURRENT_TIMESTAMP)
    `;

    const result = await this.db.run(sql, [queueId]);
    const matchId = result.id;

    // Adiciona jogadores do time 1
    for (const player of team1.players) {
      await this.addPlayerToMatch(
        matchId,
        player.id,
        "team1",
        "pending",
        "ADC",
        0.5
      );
    }

    // Adiciona jogadores do time 2
    for (const player of team2.players) {
      await this.addPlayerToMatch(
        matchId,
        player.id,
        "team2",
        "pending",
        "ADC",
        0.5
      );
    }

    return matchId;
  }

  /**
   * Adiciona um jogador a uma partida
   */
  static async addPlayerToMatch(
    matchId: number,
    playerId: string,
    team: string,
    result: "win" | "loss" | "pending",
    role: string,
    performance: number
  ): Promise<void> {
    const sql = `
      INSERT INTO match_players (match_id, player_id, team, result, role, performance) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      matchId,
      playerId,
      team,
      result,
      role,
      performance,
    ]);
  }

  /**
   * Obtém uma partida por ID
   */
  static async getMatchById(matchId: number): Promise<MatchType | null> {
    const sql = `SELECT * FROM matches WHERE id = ?`;
    const match = await this.db.get(sql, [matchId]);

    if (!match) return null;

    const players = await this.getMatchPlayers(matchId);

    return {
      id: match.id,
      queueId: match.queue_id,
      winnerTeam: match.winner_team,
      createdAt: new Date(match.created_at),
      endedAt: match.ended_at ? new Date(match.ended_at) : undefined,
      duration: match.duration,
      team1Score: match.team1_score,
      team2Score: match.team2_score,
      players,
    } as MatchType;
  }

  /**
   * Obtém todos os jogadores de uma partida
   */
  static async getMatchPlayers(matchId: number): Promise<MatchPlayer[]> {
    const sql = `
      SELECT 
        match_id as matchId, player_id as playerId, team, result, role, 
        performance, mmr_change as mmrChange
      FROM match_players 
      WHERE match_id = ?
    `;

    return await this.db.all(sql, [matchId]);
  }

  /**
   * Finaliza uma partida e calcula MMR
   */
  static async finishMatch(
    matchId: number,
    winner: "team1" | "team2",
    team1Score?: number,
    team2Score?: number,
    duration?: number
  ): Promise<any[]> {
    const match = await this.getMatchById(matchId);
    if (!match) throw new Error("Partida não encontrada");

    // Obtém jogadores organizados por time
    const team1Players = match.players.filter((p) => p.team === "team1");
    const team2Players = match.players.filter((p) => p.team === "team2");

    // Obtém dados completos dos jogadores
    const team1: Team = {
      id: "team1",
      players: await Promise.all(
        team1Players.map(async (p) => {
          const player = await PlayerModel.getPlayerById(p.playerId);
          if (!player) throw new Error(`Jogador ${p.playerId} não encontrado`);
          return player;
        })
      ),
      averageMmr: 0,
      totalMmr: 0,
    };

    const team2: Team = {
      id: "team2",
      players: await Promise.all(
        team2Players.map(async (p) => {
          const player = await PlayerModel.getPlayerById(p.playerId);
          if (!player) throw new Error(`Jogador ${p.playerId} não encontrado`);
          return player;
        })
      ),
      averageMmr: 0,
      totalMmr: 0,
    };

    // Calcula MMR médio dos times
    team1.totalMmr = team1.players.reduce((sum, p) => sum + p.mmr, 0);
    team1.averageMmr = team1.totalMmr / team1.players.length;

    team2.totalMmr = team2.players.reduce((sum, p) => sum + p.mmr, 0);
    team2.averageMmr = team2.totalMmr / team2.players.length;

    // Cria mapa de performance dos jogadores
    const playerPerformances = new Map<string, number>();
    match.players.forEach((p) => {
      playerPerformances.set(p.playerId, p.performance);
    });

    // Calcula mudanças de MMR
    const teamSize = team1.players.length; // Tamanho da partida baseado no time
    const mmrCalculations = MMRService.calculateMatchResults(
      team1,
      team2,
      winner,
      playerPerformances,
      teamSize
    );

    // Atualiza banco de dados
    await this.db.transaction(async () => {
      // Atualiza partida
      const updateMatchSql = `
        UPDATE matches 
        SET winner_team = ?, team1_score = ?, team2_score = ?, 
            duration = ?, ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await this.db.run(updateMatchSql, [
        winner,
        team1Score,
        team2Score,
        duration,
        matchId,
      ]);

      // Atualiza resultados dos jogadores
      for (const player of match.players) {
        const mmrCalc = mmrCalculations.find(
          (m) => m.playerId === player.playerId
        );
        if (mmrCalc) {
          const result = player.team === winner ? "win" : "loss";
          const updatePlayerSql = `
            UPDATE match_players 
            SET result = ?, mmr_change = ? 
            WHERE match_id = ? AND player_id = ?
          `;
          await this.db.run(updatePlayerSql, [
            result,
            mmrCalc.change,
            matchId,
            player.playerId,
          ]);

          // Atualiza MMR do jogador
          if (result === "win") {
            await PlayerModel.addWin(player.playerId, mmrCalc.change);
          } else {
            await PlayerModel.addLoss(player.playerId, mmrCalc.change);
          }

          // Registra no histórico de MMR
          const historySql = `
            INSERT INTO mmr_history (player_id, old_mmr, new_mmr, change, match_id, reason)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          await this.db.run(historySql, [
            player.playerId,
            mmrCalc.oldMmr,
            mmrCalc.newMmr,
            mmrCalc.change,
            matchId,
            `Partida ${matchId} - ${result}`,
          ]);
        }
      }
    });

    return mmrCalculations;
  }

  /**
   * Obtém estatísticas de uma partida
   */
  static async getMatchStats(matchId: number): Promise<{
    totalPlayers: number;
    averageMmr: { team1: number; team2: number };
    mmrDifference: number;
    roleDistribution: Record<string, number>;
    performanceStats: { min: number; max: number; average: number };
  } | null> {
    const match = await this.getMatchById(matchId);
    if (!match) return null;

    const players = match.players;
    const totalPlayers = players.length;

    if (totalPlayers === 0) return null;

    const team1Players = players.filter((p) => p.team === "team1");
    const team2Players = players.filter((p) => p.team === "team2");

    // Calcula MMR médio por time
    const team1Mmr =
      team1Players.reduce((sum, p) => sum + (p.mmrChange || 0), 0) /
      team1Players.length;
    const team2Mmr =
      team2Players.reduce((sum, p) => sum + (p.mmrChange || 0), 0) /
      team2Players.length;

    // Calcula distribuição de roles
    const roleDistribution: Record<string, number> = {};
    players.forEach((player) => {
      roleDistribution[player.role] = (roleDistribution[player.role] || 0) + 1;
    });

    // Calcula estatísticas de performance
    const performances = players
      .map((p) => p.performance)
      .filter((p) => p !== undefined);
    const performanceStats = {
      min: Math.min(...performances),
      max: Math.max(...performances),
      average:
        performances.reduce((sum, p) => sum + p, 0) / performances.length,
    };

    return {
      totalPlayers,
      averageMmr: { team1: team1Mmr, team2: team2Mmr },
      mmrDifference: Math.abs(team1Mmr - team2Mmr),
      roleDistribution,
      performanceStats,
    };
  }

  /**
   * Obtém histórico de partidas de um jogador
   */
  static async getPlayerMatchHistory(
    playerId: string,
    limit: number = 20
  ): Promise<MatchType[]> {
    const sql = `
      SELECT DISTINCT m.* FROM matches m
      INNER JOIN match_players mp ON m.id = mp.match_id
      WHERE mp.player_id = ? AND m.ended_at IS NOT NULL
      ORDER BY m.created_at DESC
      LIMIT ?
    `;

    const matches = await this.db.all(sql, [playerId, limit]);

    const result: MatchType[] = [];

    for (const match of matches) {
      const players = await this.getMatchPlayers(match.id);

      result.push({
        id: match.id,
        queueId: match.queue_id,
        winnerTeam: match.winner_team,
        createdAt: new Date(match.created_at),
        endedAt: match.ended_at ? new Date(match.ended_at) : undefined,
        duration: match.duration,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        players,
      } as MatchType);
    }

    return result;
  }

  /**
   * Obtém partidas recentes
   */
  static async getRecentMatches(limit: number = 20): Promise<MatchType[]> {
    const sql = `
      SELECT * FROM matches 
      WHERE ended_at IS NOT NULL
      ORDER BY ended_at DESC 
      LIMIT ?
    `;

    const matches = await this.db.all(sql, [limit]);

    const result: MatchType[] = [];

    for (const match of matches) {
      const players = await this.getMatchPlayers(match.id);

      result.push({
        id: match.id,
        queueId: match.queue_id,
        winnerTeam: match.winner_team,
        createdAt: new Date(match.created_at),
        endedAt: match.ended_at ? new Date(match.ended_at) : undefined,
        duration: match.duration,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        players,
      } as MatchType);
    }

    return result;
  }

  /**
   * Obtém partidas por período
   */
  static async getMatchesByPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<MatchType[]> {
    const sql = `
      SELECT * FROM matches 
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `;

    const matches = await this.db.all(sql, [
      startDate.toISOString(),
      endDate.toISOString(),
    ]);

    const result: MatchType[] = [];

    for (const match of matches) {
      const players = await this.getMatchPlayers(match.id);

      result.push({
        id: match.id,
        queueId: match.queue_id,
        winnerTeam: match.winner_team,
        createdAt: new Date(match.created_at),
        endedAt: match.ended_at ? new Date(match.ended_at) : undefined,
        duration: match.duration,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        players,
      } as MatchType);
    }

    return result;
  }

  /**
   * Cancela uma partida
   */
  static async cancelMatch(matchId: number): Promise<void> {
    const sql = `UPDATE matches SET ended_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.db.run(sql, [matchId]);
  }

  /**
   * Obtém partidas entre dois jogadores específicos
   */
  static async getMatchesBetweenPlayers(
    player1Id: string,
    player2Id: string
  ): Promise<MatchType[]> {
    const sql = `
      SELECT DISTINCT m.*, 
             mp1.team as player1_team,
             mp2.team as player2_team
      FROM matches m
      INNER JOIN match_players mp1 ON m.id = mp1.match_id AND mp1.player_id = ?
      INNER JOIN match_players mp2 ON m.id = mp2.match_id AND mp2.player_id = ?
      WHERE m.ended_at IS NOT NULL
      ORDER BY m.ended_at DESC
    `;

    const matches = await this.db.all(sql, [player1Id, player2Id]);
    const result: MatchType[] = [];

    for (const match of matches) {
      const players = await this.getMatchPlayers(match.id);

      // Organiza jogadores por time
      const team1Players = players.filter((p) => p.team === "team1");
      const team2Players = players.filter((p) => p.team === "team2");

      result.push({
        id: match.id,
        queueId: match.queue_id,
        winnerTeam: match.winner_team,
        createdAt: new Date(match.created_at),
        endedAt: match.ended_at ? new Date(match.ended_at) : undefined,
        duration: match.duration,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        players,
        team1Players,
        team2Players,
        teamSize: Math.max(team1Players.length, team2Players.length),
        finishedAt: match.ended_at ? new Date(match.ended_at) : undefined,
        winner: match.winner_team as "team1" | "team2",
      } as any);
    }

    return result;
  }

  /**
   * Obtém estatísticas gerais de partidas
   */
  static async getMatchStatistics(): Promise<{
    totalMatches: number;
    averageDuration: number;
    winRateByTeam: { team1: number; team2: number };
    totalPlayers: number;
    averageMmrChange: number;
  }> {
    const totalMatchesSql = `SELECT COUNT(*) as count FROM matches WHERE ended_at IS NOT NULL`;
    const totalMatches = await this.db.get(totalMatchesSql);

    const durationSql = `SELECT AVG(duration) as avg FROM matches WHERE duration IS NOT NULL`;
    const duration = await this.db.get(durationSql);

    const team1WinsSql = `SELECT COUNT(*) as count FROM matches WHERE winner_team = 'team1'`;
    const team1Wins = await this.db.get(team1WinsSql);

    const team2WinsSql = `SELECT COUNT(*) as count FROM matches WHERE winner_team = 'team2'`;
    const team2Wins = await this.db.get(team2WinsSql);

    const totalPlayersSql = `SELECT COUNT(DISTINCT player_id) as count FROM match_players`;
    const totalPlayers = await this.db.get(totalPlayersSql);

    const mmrChangeSql = `SELECT AVG(ABS(mmr_change)) as avg FROM match_players WHERE mmr_change IS NOT NULL`;
    const mmrChange = await this.db.get(mmrChangeSql);

    const total = totalMatches.count || 0;
    const team1WinRate = total > 0 ? (team1Wins.count / total) * 100 : 0;
    const team2WinRate = total > 0 ? (team2Wins.count / total) * 100 : 0;

    return {
      totalMatches: total,
      averageDuration: duration.avg || 0,
      winRateByTeam: { team1: team1WinRate, team2: team2WinRate },
      totalPlayers: totalPlayers.count || 0,
      averageMmrChange: mmrChange.avg || 0,
    };
  }
}
