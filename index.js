const discordController = require('./controllers/DiscordController')
const queueController = require('./controllers/QueueController')
const app = require('./appHandler')
const { initDatabase } = require('./database')

// Inicializa o banco de dados
async function startApp() {
  try {
    await initDatabase();
    console.log('✅ Banco de dados inicializado com sucesso!');

    // Inicia o bot do Discord
    discordController.bot.login(require('./connections.json').token);

    console.log('🚀 Aplicação iniciada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    process.exit(1);
  }
}

// Inicia a aplicação
startApp();



