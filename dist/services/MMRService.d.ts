import { Player, Team, MMRCalculation } from "../types";
export declare class MMRService {
    private static readonly BASE_MMR;
    private static readonly BASE_K_FACTOR;
    private static readonly MAX_K_FACTOR;
    private static readonly MIN_K_FACTOR;
    private static readonly STREAK_BONUS_THRESHOLD;
    private static readonly STREAK_MULTIPLIER;
    private static readonly PERFORMANCE_MULTIPLIER;
    private static readonly TEAM_BALANCE_PENALTY;
    private static readonly MMR_MULTIPLIERS;
    static calculateExpectedScore(team1Mmr: number, team2Mmr: number): number;
    static calculateKFactor(player: Player): number;
    static calculateStreakBonus(player: Player): number;
    static calculatePerformanceBonus(matchPlayer: any): number;
    static calculateMatchSizeMultiplier(teamSize: number): number;
    static calculateTeamBalanceBonus(team1: Team, team2: Team): number;
    static calculateMMRChange(player: Player, playerTeam: Team, opponentTeam: Team, result: "win" | "loss", performance?: number): MMRCalculation;
    static calculateMatchResults(team1: Team, team2: Team, winner: "team1" | "team2", playerPerformances: Map<string, number>, teamSize?: number): MMRCalculation[];
    static calculateInitialMMR(): number;
    static calculateInactivityPenalty(player: Player, daysInactive: number): number;
    static calculatePercentile(player: Player, allPlayers: Player[]): number;
    static calculateMMRConfidence(player: Player): number;
}
//# sourceMappingURL=MMRService.d.ts.map