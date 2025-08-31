export interface LoLRanking {
  tier: string;
  division: string;
  lp: number;
  rank: number;
  totalPlayers: number;
  nextRank?: string;
  nextRankLP?: number;
}

export class RankingService {
  // Definição dos tiers e divisões baseado no LoL
  private static readonly TIERS = [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
  ];

  private static readonly DIVISIONS = ["IV", "III", "II", "I"];

  // Pontos necessários para cada divisão
  private static readonly LP_PER_DIVISION = 100;

  // MMR base para cada tier
  private static readonly TIER_MMR_BASES = {
    Iron: 0,
    Bronze: 400,
    Silver: 800,
    Gold: 1200,
    Platinum: 1600,
    Diamond: 2000,
    Master: 2400,
    Grandmaster: 2800,
    Challenger: 3200,
  };

  /**
   * Calcula o ranking LoL baseado no MMR
   */
  static calculateLoLRanking(mmr: number, totalPlayers: number): LoLRanking {
    // Determina o tier baseado no MMR
    let tier: string = "Iron";
    let division: string = "IV";
    let lp = 0;

    // Encontra o tier apropriado
    for (let i = this.TIERS.length - 1; i >= 0; i--) {
      const currentTier = this.TIERS[i];
      const baseMmr =
        this.TIER_MMR_BASES[currentTier as keyof typeof this.TIER_MMR_BASES];

      if (mmr >= baseMmr) {
        tier = currentTier!;
        break;
      }
    }

    // Calcula a divisão e LP
    const baseMmr =
      this.TIER_MMR_BASES[tier as keyof typeof this.TIER_MMR_BASES];
    const mmrAboveBase = mmr - baseMmr;

    if (tier === "Challenger") {
      // Challenger é especial - apenas top jogadores
      division = "";
      lp = mmrAboveBase;
    } else if (tier === "Master" || tier === "Grandmaster") {
      // Master e Grandmaster não têm divisões
      division = "";
      lp = mmrAboveBase;
    } else {
      // Tiers normais com divisões
      const totalDivisions = this.DIVISIONS.length;
      const mmrPerDivision =
        (this.TIER_MMR_BASES[
          this.getNextTier(tier) as keyof typeof this.TIER_MMR_BASES
        ] -
          baseMmr) /
        totalDivisions;

      const divisionIndex = Math.floor(mmrAboveBase / mmrPerDivision);
      division = this.DIVISIONS[Math.min(divisionIndex, totalDivisions - 1)]!;

      const mmrInDivision = mmrAboveBase % mmrPerDivision;
      lp = Math.floor((mmrInDivision / mmrPerDivision) * this.LP_PER_DIVISION);
    }

    // Calcula a posição no ranking geral
    const rank = this.calculateRank(mmr, totalPlayers);

    // Calcula próximo rank
    const nextRank = this.getNextRank(tier, division);
    const nextRankLP = this.calculateNextRankLP(tier, division, mmr);

    return {
      tier,
      division,
      lp,
      rank,
      totalPlayers,
      nextRank,
      nextRankLP,
    };
  }

  /**
   * Obtém o próximo tier
   */
  private static getNextTier(currentTier: string): string {
    const currentIndex = this.TIERS.indexOf(currentTier);
    if (currentIndex < this.TIERS.length - 1) {
      return this.TIERS[currentIndex + 1]!;
    }
    return currentTier;
  }

  /**
   * Obtém o próximo rank
   */
  private static getNextRank(tier: string, division: string): string {
    if (tier === "Challenger") {
      return "Challenger (manter posição)";
    }

    if (tier === "Grandmaster") {
      return "Challenger";
    }

    if (tier === "Master") {
      return "Grandmaster";
    }

    // Para tiers com divisões
    const divisionIndex = this.DIVISIONS.indexOf(division);
    if (divisionIndex > 0) {
      // Próxima divisão no mesmo tier
      return `${tier} ${this.DIVISIONS[divisionIndex - 1]}`;
    } else {
      // Próximo tier
      return this.getNextTier(tier);
    }
  }

  /**
   * Calcula LP necessários para o próximo rank
   */
  private static calculateNextRankLP(
    tier: string,
    division: string,
    currentMmr: number
  ): number {
    if (tier === "Challenger") {
      return 0; // Já está no topo
    }

    const baseMmr =
      this.TIER_MMR_BASES[tier as keyof typeof this.TIER_MMR_BASES];
    const mmrAboveBase = currentMmr - baseMmr;

    if (tier === "Master" || tier === "Grandmaster") {
      const nextTier = this.getNextTier(tier);
      const nextTierMmr =
        this.TIER_MMR_BASES[nextTier as keyof typeof this.TIER_MMR_BASES];
      return nextTierMmr - currentMmr;
    }

    // Para tiers com divisões
    const divisionIndex = this.DIVISIONS.indexOf(division);
    if (divisionIndex > 0) {
      // Próxima divisão no mesmo tier
      const mmrPerDivision =
        (this.TIER_MMR_BASES[
          this.getNextTier(tier) as keyof typeof this.TIER_MMR_BASES
        ] -
          baseMmr) /
        this.DIVISIONS.length;
      const nextDivisionMmr = baseMmr + mmrPerDivision * (divisionIndex - 1);
      return nextDivisionMmr - currentMmr;
    } else {
      // Próximo tier
      const nextTier = this.getNextTier(tier);
      const nextTierMmr =
        this.TIER_MMR_BASES[nextTier as keyof typeof this.TIER_MMR_BASES];
      return nextTierMmr - currentMmr;
    }
  }

  /**
   * Calcula a posição no ranking geral
   */
  private static calculateRank(mmr: number, totalPlayers: number): number {
    // Implementação simples baseada no MMR
    // Em um sistema real, isso seria baseado na posição real no banco
    return Math.max(1, Math.floor(totalPlayers - mmr / 100 + 1));
  }

  /**
   * Obtém o emoji para cada tier
   */
  static getTierEmoji(tier: string): string {
    const emojis: { [key: string]: string } = {
      Iron: "🥉",
      Bronze: "🥉",
      Silver: "🥈",
      Gold: "🥇",
      Platinum: "💎",
      Diamond: "💎",
      Master: "👑",
      Grandmaster: "👑",
      Challenger: "👑",
    };
    return emojis[tier] || "🏆";
  }

  /**
   * Obtém a cor para cada tier
   */
  static getTierColor(tier: string): string {
    const colors: { [key: string]: string } = {
      Iron: "#8B4513",
      Bronze: "#CD7F32",
      Silver: "#C0C0C0",
      Gold: "#FFD700",
      Platinum: "#E5E4E2",
      Diamond: "#B9F2FF",
      Master: "#FF6B6B",
      Grandmaster: "#FF8C00",
      Challenger: "#FF1493",
    };
    return colors[tier] || "#00FF00";
  }

  /**
   * Formata o ranking para exibição
   */
  static formatRanking(tier: string, division: string, lp: number): string {
    if (tier === "Challenger" || tier === "Master" || tier === "Grandmaster") {
      return `${this.getTierEmoji(tier)} **${tier}** (${lp} LP)`;
    }
    return `${this.getTierEmoji(tier)} **${tier} ${division}** (${lp} LP)`;
  }

  /**
   * Obtém o progresso para o próximo rank
   */
  static getProgressToNextRank(lp: number): string {
    const percentage = Math.floor((lp / this.LP_PER_DIVISION) * 100);
    return `${percentage}%`;
  }
}
