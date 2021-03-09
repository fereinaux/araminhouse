const { mongoose, Schema } = require('../mongo')

const queueSchema = new Schema({
  status: String,
  size: Number,
  winningTeam: Number,
  players: Array,
  teamOne: Array,
  teamTwo: Array,
});

const queueModel = mongoose.model("queues", queueSchema)


module.exports = queueModel;