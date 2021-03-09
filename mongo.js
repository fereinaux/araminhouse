const mongoose = require('mongoose')
const helper = require('./helper.json')
mongoose.connect(helper.connectionString , {
  useNewUrlParser: true
})

const Schema = mongoose.Schema

module.exports = {mongoose, Schema};