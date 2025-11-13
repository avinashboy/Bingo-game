const express = require('express'),
  socket = require('socket.io'),
  helmet = require('helmet'),
  cors = require('cors'),
  body = require('body-parser')

const config = require('./config')

// Server configuration
const port = config.PORT
const rooms = {}, games = {}
const roomTimestamps = {} // Track room activity for cleanup

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

// Room cleanup mechanism - runs periodically to remove idle rooms
setInterval(() => {
  const now = Date.now()
  Object.keys(roomTimestamps).forEach(roomId => {
    const lastActivity = roomTimestamps[roomId]
    const idleTime = now - lastActivity

    // Clean up rooms that have been idle for more than IDLE_TIMEOUT_MS
    if (idleTime > config.ROOM.IDLE_TIMEOUT_MS) {
      if (rooms[roomId]) delete rooms[roomId]
      if (games[roomId]) delete games[roomId]
      delete roomTimestamps[roomId]
      console.log(`Room ${roomId} cleaned up (idle for ${Math.round(idleTime / 60000)} minutes)`)
    }
  })
}, config.ROOM.CLEANUP_INTERVAL_MS)

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
  const roomId = guid()
  const maxPlayers = parseInt(req.query.maxPlayers) || config.ROOM.MAX_PLAYERS

  // Validate player count (2-6)
  const validMaxPlayers = Math.max(config.ROOM.MIN_PLAYERS, Math.min(maxPlayers, config.ROOM.MAX_PLAYERS))

  // Initialize room with proper structure
  rooms[roomId] = {
    users: {},
    createdAt: Date.now(),
    maxPlayers: validMaxPlayers
  }

  games[roomId] = {
    clients: [],
    showin: [],
    number: config.GAME.MAX_NUMBER,
    max: validMaxPlayers, // Use the selected player count
    min: config.ROOM.MIN_PLAYERS  // Minimum 2 players required
  }

  roomTimestamps[roomId] = Date.now()

  // Return JSON response with room ID
  res.json({ roomId: roomId })
})



// socket coonection
io.on('connection', (socket) => {
  socket.on('connect', () => {
    console.log(` socket is connected ${socket.id}`)
  })

  socket.on("user-name", data => {
    const { name: clientName, room: roomId } = data

    // Validation: Check if room exists
    if (!rooms[roomId] || !games[roomId]) {
      return socket.emit("goto-main-page", { error: "Room not found" })
    }

    // Validation: Check if name is provided
    if (!clientName || clientName.trim().length === 0) {
      return socket.emit("goto-main-page", { error: "Name is required" })
    }

    const game = games[roomId]

    // FIXED: Check player limit BEFORE adding (prevents race condition)
    if (game.clients.length >= game.max) {
      return socket.emit("goto-main-page", { error: "Room is full" })
    }

    // FIXED: Check for duplicate names
    const isDuplicateName = game.clients.some(
      client => client.clientName === clientName
    )
    if (isDuplicateName) {
      return socket.emit("goto-main-page", { error: "Name already taken" })
    }

    // Now safe to add player
    socket.join(roomId)
    rooms[roomId].users[socket.id] = clientName
    game.clients.push({
      clientName: clientName,
      socketId: socket.id, // Track socket ID for cleanup
      joinedAt: Date.now()
    })

    // Update room activity timestamp
    roomTimestamps[roomId] = Date.now()

    // Notify all players in the room about updated player list
    io.sockets.to(roomId).emit('list_of_user', game)
  })

  socket.on("uwin", data => {
    const clientName = data.name
    const gameId = data.room
    const game = games[gameId]

    if (!game) return // Game already deleted

    game.showin.push({
      "clientName": clientName
    })
    socket.to(data.room).broadcast.emit('swin', data.name);

    // Clean up game when all but one player has won (last player is still playing)
    if (game.showin.length === game.max - 1) {
      delete games[data.room]
    }
  })

  socket.on("number", data => {
    const gameId = data.room
    const game = games[gameId]
    try {
      if (game === undefined) throw "Game not found or has been deleted";

      // Validate that the next player (altName) exists in current player list
      // If not, calculate the correct next player (handles disconnection edge cases)
      let nextPlayerName = data.altName
      const nextPlayerExists = game.clients.some(client => client.clientName === nextPlayerName)

      if (!nextPlayerExists && game.clients.length > 0) {
        // Find current player index and calculate next valid player
        const currentPlayerName = rooms[gameId].users[socket.id]
        const currentIndex = game.clients.findIndex(c => c.clientName === currentPlayerName)

        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % game.clients.length
          nextPlayerName = game.clients[nextIndex].clientName
        } else {
          // Fallback to first player if current player not found
          nextPlayerName = game.clients[0].clientName
        }
      }

      io.sockets.to(data.room).emit('number', { name: nextPlayerName, number: data.number, clients: game.clients });
    } catch (e) {
      console.log("error from catch", e);
    }

  })

  socket.on('disconnect', () => {
    getUserRoom(socket).forEach(roomId => {
      // Remove from rooms
      if (rooms[roomId] && rooms[roomId].users) {
        const userName = rooms[roomId].users[socket.id]
        delete rooms[roomId].users[socket.id]

        // FIXED: Also remove from games.clients (was missing - memory leak!)
        if (games[roomId] && games[roomId].clients) {
          // Find the disconnected player's index before removing
          const disconnectedPlayerIndex = games[roomId].clients.findIndex(
            client => client.socketId === socket.id
          )

          games[roomId].clients = games[roomId].clients.filter(
            client => client.socketId !== socket.id
          )

          // Calculate next active player if needed (for round-robin turn rotation)
          let nextActivePlayer = null
          if (games[roomId].clients.length > 0 && disconnectedPlayerIndex !== -1) {
            // Pass turn to next player in round-robin fashion
            const nextIndex = disconnectedPlayerIndex % games[roomId].clients.length
            nextActivePlayer = games[roomId].clients[nextIndex].clientName
          }

          // Notify remaining players
          io.sockets.to(roomId).emit('player-disconnected', {
            playerName: userName,
            remainingPlayers: games[roomId].clients,
            nextActivePlayer: nextActivePlayer  // Tell clients who should have the turn now
          })

          // Clean up empty rooms
          if (games[roomId].clients.length === 0) {
            delete rooms[roomId]
            delete games[roomId]
            delete roomTimestamps[roomId]
            console.log(`Room ${roomId} cleaned up (no players)`)
          }
        }
      }
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
