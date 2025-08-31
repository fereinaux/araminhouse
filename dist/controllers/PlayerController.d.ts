export declare class PlayerController {
    createPlayer(discordId: string, username: string): Promise<any>;
    getPlayerProfile(discordId: string): Promise<any>;
    updatePlayer(discordId: string, data: any): Promise<any>;
    updatePreferredRoles(discordId: string, roles: string[]): Promise<any>;
    getPlayerRanking(limit?: number, offset?: number): Promise<any>;
    getPlayersByMMRRange(minMmr: number, maxMmr: number): Promise<any>;
    getActivePlayers(daysActive?: number): Promise<any>;
    resetPlayerStats(discordId: string): Promise<any>;
    getPlayerPerformanceStats(discordId: string): Promise<any>;
    getPlayerMMRHistory(discordId: string, limit?: number): Promise<any>;
    private calculateMMRTrend;
    private calculateConsistency;
    getPlayerComparison(player1Id: string, player2Id: string): Promise<any>;
}
//# sourceMappingURL=PlayerController.d.ts.map