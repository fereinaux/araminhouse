const { mongoose, Schema } = require('../mongo')

const playerSchema = new Schema({
  name: String,
  id: String,
  elo: Number,
  punicoes: Number,
  summoner: {
    name: String,
    id: String    
  }
});

const playerModel = mongoose.model("players", playerSchema)


module.exports = playerModel;