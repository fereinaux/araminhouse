const { mongoose, Schema } = require('../mongo')

const roleSchema = new Schema({
  name: String,
  color: String
});

const roleModel = mongoose.model("roles", roleSchema)


module.exports = roleModel;