import { Player, Team, Role } from "../types";
export declare class TeamBalancerService {
    private static readonly MAX_MMR_DIFFERENCE;
    private static readonly IDEAL_MMR_DIFFERENCE;
    private static readonly ROLE_PRIORITY_WEIGHT;
    private static readonly MMR_WEIGHT;
    static balanceTeams(players: Player[], teamSize?: number): Team[];
    private static updateTeamStats;
    private static optimizeTeamBalance;
    private static calculateBalanceScore;
    private static calculateRoleBalance;
    private static getRoleDistribution;
    static areTeamsBalanced(team1: Team, team2: Team): boolean;
    static getBalanceStats(team1: Team, team2: Team): {
        mmrDifference: number;
        balanceScore: number;
        isBalanced: boolean;
        recommendations: string[];
    };
    static balanceTeamsWithRoles(players: Player[], teamSize?: number, requiredRoles?: Role[]): Team[];
    private static distributeRequiredRoles;
    private static distributeRemainingPlayers;
}
//# sourceMappingURL=TeamBalancerService.d.ts.map