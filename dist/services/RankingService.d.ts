export interface LoLRanking {
    tier: string;
    division: string;
    lp: number;
    rank: number;
    totalPlayers: number;
    nextRank?: string;
    nextRankLP?: number;
}
export declare class RankingService {
    private static readonly TIERS;
    private static readonly DIVISIONS;
    private static readonly LP_PER_DIVISION;
    private static readonly TIER_MMR_BASES;
    static calculateLoLRanking(mmr: number, totalPlayers: number): LoLRanking;
    private static getNextTier;
    private static getNextRank;
    private static calculateNextRankLP;
    private static calculateRank;
    static getTierEmoji(tier: string): string;
    static getTierColor(tier: string): string;
    static formatRanking(tier: string, division: string, lp: number): string;
    static getProgressToNextRank(lp: number): string;
}
//# sourceMappingURL=RankingService.d.ts.map