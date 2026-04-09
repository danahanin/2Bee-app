class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

function sendError(res, error, fallbackMessage = 'Internal server error') {
  if (error instanceof AppError) {
    return res
      .status(error.statusCode)
      .json({ error: { code: error.code, message: error.message, details: error.details ?? null } })
  }

  console.error(error)
  return res.status(500).json({ error: { code: 'SERVER_ERROR', message: fallbackMessage } })
}

module.exports = {
  AppError,
  sendError,
}
