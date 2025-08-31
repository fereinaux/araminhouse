import { Queue as QueueType, Player, Team, QueueStatus } from "../types";
export declare class Queue {
    private static db;
    static createQueue(size: number): Promise<number>;
    static addPlayerToQueue(queueId: number, playerId: string): Promise<void>;
    static removePlayerFromQueue(queueId: number, playerId: string): Promise<void>;
    static getQueuePlayers(queueId: number): Promise<Player[]>;
    static getActiveQueue(): Promise<QueueType | null>;
    static getActiveMatch(): Promise<QueueType | null>;
    static getQueueById(queueId: number): Promise<QueueType | null>;
    static updateQueueStatus(queueId: number, status: QueueStatus): Promise<void>;
    static clearQueue(queueId: number): Promise<void>;
    static isPlayerInQueue(playerId: string): Promise<boolean>;
    static getPlayerQueue(playerId: string): Promise<QueueType | null>;
    static isQueueReady(queueId: number): Promise<boolean>;
    static formTeams(queueId: number): Promise<{
        team1: Team;
        team2: Team;
        balanceStats: any;
    } | null>;
    static canFormTeamsFlexible(queueId: number): Promise<boolean>;
    static getQueueStats(queueId: number): Promise<{
        totalPlayers: number;
        averageMmr: number;
        mmrRange: {
            min: number;
            max: number;
        };
        roleDistribution: Record<string, number>;
        estimatedWaitTime: number;
    } | null>;
    static getQueueHistory(limit?: number): Promise<QueueType[]>;
    static getQueuesByStatus(status: QueueStatus): Promise<QueueType[]>;
    static removeInactivePlayers(queueId: number, maxInactiveMinutes?: number): Promise<number>;
    static getLongWaitingPlayers(queueId: number, maxWaitMinutes?: number): Promise<Player[]>;
}
//# sourceMappingURL=Queue.d.ts.map