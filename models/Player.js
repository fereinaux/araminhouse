const { mongoose, Schema } = require('../mongo')

const playerSchema = new Schema({
  name: String,
  id: String,
  elo: Number
});

const playerModel = mongoose.model("players", playerSchema)


module.exports = playerModel;