import {
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { Player } from "../models/Player";
import { Queue } from "../models/Queue";
import { Match } from "../models/Match";
import { RankingService } from "../services/RankingService";

export class SlashCommandService {
  private rest: REST;
  private clientId: string;
  private guildId: string | undefined;

  constructor(clientId: string, token: string, guildId?: string) {
    this.clientId = clientId;
    this.guildId = guildId;
    this.rest = new REST({ version: "10" }).setToken(token);
  }

  /**
   * Registra todos os comandos slash
   */
  async registerCommands(): Promise<void> {
    const commands = this.buildCommands();

    try {
      console.log("🔄 Limpando e registrando comandos slash...");

      // Força o uso de comandos de servidor para desenvolvimento (mais rápido)
      if (this.guildId) {
        // Força limpeza completa de todos os comandos
        try {
          console.log("🗑️ Forçando limpeza completa de comandos...");

          // Primeiro, tenta limpar todos os comandos de uma vez
          await this.rest.put(
            Routes.applicationGuildCommands(this.clientId, this.guildId),
            { body: [] }
          );
          console.log("✅ Todos os comandos foram limpos");

          // Aguarda um pouco para o Discord processar
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.log("ℹ️ Limpeza em lote falhou, tentando individualmente...");

          // Fallback: remove comandos individualmente
          try {
            const existingCommands = (await this.rest.get(
              Routes.applicationGuildCommands(this.clientId, this.guildId)
            )) as any[];

            if (existingCommands && existingCommands.length > 0) {
              console.log(
                `🗑️ Removendo ${existingCommands.length} comandos individualmente...`
              );

              for (const command of existingCommands) {
                await this.rest.delete(
                  Routes.applicationGuildCommand(
                    this.clientId,
                    this.guildId,
                    command.id
                  )
                );
              }
              console.log("✅ Comandos antigos removidos individualmente");

              // Aguarda um pouco mais
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          } catch (error2) {
            console.log("⚠️ Erro ao remover comandos individualmente:", error2);
          }
        }

        // Registra os novos comandos
        await this.rest.put(
          Routes.applicationGuildCommands(this.clientId, this.guildId),
          { body: commands }
        );
        console.log(
          `✅ ${commands.length} comandos registrados para o servidor ${this.guildId}`
        );
      } else {
        // Se não tiver guildId, usa comandos globais (pode demorar até 1 hora)
        await this.rest.put(Routes.applicationCommands(this.clientId), {
          body: commands,
        });
        console.log(
          "✅ Comandos globais registrados (pode demorar até 1 hora para aparecer)"
        );
      }
    } catch (error) {
      console.error("❌ Erro ao registrar comandos:", error);
    }
  }

  /**
   * Constrói todos os comandos slash
   */
  private buildCommands() {
    return [
      // Comando join
      new SlashCommandBuilder()
        .setName("join")
        .setDescription("Entra na fila ARAM")
        .toJSON(),

      // Comando leave
      new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Sai da fila atual")
        .toJSON(),

      // Comando status
      new SlashCommandBuilder()
        .setName("status")
        .setDescription("Mostra status da fila ativa")
        .toJSON(),

      // Comando profile
      new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Mostra perfil de um jogador")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription(
              "Usuário para ver o perfil (deixe vazio para ver o seu)"
            )
            .setRequired(false)
        )
        .toJSON(),

      // Comando top
      new SlashCommandBuilder()
        .setName("top")
        .setDescription("Mostra top jogadores")
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Número de jogadores para mostrar (1-25)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
        .toJSON(),

      // Comando stats
      new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Mostra estatísticas globais")
        .toJSON(),

      // Comando versus
      new SlashCommandBuilder()
        .setName("versus")
        .setDescription("Mostra histórico de partidas entre dois jogadores")
        .addUserOption((option) =>
          option
            .setName("player1")
            .setDescription("Primeiro jogador")
            .setRequired(true)
        )
        .addUserOption((option) =>
          option
            .setName("player2")
            .setDescription("Segundo jogador")
            .setRequired(true)
        )
        .toJSON(),

      // Comando help
      new SlashCommandBuilder()
        .setName("help")
        .setDescription("Mostra ajuda sobre os comandos")
        .toJSON(),

      // Comando admin (apenas para administradores)
      new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Comandos administrativos")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("reset-player")
            .setDescription("Reseta estatísticas de um jogador")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Usuário para resetar")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("punish")
            .setDescription("Pune um jogador reduzindo seu MMR")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Usuário para punir")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("points")
                .setDescription("Pontos de MMR para reduzir (1-100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Motivo da punição")
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("start")
            .setDescription(
              "Inicia partida com qualquer número par de jogadores (2v2, 3v3, 4v4, 5v5)"
            )
        )

        .addSubcommand((subcommand) =>
          subcommand.setName("clear-queue").setDescription("Limpa a fila atual")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add-bot")
            .setDescription("Adiciona bot à fila para completar times")
            .addIntegerOption((option) =>
              option
                .setName("count")
                .setDescription("Número de bots para adicionar")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("finish-match")
            .setDescription("Finaliza uma partida e registra resultados")
            .addStringOption((option) =>
              option
                .setName("winner")
                .setDescription("Time vencedor (team1 ou team2)")
                .setRequired(true)
                .addChoices(
                  { name: "Time 1", value: "team1" },
                  { name: "Time 2", value: "team2" }
                )
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON(),
    ];
  }

  /**
   * Processa um comando slash
   */
  async handleSlashCommand(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
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
    } catch (error) {
      console.error(`Erro ao processar comando ${commandName}:`, error);
      await interaction.reply({
        content: "❌ Ocorreu um erro ao processar o comando",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando join
   */
  private async handleJoin(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const discordId = interaction.user.id;
    const username = interaction.user.username;

    try {
      // Verifica se o jogador já está em uma fila
      if (await Queue.isPlayerInQueue(discordId)) {
        await interaction.reply({
          content: "❌ Você já está em uma fila!",
          ephemeral: true,
        });
        return;
      }

      // Cria ou obtém o jogador
      let player = await Player.getPlayerByDiscordId(discordId);
      if (!player) {
        player = await Player.createPlayer(discordId, username);
      }

      // Obtém ou cria uma fila ativa
      let activeQueue = await Queue.getActiveQueue();
      if (!activeQueue) {
        const queueId = await Queue.createQueue(10);
        activeQueue = await Queue.getQueueById(queueId);
      }

      if (!activeQueue) {
        await interaction.reply({
          content: "❌ Erro ao criar/obter fila",
          ephemeral: true,
        });
        return;
      }

      // Verifica se a fila está cheia
      if (activeQueue.players.length >= activeQueue.size) {
        await interaction.reply({
          content:
            "❌ A fila está cheia! Aguarde uma vaga ou use `/admin start` para iniciar a partida.",
          ephemeral: true,
        });
        return;
      }

      // Adiciona jogador à fila
      await Queue.addPlayerToQueue(activeQueue.id, discordId);

      // Obtém estatísticas da fila
      const stats = await Queue.getQueueStats(activeQueue.id);
      if (!stats) {
        await interaction.reply({
          content: "❌ Erro ao obter estatísticas da fila",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🎮 Entrou na Fila ARAM!")
        .setColor("#00ff00")
        .addFields(
          { name: "👤 Jogador", value: username, inline: true },
          {
            name: "📊 MMR",
            value: Math.ceil(player.mmr).toString(),
            inline: true,
          },
          {
            name: "🎮 Ranking LoL",
            value: (() => {
              const lolRanking = RankingService.calculateLoLRanking(
                player.mmr,
                stats.totalPlayers
              );
              return RankingService.formatRanking(
                lolRanking.tier,
                lolRanking.division,
                lolRanking.lp
              );
            })(),
            inline: true,
          },
          {
            name: "🏆 Vitórias",
            value: `${player.wins}/${player.gamesPlayed}`,
            inline: true,
          },
          {
            name: "👥 Jogadores na fila",
            value: stats.totalPlayers.toString(),
            inline: true,
          },
          {
            name: "⏱️ Tempo estimado",
            value: `${stats.estimatedWaitTime} min`,
            inline: true,
          },
          {
            name: "📈 MMR médio",
            value: Math.ceil(stats.averageMmr).toString(),
            inline: true,
          }
        )
        .setFooter({ text: `Fila #${activeQueue.id}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao entrar na fila:", error);
      await interaction.reply({
        content: "❌ Erro ao entrar na fila. Tente novamente.",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando leave
   */
  private async handleLeave(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const discordId = interaction.user.id;

    try {
      const playerQueue = await Queue.getPlayerQueue(discordId);
      if (!playerQueue) {
        await interaction.reply({
          content: "❌ Você não está em nenhuma fila!",
          ephemeral: true,
        });
        return;
      }

      await Queue.removePlayerFromQueue(playerQueue.id, discordId);

      const embed = new EmbedBuilder()
        .setTitle("🚪 Saiu da Fila")
        .setColor("#ff0000")
        .setDescription(`Você saiu da fila #${playerQueue.id}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao sair da fila:", error);
      await interaction.reply({
        content: "❌ Erro ao sair da fila. Tente novamente.",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando status
   * Mostra o status atual da fila ou partida até ser cancelada/finalizada
   */
  private async handleStatus(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      // Obtém fila ativa (waiting)
      const activeQueue = await Queue.getActiveQueue();

      // Obtém partida ativa (forming)
      const activeMatch = await Queue.getActiveMatch();

      if (!activeQueue && !activeMatch) {
        const noActivityEmbed = new EmbedBuilder()
          .setTitle("📊 Status do Sistema")
          .setColor("#ff6b6b")
          .setDescription(
            "❌ **Nenhuma fila ou partida ativa**\n\nUse `/queue join` para entrar na fila!"
          )
          .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
          .setTimestamp();

        await interaction.reply({
          embeds: [noActivityEmbed],
          ephemeral: false,
        });
        return;
      }

      // Mostra o status atual (fila ou partida) até ser cancelada/finalizada
      if (activeMatch && activeMatch.status === "forming") {
        // Mostra partida ativa
        const matchEmbed = new EmbedBuilder()
          .setTitle(`⚔️ Partida Ativa #${activeMatch.id}`)
          .setColor("#ff9900")
          .addFields(
            {
              name: "👥 Jogadores",
              value: activeMatch.players.length.toString(),
              inline: true,
            },
            {
              name: "🎮 Formato",
              value: `${Math.floor(
                activeMatch.players.length / 2
              )}v${Math.floor(activeMatch.players.length / 2)}`,
              inline: true,
            },
            {
              name: "🕐 Iniciada em",
              value: activeMatch.startedAt
                ? `${activeMatch.startedAt.toLocaleDateString(
                    "pt-BR"
                  )}, ${activeMatch.startedAt.toLocaleTimeString("pt-BR")}`
                : "Agora",
              inline: true,
            }
          )
          .setFooter({
            text: `Partida #${activeMatch.id} • ${Math.floor(
              activeMatch.players.length / 2
            )}v${Math.floor(activeMatch.players.length / 2)}`,
          })
          .setTimestamp();

        // Adiciona lista de jogadores se houver
        if (activeMatch.players.length > 0) {
          const playerList = activeMatch.players
            .map((p, i) => {
              const lolRanking = RankingService.calculateLoLRanking(
                p.mmr,
                activeMatch.players.length
              );
              const rankingDisplay = RankingService.formatRanking(
                lolRanking.tier,
                lolRanking.division,
                lolRanking.lp
              );
              return `${i + 1}. **${p.username}** - ${rankingDisplay}`;
            })
            .join("\n");

          matchEmbed.addFields({
            name: "👤 Jogadores na partida",
            value: playerList,
            inline: false,
          });
        }

        // Adiciona comandos para finalizar
                          matchEmbed.addFields({
                    name: "🎯 Para finalizar a partida, use:",
                    value:
                      "`/admin finish-match winner:team1`\n`/admin finish-match winner:team2`",
                    inline: false,
                  });

        await interaction.reply({
          embeds: [matchEmbed],
          ephemeral: false,
        });
      } else if (activeQueue && activeQueue.status === "waiting") {
        // Mostra fila ativa
        const stats = await Queue.getQueueStats(activeQueue.id);
        if (stats) {
          const queueEmbed = new EmbedBuilder()
            .setTitle(`🎮 Fila Ativa #${activeQueue.id}`)
            .setColor("#00ff00")
            .addFields(
              {
                name: "👥 Jogadores",
                value: `${stats.totalPlayers}/${activeQueue.size}`,
                inline: true,
              },
              {
                name: "⏱️ Tempo estimado",
                value: `${stats.estimatedWaitTime} min`,
                inline: true,
              },
              {
                name: "📈 MMR médio",
                value: Math.ceil(stats.averageMmr).toString(),
                inline: true,
              },
              {
                name: "📊 Faixa de MMR",
                value: `${Math.ceil(stats.mmrRange.min)} - ${Math.ceil(
                  stats.mmrRange.max
                )}`,
                inline: true,
              },
              {
                name: "🎭 Roles",
                value:
                  Object.entries(stats.roleDistribution)
                    .map(([role, count]) => `${role}: ${count}`)
                    .join(", ") || "N/A",
                inline: true,
              }
            )
            .setFooter({
              text: `Criada em ${activeQueue.createdAt.toLocaleDateString(
                "pt-BR"
              )}, ${activeQueue.createdAt.toLocaleTimeString("pt-BR")}`,
            })
            .setTimestamp();

          // Adiciona lista de jogadores se houver
          if (activeQueue.players.length > 0) {
            const playerList = activeQueue.players
              .map((p, i) => {
                const lolRanking = RankingService.calculateLoLRanking(
                  p.mmr,
                  activeQueue.players.length
                );
                const rankingDisplay = RankingService.formatRanking(
                  lolRanking.tier,
                  lolRanking.division,
                  lolRanking.lp
                );
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
    } catch (error) {
      console.error("Erro ao obter status:", error);
      await interaction.reply({
        content: "❌ Erro ao obter status do sistema",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando profile
   */
  private async handleProfile(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const targetUser = interaction.options.getUser("user") || interaction.user;

    try {
      const player = await Player.getPlayerByDiscordId(targetUser.id);
      if (!player) {
        await interaction.reply({
          content: "❌ Jogador não encontrado!",
          ephemeral: true,
        });
        return;
      }

      const stats = await Player.getPlayerStats(player.id);
      if (!stats) {
        await interaction.reply({
          content: "❌ Erro ao obter estatísticas do jogador",
          ephemeral: true,
        });
        return;
      }

      // Obtém a posição no ranking e total de jogadores
      const rankingPosition = await Player.getPlayerRankingPosition(
        targetUser.id
      );
      const totalPlayers = await Player.getTotalPlayers();

      // Calcula o ranking LoL
      const lolRanking = RankingService.calculateLoLRanking(
        player.mmr,
        totalPlayers
      );

      const embed = new EmbedBuilder()
        .setTitle(`👤 Perfil de ${player.username}`)
        .setColor("#ff9900")
        .addFields(
          {
            name: "📊 MMR",
            value: Math.ceil(player.mmr).toString(),
            inline: true,
          },
          {
            name: "🏆 Posição no Ranking",
            value:
              rankingPosition && totalPlayers
                ? `#${rankingPosition} de ${totalPlayers}`
                : "N/A",
            inline: true,
          },
          {
            name: "🎮 Ranking LoL",
            value: RankingService.formatRanking(
              lolRanking.tier,
              lolRanking.division,
              lolRanking.lp
            ),
            inline: true,
          },
          { name: "🏆 Vitórias", value: player.wins.toString(), inline: true },
          {
            name: "💔 Derrotas",
            value: player.losses.toString(),
            inline: true,
          },
          { name: "📈 Taxa de vitória", value: stats.winRate, inline: true },
          {
            name: "🎮 Jogos",
            value: player.gamesPlayed.toString(),
            inline: true,
          },
          {
            name: "📊 Percentil",
            value: `${stats.percentile.toFixed(1)}%`,
            inline: true,
          },
          {
            name: "🔥 Sequência atual",
            value: player.currentStreak.toString(),
            inline: true,
          },
          {
            name: "🎯 Distância do Topo",
            value:
              rankingPosition && rankingPosition > 1
                ? `${rankingPosition - 1} posições`
                : "Já é o #1! 🥇",
            inline: true,
          },
          {
            name: "📈 Próximo Rank",
            value: lolRanking.nextRank || "Já é o máximo!",
            inline: true,
          },
          {
            name: "🏅 Melhor sequência",
            value: player.bestStreak.toString(),
            inline: true,
          },
          {
            name: "🎯 Confiança MMR",
            value: `${(stats.mmrConfidence * 100).toFixed(0)}%`,
            inline: true,
          }
        )
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
    } catch (error) {
      console.error("Erro ao obter perfil do jogador:", error);
      await interaction.reply({
        content: "❌ Erro ao obter perfil do jogador.",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando top
   */
  private async handleTop(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      const limit = interaction.options.getInteger("limit") || 10;
      const players = await Player.getTopPlayers(Math.min(limit, 25));

      if (players.length === 0) {
        await interaction.reply({
          content: "📭 Nenhum jogador encontrado.",
          ephemeral: true,
        });
        return;
      }

      const playerList = players
        .map((p, i) => {
          const medal =
            i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

          // Calcula o ranking LoL para cada jogador
          const lolRanking = RankingService.calculateLoLRanking(
            p.mmr,
            players.length
          );
          const rankingDisplay = RankingService.formatRanking(
            lolRanking.tier,
            lolRanking.division,
            lolRanking.lp
          );

          return `${medal} **${p.username}** - ${rankingDisplay} (${Math.ceil(
            p.mmr
          )} MMR)`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top Jogadores")
        .setColor("#ffd700")
        .setDescription(playerList)
        .setFooter({ text: `Top ${players.length} jogadores por MMR` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao obter top jogadores:", error);
      await interaction.reply({
        content: "❌ Erro ao obter top jogadores.",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando versus
   */
  private async handleVersus(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
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
      // Busca os jogadores no banco
      const player1 = await Player.getPlayerByDiscordId(player1User.id);
      const player2 = await Player.getPlayerByDiscordId(player2User.id);

      if (!player1 || !player2) {
        await interaction.reply({
          content:
            "❌ Um ou ambos os jogadores não foram encontrados no sistema!",
          ephemeral: true,
        });
        return;
      }

      // Busca histórico de partidas entre os dois jogadores
      const matches = await Match.getMatchesBetweenPlayers(
        player1.id,
        player2.id
      );

      if (matches.length === 0) {
        const noMatchesEmbed = new EmbedBuilder()
          .setTitle("⚔️ Versus")
          .setColor("#ff6b6b")
          .setDescription(
            `**${player1.username}** vs **${player2.username}**\n\n` +
              "❌ **Nenhuma partida encontrada**\n\n" +
              "Estes jogadores nunca jogaram juntos ou em times opostos!"
          )
          .addFields(
            {
              name: `👤 ${player1.username}`,
              value: `MMR: ${Math.ceil(player1.mmr)} • ${player1.wins}W/${
                player1.losses
              }L`,
              inline: true,
            },
            {
              name: `👤 ${player2.username}`,
              value: `MMR: ${Math.ceil(player2.mmr)} • ${player2.wins}W/${
                player2.losses
              }L`,
              inline: true,
            }
          )
          .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
          .setTimestamp();

        await interaction.reply({
          embeds: [noMatchesEmbed],
          ephemeral: false,
        });
        return;
      }

      // Calcula estatísticas do versus
      let player1Wins = 0;
      let player2Wins = 0;
      let totalMatches = matches.length;

      matches.forEach((match: any) => {
        if (match.winner === "team1") {
          // Verifica em qual time cada jogador estava
          const player1InTeam1 =
            match.team1Players?.some((p: any) => p.playerId === player1.id) ||
            false;
          const player2InTeam1 =
            match.team1Players?.some((p: any) => p.playerId === player2.id) ||
            false;

          if (player1InTeam1 && !player2InTeam1) {
            player1Wins++;
          } else if (player2InTeam1 && !player1InTeam1) {
            player2Wins++;
          }
        } else if (match.winner === "team2") {
          // Verifica em qual time cada jogador estava
          const player1InTeam2 =
            match.team2Players?.some((p: any) => p.playerId === player1.id) ||
            false;
          const player2InTeam2 =
            match.team2Players?.some((p: any) => p.playerId === player2.id) ||
            false;

          if (player1InTeam2 && !player2InTeam2) {
            player1Wins++;
          } else if (player2InTeam2 && !player1InTeam2) {
            player2Wins++;
          }
        }
      });

      // Cria embed com histórico
      const versusEmbed = new EmbedBuilder()
        .setTitle("⚔️ Versus")
        .setColor("#ff9900")
        .setDescription(
          `**${player1.username}** vs **${player2.username}**\n\n` +
            `📊 **Histórico de ${totalMatches} partidas**`
        )
        .addFields(
          {
            name: `🏆 ${player1.username}`,
            value: `${player1Wins} vitórias`,
            inline: true,
          },
          {
            name: `🏆 ${player2.username}`,
            value: `${player2Wins} vitórias`,
            inline: true,
          },
          {
            name: "📈 Taxa de vitória",
            value: `${((player1Wins / totalMatches) * 100).toFixed(1)}% vs ${(
              (player2Wins / totalMatches) *
              100
            ).toFixed(1)}%`,
            inline: false,
          }
        );

      // Adiciona estatísticas individuais
      versusEmbed.addFields(
        {
          name: `👤 ${player1.username}`,
          value: (() => {
            const lolRanking = RankingService.calculateLoLRanking(
              player1.mmr,
              matches.length
            );
            const rankingDisplay = RankingService.formatRanking(
              lolRanking.tier,
              lolRanking.division,
              lolRanking.lp
            );
            return `${rankingDisplay} • ${player1.wins}W/${player1.losses}L`;
          })(),
          inline: true,
        },
        {
          name: `👤 ${player2.username}`,
          value: (() => {
            const lolRanking = RankingService.calculateLoLRanking(
              player2.mmr,
              matches.length
            );
            const rankingDisplay = RankingService.formatRanking(
              lolRanking.tier,
              lolRanking.division,
              lolRanking.lp
            );
            return `${rankingDisplay} • ${player2.wins}W/${player2.losses}L`;
          })(),
          inline: true,
        }
      );

      // Adiciona últimas partidas se houver
      if (matches.length > 0) {
        const recentMatches = matches
          .slice(0, 5) // Últimas 5 partidas
          .map((match: any, index: number) => {
            const player1InTeam1 =
              match.team1Players?.some((p: any) => p.playerId === player1.id) ||
              false;
            const player1Won =
              (match.winner === "team1" && player1InTeam1) ||
              (match.winner === "team2" && !player1InTeam1);

            const result = player1Won ? "✅" : "❌";
            const date = match.finishedAt
              ? match.finishedAt.toLocaleDateString("pt-BR")
              : "Data desconhecida";

            return `${result} **${date}** - ${match.teamSize || "?"}v${
              match.teamSize || "?"
            }`;
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
    } catch (error) {
      console.error("Erro ao obter versus:", error);
      await interaction.reply({
        content: "❌ Erro ao obter histórico de partidas. Tente novamente.",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando stats
   */
  private async handleStats(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      const [playerStats, matchStats] = await Promise.all([
        Player.getAllPlayers(),
        Match.getMatchStatistics(),
      ]);

      const totalPlayers = playerStats.length;
      const activePlayers = playerStats.filter((p) => {
        if (!p.lastGameAt) return false;
        const daysSinceLastGame =
          (Date.now() - p.lastGameAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastGame <= 30;
      }).length;

      const embed = new EmbedBuilder()
        .setTitle("📊 Estatísticas Globais")
        .setColor("#00ff00")
        .addFields(
          {
            name: "👥 Total de jogadores",
            value: totalPlayers.toString(),
            inline: true,
          },
          {
            name: "🟢 Jogadores ativos (30d)",
            value: activePlayers.toString(),
            inline: true,
          },
          {
            name: "🎮 Total de partidas",
            value: matchStats.totalMatches.toString(),
            inline: true,
          },
          {
            name: "⏱️ Duração média",
            value: `${matchStats.averageDuration.toFixed(0)} min`,
            inline: true,
          },
          {
            name: "📈 MMR médio",
            value: Math.ceil(
              playerStats.reduce((sum, p) => sum + p.mmr, 0) / totalPlayers
            ).toString(),
            inline: true,
          },
          {
            name: "🔄 MMR médio por partida",
            value: matchStats.averageMmrChange.toFixed(1),
            inline: true,
          }
        )
        .setFooter({ text: "Estatísticas em tempo real" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao obter estatísticas globais:", error);
      await interaction.reply({
        content: "❌ Erro ao obter estatísticas globais.",
        ephemeral: true,
      });
    }
  }

  /**
   * Handler para comando help
   */
  private async handleHelp(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("❓ Comandos Disponíveis")
      .setColor("#0099ff")
      .setDescription("Lista de todos os comandos disponíveis:")
      .addFields(
        { name: "/join", value: "Entra na fila ARAM", inline: true },
        { name: "/leave", value: "Sai da fila atual", inline: true },
        { name: "/status", value: "Mostra status da fila ativa", inline: true },
        {
          name: "/profile [@user]",
          value: "Mostra perfil de um jogador",
          inline: true,
        },
        {
          name: "/top [número]",
          value: "Mostra top jogadores (padrão: 10)",
          inline: true,
        },
        { name: "/stats", value: "Mostra estatísticas globais", inline: true },
        {
          name: "/versus [@p1] [@p2]",
          value: "Histórico entre dois jogadores",
          inline: true,
        },
        { name: "/help", value: "Mostra esta mensagem de ajuda", inline: true }
      )
      .addFields(
        {
          name: "🔧 Comandos Admin",
          value:
            "• `/admin punish [@user] [points] [reason]` - Pune jogador reduzindo MMR\n• `/admin reset-player [@user]` - Reseta estatísticas\n• `/admin start` - Inicia partida\n• `/admin finish-match [winner]` - Finaliza partida",
          inline: false,
        },
        {
          name: "📊 Sistema MMR",
          value:
            "O sistema usa um algoritmo Elo adaptado para ARAM, considerando performance individual, balanceamento de times e sequências de vitórias.",
          inline: false,
        },
        {
          name: "🎮 Sistema de Ranking LoL",
          value:
            "Rankings baseados no League of Legends: Iron IV → Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster → Challenger. Cada divisão tem 100 LP.",
          inline: false,
        },
        {
          name: "⚖️ Balanceamento",
          value:
            "Times são formados automaticamente para maximizar o equilíbrio de MMR e distribuição de roles.",
          inline: false,
        },
        {
          name: "🎮 Comandos Admin",
          value:
            "Comandos administrativos incluem: reset de jogadores, punições de MMR, início de partidas (2v2 a 5v5), limpeza de filas, adição de bots e finalização de partidas.",
          inline: false,
        }
      )
      .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Handler para comando admin
   */
  private async handleAdmin(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "reset-player":
          const targetUser = interaction.options.getUser("user", true);
          await Player.resetPlayer(targetUser.id);
          await interaction.reply({
            content: `✅ Estatísticas do jogador ${targetUser.username} foram resetadas!`,
            ephemeral: true,
          });
          break;

        case "punish":
          const punishUser = interaction.options.getUser("user", true);
          const points = interaction.options.getInteger("points", true);
          const reason =
            interaction.options.getString("reason") || "Punição administrativa";

          try {
            // Busca o jogador no banco
            const player = await Player.getPlayerByDiscordId(punishUser.id);
            if (!player) {
              await interaction.reply({
                content: "❌ Jogador não encontrado no sistema!",
                ephemeral: true,
              });
              return;
            }

            // Calcula novo MMR (não pode ser menor que 0)
            const oldMmr = player.mmr;
            const newMmr = Math.max(0, oldMmr - points);

            // Atualiza o MMR do jogador
            await Player.updatePlayerMMR(punishUser.id, newMmr);

            // Cria embed de confirmação
            const punishEmbed = new EmbedBuilder()
              .setTitle("⚖️ Punição Aplicada")
              .setColor("#ff6b6b")
              .setDescription(
                `**${punishUser.username}** foi punido com sucesso!`
              )
              .addFields(
                {
                  name: "👤 Jogador",
                  value: punishUser.username,
                  inline: true,
                },
                {
                  name: "📉 MMR Anterior",
                  value: Math.ceil(oldMmr).toString(),
                  inline: true,
                },
                {
                  name: "📉 MMR Atual",
                  value: Math.ceil(newMmr).toString(),
                  inline: true,
                },
                {
                  name: "🔴 Pontos Reduzidos",
                  value: points.toString(),
                  inline: true,
                },
                {
                  name: "📝 Motivo",
                  value: reason,
                  inline: false,
                }
              )
              .setFooter({
                text: `Punido por ${interaction.user.username} • AramHouse TS`,
              })
              .setTimestamp();

            await interaction.reply({
              embeds: [punishEmbed],
              ephemeral: true,
            });
          } catch (error) {
            console.error("Erro ao punir jogador:", error);
            await interaction.reply({
              content: "❌ Erro ao aplicar punição. Tente novamente.",
              ephemeral: true,
            });
          }
          break;

        case "start":
          const activeQueue = await Queue.getActiveQueue();
          if (!activeQueue) {
            await interaction.reply({
              content: "❌ Não há filas ativas para iniciar partida",
              ephemeral: true,
            });
            return;
          }

          // Verifica se a fila pode formar times (mínimo 4 jogadores, número par)
          if (!(await Queue.canFormTeamsFlexible(activeQueue.id))) {
            await interaction.reply({
              content:
                "❌ Fila não pode formar times. Necessita de pelo menos 4 jogadores e número par de jogadores.",
              ephemeral: true,
            });
            return;
          }

          // Força formação de times
          const teams = await Queue.formTeams(activeQueue.id);
          if (teams) {
            // Determina o tipo de partida baseado no número de jogadores
            const teamSize = teams.team1.players.length;
            let matchType = "";
            let mmrInfo = "";

            if (teamSize === 2) {
              matchType = "2v2";
              mmrInfo = "⚠️ MMR muito baixo (2v2)";
            } else if (teamSize === 3) {
              matchType = "3v3";
              mmrInfo = "⚠️ MMR baixo (3v3)";
            } else if (teamSize === 4) {
              matchType = "4v4";
              mmrInfo = "⚠️ MMR reduzido (4v4)";
            } else {
              matchType = "5v5";
              mmrInfo = "✅ MMR normal (5v5)";
            }

            // Cria embed com detalhes dos times
            const teamsEmbed = new EmbedBuilder()
              .setTitle(`🎮 Partida ${matchType} Iniciada!`)
              .setColor("#00ff00")
              .addFields(
                {
                  name: "📊 Configuração",
                  value: `${teamSize} vs ${teamSize} jogadores`,
                  inline: true,
                },
                {
                  name: "🎯 MMR",
                  value: mmrInfo,
                  inline: true,
                },
                {
                  name: "👥 Time 1",
                  value: teams.team1.players
                    .map((p) => `**${p.username}** (MMR: ${Math.ceil(p.mmr)})`)
                    .join("\n"),
                  inline: false,
                },
                {
                  name: "👥 Time 2",
                  value: teams.team2.players
                    .map((p) => `**${p.username}** (MMR: ${Math.ceil(p.mmr)})`)
                    .join("\n"),
                  inline: false,
                }
              )
              .setFooter({ text: `Fila #${activeQueue.id} • ${matchType}` })
              .setTimestamp();

            await interaction.reply({
              content: `✅ Partida ${matchType} iniciada com sucesso!`,
              embeds: [teamsEmbed],
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "❌ Erro ao formar times",
              ephemeral: true,
            });
          }
          break;

        case "clear-queue":
          const queueToClear = await Queue.getActiveQueue();
          if (!queueToClear) {
            await interaction.reply({
              content: "❌ Não há filas ativas para limpar",
              ephemeral: true,
            });
            return;
          }

          await Queue.clearQueue(queueToClear.id);
          await interaction.reply({
            content: `✅ Fila #${queueToClear.id} foi limpa com sucesso!`,
            ephemeral: true,
          });
          break;

        case "add-bot":
          const count = interaction.options.getInteger("count", true);
          const queueForBots = await Queue.getActiveQueue();

          if (!queueForBots) {
            await interaction.reply({
              content: "❌ Não há filas ativas para adicionar bots",
              ephemeral: true,
            });
            return;
          }

          // Adiciona bots à fila
          for (let i = 0; i < count; i++) {
            const botId = `bot_${Date.now()}_${i}`;
            const botUsername = `Bot_${i + 1}`;

            // Cria bot como jogador
            let botPlayer = await Player.getPlayerByDiscordId(botId);
            if (!botPlayer) {
              botPlayer = await Player.createPlayer(botId, botUsername);
            }

            // Adiciona bot à fila
            await Queue.addPlayerToQueue(queueForBots.id, botId);
          }

          await interaction.reply({
            content: `✅ ${count} bot(s) adicionado(s) à fila #${queueForBots.id}!`,
            ephemeral: true,
          });
          break;

        case "finish-match":
          try {
            const winner = interaction.options.getString("winner", true);

            // Obtém a fila que está formando times (status "forming")
            const activeQueue = await Queue.getQueuesByStatus("forming");
            if (!activeQueue || activeQueue.length === 0) {
              await interaction.reply({
                content: "❌ Não há partidas em andamento para finalizar",
                ephemeral: true,
              });
              return;
            }

            // Usa a primeira fila em formação
            const queueToFinish = activeQueue[0];
            if (!queueToFinish) {
              await interaction.reply({
                content: "❌ Erro ao obter fila para finalizar",
                ephemeral: true,
              });
              return;
            }

            // Calcula a duração da partida automaticamente
            const matchStartTime = queueToFinish.startedAt || queueToFinish.createdAt;
            const matchEndTime = new Date();
            const durationInMs = matchEndTime.getTime() - matchStartTime.getTime();
            const durationInMinutes = Math.max(1, Math.floor(durationInMs / (1000 * 60)));

            // Obtém os times formados
            const teams = await Queue.formTeams(queueToFinish.id);
            if (!teams) {
              await interaction.reply({
                content: "❌ Erro ao obter times da partida",
                ephemeral: true,
              });
              return;
            }

            // Cria o registro da partida
            const matchId = await Match.createMatch(
              queueToFinish.id,
              teams.team1,
              teams.team2
            );

            // Finaliza a partida e calcula MMR
            await Match.finishMatch(
              matchId,
              winner as "team1" | "team2",
              undefined,
              undefined,
              durationInMinutes
            );

            // Atualiza status da fila para completed
            await Queue.updateQueueStatus(queueToFinish.id, "completed");

            // Cria embed com resultado
            const resultEmbed = new EmbedBuilder()
              .setTitle("🏁 Partida Finalizada!")
              .setColor(winner === "team1" ? "#00ff00" : "#ff0000")
              .addFields(
                {
                  name: "🏆 Vencedor",
                  value: winner === "team1" ? "Time 1" : "Time 2",
                  inline: true,
                },
                {
                  name: "⏱️ Duração",
                  value: `${durationInMinutes} min`,
                  inline: true,
                },
                {
                  name: "👥 Time 1",
                  value: teams.team1.players
                    .map((p) => `${p.username} (MMR: ${Math.ceil(p.mmr)})`)
                    .join(", "),
                  inline: false,
                },
                {
                  name: "👥 Time 2",
                  value: teams.team2.players
                    .map((p) => `${p.username} (MMR: ${Math.ceil(p.mmr)})`)
                    .join(", "),
                  inline: false,
                }
              )
              .setFooter({ text: `Partida #${matchId}` })
              .setTimestamp();

            await interaction.reply({
              content: `✅ Partida finalizada com sucesso!`,
              embeds: [resultEmbed],
              ephemeral: true,
            });
          } catch (error) {
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
    } catch (error) {
      console.error("Erro no comando admin:", error);
      await interaction.reply({
        content: "❌ Erro ao executar comando administrativo",
        ephemeral: true,
      });
    }
  }
}
