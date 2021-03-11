const axios = require('axios');
const connections = require('../helper.json')

const api = axios.create({
  baseURL:  connections.lolBaseUrl,
  timeout: 10000,
  headers: { "X-Riot-Token": connections.lolApiKey },
  validateStatus: false
});

const externalApi = axios.create()


async function searchBySummonerName(name) {
  const response = await api.get(`/lol/summoner/v4/summoners/by-name/${encodeURI(name)}`)
  if (response.status == 200) {
    return response.data
  }
}

async function searchMatches(accountId, beginTime) {
  let endTime = new Date() / 1000
  const response = await api.get(`/lol/match/v4/matchlists/by-account/${accountId}?endTime=${endTime}&beginTime=1615341442278`)
  if (response.status == 200) {
    return response.data
  }
}

async function searchActiveMatch(summonerid) {
  const response = await api.get(`/lol/spectator/v4/active-games/by-summoner/${summonerid}`)
  if (response.status == 200) {
    return response.data
  }
}

async function getMatchById(matchId) {
  const response = await api.get(`lol/match/v4/matches/${matchId}`)  
  if (response.status == 200) {
    return response.data
  }
}

async function searchSummonerLeague(id) {
  const response = await api.get(`/lol/league/v4/entries/by-summoner/${id}`)
  return response.data
}

async function getChampions() {
  const response = await api.get('http://ddragon.leagueoflegends.com/cdn/11.5.1/data/en_US/champion.json')
  return response.data.data
}

function getImageByChampionPath(championPath) {
  return `http://ddragon.leagueoflegends.com/cdn/11.5.1/img/champion/${championPath}`
}

module.exports = { searchBySummonerName, searchMatches, searchSummonerLeague, getMatchById, searchActiveMatch, getChampions, getImageByChampionPath }