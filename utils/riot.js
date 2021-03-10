const axios = require('axios');
const helper = require('../helper.json')

const api = axios.create({
  baseURL: 'https://br1.api.riotgames.com',
  timeout: 10000,
  headers: { "X-Riot-Token": helper.lolApiKey },
  validateStatus: false
});



async function searchBySummonerName(name) {
  const response = await api.get(`/lol/summoner/v4/summoners/by-name/${encodeURI(name)}`)
  if (response.status == 200) {    
    return response.data
  }
}

async function searchSummonerLeague(id) {
  const response = await api.get(`/lol/league/v4/entries/by-summoner/${id}`)
  return response.data
}

module.exports = { searchBySummonerName, searchSummonerLeague }