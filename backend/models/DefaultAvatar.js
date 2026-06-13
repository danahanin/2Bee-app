const mongoose = require('mongoose')

const defaultAvatarSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    label: { type: String, required: true },
    url: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false },
)

module.exports = mongoose.model('DefaultAvatar', defaultAvatarSchema)
