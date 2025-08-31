export declare class QueueController {
    createQueue(size: number): Promise<number>;
    addPlayerToQueue(queueId: number, playerId: string): Promise<void>;
    removePlayerFromQueue(queueId: number, playerId: string): Promise<void>;
    getQueueStatus(queueId: number): Promise<any>;
    formTeams(queueId: number): Promise<any>;
    processCompleteQueue(queueId: number): Promise<any>;
    getAllQueueStats(): Promise<any[]>;
    cleanupOldQueues(maxAgeHours?: number): Promise<number>;
    getLongWaitingPlayers(queueId: number, maxWaitMinutes?: number): Promise<any[]>;
    removeInactivePlayers(queueId: number, maxInactiveMinutes?: number): Promise<number>;
    getBalanceRecommendations(queueId: number): Promise<any>;
    getPlayerQueueHistory(playerId: string, limit?: number): Promise<any[]>;
    getQueuePerformanceStats(queueId: number): Promise<any>;
    private calculateMMRVariance;
    private calculateRoleBalance;
    private calculateWaitTimeEfficiency;
}
//# sourceMappingURL=QueueController.d.ts.map