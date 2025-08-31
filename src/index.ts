import { Client, GatewayIntentBits, Events } from "discord.js";
import { DatabaseService } from "./services/DatabaseService";
import { Player } from "./models/Player";
import { Queue } from "./models/Queue";
import { Match } from "./models/Match";
import { MMRService } from "./services/MMRService";
import { TeamBalancerService } from "./services/TeamBalancerService";
import { DiscordController } from "./controllers/DiscordController";
import { QueueController } from "./controllers/QueueController";
import { PlayerController } from "./controllers/PlayerController";
import { AppConfig } from "./types";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Carrega variáveis de ambiente
dotenv.config();

// Carrega configuração do arquivo JSON
const configPath = path.join(__dirname, "config.json");
let config: AppConfig;

try {
  const configFile = fs.readFileSync(configPath, "utf8");
  const jsonConfig = JSON.parse(configFile);

  config = {
    port: jsonConfig.application?.port || 3000,
    discord: {
      token: process.env.DISCORD_TOKEN || jsonConfig.discord?.token || "",
      clientId: jsonConfig.discord?.clientId || "",
      guildId: "", // Não configurado no JSON
    },
    database: {
      path: jsonConfig.database?.path || "./aramhouse.db",
      verbose: jsonConfig.application?.nodeEnv === "development",
    },
    queue: {
      minPlayers: 8,
      maxPlayers: 10,
      teamSize: 5,
      maxMmrDifference: 200,
      roleDistribution: [
        { name: "ADC", priority: 1, required: true },
        { name: "Support", priority: 2, required: true },
        { name: "Mid", priority: 3, required: false },
        { name: "Top", priority: 4, required: false },
        { name: "Jungle", priority: 5, required: false },
      ],
    },
  };

  // Valida se o token está presente
  if (!config.discord.token) {
    throw new Error(
      "DISCORD_TOKEN é obrigatório (defina no arquivo .env ou config.json)"
    );
  }

  console.log(
    "✅ Configuração carregada do arquivo config.json com token das variáveis de ambiente"
  );
} catch (error) {
  console.error("❌ Erro ao carregar configuração:", error);
  process.exit(1);
}

// Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Inicializa a aplicação
async function startApp(): Promise<void> {
  try {
    console.log("🚀 Iniciando AramHouse TS...");

    // Inicializa banco de dados
    const db = DatabaseService.getInstance(config.database.path);
    await db.initDatabase();
    console.log("✅ Banco de dados inicializado com sucesso!");

    // Inicializa controladores
    const discordController = new DiscordController(client, config.discord);
    const queueController = new QueueController();
    const playerController = new PlayerController();

    // Configura eventos do Discord
    client.on(Events.ClientReady, async () => {
      console.log(`🤖 Bot ${client.user?.tag} está online!`);
      await discordController.setupCommands();
    });

    // Inicializa o bot do Discord
    await client.login(config.discord.token);

    // Inicia serviços em background
    startBackgroundServices();

    console.log("🚀 Aplicação AramHouse TS iniciada com sucesso!");
    console.log(`📊 Configurações:`);
    console.log(
      `   - Tamanho da fila: ${config.queue.minPlayers}-${config.queue.maxPlayers} jogadores`
    );
    console.log(`   - Tamanho do time: ${config.queue.teamSize} jogadores`);
    console.log(
      `   - Diferença máxima de MMR: ${config.queue.maxMmrDifference}`
    );
    console.log(
      `   - Roles: ${config.queue.roleDistribution
        .map((r) => r.name)
        .join(", ")}`
    );
  } catch (error) {
    console.error("❌ Erro ao inicializar aplicação:", error);
    process.exit(1);
  }
}

// Serviços em background
function startBackgroundServices(): void {
  // Limpa jogadores inativos das filas a cada 5 minutos
  setInterval(async () => {
    try {
      const activeQueue = await Queue.getActiveQueue();
      if (activeQueue) {
        const removedCount = await Queue.removeInactivePlayers(
          activeQueue.id,
          10
        );
        if (removedCount > 0) {
          console.log(
            `🧹 Removidos ${removedCount} jogadores inativos da fila ${activeQueue.id}`
          );
        }
      }
    } catch (error) {
      console.error("Erro ao limpar jogadores inativos:", error);
    }
  }, 5 * 60 * 1000);

  // Sistema automático de formação de times DESABILITADO
  // As partidas agora só são iniciadas manualmente pelos comandos admin
  // (start, finish-match)
  console.log("ℹ️ Sistema automático de formação de times desabilitado");
  console.log("ℹ️ Use comandos admin para iniciar partidas manualmente");

  // Atualiza estatísticas a cada hora
  setInterval(async () => {
    try {
      const stats = await Match.getMatchStatistics();
      console.log(`📊 Estatísticas atualizadas:`);
      console.log(`   Total de partidas: ${stats.totalMatches}`);
      console.log(`   Jogadores únicos: ${stats.totalPlayers}`);
      console.log(
        `   Duração média: ${stats.averageDuration.toFixed(0)} minutos`
      );
      console.log(
        `   Taxa de vitória Time 1: ${stats.winRateByTeam.team1.toFixed(1)}%`
      );
      console.log(
        `   Taxa de vitória Time 2: ${stats.winRateByTeam.team2.toFixed(1)}%`
      );
    } catch (error) {
      console.error("Erro ao atualizar estatísticas:", error);
    }
  }, 60 * 60 * 1000);
}

// Tratamento de erros não capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Tratamento de sinais de término
process.on("SIGINT", async () => {
  console.log("\n🛑 Recebido sinal de término...");

  try {
    if (client.isReady()) {
      await client.destroy();
      console.log("🤖 Bot Discord desconectado");
    }

    console.log("✅ Aplicação encerrada com sucesso");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao encerrar aplicação:", error);
    process.exit(1);
  }
});

// Inicia a aplicação
startApp();
