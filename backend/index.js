const mongoose = require('mongoose')
const { createApp } = require('./app')

const port = process.env.PORT || 4000
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'
const app = createApp()

function startServer({ mongoReady }) {
  app.listen(port, () => {
    if (mongoReady) {
      console.log('Connected to MongoDB')
    } else {
      console.warn('MongoDB not connected — running in offline mode. Some features may be unavailable.')
    }
    console.log(`2Bee backend running on http://localhost:${port}`)
  })
}

function bootstrap() {
  mongoose
    .connect(mongoUri)
    .then(() => {
      startServer({ mongoReady: true })
    })
    .catch((err) => {
      console.warn('MongoDB connection error:', err.message)
      startServer({ mongoReady: false })
    })
}

if (require.main === module) {
  bootstrap()
}

module.exports = { app, bootstrap }
