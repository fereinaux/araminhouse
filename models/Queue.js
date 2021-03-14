const { mongoose, Schema } = require('../mongo')

const queueSchema = new Schema({
  status: String,
  reopen: Boolean,
  ownerId: String,
  size: Number,
  players: Array,
  teamOne: Array,
  teamTwo: Array,
  date: Date,
  endDate: Date,
  matchId: String
});

const queueModel = mongoose.model("queues", queueSchema)


module.exports = queueModel;