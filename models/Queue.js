const { mongoose, Schema } = require('../mongo')

const queueSchema = new Schema({
  status: String,
  size: Number,
  players: Array,
  teamOne: Array,
  teamTwo: Array,
  date: Date,
  matchId: String
});

const queueModel = mongoose.model("queues", queueSchema)


module.exports = queueModel;