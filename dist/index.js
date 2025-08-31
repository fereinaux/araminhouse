"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const DatabaseService_1 = require("./services/DatabaseService");
const Queue_1 = require("./models/Queue");
const Match_1 = require("./models/Match");
const DiscordController_1 = require("./controllers/DiscordController");
const QueueController_1 = require("./controllers/QueueController");
const PlayerController_1 = require("./controllers/PlayerController");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const configPath = path.join(__dirname, "config.json");
let config;
try {
    const configFile = fs.readFileSync(configPath, "utf8");
    const jsonConfig = JSON.parse(configFile);
    config = {
        port: jsonConfig.application?.port || 3000,
        discord: {
            token: jsonConfig.discord?.token || "",
            clientId: jsonConfig.discord?.clientId || "",
            guildId: "",
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
    console.log("✅ Configuração carregada do arquivo config.json");
}
catch (error) {
    console.error("❌ Erro ao carregar configuração:", error);
    process.exit(1);
}
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
async function startApp() {
    try {
        console.log("🚀 Iniciando AramHouse TS...");
        const db = DatabaseService_1.DatabaseService.getInstance(config.database.path);
        await db.initDatabase();
        console.log("✅ Banco de dados inicializado com sucesso!");
        const discordController = new DiscordController_1.DiscordController(client, config.discord);
        const queueController = new QueueController_1.QueueController();
        const playerController = new PlayerController_1.PlayerController();
        client.on(discord_js_1.Events.ClientReady, async () => {
            console.log(`🤖 Bot ${client.user?.tag} está online!`);
            await discordController.setupCommands();
        });
        await client.login(config.discord.token);
        startBackgroundServices();
        console.log("🚀 Aplicação AramHouse TS iniciada com sucesso!");
        console.log(`📊 Configurações:`);
        console.log(`   - Tamanho da fila: ${config.queue.minPlayers}-${config.queue.maxPlayers} jogadores`);
        console.log(`   - Tamanho do time: ${config.queue.teamSize} jogadores`);
        console.log(`   - Diferença máxima de MMR: ${config.queue.maxMmrDifference}`);
        console.log(`   - Roles: ${config.queue.roleDistribution
            .map((r) => r.name)
            .join(", ")}`);
    }
    catch (error) {
        console.error("❌ Erro ao inicializar aplicação:", error);
        process.exit(1);
    }
}
function startBackgroundServices() {
    setInterval(async () => {
        try {
            const activeQueue = await Queue_1.Queue.getActiveQueue();
            if (activeQueue) {
                const removedCount = await Queue_1.Queue.removeInactivePlayers(activeQueue.id, 10);
                if (removedCount > 0) {
                    console.log(`🧹 Removidos ${removedCount} jogadores inativos da fila ${activeQueue.id}`);
                }
            }
        }
        catch (error) {
            console.error("Erro ao limpar jogadores inativos:", error);
        }
    }, 5 * 60 * 1000);
    console.log("ℹ️ Sistema automático de formação de times desabilitado");
    console.log("ℹ️ Use comandos admin para iniciar partidas manualmente");
    setInterval(async () => {
        try {
            const stats = await Match_1.Match.getMatchStatistics();
            console.log(`📊 Estatísticas atualizadas:`);
            console.log(`   Total de partidas: ${stats.totalMatches}`);
            console.log(`   Jogadores únicos: ${stats.totalPlayers}`);
            console.log(`   Duração média: ${stats.averageDuration.toFixed(0)} minutos`);
            console.log(`   Taxa de vitória Time 1: ${stats.winRateByTeam.team1.toFixed(1)}%`);
            console.log(`   Taxa de vitória Time 2: ${stats.winRateByTeam.team2.toFixed(1)}%`);
        }
        catch (error) {
            console.error("Erro ao atualizar estatísticas:", error);
        }
    }, 60 * 60 * 1000);
}
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
process.on("SIGINT", async () => {
    console.log("\n🛑 Recebido sinal de término...");
    try {
        if (client.isReady()) {
            await client.destroy();
            console.log("🤖 Bot Discord desconectado");
        }
        console.log("✅ Aplicação encerrada com sucesso");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Erro ao encerrar aplicação:", error);
        process.exit(1);
    }
});
startApp();
//# sourceMappingURL=index.js.map