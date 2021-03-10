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

async function searchMatches(accountId, beginTime) {
  let endTime = new Date() / 1000
  const response = await api.get(`/lol/match/v4/matchlists/by-account/${accountId}?endTime=${endTime}&beginTime=1615341442278`)
  if (response.status == 200) {
    return response.data
  }
}

async function searchActiveMatch(summonerid){
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

module.exports = { searchBySummonerName, searchMatches, searchSummonerLeague, getMatchById, searchActiveMatch }