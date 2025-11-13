const express = require('express'),
  socket = require('socket.io'),
  helmet = require('helmet'),
  cors = require('cors'),
  body = require('body-parser')

const port = process.env.PORT || 3000
const rooms = {}, games = {}
const toPop = 1

// App config
const app = express()

// App Middlewares
app.use(helmet())
app.use(body.json())
app.use(cors())
app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))



// listener
const server = app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

const io = socket(server)
// - API routes

app.get('/', (req, res) => {
  res.setHeader("Content-Security-Policy", "script-src  'self' https://cdnjs.cloudflare.com https://code.jquery.com")
  res.render('index')
});

app.get('/join', (req, res) => {
  if (rooms[req.query.game] == null) return res.redirect('/')
  res.setHeader("Content-Security-Policy", "script-src  'self' https://cdnjs.cloudflare.com https://code.jquery.com")
  res.render('play', {
    roomName: req.query.game
  })
})

app.get('/create', (req, res) => {
  let playload = guid()
  rooms[playload] = {
    users: {}
  }
  games[playload] = {
    "clients": [],
    "showin": [],
    "number": 25,
    "max": 5
  }
  io.emit("new-room", playload)
  res.render('index')
})



// socket coonection
io.on('connection', (socket) => {
  socket.on('connect', () => {
    console.log(` socket is connected ${socket.id}`)
  })

  socket.on("user-name", data => {
    socket.join(data.room)
    rooms[data.room].users[socket.id] = data.name
    const clientName = data.name
    const gameId = data.room
    const game = games[gameId]

    if (game.clients.length >= game.max) return socket.emit("goto-main-page")

    game.clients.push({
      "clientName": clientName
    })
    io.sockets.to(data.room).emit('list_of_user', game);
  })

  socket.on("uwin", data => {
    const clientName = data.name
    const gameId = data.room
    const game = games[gameId]

    game.showin.push({
      "clientName": clientName
    })
    socket.to(data.room).broadcast.emit('swin', data.name);
    if (game.showin.length === toPop) delete games[data.room]
  })

  socket.on("number", data => {
    const gameId = data.room
    const game = games[gameId]
    try {
      if (game === undefined) throw "Game not found or has been deleted";

      io.sockets.to(data.room).emit('number', { name: data.altName, number: data.number, clients: game.clients });
    } catch (e) {
      console.log("error from catch", e);
    }

  })

  socket.on('disconnect', () => {
    getUserRoom(socket).forEach(room => {
      delete rooms[room].users[socket.id]
    })
  })
})

function getUserRoom(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}


function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
