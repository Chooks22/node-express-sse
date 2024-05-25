import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import express from 'express'

const ONE_DAY = 3600 * 24
// ID <-> username map
const users = new Map()

// Current SSE connections
const connections = new Set()
// Previous messages
const messages = []

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))

// Map an id to a username
function createSession(username) {
  const sessionId = randomUUID()
  users.set(sessionId, username)
  return sessionId
}

// Get the username from an id
function getUserFromSession(sessionId) {
  return users.get(sessionId)
}

// Middleware to get username from id
function auth(req, res, next) {
  req.user = getUserFromSession(req.cookies.session_id)
  next()
}

app.get('/', auth, (req, res) => {
  if (!req.user) {
    res.redirect('/login')
    return
  }
  res.sendFile(`${process.cwd()}/static/index.html`)
})

app.get('/login', auth, (req, res) => {
  if (req.user) {
    res.redirect('/')
    return
  }
  res.sendFile(`${process.cwd()}/static/login.html`)
})

// Mainly to serve js file
app.use('/', express.static('static'))

// Attach an id to a username
app.post('/login', (req, res) => {
  const session = createSession(req.body.username)
  res.setHeader('Set-Cookie', `session_id=${session}; Secure; HttpOnly; Same-Site=strict; Path=/; Max-Age=${ONE_DAY};`)
  res.redirect('/')
  console.log(`User created: %s`, req.body.username)
})

// Gets previous messages
app.get('/messages', auth, (req, res) => {
  res.json({ data: messages })
})

// Subscribes to real-time chat
app.get('/sse', auth, (req, res) => {
  if (!req.user) {
    res.sendStatus(403)
    return
  }

  console.log('User connected: %s', req.user)
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  connections.add(res)
  req.once('close', () => {
    console.log('User disconnected: %s', req.user)
    connections.delete(res)
  })
})

// Creates a new message
app.post('/message', auth, (req, res) => {
  if (!req.user) {
    res.sendStatus(403)
    return
  }

  res.sendStatus(200)
  console.log('Message: <%s>: %s', req.user, req.body.message)
  const payload = { user: req.user, body: req.body.message }
  messages.push(payload)

  for (const conn of connections) {
    conn.write(`data: ${JSON.stringify(payload)}\n\n`)
  }
})

const PORT = Number(process.env.PORT ?? '4000')
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`)
})
