"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordController = void 0;
const discord_js_1 = require("discord.js");
const Player_1 = require("../models/Player");
const Queue_1 = require("../models/Queue");
const Match_1 = require("../models/Match");
const SlashCommandService_1 = require("../services/SlashCommandService");
class DiscordController {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.slashCommandService = new SlashCommandService_1.SlashCommandService(config.clientId, config.token, config.guildId);
        this.setupMessageHandlers();
        this.setupSlashCommandHandlers();
    }
    async setupCommands() {
        console.log("🔧 Configurando comandos do Discord...");
        if (!this.config.guildId) {
            const guilds = await this.client.guilds.fetch();
            const firstGuild = guilds.first();
            if (firstGuild) {
                console.log(`🏠 Servidor detectado: ${firstGuild.name} (${firstGuild.id})`);
                this.slashCommandService.guildId = firstGuild.id;
            }
        }
        await this.slashCommandService.registerCommands();
    }
    setupSlashCommandHandlers() {
        this.client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            try {
                await this.slashCommandService.handleSlashCommand(interaction);
            }
            catch (error) {
                console.error('Erro ao processar comando slash:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: '❌ Ocorreu um erro ao processar o comando',
                        ephemeral: true
                    });
                }
                else {
                    await interaction.reply({
                        content: '❌ Ocorreu um erro ao processar o comando',
                        ephemeral: true
                    });
                }
            }
        });
    }
    setupMessageHandlers() {
        this.client.on("messageCreate", async (message) => {
            if (message.author.bot || message.channel.type !== discord_js_1.ChannelType.GuildText)
                return;
            const content = message.content.toLowerCase();
            const args = content.split(" ");
            try {
                switch (args[0]) {
                    case "!join":
                        await this.handleJoinQueue(message, args);
                        break;
                    case "!leave":
                        await this.handleLeaveQueue(message, args);
                        break;
                    case "!status":
                        await this.handleQueueStatus(message, args);
                        break;
                    case "!profile":
                        await this.handlePlayerProfile(message, args);
                        break;
                    case "!top":
                        await this.handleTopPlayers(message, args);
                        break;
                    case "!stats":
                        await this.handleGlobalStats(message, args);
                        break;
                    case "!help":
                        await this.handleHelp(message, args);
                        break;
                }
            }
            catch (error) {
                console.error("Erro ao processar comando:", error);
                await message.reply("❌ Ocorreu um erro ao processar o comando.");
            }
        });
    }
    async handleJoinQueue(message, args) {
        const discordId = message.author.id;
        const username = message.author.username;
        try {
            if (await Queue_1.Queue.isPlayerInQueue(discordId)) {
                await message.reply("❌ Você já está em uma fila!");
                return;
            }
            let player = await Player_1.Player.getPlayerByDiscordId(discordId);
            if (!player) {
                player = await Player_1.Player.createPlayer(discordId, username);
            }
            let activeQueue = await Queue_1.Queue.getActiveQueue();
            if (!activeQueue) {
                const queueId = await Queue_1.Queue.createQueue(10);
                activeQueue = await Queue_1.Queue.getQueueById(queueId);
            }
            if (!activeQueue) {
                await message.reply("❌ Erro ao criar/obter fila");
                return;
            }
            await Queue_1.Queue.addPlayerToQueue(activeQueue.id, discordId);
            const stats = await Queue_1.Queue.getQueueStats(activeQueue.id);
            if (!stats) {
                await message.reply("❌ Erro ao obter estatísticas da fila");
                return;
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🎮 Entrou na Fila ARAM!")
                .setColor("#00ff00")
                .addFields({ name: "👤 Jogador", value: username, inline: true }, { name: "📊 MMR", value: player.mmr.toString(), inline: true }, {
                name: "🏆 Vitórias",
                value: `${player.wins}/${player.gamesPlayed}`,
                inline: true,
            }, {
                name: "👥 Jogadores na fila",
                value: stats.totalPlayers.toString(),
                inline: true,
            }, {
                name: "⏱️ Tempo estimado",
                value: `${stats.estimatedWaitTime} min`,
                inline: true,
            }, {
                name: "📈 MMR médio",
                value: stats.averageMmr.toFixed(0),
                inline: true,
            })
                .setFooter({ text: `Fila #${activeQueue.id}` })
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao entrar na fila:", error);
            await message.reply("❌ Erro ao entrar na fila. Tente novamente.");
        }
    }
    async handleLeaveQueue(message, args) {
        const discordId = message.author.id;
        try {
            const playerQueue = await Queue_1.Queue.getPlayerQueue(discordId);
            if (!playerQueue) {
                await message.reply("❌ Você não está em nenhuma fila!");
                return;
            }
            await Queue_1.Queue.removePlayerFromQueue(playerQueue.id, discordId);
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🚪 Saiu da Fila")
                .setColor("#ff0000")
                .setDescription(`Você saiu da fila #${playerQueue.id}`)
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao sair da fila:", error);
            await message.reply("❌ Erro ao sair da fila. Tente novamente.");
        }
    }
    async handleQueueStatus(message, args) {
        try {
            const activeQueue = await Queue_1.Queue.getActiveQueue();
            if (!activeQueue) {
                await message.reply("📭 Não há filas ativas no momento.");
                return;
            }
            const stats = await Queue_1.Queue.getQueueStats(activeQueue.id);
            if (!stats) {
                await message.reply("❌ Erro ao obter estatísticas da fila");
                return;
            }
            const players = activeQueue.players.slice(0, 10);
            const playerList = players
                .map((p, i) => `${i + 1}. **${p.username}** (MMR: ${p.mmr})`)
                .join("\n");
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`📊 Status da Fila #${activeQueue.id}`)
                .setColor("#0099ff")
                .addFields({
                name: "👥 Jogadores",
                value: `${stats.totalPlayers}/${activeQueue.size}`,
                inline: true,
            }, {
                name: "⏱️ Tempo estimado",
                value: `${stats.estimatedWaitTime} min`,
                inline: true,
            }, {
                name: "📈 MMR médio",
                value: stats.averageMmr.toFixed(0),
                inline: true,
            }, {
                name: "📊 Faixa de MMR",
                value: `${stats.mmrRange.min} - ${stats.mmrRange.max}`,
                inline: true,
            }, {
                name: "🎭 Roles",
                value: Object.entries(stats.roleDistribution)
                    .map(([role, count]) => `${role}: ${count}`)
                    .join(", ") || "N/A",
                inline: true,
            })
                .addFields({
                name: "👤 Jogadores na fila",
                value: playerList || "Nenhum jogador",
                inline: false,
            })
                .setFooter({
                text: `Criada em ${activeQueue.createdAt.toLocaleString("pt-BR")}`,
            })
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter status da fila:", error);
            await message.reply("❌ Erro ao obter status da fila.");
        }
    }
    async handlePlayerProfile(message, args) {
        const targetUser = args[1]
            ? args[1].replace(/[<@!>]/g, "")
            : message.author.id;
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(targetUser);
            if (!player) {
                await message.reply("❌ Jogador não encontrado!");
                return;
            }
            const stats = await Player_1.Player.getPlayerStats(player.id);
            if (!stats) {
                await message.reply("❌ Erro ao obter estatísticas do jogador");
                return;
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`👤 Perfil de ${player.username}`)
                .setColor("#ff9900")
                .addFields({ name: "📊 MMR", value: player.mmr.toString(), inline: true }, { name: "🏆 Vitórias", value: player.wins.toString(), inline: true }, {
                name: "💔 Derrotas",
                value: player.losses.toString(),
                inline: true,
            }, { name: "📈 Taxa de vitória", value: stats.winRate, inline: true }, {
                name: "🎮 Jogos",
                value: player.gamesPlayed.toString(),
                inline: true,
            }, {
                name: "📊 Percentil",
                value: `${stats.percentile.toFixed(1)}%`,
                inline: true,
            }, {
                name: "🔥 Sequência atual",
                value: player.currentStreak.toString(),
                inline: true,
            }, {
                name: "🏅 Melhor sequência",
                value: player.bestStreak.toString(),
                inline: true,
            }, {
                name: "🎯 Confiança MMR",
                value: `${(stats.mmrConfidence * 100).toFixed(0)}%`,
                inline: true,
            })
                .setFooter({
                text: `Jogador desde ${player.createdAt.toLocaleDateString("pt-BR")}`,
            })
                .setTimestamp();
            if (player.preferredRoles.length > 0) {
                embed.addFields({
                    name: "🎭 Roles preferidas",
                    value: player.preferredRoles.join(", "),
                    inline: false,
                });
            }
            await message.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter perfil do jogador:", error);
            await message.reply("❌ Erro ao obter perfil do jogador.");
        }
    }
    async handleTopPlayers(message, args) {
        try {
            const limit = args[1] ? parseInt(args[1]) : 10;
            const players = await Player_1.Player.getTopPlayers(Math.min(limit, 25));
            if (players.length === 0) {
                await message.reply("📭 Nenhum jogador encontrado.");
                return;
            }
            const playerList = players
                .map((p, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                return `${medal} **${p.username}** - MMR: ${p.mmr} (${p.wins}W/${p.losses}L)`;
            })
                .join("\n");
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🏆 Top Jogadores")
                .setColor("#ffd700")
                .setDescription(playerList)
                .setFooter({ text: `Top ${players.length} jogadores por MMR` })
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter top jogadores:", error);
            await message.reply("❌ Erro ao obter top jogadores.");
        }
    }
    async handleGlobalStats(message, args) {
        try {
            const [playerStats, matchStats] = await Promise.all([
                Player_1.Player.getAllPlayers(),
                Match_1.Match.getMatchStatistics(),
            ]);
            const totalPlayers = playerStats.length;
            const activePlayers = playerStats.filter((p) => {
                if (!p.lastGameAt)
                    return false;
                const daysSinceLastGame = (Date.now() - p.lastGameAt.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceLastGame <= 30;
            }).length;
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("📊 Estatísticas Globais")
                .setColor("#00ff00")
                .addFields({
                name: "👥 Total de jogadores",
                value: totalPlayers.toString(),
                inline: true,
            }, {
                name: "🟢 Jogadores ativos (30d)",
                value: activePlayers.toString(),
                inline: true,
            }, {
                name: "🎮 Total de partidas",
                value: matchStats.totalMatches.toString(),
                inline: true,
            }, {
                name: "⏱️ Duração média",
                value: `${matchStats.averageDuration.toFixed(0)} min`,
                inline: true,
            }, {
                name: "📈 MMR médio",
                value: (playerStats.reduce((sum, p) => sum + p.mmr, 0) / totalPlayers).toFixed(0),
                inline: true,
            }, {
                name: "🔄 MMR médio por partida",
                value: matchStats.averageMmrChange.toFixed(1),
                inline: true,
            })
                .setFooter({ text: "Estatísticas em tempo real" })
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter estatísticas globais:", error);
            await message.reply("❌ Erro ao obter estatísticas globais.");
        }
    }
    async handleHelp(message, args) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("❓ Comandos Disponíveis")
            .setColor("#0099ff")
            .setDescription("Lista de todos os comandos disponíveis:")
            .addFields({ name: "!join", value: "Entra na fila ARAM", inline: true }, { name: "!leave", value: "Sai da fila atual", inline: true }, { name: "!status", value: "Mostra status da fila ativa", inline: true }, {
            name: "!profile [@user]",
            value: "Mostra perfil de um jogador",
            inline: true,
        }, {
            name: "!top [número]",
            value: "Mostra top jogadores (padrão: 10)",
            inline: true,
        }, { name: "!stats", value: "Mostra estatísticas globais", inline: true }, { name: "!help", value: "Mostra esta mensagem de ajuda", inline: true })
            .addFields({
            name: "📊 Sistema MMR",
            value: "O sistema usa um algoritmo Elo adaptado para ARAM, considerando performance individual, balanceamento de times e sequências de vitórias.",
            inline: false,
        }, {
            name: "⚖️ Balanceamento",
            value: "Times são formados automaticamente para maximizar o equilíbrio de MMR e distribuição de roles.",
            inline: false,
        })
            .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    async sendNotification(channelId, content, embed) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (channel?.isTextBased()) {
                if (embed) {
                    await channel.send({ content, embeds: [embed] });
                }
                else {
                    await channel.send(content);
                }
            }
        }
        catch (error) {
            console.error("Erro ao enviar notificação:", error);
        }
    }
    async notifyMatchFormed(queueId, team1, team2, channelId) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("⚔️ Partida Formada!")
            .setColor("#ff6b6b")
            .setDescription(`Fila #${queueId} está pronta!`)
            .addFields({
            name: "🔵 Time 1",
            value: team1.players.map((p) => p.username).join("\n"),
            inline: true,
        }, {
            name: "🔴 Time 2",
            value: team2.players.map((p) => p.username).join("\n"),
            inline: true,
        })
            .addFields({
            name: "📊 MMR Time 1",
            value: team1.averageMmr.toFixed(0),
            inline: true,
        }, {
            name: "📊 MMR Time 2",
            value: team2.averageMmr.toFixed(0),
            inline: true,
        }, {
            name: "⚖️ Diferença",
            value: Math.abs(team1.averageMmr - team2.averageMmr).toFixed(0),
            inline: true,
        })
            .setFooter({ text: "Entre no jogo e divirta-se!" })
            .setTimestamp();
        if (channelId) {
            await this.sendNotification(channelId, "🎮 **PARTIDA FORMADA!**", embed);
        }
    }
}
exports.DiscordController = DiscordController;
//# sourceMappingURL=DiscordController.js.map