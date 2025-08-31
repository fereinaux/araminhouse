import {
  Client,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Events,
  Interaction,
} from "discord.js";
import { DiscordConfig } from "../types";
import { Player } from "../models/Player";
import { Queue } from "../models/Queue";
import { Match } from "../models/Match";
import { MMRService } from "../services/MMRService";
import { SlashCommandService } from "../services/SlashCommandService";

export class DiscordController {
  private client: Client;
  private config: DiscordConfig;
  private slashCommandService: SlashCommandService;

  constructor(client: Client, config: DiscordConfig) {
    this.client = client;
    this.config = config;
    this.slashCommandService = new SlashCommandService(
      config.clientId,
      config.token,
      config.guildId
    );
    this.setupMessageHandlers();
    this.setupSlashCommandHandlers();
  }

  /**
   * Configura comandos slash do Discord
   */
  async setupCommands(): Promise<void> {
    console.log("🔧 Configurando comandos do Discord...");
    
    // Tenta detectar o servidor automaticamente se não tiver guildId configurado
    if (!this.config.guildId) {
      const guilds = await this.client.guilds.fetch();
      const firstGuild = guilds.first();
      
      if (firstGuild) {
        console.log(`🏠 Servidor detectado: ${firstGuild.name} (${firstGuild.id})`);
        // Atualiza o guildId no SlashCommandService
        (this.slashCommandService as any).guildId = firstGuild.id;
      }
    }
    
    // Registra comandos slash
    await this.slashCommandService.registerCommands();
  }

  /**
   * Configura handlers para comandos slash
   */
  private setupSlashCommandHandlers(): void {
    this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await this.slashCommandService.handleSlashCommand(interaction);
      } catch (error) {
        console.error('Erro ao processar comando slash:', error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: '❌ Ocorreu um erro ao processar o comando', 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: '❌ Ocorreu um erro ao processar o comando', 
            ephemeral: true 
          });
        }
      }
    });
  }

  /**
   * Configura handlers de mensagens
   */
  private setupMessageHandlers(): void {
    this.client.on("messageCreate", async (message: Message) => {
      if (message.author.bot || message.channel.type !== ChannelType.GuildText)
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
      } catch (error) {
        console.error("Erro ao processar comando:", error);
        await message.reply("❌ Ocorreu um erro ao processar o comando.");
      }
    });
  }

  /**
   * Handler para entrar na fila
   */
  private async handleJoinQueue(
    message: Message,
    args: string[]
  ): Promise<void> {
    const discordId = message.author.id;
    const username = message.author.username;

    try {
      // Verifica se o jogador já está em uma fila
      if (await Queue.isPlayerInQueue(discordId)) {
        await message.reply("❌ Você já está em uma fila!");
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
        const queueId = await Queue.createQueue(10); // Fila de 10 jogadores
        activeQueue = await Queue.getQueueById(queueId);
      }

      if (!activeQueue) {
        await message.reply("❌ Erro ao criar/obter fila");
        return;
      }

      // Adiciona jogador à fila
      await Queue.addPlayerToQueue(activeQueue.id, discordId);

      // Obtém estatísticas da fila
      const stats = await Queue.getQueueStats(activeQueue.id);
      if (!stats) {
        await message.reply("❌ Erro ao obter estatísticas da fila");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🎮 Entrou na Fila ARAM!")
        .setColor("#00ff00")
        .addFields(
          { name: "👤 Jogador", value: username, inline: true },
          { name: "📊 MMR", value: player.mmr.toString(), inline: true },
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
            value: stats.averageMmr.toFixed(0),
            inline: true,
          }
        )
        .setFooter({ text: `Fila #${activeQueue.id}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao entrar na fila:", error);
      await message.reply("❌ Erro ao entrar na fila. Tente novamente.");
    }
  }

  /**
   * Handler para sair da fila
   */
  private async handleLeaveQueue(
    message: Message,
    args: string[]
  ): Promise<void> {
    const discordId = message.author.id;

    try {
      const playerQueue = await Queue.getPlayerQueue(discordId);
      if (!playerQueue) {
        await message.reply("❌ Você não está em nenhuma fila!");
        return;
      }

      await Queue.removePlayerFromQueue(playerQueue.id, discordId);

      const embed = new EmbedBuilder()
        .setTitle("🚪 Saiu da Fila")
        .setColor("#ff0000")
        .setDescription(`Você saiu da fila #${playerQueue.id}`)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao sair da fila:", error);
      await message.reply("❌ Erro ao sair da fila. Tente novamente.");
    }
  }

  /**
   * Handler para status da fila
   */
  private async handleQueueStatus(
    message: Message,
    args: string[]
  ): Promise<void> {
    try {
      const activeQueue = await Queue.getActiveQueue();
      if (!activeQueue) {
        await message.reply("📭 Não há filas ativas no momento.");
        return;
      }

      const stats = await Queue.getQueueStats(activeQueue.id);
      if (!stats) {
        await message.reply("❌ Erro ao obter estatísticas da fila");
        return;
      }

      const players = activeQueue.players.slice(0, 10); // Mostra apenas os primeiros 10
      const playerList = players
        .map((p, i) => `${i + 1}. **${p.username}** (MMR: ${p.mmr})`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`📊 Status da Fila #${activeQueue.id}`)
        .setColor("#0099ff")
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
            value: stats.averageMmr.toFixed(0),
            inline: true,
          },
          {
            name: "📊 Faixa de MMR",
            value: `${stats.mmrRange.min} - ${stats.mmrRange.max}`,
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
    } catch (error) {
      console.error("Erro ao obter status da fila:", error);
      await message.reply("❌ Erro ao obter status da fila.");
    }
  }

  /**
   * Handler para perfil do jogador
   */
  private async handlePlayerProfile(
    message: Message,
    args: string[]
  ): Promise<void> {
    const targetUser = args[1]
      ? args[1].replace(/[<@!>]/g, "")
      : message.author.id;

    try {
      const player = await Player.getPlayerByDiscordId(targetUser);
      if (!player) {
        await message.reply("❌ Jogador não encontrado!");
        return;
      }

      const stats = await Player.getPlayerStats(player.id);
      if (!stats) {
        await message.reply("❌ Erro ao obter estatísticas do jogador");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`👤 Perfil de ${player.username}`)
        .setColor("#ff9900")
        .addFields(
          { name: "📊 MMR", value: player.mmr.toString(), inline: true },
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

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao obter perfil do jogador:", error);
      await message.reply("❌ Erro ao obter perfil do jogador.");
    }
  }

  /**
   * Handler para top jogadores
   */
  private async handleTopPlayers(
    message: Message,
    args: string[]
  ): Promise<void> {
    try {
      const limit = args[1] ? parseInt(args[1]) : 10;
      const players = await Player.getTopPlayers(Math.min(limit, 25));

      if (players.length === 0) {
        await message.reply("📭 Nenhum jogador encontrado.");
        return;
      }

      const playerList = players
        .map((p, i) => {
          const medal =
            i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return `${medal} **${p.username}** - MMR: ${p.mmr} (${p.wins}W/${p.losses}L)`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top Jogadores")
        .setColor("#ffd700")
        .setDescription(playerList)
        .setFooter({ text: `Top ${players.length} jogadores por MMR` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao obter top jogadores:", error);
      await message.reply("❌ Erro ao obter top jogadores.");
    }
  }

  /**
   * Handler para estatísticas globais
   */
  private async handleGlobalStats(
    message: Message,
    args: string[]
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
            value: (
              playerStats.reduce((sum, p) => sum + p.mmr, 0) / totalPlayers
            ).toFixed(0),
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

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao obter estatísticas globais:", error);
      await message.reply("❌ Erro ao obter estatísticas globais.");
    }
  }

  /**
   * Handler para ajuda
   */
  private async handleHelp(message: Message, args: string[]): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("❓ Comandos Disponíveis")
      .setColor("#0099ff")
      .setDescription("Lista de todos os comandos disponíveis:")
      .addFields(
        { name: "!join", value: "Entra na fila ARAM", inline: true },
        { name: "!leave", value: "Sai da fila atual", inline: true },
        { name: "!status", value: "Mostra status da fila ativa", inline: true },
        {
          name: "!profile [@user]",
          value: "Mostra perfil de um jogador",
          inline: true,
        },
        {
          name: "!top [número]",
          value: "Mostra top jogadores (padrão: 10)",
          inline: true,
        },
        { name: "!stats", value: "Mostra estatísticas globais", inline: true },
        { name: "!help", value: "Mostra esta mensagem de ajuda", inline: true }
      )
      .addFields(
        {
          name: "📊 Sistema MMR",
          value:
            "O sistema usa um algoritmo Elo adaptado para ARAM, considerando performance individual, balanceamento de times e sequências de vitórias.",
          inline: false,
        },
        {
          name: "⚖️ Balanceamento",
          value:
            "Times são formados automaticamente para maximizar o equilíbrio de MMR e distribuição de roles.",
          inline: false,
        }
      )
      .setFooter({ text: "AramHouse TS - Sistema de Ranking ARAM" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Envia notificação para um canal específico
   */
  async sendNotification(
    channelId: string,
    content: string,
    embed?: EmbedBuilder
  ): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel?.isTextBased()) {
        if (embed) {
          await (channel as any).send({ content, embeds: [embed] });
        } else {
          await (channel as any).send(content);
        }
      }
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  }

  /**
   * Envia notificação de partida formada
   * Nota: Este método precisa ser chamado com o contexto da mensagem para enviar no canal correto
   */
  async notifyMatchFormed(
    queueId: number,
    team1: any,
    team2: any,
    channelId?: string
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("⚔️ Partida Formada!")
      .setColor("#ff6b6b")
      .setDescription(`Fila #${queueId} está pronta!`)
      .addFields(
        {
          name: "🔵 Time 1",
          value: team1.players.map((p: any) => p.username).join("\n"),
          inline: true,
        },
        {
          name: "🔴 Time 2",
          value: team2.players.map((p: any) => p.username).join("\n"),
          inline: true,
        }
      )
      .addFields(
        {
          name: "📊 MMR Time 1",
          value: team1.averageMmr.toFixed(0),
          inline: true,
        },
        {
          name: "📊 MMR Time 2",
          value: team2.averageMmr.toFixed(0),
          inline: true,
        },
        {
          name: "⚖️ Diferença",
          value: Math.abs(team1.averageMmr - team2.averageMmr).toFixed(0),
          inline: true,
        }
      )
      .setFooter({ text: "Entre no jogo e divirta-se!" })
      .setTimestamp();

    // Se não houver channelId, não envia notificação
    if (channelId) {
      await this.sendNotification(
        channelId,
        "🎮 **PARTIDA FORMADA!**",
        embed
      );
    }
  }
}
