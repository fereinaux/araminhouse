# AramHouse TS - Sistema de Ranking ARAM

Uma versão moderna e robusta do sistema de ranking ARAM, desenvolvida em TypeScript com um sistema de MMR avançado e balanceamento inteligente de times.

## 🚀 Características

- **Sistema MMR Robusto**: Algoritmo Elo adaptado para ARAM com fatores dinâmicos
- **Balanceamento Inteligente**: Formação automática de times balanceados por MMR e roles
- **Bot Discord**: Interface completa via Discord com comandos intuitivos
- **Banco de Dados SQLite**: Armazenamento persistente com histórico completo
- **TypeScript**: Código tipado e moderno para maior confiabilidade
- **Arquitetura Modular**: Serviços e controladores bem estruturados

## 🏗️ Arquitetura

```
src/
├── controllers/          # Controladores da aplicação
│   ├── DiscordController.ts
│   ├── PlayerController.ts
│   └── QueueController.ts
├── models/              # Modelos de dados
│   ├── Player.ts
│   ├── Queue.ts
│   └── Match.ts
├── services/            # Serviços de negócio
│   ├── MMRService.ts
│   ├── TeamBalancerService.ts
│   └── DatabaseService.ts
├── types/               # Definições de tipos TypeScript
│   └── index.ts
└── index.ts             # Arquivo principal
```

## 📊 Sistema MMR

O sistema utiliza um algoritmo Elo adaptado especificamente para partidas ARAM:

- **Fator K Dinâmico**: Ajusta baseado no número de jogos e MMR atual
- **Bônus de Streak**: Recompensa sequências de vitórias
- **Performance Individual**: Considera KDA e outros fatores
- **Balanceamento de Times**: Penaliza times desbalanceados
- **Confiança MMR**: Indica a confiabilidade do rating

## ⚖️ Balanceamento de Times

- **Distribuição por MMR**: Jogadores distribuídos alternadamente para manter equilíbrio
- **Otimização Automática**: Troca jogadores entre times para melhorar balanceamento
- **Distribuição de Roles**: Considera roles preferidas dos jogadores
- **Score de Balanceamento**: Métrica numérica para qualidade do balanceamento

## 🤖 Comandos do Discord

- `!join` - Entra na fila ARAM
- `!leave` - Sai da fila atual
- `!status` - Mostra status da fila ativa
- `!profile [@user]` - Mostra perfil de um jogador
- `!top [número]` - Mostra top jogadores

- `!stats` - Mostra estatísticas globais
- `!help` - Mostra ajuda

## 🛠️ Instalação

1. **Clone o repositório**

   ```bash
   git clone <url-do-repositorio>
   cd aramhouse
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   Crie um arquivo `.env` baseado no `.env.example`:

   ```env
   DISCORD_TOKEN=seu_token_aqui
   DISCORD_CLIENT_ID=seu_client_id_aqui
   DISCORD_GUILD_ID=seu_guild_id_aqui
   DISCORD_CHANNEL_ID=seu_channel_id_aqui
   NODE_ENV=development
   ```

4. **Compile o projeto**

   ```bash
   npm run build
   ```

5. **Execute a aplicação**
   ```bash
   npm start
   ```

## 🔧 Scripts Disponíveis

- `npm run build` - Compila o projeto TypeScript
- `npm start` - Executa a versão compilada
- `npm run dev` - Executa em modo desenvolvimento
- `npm run watch` - Compila automaticamente em mudanças
- `npm run clean` - Limpa arquivos compilados

## 📈 Funcionalidades Avançadas

### Sistema de Filas

- Criação automática de filas
- Balanceamento inteligente de times
- Remoção de jogadores inativos
- Estatísticas em tempo real

### Histórico e Estatísticas

- Histórico completo de partidas
- Estatísticas por jogador
- Rankings atualizados
- Análise de performance

### Monitoramento

- Serviços em background
- Limpeza automática de dados antigos
- Logs detalhados de operações
- Tratamento robusto de erros

## 🎯 Configurações

O sistema é altamente configurável através do arquivo de configuração:

```typescript
const config: AppConfig = {
  queue: {
    minPlayers: 8,
    maxPlayers: 10,
    teamSize: 5,
    maxMmrDifference: 200,
    roleDistribution: [
      { name: "ADC", priority: 1, required: true },
      { name: "Support", priority: 2, required: true },
      // ... mais roles
    ],
  },
};
```

## 🔒 Segurança

- Validação de entrada em todos os comandos
- Sanitização de dados do Discord
- Transações de banco de dados para operações críticas
- Tratamento robusto de erros

## 📝 Licença

Este projeto está sob a licença ISC.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request para sugestões e melhorias.

## 📞 Suporte

Para suporte ou dúvidas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.
