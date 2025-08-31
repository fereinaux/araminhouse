const express = require('express');
const PORT = process.env.PORT || 3000;
const { URLSearchParams } = require('url');
const fetch = require('node-fetch');
const app = express();
const server = require('http').createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
})

let interval;

io.on('connection', async (client) => {
  client.on('findQueue', async () => {
    setInterval(async () => {
      const queue = await queueController.queueExists()
      client.emit('queueFound', queue);
    }, 1000);
  });
});

const connections = require('./connections.json')
const playerController = require('./controllers/PlayerController')
const queueController = require('./controllers/QueueController')
const discordController = require('./controllers/DiscordController')
const cors = require('cors');
const bodyParser = require('body-parser')

app.use(bodyParser());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/getRanking', async (req, res) => {
  try {
    const result = await playerController.playersRankedPortal()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking' })
  }
})

app.get('/getPlayerById/:id', async (req, res) => {
  try {
    const result = await playerController.getObjPlayer(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar jogador' })
  }
})

app.get('/getAuth/:id', async (req, res) => {
  try {
    const result = await playerController.getPlayerByDiscordToken(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar autenticação' })
  }
})

app.get('/auth', (req, res) => {
  const code = req.query.code;
  if (code) {
    const data = {
      client_id: connections.discordClientId,
      client_secret: connections.discordSecretId,
      grant_type: "authorization_code",
      code: code,
      scope: 'identify+guilds'
    }
    fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams(data),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then(res => res.json())
      .then(data => res.redirect(`/guilds?token=${data.access_token}`));
  } else {
    res.send([
      'https://discordapp.com/oauth2/authorize',
      `?client_id=${connections.discordClientId}`,
      '&scope=identify+guilds',
      '&response_type=code'
    ].join(''));
  }
});

app.post('/join', async (req, res) => {
  try {
    await queueController.setJoin(req.body.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao entrar na fila' })
  }
})

app.post('/queue', async (req, res) => {
  try {
    await queueController.createQueue(req.body.size || 5)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar fila' })
  }
})

app.post('/leave', async (req, res) => {
  try {
    await queueController.leaveQueue(req.body.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao sair da fila' })
  }
})

app.get('/guilds', (req, res) => {
  fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${req.query.token}`,
    },
  })
    .then(res => res.json())
    .then(data => {
      res.json({
        success: true,
        user: data,
        message: 'Autenticação realizada com sucesso'
      })
    })
    .catch(error => {
      res.status(500).json({ error: 'Erro na autenticação' })
    });
});

server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));