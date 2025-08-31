import { Match as MatchType, MatchPlayer, Team } from "../types";
export declare class Match {
    private static db;
    static createMatch(queueId: number, team1: Team, team2: Team): Promise<number>;
    static addPlayerToMatch(matchId: number, playerId: string, team: string, result: "win" | "loss" | "pending", role: string, performance: number): Promise<void>;
    static getMatchById(matchId: number): Promise<MatchType | null>;
    static getMatchPlayers(matchId: number): Promise<MatchPlayer[]>;
    static finishMatch(matchId: number, winner: "team1" | "team2", team1Score?: number, team2Score?: number, duration?: number): Promise<any[]>;
    static getMatchStats(matchId: number): Promise<{
        totalPlayers: number;
        averageMmr: {
            team1: number;
            team2: number;
        };
        mmrDifference: number;
        roleDistribution: Record<string, number>;
        performanceStats: {
            min: number;
            max: number;
            average: number;
        };
    } | null>;
    static getPlayerMatchHistory(playerId: string, limit?: number): Promise<MatchType[]>;
    static getRecentMatches(limit?: number): Promise<MatchType[]>;
    static getMatchesByPeriod(startDate: Date, endDate: Date): Promise<MatchType[]>;
    static cancelMatch(matchId: number): Promise<void>;
    static getMatchesBetweenPlayers(player1Id: string, player2Id: string): Promise<MatchType[]>;
    static getMatchStatistics(): Promise<{
        totalMatches: number;
        averageDuration: number;
        winRateByTeam: {
            team1: number;
            team2: number;
        };
        totalPlayers: number;
        averageMmrChange: number;
    }>;
}
//# sourceMappingURL=Match.d.ts.map