import { Client, EmbedBuilder } from "discord.js";
import { DiscordConfig } from "../types";
export declare class DiscordController {
    private client;
    private config;
    private slashCommandService;
    constructor(client: Client, config: DiscordConfig);
    setupCommands(): Promise<void>;
    private setupSlashCommandHandlers;
    private setupMessageHandlers;
    private handleJoinQueue;
    private handleLeaveQueue;
    private handleQueueStatus;
    private handlePlayerProfile;
    private handleTopPlayers;
    private handleGlobalStats;
    private handleHelp;
    sendNotification(channelId: string, content: string, embed?: EmbedBuilder): Promise<void>;
    notifyMatchFormed(queueId: number, team1: any, team2: any, channelId?: string): Promise<void>;
}
//# sourceMappingURL=DiscordController.d.ts.map