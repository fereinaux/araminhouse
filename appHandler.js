const express = require('express');
const PORT = process.env.PORT || 80;
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
const playerModel = require('./models/Player')
const queueModel = require('./models/Queue')
const playerController = require('./controllers/PlayerController')
const queueController = require('./controllers/QueueController')
const discordController = require('./controllers/DiscordController')
const utilsBot = require('./utils/bot')
const utilsRiot = require('./utils/riot')
const cors = require('cors');
const bodyParser = require('body-parser')

app.use(bodyParser());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/getRanking', async (req, res) => {
  const result = await playerController.playersRankedPortal()
  res.send(result)
})

app.get('/getPlayerById/:id', async (req, res) => {
  const result = await playerController.getObjPlayer(req.params.id)
  res.send(result)
})

app.get('/getAuth/:id', async (req, res) => {
  const result = await playerController.getPlayerByDiscordToken(req.params.id)
  res.send(result)
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

app.post('/join', (req, res) => {
  discordController.Queue.add({id: req.body.id})
  res.send()
})

app.post('/leave', (req, res) => {
  queueController.leaveQueue(req.body.id)
  res.send()
})

app.get('/guilds', (req, res) => {
  fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${req.query.token}`,
    },
  })
    .then(res => res.json())
    .then(data => playerController.getPlayerById(data.id).then(result => {
      result.discordAcessToken = req.query.token
      playerModel.findOneAndUpdate({ id: data.id }, result, { new: true }).then(res.redirect(
        `https://araminhouse.herokuapp.com/login/${req.query.token}`
        // `https://araminhouse.herokuapp.com/login/${req.query.token}`
      ))
    }
    ));
});

server.listen(PORT, () => console.log(`Listening on Port ${PORT}`));