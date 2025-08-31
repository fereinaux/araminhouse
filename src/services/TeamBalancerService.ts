import { Player, Team, Role } from "../types";

export class TeamBalancerService {
  private static readonly MAX_MMR_DIFFERENCE = 200;
  private static readonly IDEAL_MMR_DIFFERENCE = 100;
  private static readonly ROLE_PRIORITY_WEIGHT = 0.3;
  private static readonly MMR_WEIGHT = 0.7;

  /**
   * Distribui jogadores em times balanceados
   */
  static balanceTeams(players: Player[], teamSize?: number): Team[] {
    // Calcula automaticamente o tamanho do time baseado no número de jogadores
    if (!teamSize) {
      teamSize = Math.floor(players.length / 2);
    }

    if (players.length < teamSize * 2) {
      throw new Error("Número insuficiente de jogadores para formar times");
    }

    // Ordena jogadores por MMR
    const sortedPlayers = [...players].sort((a, b) => b.mmr - a.mmr);

    // Cria dois times vazios
    const team1: Team = {
      id: "team1",
      players: [],
      averageMmr: 0,
      totalMmr: 0,
    };
    const team2: Team = {
      id: "team2",
      players: [],
      averageMmr: 0,
      totalMmr: 0,
    };

    // Distribui jogadores alternadamente para manter o balanceamento
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      if (!player) continue;

      if (i % 2 === 0) {
        team1.players.push(player);
        this.updateTeamStats(team1);
      } else {
        team2.players.push(player);
        this.updateTeamStats(team2);
      }
    }

    // Otimiza o balanceamento trocando jogadores se necessário
    this.optimizeTeamBalance(team1, team2);

    return [team1, team2];
  }

  /**
   * Atualiza as estatísticas de um time
   */
  private static updateTeamStats(team: Team): void {
    if (team.players.length === 0) {
      team.totalMmr = 0;
      team.averageMmr = 0;
      return;
    }

    team.totalMmr = team.players.reduce((sum, player) => sum + player.mmr, 0);
    team.averageMmr = team.totalMmr / team.players.length;
  }

  /**
   * Otimiza o balanceamento entre os times
   */
  private static optimizeTeamBalance(team1: Team, team2: Team): void {
    let bestBalance = this.calculateBalanceScore(team1, team2);
    let improved = true;

    while (improved) {
      improved = false;

      for (let i = 0; i < team1.players.length; i++) {
        for (let j = 0; j < team2.players.length; j++) {
          // Tenta trocar jogadores
          const tempPlayer1 = team1.players[i];
          const tempPlayer2 = team2.players[j];

          if (!tempPlayer1 || !tempPlayer2) continue;

          // Faz a troca temporária
          team1.players[i] = tempPlayer2;
          team2.players[j] = tempPlayer1;

          // Atualiza estatísticas
          this.updateTeamStats(team1);
          this.updateTeamStats(team2);

          // Calcula novo score de balanceamento
          const newBalance = this.calculateBalanceScore(team1, team2);

          // Se melhorou, mantém a troca
          if (newBalance > bestBalance) {
            bestBalance = newBalance;
            improved = true;
          } else {
            // Desfaz a troca
            team1.players[i] = tempPlayer1;
            team2.players[j] = tempPlayer2;
            this.updateTeamStats(team1);
            this.updateTeamStats(team2);
          }
        }
      }
    }
  }

  /**
   * Calcula o score de balanceamento entre dois times
   */
  private static calculateBalanceScore(team1: Team, team2: Team): number {
    const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
    const roleBalance = this.calculateRoleBalance(team1, team2);

    // Score baseado na diferença de MMR (menor = melhor)
    const mmrScore = Math.max(0, 1 - mmrDifference / this.MAX_MMR_DIFFERENCE);

    // Score combinado
    return mmrScore * this.MMR_WEIGHT + roleBalance * this.ROLE_PRIORITY_WEIGHT;
  }

  /**
   * Calcula o balanceamento de roles entre os times
   */
  private static calculateRoleBalance(team1: Team, team2: Team): number {
    const roles1 = this.getRoleDistribution(team1);
    const roles2 = this.getRoleDistribution(team2);

    let totalDifference = 0;
    const allRoles = new Set([...Object.keys(roles1), ...Object.keys(roles2)]);

    for (const role of allRoles) {
      const count1 = roles1[role] || 0;
      const count2 = roles2[role] || 0;
      const difference = Math.abs(count1 - count2);
      totalDifference += difference;
    }

    // Normaliza para 0-1 (menor diferença = melhor)
    const maxDifference = allRoles.size * 5; // Assumindo máximo de 5 jogadores por role
    return Math.max(0, 1 - totalDifference / maxDifference);
  }

  /**
   * Obtém a distribuição de roles em um time
   */
  private static getRoleDistribution(team: Team): Record<string, number> {
    const roles: Record<string, number> = {};

    team.players.forEach((player) => {
      player.preferredRoles.forEach((role) => {
        roles[role] = (roles[role] || 0) + 1;
      });
    });

    return roles;
  }

  /**
   * Verifica se os times estão balanceados
   */
  static areTeamsBalanced(team1: Team, team2: Team): boolean {
    const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
    return mmrDifference <= this.MAX_MMR_DIFFERENCE;
  }

  /**
   * Obtém estatísticas de balanceamento
   */
  static getBalanceStats(
    team1: Team,
    team2: Team
  ): {
    mmrDifference: number;
    balanceScore: number;
    isBalanced: boolean;
    recommendations: string[];
  } {
    const mmrDifference = Math.abs(team1.averageMmr - team2.averageMmr);
    const balanceScore = this.calculateBalanceScore(team1, team2);
    const isBalanced = this.areTeamsBalanced(team1, team2);

    const recommendations: string[] = [];

    if (mmrDifference > this.IDEAL_MMR_DIFFERENCE) {
      recommendations.push(
        "Considerar redistribuir jogadores para reduzir diferença de MMR"
      );
    }

    if (balanceScore < 0.7) {
      recommendations.push("Verificar distribuição de roles entre os times");
    }

    return {
      mmrDifference,
      balanceScore,
      isBalanced,
      recommendations,
    };
  }

  /**
   * Cria times com distribuição específica de roles
   */
  static balanceTeamsWithRoles(
    players: Player[],
    teamSize: number = 5,
    requiredRoles: Role[] = []
  ): Team[] {
    // Primeiro, distribui jogadores com roles obrigatórios
    const teams = this.distributeRequiredRoles(
      players,
      teamSize,
      requiredRoles
    );

    // Depois, distribui os jogadores restantes
    const remainingPlayers = players.filter(
      (p) => !teams.some((team) => team.players.includes(p))
    );

    this.distributeRemainingPlayers(teams, remainingPlayers);

    // Otimiza o balanceamento final
    if (teams[0] && teams[1]) {
      this.optimizeTeamBalance(teams[0], teams[1]);
    }

    return teams;
  }

  /**
   * Distribui jogadores com roles obrigatórios
   */
  private static distributeRequiredRoles(
    players: Player[],
    teamSize: number,
    requiredRoles: Role[]
  ): Team[] {
    const team1: Team = {
      id: "team1",
      players: [],
      averageMmr: 0,
      totalMmr: 0,
    };
    const team2: Team = {
      id: "team2",
      players: [],
      averageMmr: 0,
      totalMmr: 0,
    };

    // Distribui roles obrigatórios alternadamente
    requiredRoles.forEach((role, index) => {
      const availablePlayers = players.filter(
        (p) =>
          p.preferredRoles.includes(role.name) &&
          !team1.players.includes(p) &&
          !team2.players.includes(p)
      );

      if (availablePlayers.length > 0) {
        const player = availablePlayers.sort((a, b) => b.mmr - a.mmr)[0];
        if (!player) return;

        if (index % 2 === 0) {
          team1.players.push(player);
        } else {
          team2.players.push(player);
        }
      }
    });

    return [team1, team2];
  }

  /**
   * Distribui jogadores restantes
   */
  private static distributeRemainingPlayers(
    teams: Team[],
    players: Player[]
  ): void {
    const sortedPlayers = [...players].sort((a, b) => b.mmr - a.mmr);

    sortedPlayers.forEach((player, index) => {
      if (!player) return;

      const targetTeam = index % 2 === 0 ? teams[0] : teams[1];
      if (targetTeam) {
        targetTeam.players.push(player);
        this.updateTeamStats(targetTeam);
      }
    });
  }
}
