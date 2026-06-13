const avatarService = require('../services/avatarService')
const profileService = require('../services/profileService')

function userFallback(req) {
  return {
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    pairId: req.user.pairId,
    hiveId: req.user.hiveId,
  }
}

async function getDefaultAvatars(_req, res, next) {
  try {
    const avatars = await avatarService.listDefaultAvatars()
    return res.json({ avatars })
  } catch (error) {
    return next(error)
  }
}

async function uploadAvatar(req, res, next) {
  try {
    const result = await avatarService.saveUploadedAvatar(req.user.userId, req.file, userFallback(req))
    return res.json({ success: true, ...result })
  } catch (error) {
    return next(error)
  }
}

async function getHiveMembers(req, res, next) {
  try {
    const members = await avatarService.getHiveMembers(req.params.hiveId, req.user.userId)
    return res.json({ members })
  } catch (error) {
    return next(error)
  }
}

async function getPartnerProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.userId, userFallback(req))
    if (!profile.pairId) {
      return res.json({ partner: null })
    }

    const User = require('../models/User')
    const partner = await User.findById(profile.pairId).lean()
    if (!partner) {
      return res.json({ partner: null })
    }

    return res.json({
      partner: {
        id: partner._id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        avatarUrl: partner.avatarUrl || null,
      },
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getDefaultAvatars,
  uploadAvatar,
  getHiveMembers,
  getPartnerProfile,
}
