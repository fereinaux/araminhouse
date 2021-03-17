const express = require('express');
const PORT = process.env.PORT || 3000;
const { URLSearchParams } = require('url');
const fetch = require('node-fetch');
const app = express();
const connections = require('./connections.json')
const playerModel = require('./models/Player')
const queueModel = require('./models/Queue')
const playerController = require('./controllers/PlayerController')
const queueController = require('./controllers/QueueController')
const utilsBot = require('./utils/bot')
const utilsRiot = require('./utils/riot')
const cors = require('cors');

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

app.get('/', (req, res) => {
  const code = req.query.code;

  const data = {
    client_id: connections.discordClientId,
    client_secret: connections.discordSecretId,
    grant_type: "authorization_code",
    redirect_uri: 'http://localhost:53134',
    code: code,
    scope: 'identify+guilds',
  }
  if (code) {
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
    res.redirect([
      'https://discordapp.com/oauth2/authorize',
      `?client_id=${connections.discordClientId}`,
      '&scope=identify+guilds',
      '&response_type=code',
      `&callback_uri=http://localhost:53134`
    ].join(''));
  }
});

app.get('/guilds', (req, res) => {
  fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${req.query.token}`,
    },
  })
    .then(res => res.json())
    .then(data => playerController.getPlayerById(data.id).then(result => {
      result.discordAcessToken = req.query.token
      playerModel.findOneAndUpdate({ id: data.id }, result, { new: true }).then(res.redirect(`http://localhost:3000/${data.id}`))
    }
    ));
});

app.listen(PORT, () =>  console.log(`Listening on Port ${PORT}`));