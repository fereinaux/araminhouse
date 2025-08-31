import { Player as PlayerType } from "../types";
export declare class Player {
    private static db;
    static createPlayer(discordId: string, username: string): Promise<PlayerType>;
    static getPlayerById(id: string): Promise<PlayerType | null>;
    static getPlayerByDiscordId(discordId: string): Promise<PlayerType | null>;
    static updatePlayer(id: string, data: Partial<PlayerType>): Promise<PlayerType | null>;
    static getAllPlayers(): Promise<PlayerType[]>;
    static getTopPlayers(limit?: number): Promise<PlayerType[]>;
    static addWin(playerId: string, mmrChange: number): Promise<void>;
    static addLoss(playerId: string, mmrChange: number): Promise<void>;
    static resetPlayer(playerId: string): Promise<void>;
    static getPlayerStats(playerId: string): Promise<(PlayerType & {
        winRate: string;
        percentile: number;
        mmrConfidence: number;
    }) | null>;
    static updatePreferredRoles(playerId: string, roles: string[]): Promise<void>;
    static updateAverageKDA(playerId: string, kda: number): Promise<void>;
    static getPlayersByMMRRange(minMmr: number, maxMmr: number): Promise<PlayerType[]>;
    static updatePlayerMMR(discordId: string, newMmr: number): Promise<void>;
    static getPlayerRankingPosition(discordId: string): Promise<number | null>;
    static getTotalPlayers(): Promise<number>;
    static getActivePlayers(): Promise<PlayerType[]>;
}
//# sourceMappingURL=Player.d.ts.map