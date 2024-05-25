const sse = new EventSource('/sse')

const chatbox = document.querySelector('#chatbox')
const message = document.querySelector('#message')
const messages = document.querySelector('#messages')

// Handle form submit to prevent page redirecting
chatbox.addEventListener('submit', async e => {
  e.preventDefault()
  await fetch('/message', {
    method: 'POST',
    headers: [['Content-Type', 'application/x-www-form-urlencoded']],
    body: `message=${message.value}`
  })
  chatbox.reset()
})

function addMessage(data) {
  const item = document.createElement('li')
  const user = document.createElement('span')
  const body = document.createElement('p')

  user.textContent = data.user
  body.textContent = data.body
  item.append(user, body)

  messages.append(item)
}

// Create new messages from event
sse.addEventListener('message', e => {
  const data = JSON.parse(e.data)
  addMessage(data)
})

// Load previous messages on load
async function load() {
  const res = await fetch('/messages')
  const body = await res.json()
  console.log(body.data)

  body.data.forEach(addMessage)
}

load()
