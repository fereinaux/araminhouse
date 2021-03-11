const mongoose = require('mongoose')
const helper = require('./helper.json')
const connections = require('./connections.json')
mongoose.connect(connections.connectionString , {
  useNewUrlParser: true
})

const Schema = mongoose.Schema

module.exports = {mongoose, Schema};