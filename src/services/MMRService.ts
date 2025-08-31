import { Player, Team, MMRCalculation, Match } from "../types";

export class MMRService {
  private static readonly BASE_MMR = 1000;
  private static readonly BASE_K_FACTOR = 32;
  private static readonly MAX_K_FACTOR = 40;
  private static readonly MIN_K_FACTOR = 16;
  private static readonly STREAK_BONUS_THRESHOLD = 3;
  private static readonly STREAK_MULTIPLIER = 1.2;
  private static readonly PERFORMANCE_MULTIPLIER = 0.1;
  private static readonly TEAM_BALANCE_PENALTY = 0.05;

  // Multiplicadores de MMR baseados no tamanho da partida
  private static readonly MMR_MULTIPLIERS = {
    2: 0.3, // 2v2: MMR muito baixo (30%)
    3: 0.5, // 3v3: MMR baixo (50%)
    4: 0.7, // 4v4: MMR reduzido (70%)
    5: 1.0, // 5v5: MMR normal (100%)
  };

  /**
   * Calcula o MMR esperado baseado na diferença de MMR entre times
   */
  static calculateExpectedScore(team1Mmr: number, team2Mmr: number): number {
    const mmrDifference = team1Mmr - team2Mmr;
    return 1 / (1 + Math.pow(10, mmrDifference / 400));
  }

  /**
   * Calcula o fator K dinâmico baseado no número de jogos e MMR atual
   */
  static calculateKFactor(player: Player): number {
    let kFactor = this.BASE_K_FACTOR;

    // Ajusta baseado no número de jogos
    if (player.gamesPlayed < 30) {
      kFactor = this.MAX_K_FACTOR; // Novos jogadores têm K mais alto
    } else if (player.gamesPlayed > 100) {
      kFactor = this.MIN_K_FACTOR; // Jogadores experientes têm K mais baixo
    }

    // Ajusta baseado no MMR atual
    if (player.mmr > 2000) {
      kFactor *= 0.8; // Jogadores de alto MMR têm mudanças menores
    } else if (player.mmr < 800) {
      kFactor *= 1.2; // Jogadores de baixo MMR têm mudanças maiores
    }

    return Math.max(this.MIN_K_FACTOR, Math.min(this.MAX_K_FACTOR, kFactor));
  }

  /**
   * Calcula o bônus de streak para jogadores em sequência
   */
  static calculateStreakBonus(player: Player): number {
    if (player.currentStreak >= this.STREAK_BONUS_THRESHOLD) {
      return Math.min(
        0.3,
        (player.currentStreak - this.STREAK_BONUS_THRESHOLD + 1) * 0.1
      );
    }
    return 0;
  }

  /**
   * Calcula o bônus de performance baseado no KDA e outros fatores
   */
  static calculatePerformanceBonus(matchPlayer: any): number {
    let bonus = 0;

    if (matchPlayer.performance > 0.7) {
      bonus += 0.1; // Bônus para jogadores com boa performance
    } else if (matchPlayer.performance < 0.3) {
      bonus -= 0.1; // Penalidade para jogadores com baixa performance
    }

    return bonus;
  }

  /**
   * Calcula o multiplicador de MMR baseado no tamanho da partida
   */
  static calculateMatchSizeMultiplier(teamSize: number): number {
    return (
      this.MMR_MULTIPLIERS[teamSize as keyof typeof this.MMR_MULTIPLIERS] || 1.0
    );
  }

  /**
   * Calcula o bônus/penalidade de balanceamento de times
   */
  static calculateTeamBalanceBonus(team1: Team, team2: Team): number {
    const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
    const maxAllowedDifference = 200; // Diferença máxima recomendada

    if (mmrDifference > maxAllowedDifference) {
      // Penaliza times desbalanceados
      return (
        -this.TEAM_BALANCE_PENALTY * (mmrDifference / maxAllowedDifference)
      );
    }

    return 0.05; // Bônus para times balanceados
  }

  /**
   * Calcula a mudança de MMR para um jogador em uma partida
   */
  static calculateMMRChange(
    player: Player,
    playerTeam: Team,
    opponentTeam: Team,
    result: "win" | "loss",
    performance: number = 0.5
  ): MMRCalculation {
    const expectedScore = this.calculateExpectedScore(
      playerTeam.averageMmr,
      opponentTeam.averageMmr
    );
    const actualScore = result === "win" ? 1 : 0;

    const kFactor = this.calculateKFactor(player);
    const streakBonus = this.calculateStreakBonus(player);
    const performanceBonus = this.calculatePerformanceBonus({ performance });
    const teamBalanceBonus = this.calculateTeamBalanceBonus(
      playerTeam,
      opponentTeam
    );

    // Calcula a mudança base de MMR
    let mmrChange = kFactor * (actualScore - expectedScore);

    // Aplica modificadores
    mmrChange *= 1 + streakBonus + performanceBonus + teamBalanceBonus;

    // Limita a mudança máxima
    const maxChange = kFactor * 2;
    mmrChange = Math.max(-maxChange, Math.min(maxChange, mmrChange));

    const newMmr = Math.max(0, player.mmr + mmrChange);

    return {
      playerId: player.id,
      oldMmr: player.mmr,
      newMmr,
      change: mmrChange,
      expectedScore,
      actualScore,
      kFactor,
    };
  }

  /**
   * Atualiza o MMR de todos os jogadores após uma partida
   */
  static calculateMatchResults(
    team1: Team,
    team2: Team,
    winner: "team1" | "team2",
    playerPerformances: Map<string, number>,
    teamSize: number = 5
  ): MMRCalculation[] {
    const results: MMRCalculation[] = [];
    const matchSizeMultiplier = this.calculateMatchSizeMultiplier(teamSize);

    // Calcula MMR para jogadores do time 1
    team1.players.forEach((player) => {
      const performance = playerPerformances.get(player.id) || 0.5;
      const result = winner === "team1" ? "win" : "loss";

      const mmrCalc = this.calculateMMRChange(
        player,
        team1,
        team2,
        result,
        performance
      );

      // Aplica multiplicador baseado no tamanho da partida
      mmrCalc.change *= matchSizeMultiplier;
      mmrCalc.newMmr = Math.max(0, player.mmr + mmrCalc.change);

      results.push(mmrCalc);
    });

    // Calcula MMR para jogadores do time 2
    team2.players.forEach((player) => {
      const performance = playerPerformances.get(player.id) || 0.5;
      const result = winner === "team2" ? "win" : "loss";

      const mmrCalc = this.calculateMMRChange(
        player,
        team2,
        team1,
        result,
        performance
      );

      // Aplica multiplicador baseado no tamanho da partida
      mmrCalc.change *= matchSizeMultiplier;
      mmrCalc.newMmr = Math.max(0, player.mmr + mmrCalc.change);

      results.push(mmrCalc);
    });

    return results;
  }

  /**
   * Calcula o MMR inicial para um novo jogador
   */
  static calculateInitialMMR(): number {
    return this.BASE_MMR;
  }

  /**
   * Ajusta MMR para jogadores inativos
   */
  static calculateInactivityPenalty(
    player: Player,
    daysInactive: number
  ): number {
    if (daysInactive < 30) return 0;

    const penalty = Math.min(50, daysInactive * 0.5);
    return -penalty;
  }

  /**
   * Calcula o ranking percentil de um jogador
   */
  static calculatePercentile(player: Player, allPlayers: Player[]): number {
    const sortedPlayers = [...allPlayers].sort((a, b) => b.mmr - a.mmr);
    const playerIndex = sortedPlayers.findIndex((p) => p.id === player.id);

    if (playerIndex === -1) return 0;

    return ((sortedPlayers.length - playerIndex) / sortedPlayers.length) * 100;
  }

  /**
   * Calcula a confiabilidade do MMR de um jogador
   */
  static calculateMMRConfidence(player: Player): number {
    if (player.gamesPlayed < 10) return 0.3;
    if (player.gamesPlayed < 30) return 0.6;
    if (player.gamesPlayed < 100) return 0.8;
    return 0.95;
  }
}
