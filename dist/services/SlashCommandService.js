"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlashCommandService = void 0;
const discord_js_1 = require("discord.js");
const Player_1 = require("../models/Player");
const Queue_1 = require("../models/Queue");
const Match_1 = require("../models/Match");
const RankingService_1 = require("../services/RankingService");
class SlashCommandService {
    constructor(clientId, token, guildId) {
        this.clientId = clientId;
        this.guildId = guildId;
        this.rest = new discord_js_1.REST({ version: "10" }).setToken(token);
    }
    async registerCommands() {
        const commands = this.buildCommands();
        try {
            console.log("🔄 Limpando e registrando comandos slash...");
            if (this.guildId) {
                try {
                    console.log("🗑️ Forçando limpeza completa de comandos...");
                    await this.rest.put(discord_js_1.Routes.applicationGuildCommands(this.clientId, this.guildId), { body: [] });
                    console.log("✅ Todos os comandos foram limpos");
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
                catch (error) {
                    console.log("ℹ️ Limpeza em lote falhou, tentando individualmente...");
                    try {
                        const existingCommands = (await this.rest.get(discord_js_1.Routes.applicationGuildCommands(this.clientId, this.guildId)));
                        if (existingCommands && existingCommands.length > 0) {
                            console.log(`🗑️ Removendo ${existingCommands.length} comandos individualmente...`);
                            for (const command of existingCommands) {
                                await this.rest.delete(discord_js_1.Routes.applicationGuildCommand(this.clientId, this.guildId, command.id));
                            }
                            console.log("✅ Comandos antigos removidos individualmente");
                            await new Promise((resolve) => setTimeout(resolve, 2000));
                        }
                    }
                    catch (error2) {
                        console.log("⚠️ Erro ao remover comandos individualmente:", error2);
                    }
                }
                await this.rest.put(discord_js_1.Routes.applicationGuildCommands(this.clientId, this.guildId), { body: commands });
                console.log(`✅ ${commands.length} comandos registrados para o servidor ${this.guildId}`);
            }
            else {
                await this.rest.put(discord_js_1.Routes.applicationCommands(this.clientId), {
                    body: commands,
                });
                console.log("✅ Comandos globais registrados (pode demorar até 1 hora para aparecer)");
            }
        }
        catch (error) {
            console.error("❌ Erro ao registrar comandos:", error);
        }
    }
    buildCommands() {
        return [
            new discord_js_1.SlashCommandBuilder()
                .setName("join")
                .setDescription("Entra na fila ARAM")
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("leave")
                .setDescription("Sai da fila atual")
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("status")
                .setDescription("Mostra status da fila ativa")
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("profile")
                .setDescription("Mostra perfil de um jogador")
                .addUserOption((option) => option
                .setName("user")
                .setDescription("Usuário para ver o perfil (deixe vazio para ver o seu)")
                .setRequired(false))
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("top")
                .setDescription("Mostra top jogadores")
                .addIntegerOption((option) => option
                .setName("limit")
                .setDescription("Número de jogadores para mostrar (1-25)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25))
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("stats")
                .setDescription("Mostra estatísticas globais")
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("versus")
                .setDescription("Mostra histórico de partidas entre dois jogadores")
                .addUserOption((option) => option
                .setName("player1")
                .setDescription("Primeiro jogador")
                .setRequired(true))
                .addUserOption((option) => option
                .setName("player2")
                .setDescription("Segundo jogador")
                .setRequired(true))
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("help")
                .setDescription("Mostra ajuda sobre os comandos")
                .toJSON(),
            new discord_js_1.SlashCommandBuilder()
                .setName("admin")
                .setDescription("Comandos administrativos")
                .addSubcommand((subcommand) => subcommand
                .setName("reset-player")
                .setDescription("Reseta estatísticas de um jogador")
                .addUserOption((option) => option
                .setName("user")
                .setDescription("Usuário para resetar")
                .setRequired(true)))
                .addSubcommand((subcommand) => subcommand
                .setName("punish")
                .setDescription("Pune um jogador reduzindo seu MMR")
                .addUserOption((option) => option
                .setName("user")
                .setDescription("Usuário para punir")
                .setRequired(true))
                .addIntegerOption((option) => option
                .setName("points")
                .setDescription("Pontos de MMR para reduzir (1-100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
                .addStringOption((option) => option
                .setName("reason")
                .setDescription("Motivo da punição")
                .setRequired(false)))
                .addSubcommand((subcommand) => subcommand
                .setName("start")
                .setDescription("Inicia partida com qualquer número par de jogadores (2v2, 3v3, 4v4, 5v5)"))
                .addSubcommand((subcommand) => subcommand.setName("clear-queue").setDescription("Limpa a fila atual"))
                .addSubcommand((subcommand) => subcommand
                .setName("add-bot")
                .setDescription("Adiciona bot à fila para completar times")
                .addIntegerOption((option) => option
                .setName("count")
                .setDescription("Número de bots para adicionar")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)))
                .addSubcommand((subcommand) => subcommand
                .setName("finish-match")
                .setDescription("Finaliza uma partida e registra resultados")
                .addStringOption((option) => option
                .setName("winner")
                .setDescription("Time vencedor (team1 ou team2)")
                .setRequired(true)
                .addChoices({ name: "Time 1", value: "team1" }, { name: "Time 2", value: "team2" })))
                .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
                .toJSON(),
        ];
    }
    async handleSlashCommand(interaction) {
        const { commandName } = interaction;
        try {
            switch (commandName) {
                case "join":
                    await this.handleJoin(interaction);
                    break;
                case "leave":
                    await this.handleLeave(interaction);
                    break;
                case "status":
                    await this.handleStatus(interaction);
                    break;
                case "profile":
                    await this.handleProfile(interaction);
                    break;
                case "top":
                    await this.handleTop(interaction);
                    break;
                case "stats":
                    await this.handleStats(interaction);
                    break;
                case "versus":
                    await this.handleVersus(interaction);
                    break;
                case "help":
                    await this.handleHelp(interaction);
                    break;
                case "admin":
                    await this.handleAdmin(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "❌ Comando não reconhecido",
                        ephemeral: true,
                    });
            }
        }
        catch (error) {
            console.error(`Erro ao processar comando ${commandName}:`, error);
            await interaction.reply({
                content: "❌ Ocorreu um erro ao processar o comando",
                ephemeral: true,
            });
        }
    }
    async handleJoin(interaction) {
        const discordId = interaction.user.id;
        const username = interaction.user.username;
        try {
            if (await Queue_1.Queue.isPlayerInQueue(discordId)) {
                await interaction.reply({
                    content: "❌ Você já está em uma fila!",
                    ephemeral: true,
                });
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
                await interaction.reply({
                    content: "❌ Erro ao criar/obter fila",
                    ephemeral: true,
                });
                return;
            }
            if (activeQueue.players.length >= activeQueue.size) {
                await interaction.reply({
                    content: "❌ A fila está cheia! Aguarde uma vaga ou use `/admin start` para iniciar a partida.",
                    ephemeral: true,
                });
                return;
            }
            await Queue_1.Queue.addPlayerToQueue(activeQueue.id, discordId);
            const stats = await Queue_1.Queue.getQueueStats(activeQueue.id);
            if (!stats) {
                await interaction.reply({
                    content: "❌ Erro ao obter estatísticas da fila",
                    ephemeral: true,
                });
                return;
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🎮 Entrou na Fila ARAM!")
                .setColor("#00ff00")
                .addFields({ name: "👤 Jogador", value: username, inline: true }, {
                name: "📊 MMR",
                value: Math.ceil(player.mmr).toString(),
                inline: true,
            }, {
                name: "🎮 Ranking LoL",
                value: (() => {
                    const lolRanking = RankingService_1.RankingService.calculateLoLRanking(player.mmr, stats.totalPlayers);
                    return RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp);
                })(),
                inline: true,
            }, {
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
                value: Math.ceil(stats.averageMmr).toString(),
                inline: true,
            })
                .setFooter({ text: `Fila #${activeQueue.id}` })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao entrar na fila:", error);
            await interaction.reply({
                content: "❌ Erro ao entrar na fila. Tente novamente.",
                ephemeral: true,
            });
        }
    }
    async handleLeave(interaction) {
        const discordId = interaction.user.id;
        try {
            const playerQueue = await Queue_1.Queue.getPlayerQueue(discordId);
            if (!playerQueue) {
                await interaction.reply({
                    content: "❌ Você não está em nenhuma fila!",
                    ephemeral: true,
                });
                return;
            }
            await Queue_1.Queue.removePlayerFromQueue(playerQueue.id, discordId);
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🚪 Saiu da Fila")
                .setColor("#ff0000")
                .setDescription(`Você saiu da fila #${playerQueue.id}`)
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao sair da fila:", error);
            await interaction.reply({
                content: "❌ Erro ao sair da fila. Tente novamente.",
                ephemeral: true,
            });
        }
    }
    async handleStatus(interaction) {
        try {
            const activeQueue = await Queue_1.Queue.getActiveQueue();
            const activeMatch = await Queue_1.Queue.getActiveMatch();
            if (!activeQueue && !activeMatch) {
                const noActivityEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle("📊 Status do Sistema")
                    .setColor("#ff6b6b")
                    .setDescription("❌ **Nenhuma fila ou partida ativa**\n\nUse `/queue join` para entrar na fila!")
                    .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
                    .setTimestamp();
                await interaction.reply({
                    embeds: [noActivityEmbed],
                    ephemeral: false,
                });
                return;
            }
            if (activeMatch && activeMatch.status === "forming") {
                const matchEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle(`⚔️ Partida Ativa #${activeMatch.id}`)
                    .setColor("#ff9900")
                    .addFields({
                    name: "👥 Jogadores",
                    value: activeMatch.players.length.toString(),
                    inline: true,
                }, {
                    name: "🎮 Formato",
                    value: `${Math.floor(activeMatch.players.length / 2)}v${Math.floor(activeMatch.players.length / 2)}`,
                    inline: true,
                }, {
                    name: "🕐 Iniciada em",
                    value: activeMatch.startedAt
                        ? `${activeMatch.startedAt.toLocaleDateString("pt-BR")}, ${activeMatch.startedAt.toLocaleTimeString("pt-BR")}`
                        : "Agora",
                    inline: true,
                })
                    .setFooter({
                    text: `Partida #${activeMatch.id} • ${Math.floor(activeMatch.players.length / 2)}v${Math.floor(activeMatch.players.length / 2)}`,
                })
                    .setTimestamp();
                if (activeMatch.players.length > 0) {
                    const playerList = activeMatch.players
                        .map((p, i) => {
                        const lolRanking = RankingService_1.RankingService.calculateLoLRanking(p.mmr, activeMatch.players.length);
                        const rankingDisplay = RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp);
                        return `${i + 1}. **${p.username}** - ${rankingDisplay}`;
                    })
                        .join("\n");
                    matchEmbed.addFields({
                        name: "👤 Jogadores na partida",
                        value: playerList,
                        inline: false,
                    });
                }
                matchEmbed.addFields({
                    name: "🎯 Para finalizar a partida, use:",
                    value: "`/admin finish-match winner:team1`\n`/admin finish-match winner:team2`",
                    inline: false,
                });
                await interaction.reply({
                    embeds: [matchEmbed],
                    ephemeral: false,
                });
            }
            else if (activeQueue && activeQueue.status === "waiting") {
                const stats = await Queue_1.Queue.getQueueStats(activeQueue.id);
                if (stats) {
                    const queueEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle(`🎮 Fila Ativa #${activeQueue.id}`)
                        .setColor("#00ff00")
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
                        value: Math.ceil(stats.averageMmr).toString(),
                        inline: true,
                    }, {
                        name: "📊 Faixa de MMR",
                        value: `${Math.ceil(stats.mmrRange.min)} - ${Math.ceil(stats.mmrRange.max)}`,
                        inline: true,
                    }, {
                        name: "🎭 Roles",
                        value: Object.entries(stats.roleDistribution)
                            .map(([role, count]) => `${role}: ${count}`)
                            .join(", ") || "N/A",
                        inline: true,
                    })
                        .setFooter({
                        text: `Criada em ${activeQueue.createdAt.toLocaleDateString("pt-BR")}, ${activeQueue.createdAt.toLocaleTimeString("pt-BR")}`,
                    })
                        .setTimestamp();
                    if (activeQueue.players.length > 0) {
                        const playerList = activeQueue.players
                            .map((p, i) => {
                            const lolRanking = RankingService_1.RankingService.calculateLoLRanking(p.mmr, activeQueue.players.length);
                            const rankingDisplay = RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp);
                            return `${i + 1}. **${p.username}** - ${rankingDisplay}`;
                        })
                            .join("\n");
                        queueEmbed.addFields({
                            name: "👤 Jogadores na fila",
                            value: playerList,
                            inline: false,
                        });
                    }
                    await interaction.reply({
                        embeds: [queueEmbed],
                        ephemeral: false,
                    });
                }
            }
        }
        catch (error) {
            console.error("Erro ao obter status:", error);
            await interaction.reply({
                content: "❌ Erro ao obter status do sistema",
                ephemeral: true,
            });
        }
    }
    async handleProfile(interaction) {
        const targetUser = interaction.options.getUser("user") || interaction.user;
        try {
            const player = await Player_1.Player.getPlayerByDiscordId(targetUser.id);
            if (!player) {
                await interaction.reply({
                    content: "❌ Jogador não encontrado!",
                    ephemeral: true,
                });
                return;
            }
            const stats = await Player_1.Player.getPlayerStats(player.id);
            if (!stats) {
                await interaction.reply({
                    content: "❌ Erro ao obter estatísticas do jogador",
                    ephemeral: true,
                });
                return;
            }
            const rankingPosition = await Player_1.Player.getPlayerRankingPosition(targetUser.id);
            const totalPlayers = await Player_1.Player.getTotalPlayers();
            const lolRanking = RankingService_1.RankingService.calculateLoLRanking(player.mmr, totalPlayers);
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`👤 Perfil de ${player.username}`)
                .setColor("#ff9900")
                .addFields({
                name: "📊 MMR",
                value: Math.ceil(player.mmr).toString(),
                inline: true,
            }, {
                name: "🏆 Posição no Ranking",
                value: rankingPosition && totalPlayers
                    ? `#${rankingPosition} de ${totalPlayers}`
                    : "N/A",
                inline: true,
            }, {
                name: "🎮 Ranking LoL",
                value: RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp),
                inline: true,
            }, { name: "🏆 Vitórias", value: player.wins.toString(), inline: true }, {
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
                name: "🎯 Distância do Topo",
                value: rankingPosition && rankingPosition > 1
                    ? `${rankingPosition - 1} posições`
                    : "Já é o #1! 🥇",
                inline: true,
            }, {
                name: "📈 Próximo Rank",
                value: lolRanking.nextRank || "Já é o máximo!",
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
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter perfil do jogador:", error);
            await interaction.reply({
                content: "❌ Erro ao obter perfil do jogador.",
                ephemeral: true,
            });
        }
    }
    async handleTop(interaction) {
        try {
            const limit = interaction.options.getInteger("limit") || 10;
            const players = await Player_1.Player.getTopPlayers(Math.min(limit, 25));
            if (players.length === 0) {
                await interaction.reply({
                    content: "📭 Nenhum jogador encontrado.",
                    ephemeral: true,
                });
                return;
            }
            const playerList = players
                .map((p, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                const lolRanking = RankingService_1.RankingService.calculateLoLRanking(p.mmr, players.length);
                const rankingDisplay = RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp);
                return `${medal} **${p.username}** - ${rankingDisplay} (${Math.ceil(p.mmr)} MMR)`;
            })
                .join("\n");
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("🏆 Top Jogadores")
                .setColor("#ffd700")
                .setDescription(playerList)
                .setFooter({ text: `Top ${players.length} jogadores por MMR` })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter top jogadores:", error);
            await interaction.reply({
                content: "❌ Erro ao obter top jogadores.",
                ephemeral: true,
            });
        }
    }
    async handleVersus(interaction) {
        const player1User = interaction.options.getUser("player1", true);
        const player2User = interaction.options.getUser("player2", true);
        if (player1User.id === player2User.id) {
            await interaction.reply({
                content: "❌ Não é possível comparar um jogador com ele mesmo!",
                ephemeral: true,
            });
            return;
        }
        try {
            const player1 = await Player_1.Player.getPlayerByDiscordId(player1User.id);
            const player2 = await Player_1.Player.getPlayerByDiscordId(player2User.id);
            if (!player1 || !player2) {
                await interaction.reply({
                    content: "❌ Um ou ambos os jogadores não foram encontrados no sistema!",
                    ephemeral: true,
                });
                return;
            }
            const matches = await Match_1.Match.getMatchesBetweenPlayers(player1.id, player2.id);
            if (matches.length === 0) {
                const noMatchesEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle("⚔️ Versus")
                    .setColor("#ff6b6b")
                    .setDescription(`**${player1.username}** vs **${player2.username}**\n\n` +
                    "❌ **Nenhuma partida encontrada**\n\n" +
                    "Estes jogadores nunca jogaram juntos ou em times opostos!")
                    .addFields({
                    name: `👤 ${player1.username}`,
                    value: `MMR: ${Math.ceil(player1.mmr)} • ${player1.wins}W/${player1.losses}L`,
                    inline: true,
                }, {
                    name: `👤 ${player2.username}`,
                    value: `MMR: ${Math.ceil(player2.mmr)} • ${player2.wins}W/${player2.losses}L`,
                    inline: true,
                })
                    .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
                    .setTimestamp();
                await interaction.reply({
                    embeds: [noMatchesEmbed],
                    ephemeral: false,
                });
                return;
            }
            let player1Wins = 0;
            let player2Wins = 0;
            let totalMatches = matches.length;
            matches.forEach((match) => {
                if (match.winner === "team1") {
                    const player1InTeam1 = match.team1Players?.some((p) => p.playerId === player1.id) ||
                        false;
                    const player2InTeam1 = match.team1Players?.some((p) => p.playerId === player2.id) ||
                        false;
                    if (player1InTeam1 && !player2InTeam1) {
                        player1Wins++;
                    }
                    else if (player2InTeam1 && !player1InTeam1) {
                        player2Wins++;
                    }
                }
                else if (match.winner === "team2") {
                    const player1InTeam2 = match.team2Players?.some((p) => p.playerId === player1.id) ||
                        false;
                    const player2InTeam2 = match.team2Players?.some((p) => p.playerId === player2.id) ||
                        false;
                    if (player1InTeam2 && !player2InTeam2) {
                        player1Wins++;
                    }
                    else if (player2InTeam2 && !player1InTeam2) {
                        player2Wins++;
                    }
                }
            });
            const versusEmbed = new discord_js_1.EmbedBuilder()
                .setTitle("⚔️ Versus")
                .setColor("#ff9900")
                .setDescription(`**${player1.username}** vs **${player2.username}**\n\n` +
                `📊 **Histórico de ${totalMatches} partidas**`)
                .addFields({
                name: `🏆 ${player1.username}`,
                value: `${player1Wins} vitórias`,
                inline: true,
            }, {
                name: `🏆 ${player2.username}`,
                value: `${player2Wins} vitórias`,
                inline: true,
            }, {
                name: "📈 Taxa de vitória",
                value: `${((player1Wins / totalMatches) * 100).toFixed(1)}% vs ${((player2Wins / totalMatches) *
                    100).toFixed(1)}%`,
                inline: false,
            });
            versusEmbed.addFields({
                name: `👤 ${player1.username}`,
                value: (() => {
                    const lolRanking = RankingService_1.RankingService.calculateLoLRanking(player1.mmr, matches.length);
                    const rankingDisplay = RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp);
                    return `${rankingDisplay} • ${player1.wins}W/${player1.losses}L`;
                })(),
                inline: true,
            }, {
                name: `👤 ${player2.username}`,
                value: (() => {
                    const lolRanking = RankingService_1.RankingService.calculateLoLRanking(player2.mmr, matches.length);
                    const rankingDisplay = RankingService_1.RankingService.formatRanking(lolRanking.tier, lolRanking.division, lolRanking.lp);
                    return `${rankingDisplay} • ${player2.wins}W/${player2.losses}L`;
                })(),
                inline: true,
            });
            if (matches.length > 0) {
                const recentMatches = matches
                    .slice(0, 5)
                    .map((match, index) => {
                    const player1InTeam1 = match.team1Players?.some((p) => p.playerId === player1.id) ||
                        false;
                    const player1Won = (match.winner === "team1" && player1InTeam1) ||
                        (match.winner === "team2" && !player1InTeam1);
                    const result = player1Won ? "✅" : "❌";
                    const date = match.finishedAt
                        ? match.finishedAt.toLocaleDateString("pt-BR")
                        : "Data desconhecida";
                    return `${result} **${date}** - ${match.teamSize || "?"}v${match.teamSize || "?"}`;
                })
                    .join("\n");
                versusEmbed.addFields({
                    name: "📅 Últimas partidas",
                    value: recentMatches || "Nenhuma partida recente",
                    inline: false,
                });
            }
            versusEmbed
                .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
                .setTimestamp();
            await interaction.reply({
                embeds: [versusEmbed],
                ephemeral: false,
            });
        }
        catch (error) {
            console.error("Erro ao obter versus:", error);
            await interaction.reply({
                content: "❌ Erro ao obter histórico de partidas. Tente novamente.",
                ephemeral: true,
            });
        }
    }
    async handleStats(interaction) {
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
                value: Math.ceil(playerStats.reduce((sum, p) => sum + p.mmr, 0) / totalPlayers).toString(),
                inline: true,
            }, {
                name: "🔄 MMR médio por partida",
                value: matchStats.averageMmrChange.toFixed(1),
                inline: true,
            })
                .setFooter({ text: "Estatísticas em tempo real" })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error("Erro ao obter estatísticas globais:", error);
            await interaction.reply({
                content: "❌ Erro ao obter estatísticas globais.",
                ephemeral: true,
            });
        }
    }
    async handleHelp(interaction) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("❓ Comandos Disponíveis")
            .setColor("#0099ff")
            .setDescription("Lista de todos os comandos disponíveis:")
            .addFields({ name: "/join", value: "Entra na fila ARAM", inline: true }, { name: "/leave", value: "Sai da fila atual", inline: true }, { name: "/status", value: "Mostra status da fila ativa", inline: true }, {
            name: "/profile [@user]",
            value: "Mostra perfil de um jogador",
            inline: true,
        }, {
            name: "/top [número]",
            value: "Mostra top jogadores (padrão: 10)",
            inline: true,
        }, { name: "/stats", value: "Mostra estatísticas globais", inline: true }, {
            name: "/versus [@p1] [@p2]",
            value: "Histórico entre dois jogadores",
            inline: true,
        }, { name: "/help", value: "Mostra esta mensagem de ajuda", inline: true })
            .addFields({
            name: "🔧 Comandos Admin",
            value: "• `/admin punish [@user] [points] [reason]` - Pune jogador reduzindo MMR\n• `/admin reset-player [@user]` - Reseta estatísticas\n• `/admin start` - Inicia partida\n• `/admin finish-match [winner]` - Finaliza partida",
            inline: false,
        }, {
            name: "📊 Sistema MMR",
            value: "O sistema usa um algoritmo Elo adaptado para ARAM, considerando performance individual, balanceamento de times e sequências de vitórias.",
            inline: false,
        }, {
            name: "🎮 Sistema de Ranking LoL",
            value: "Rankings baseados no League of Legends: Iron IV → Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster → Challenger. Cada divisão tem 100 LP.",
            inline: false,
        }, {
            name: "⚖️ Balanceamento",
            value: "Times são formados automaticamente para maximizar o equilíbrio de MMR e distribuição de roles.",
            inline: false,
        }, {
            name: "🎮 Comandos Admin",
            value: "Comandos administrativos incluem: reset de jogadores, punições de MMR, início de partidas (2v2 a 5v5), limpeza de filas, adição de bots e finalização de partidas.",
            inline: false,
        })
            .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    async handleAdmin(interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            switch (subcommand) {
                case "reset-player":
                    const targetUser = interaction.options.getUser("user", true);
                    await Player_1.Player.resetPlayer(targetUser.id);
                    await interaction.reply({
                        content: `✅ Estatísticas do jogador ${targetUser.username} foram resetadas!`,
                        ephemeral: true,
                    });
                    break;
                case "punish":
                    const punishUser = interaction.options.getUser("user", true);
                    const points = interaction.options.getInteger("points", true);
                    const reason = interaction.options.getString("reason") || "Punição administrativa";
                    try {
                        const player = await Player_1.Player.getPlayerByDiscordId(punishUser.id);
                        if (!player) {
                            await interaction.reply({
                                content: "❌ Jogador não encontrado no sistema!",
                                ephemeral: true,
                            });
                            return;
                        }
                        const oldMmr = player.mmr;
                        const newMmr = Math.max(0, oldMmr - points);
                        await Player_1.Player.updatePlayerMMR(punishUser.id, newMmr);
                        const punishEmbed = new discord_js_1.EmbedBuilder()
                            .setTitle("⚖️ Punição Aplicada")
                            .setColor("#ff6b6b")
                            .setDescription(`**${punishUser.username}** foi punido com sucesso!`)
                            .addFields({
                            name: "👤 Jogador",
                            value: punishUser.username,
                            inline: true,
                        }, {
                            name: "📉 MMR Anterior",
                            value: Math.ceil(oldMmr).toString(),
                            inline: true,
                        }, {
                            name: "📉 MMR Atual",
                            value: Math.ceil(newMmr).toString(),
                            inline: true,
                        }, {
                            name: "🔴 Pontos Reduzidos",
                            value: points.toString(),
                            inline: true,
                        }, {
                            name: "📝 Motivo",
                            value: reason,
                            inline: false,
                        })
                            .setFooter({
                            text: `Punido por ${interaction.user.username} • AramHouse TS`,
                        })
                            .setTimestamp();
                        await interaction.reply({
                            embeds: [punishEmbed],
                            ephemeral: true,
                        });
                    }
                    catch (error) {
                        console.error("Erro ao punir jogador:", error);
                        await interaction.reply({
                            content: "❌ Erro ao aplicar punição. Tente novamente.",
                            ephemeral: true,
                        });
                    }
                    break;
                case "start":
                    const activeQueue = await Queue_1.Queue.getActiveQueue();
                    if (!activeQueue) {
                        await interaction.reply({
                            content: "❌ Não há filas ativas para iniciar partida",
                            ephemeral: true,
                        });
                        return;
                    }
                    if (!(await Queue_1.Queue.canFormTeamsFlexible(activeQueue.id))) {
                        await interaction.reply({
                            content: "❌ Fila não pode formar times. Necessita de pelo menos 4 jogadores e número par de jogadores.",
                            ephemeral: true,
                        });
                        return;
                    }
                    const teams = await Queue_1.Queue.formTeams(activeQueue.id);
                    if (teams) {
                        const teamSize = teams.team1.players.length;
                        let matchType = "";
                        let mmrInfo = "";
                        if (teamSize === 2) {
                            matchType = "2v2";
                            mmrInfo = "⚠️ MMR muito baixo (2v2)";
                        }
                        else if (teamSize === 3) {
                            matchType = "3v3";
                            mmrInfo = "⚠️ MMR baixo (3v3)";
                        }
                        else if (teamSize === 4) {
                            matchType = "4v4";
                            mmrInfo = "⚠️ MMR reduzido (4v4)";
                        }
                        else {
                            matchType = "5v5";
                            mmrInfo = "✅ MMR normal (5v5)";
                        }
                        const teamsEmbed = new discord_js_1.EmbedBuilder()
                            .setTitle(`🎮 Partida ${matchType} Iniciada!`)
                            .setColor("#00ff00")
                            .addFields({
                            name: "📊 Configuração",
                            value: `${teamSize} vs ${teamSize} jogadores`,
                            inline: true,
                        }, {
                            name: "🎯 MMR",
                            value: mmrInfo,
                            inline: true,
                        }, {
                            name: "👥 Time 1",
                            value: teams.team1.players
                                .map((p) => `**${p.username}** (MMR: ${Math.ceil(p.mmr)})`)
                                .join("\n"),
                            inline: false,
                        }, {
                            name: "👥 Time 2",
                            value: teams.team2.players
                                .map((p) => `**${p.username}** (MMR: ${Math.ceil(p.mmr)})`)
                                .join("\n"),
                            inline: false,
                        })
                            .setFooter({ text: `Fila #${activeQueue.id} • ${matchType}` })
                            .setTimestamp();
                        await interaction.reply({
                            content: `✅ Partida ${matchType} iniciada com sucesso!`,
                            embeds: [teamsEmbed],
                            ephemeral: true,
                        });
                    }
                    else {
                        await interaction.reply({
                            content: "❌ Erro ao formar times",
                            ephemeral: true,
                        });
                    }
                    break;
                case "clear-queue":
                    const queueToClear = await Queue_1.Queue.getActiveQueue();
                    if (!queueToClear) {
                        await interaction.reply({
                            content: "❌ Não há filas ativas para limpar",
                            ephemeral: true,
                        });
                        return;
                    }
                    await Queue_1.Queue.clearQueue(queueToClear.id);
                    await interaction.reply({
                        content: `✅ Fila #${queueToClear.id} foi limpa com sucesso!`,
                        ephemeral: true,
                    });
                    break;
                case "add-bot":
                    const count = interaction.options.getInteger("count", true);
                    const queueForBots = await Queue_1.Queue.getActiveQueue();
                    if (!queueForBots) {
                        await interaction.reply({
                            content: "❌ Não há filas ativas para adicionar bots",
                            ephemeral: true,
                        });
                        return;
                    }
                    for (let i = 0; i < count; i++) {
                        const botId = `bot_${Date.now()}_${i}`;
                        const botUsername = `Bot_${i + 1}`;
                        let botPlayer = await Player_1.Player.getPlayerByDiscordId(botId);
                        if (!botPlayer) {
                            botPlayer = await Player_1.Player.createPlayer(botId, botUsername);
                        }
                        await Queue_1.Queue.addPlayerToQueue(queueForBots.id, botId);
                    }
                    await interaction.reply({
                        content: `✅ ${count} bot(s) adicionado(s) à fila #${queueForBots.id}!`,
                        ephemeral: true,
                    });
                    break;
                case "finish-match":
                    try {
                        const winner = interaction.options.getString("winner", true);
                        const activeQueue = await Queue_1.Queue.getQueuesByStatus("forming");
                        if (!activeQueue || activeQueue.length === 0) {
                            await interaction.reply({
                                content: "❌ Não há partidas em andamento para finalizar",
                                ephemeral: true,
                            });
                            return;
                        }
                        const queueToFinish = activeQueue[0];
                        if (!queueToFinish) {
                            await interaction.reply({
                                content: "❌ Erro ao obter fila para finalizar",
                                ephemeral: true,
                            });
                            return;
                        }
                        const matchStartTime = queueToFinish.startedAt || queueToFinish.createdAt;
                        const matchEndTime = new Date();
                        const durationInMs = matchEndTime.getTime() - matchStartTime.getTime();
                        const durationInMinutes = Math.max(1, Math.floor(durationInMs / (1000 * 60)));
                        const teams = await Queue_1.Queue.formTeams(queueToFinish.id);
                        if (!teams) {
                            await interaction.reply({
                                content: "❌ Erro ao obter times da partida",
                                ephemeral: true,
                            });
                            return;
                        }
                        const matchId = await Match_1.Match.createMatch(queueToFinish.id, teams.team1, teams.team2);
                        await Match_1.Match.finishMatch(matchId, winner, undefined, undefined, durationInMinutes);
                        await Queue_1.Queue.updateQueueStatus(queueToFinish.id, "completed");
                        const resultEmbed = new discord_js_1.EmbedBuilder()
                            .setTitle("🏁 Partida Finalizada!")
                            .setColor(winner === "team1" ? "#00ff00" : "#ff0000")
                            .addFields({
                            name: "🏆 Vencedor",
                            value: winner === "team1" ? "Time 1" : "Time 2",
                            inline: true,
                        }, {
                            name: "⏱️ Duração",
                            value: `${durationInMinutes} min`,
                            inline: true,
                        }, {
                            name: "👥 Time 1",
                            value: teams.team1.players
                                .map((p) => `${p.username} (MMR: ${Math.ceil(p.mmr)})`)
                                .join(", "),
                            inline: false,
                        }, {
                            name: "👥 Time 2",
                            value: teams.team2.players
                                .map((p) => `${p.username} (MMR: ${Math.ceil(p.mmr)})`)
                                .join(", "),
                            inline: false,
                        })
                            .setFooter({ text: `Partida #${matchId}` })
                            .setTimestamp();
                        await interaction.reply({
                            content: `✅ Partida finalizada com sucesso!`,
                            embeds: [resultEmbed],
                            ephemeral: true,
                        });
                    }
                    catch (error) {
                        console.error("Erro ao finalizar partida:", error);
                        await interaction.reply({
                            content: "❌ Erro ao finalizar partida",
                            ephemeral: true,
                        });
                    }
                    break;
                default:
                    await interaction.reply({
                        content: "❌ Subcomando não reconhecido",
                        ephemeral: true,
                    });
            }
        }
        catch (error) {
            console.error("Erro no comando admin:", error);
            await interaction.reply({
                content: "❌ Erro ao executar comando administrativo",
                ephemeral: true,
            });
        }
    }
}
exports.SlashCommandService = SlashCommandService;
//# sourceMappingURL=SlashCommandService.js.map