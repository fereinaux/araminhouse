import { ChatInputCommandInteraction } from "discord.js";
export declare class SlashCommandService {
    private rest;
    private clientId;
    private guildId;
    constructor(clientId: string, token: string, guildId?: string);
    registerCommands(): Promise<void>;
    private buildCommands;
    handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    private handleJoin;
    private handleLeave;
    private handleStatus;
    private handleProfile;
    private handleTop;
    private handleVersus;
    private handleStats;
    private handleHelp;
    private handleAdmin;
}
//# sourceMappingURL=SlashCommandService.d.ts.map