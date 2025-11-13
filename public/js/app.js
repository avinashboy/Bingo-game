// ========================================
// BINGO GAME - CLIENT SIDE
// Optimized for Performance and Scalability
// Following the 4 Pillars: Readability, Maintainability, Scalability, Performance
// ========================================

// Socket connection
const socket = io.connect(url)

// ========================================
// STATE MANAGEMENT
// ========================================
const GameState = {
  // Game grid data
  numberArray: [],
  matrixArray: [],
  numberPositionMap: new Map(), // PERFORMANCE: O(1) lookup instead of O(n²)

  // Player data
  playerList: [],
  currentPlayerName: null,
  activePlayerName: null,

  // Game configuration
  maxNumber: 25,
  gridSize: 5,
  strikesNeeded: 5,

  // Strike tracking
  strikeCount: 0,
  completedRows: new Set(),
  completedCols: new Set(),
  diagonalStrike1: false,
  diagonalStrike2: false,
}

// Speech synthesis configuration
const speech = new SpeechSynthesisUtterance()
speech.lang = 'en'
speech.rate = 1
speech.volume = 1
speech.pitch = 1

// ========================================
// DOM ELEMENTS
// ========================================
const roomId = $("#id").html()
const loader = document.querySelector('.loader')
const main = document.querySelector('.main')
const playArea = document.getElementById('play-area')
const playAreaElements = document.querySelectorAll('.play-area')
const showPlayer = document.getElementById('show-player')

// Get player name with validation
let playerName = null
while (!playerName || playerName.trim().length === 0) {
  playerName = prompt("Enter your name (2-20 characters):")
  if (playerName) {
    playerName = playerName.trim()
    if (playerName.length < 2 || playerName.length > 20) {
      alert("Name must be between 2 and 20 characters")
      playerName = null
    }
  }
}
GameState.currentPlayerName = playerName



// ========================================
// SOCKET EVENT HANDLERS
// ========================================

socket.on("goto-main-page", (data) => {
  if (data?.error) {
    alert(`Cannot join room: ${data.error}`)
  }
  window.location = url
})

socket.emit("user-name", {
  name: playerName,
  room: roomId
})

socket.on("list_of_user", (data) => {
  GameState.maxNumber = data.number

  // Start game when minimum players are reached and room is ready
  if (data.clients.length >= (data.min || 2) && data.clients.length === data.max) {
    runOnetime()
    updatePlayerList(data.clients)
    initializeGame()
  } else {
    // Show waiting message
    updatePlayerList(data.clients)
  }
})

$('#playName').text(playerName)

socket.on("swin", (playerName) => {
  $('#show').append(`<li><h2>${playerName} won! You lose the game</h2></li>`)
})

socket.on("number", (data) => {
  if (data.clients && data.clients.length > 0) {
    checkStrike(data.number)
    GameState.activePlayerName = data.name
    updatePlayerList(data.clients)
  }
})

socket.on("player-disconnected", (data) => {
  alert(`${data.playerName} disconnected from the game`)
  if (data.remainingPlayers) {
    updatePlayerList(data.remainingPlayers)
  }
})

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Fisher-Yates shuffle algorithm - O(n)
 */
function shuffle(array) {
  const arr = [...array] // Create copy to avoid mutation
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]] // ES6 swap
  }
  return arr
}

/**
 * Initialize game UI (show game, hide loader)
 */
function initializeGame() {
  setTimeout(() => {
    loader.style.opacity = 0
    loader.style.display = 'none'

    main.style.display = 'block'
    setTimeout(() => (main.style.opacity = 1), 50)
  }, 1000)
}

/**
 * PERFORMANCE OPTIMIZED: Create and render Bingo grid
 * Uses DocumentFragment to batch DOM operations - single reflow instead of 25!
 * Also builds HashMap for O(1) number lookups
 */
function createBingoGrid() {
  const shuffledNumbers = shuffle(GameState.numberArray)

  // Create 5x5 matrix
  while (shuffledNumbers.length) {
    GameState.matrixArray.push(shuffledNumbers.splice(0, GameState.gridSize))
  }

  // PERFORMANCE: Use DocumentFragment to batch all DOM operations
  const fragment = document.createDocumentFragment()

  // Create buttons and build position map
  for (let row = 0; row < GameState.matrixArray.length; row++) {
    for (let col = 0; col < GameState.matrixArray[row].length; col++) {
      const number = GameState.matrixArray[row][col]

      // Create button element
      const button = document.createElement('button')
      button.setAttribute("id", `num-${number}`)
      button.innerText = number

      // PERFORMANCE: Build HashMap for O(1) lookup (eliminates nested loop search!)
      GameState.numberPositionMap.set(number, { row, col })

      fragment.appendChild(button)
    }
  }

  // Single DOM operation - single reflow!
  playArea.appendChild(fragment)
}


/**
 * Initialize number array based on server configuration
 */
function initializeNumbers() {
  for (let i = 1; i <= GameState.maxNumber; i++) {
    GameState.numberArray.push(i)
  }
  createBingoGrid()
}

/**
 * Handle number selection by player
 */
function handleNumberClick(event) {
  if (event.target.tagName.toLowerCase() !== 'button') return

  // Calculate next player in turn order
  const currentPlayerIndex = GameState.playerList.indexOf(playerName)
  const nextPlayerIndex = (currentPlayerIndex + 1) % GameState.playerList.length
  const nextPlayerName = GameState.playerList[nextPlayerIndex]

  // Mark number as selected
  $(`#${event.target.id}`).addClass('already_press')
  document.getElementById("play-area").classList.add("dim")

  // Emit to server
  socket.emit("number", {
    number: parseInt(event.target.innerText),
    room: roomId,
    altName: nextPlayerName
  })
}


/**
 * Update BINGO letter display based on strike count
 */
function updateBingoDisplay() {
  const bingoLetters = ['iob', 'ioi', 'ion', 'iog', 'ioo'] // B-I-N-G-O
  const index = GameState.strikeCount - 1

  if (index >= 0 && index < bingoLetters.length) {
    document.getElementById(bingoLetters[index])?.classList.add("done_color")
  }
}

/**
 * PERFORMANCE OPTIMIZED: Check if number creates a strike (completed line)
 * Uses O(1) HashMap lookup instead of O(n²) nested loop search!
 */
function checkStrike(number) {
  // Mark number as selected in UI
  $(`#num-${number}`).addClass('already_press')

  // PERFORMANCE: O(1) lookup using HashMap!
  const position = GameState.numberPositionMap.get(number)
  if (!position) return // Number not on this player's board

  const { row, col } = position

  // Mark as used in matrix
  GameState.matrixArray[row][col] = 0

  // Check row completion (if not already completed)
  if (!GameState.completedRows.has(row)) {
    const isRowComplete = GameState.matrixArray[row].every(val => val === 0)
    if (isRowComplete) {
      GameState.completedRows.add(row)
      GameState.strikeCount++
      updateBingoDisplay()
    }
  }

  // Check column completion (if not already completed)
  if (!GameState.completedCols.has(col)) {
    const isColComplete = GameState.matrixArray.every(rowArr => rowArr[col] === 0)
    if (isColComplete) {
      GameState.completedCols.add(col)
      GameState.strikeCount++
      updateBingoDisplay()
    }
  }

  // Check main diagonal (top-left to bottom-right)
  if (row === col && !GameState.diagonalStrike1) {
    const isDiag1Complete = GameState.matrixArray.every((rowArr, i) => rowArr[i] === 0)
    if (isDiag1Complete) {
      GameState.diagonalStrike1 = true
      GameState.strikeCount++
      updateBingoDisplay()
    }
  }

  // Check anti-diagonal (top-right to bottom-left)
  if (row + col === GameState.gridSize - 1 && !GameState.diagonalStrike2) {
    const isDiag2Complete = GameState.matrixArray.every(
      (rowArr, i) => rowArr[GameState.gridSize - 1 - i] === 0
    )
    if (isDiag2Complete) {
      GameState.diagonalStrike2 = true
      GameState.strikeCount++
      updateBingoDisplay()
    }
  }

  // Check for win condition
  if (GameState.strikeCount >= GameState.strikesNeeded) {
    $('#footer, #lead').fadeOut()
    $('#winBg').text("BINGO! You won!").addClass('leads')
    speakText("Bingo! You won!")
    socket.emit("uwin", { name: playerName, room: roomId })
  }
}

/**
 * Text-to-speech helper
 */
function speakText(text) {
  if (!window.speechSynthesis) return // Not supported
  speech.text = text
  window.speechSynthesis.speak(speech)
}

/**
 * PERFORMANCE OPTIMIZED: Update player list with incremental rendering
 * Only updates if list actually changed (avoids unnecessary DOM operations)
 */
function updatePlayerList(clientsArray) {
  const newPlayerList = clientsArray.map(client => client.clientName)

  // PERFORMANCE: Check if list actually changed
  const hasChanged = JSON.stringify(newPlayerList) !== JSON.stringify(GameState.playerList)
  if (!hasChanged && GameState.activePlayerName === GameState.activePlayerName) {
    return // No changes, skip re-render
  }

  GameState.playerList = newPlayerList

  // Use DocumentFragment for batch rendering
  const fragment = document.createDocumentFragment()

  newPlayerList.forEach(clientName => {
    const span = document.createElement('span')
    span.innerText = clientName

    // Highlight active player's turn
    if (GameState.activePlayerName === clientName) {
      span.setAttribute('class', 'active')
    }

    // Enable/disable play area based on turn
    if (GameState.activePlayerName === playerName) {
      document.getElementById("play-area").classList.remove("dim")
    } else {
      document.getElementById("play-area").classList.add("dim")
    }

    fragment.appendChild(span)
  })

  // Single DOM update
  showPlayer.innerHTML = ""
  showPlayer.appendChild(fragment)
}


/**
 * Singleton pattern: Initialize game grid only once
 */
let runOnetime = (function () {
  let executed = false
  return function () {
    if (!executed) {
      executed = true
      initializeNumbers()
    }
  }
})()

// ========================================
// EVENT LISTENERS
// ========================================
playAreaElements.forEach((element) => {
  element.addEventListener('click', handleNumberClick)
})
