// socket connect
const socket = io.connect(url)

// gobal
let numberArr = [], martixArr = [], dummyList = []
let byServer = null, serverName = null
let strike = {}
let i = 0

let speech = new SpeechSynthesisUtterance();
speech.lang = 'en';
speech.rate = 1;
speech.volume = 1;
speech.pitch = 1;

/*
Done by Nivedha
Follow github-- > https: //github.com/nibfic99
*/

let niv = 5, f = 0, l, k, s, sum, num, wi = 0, li = 0, ne = 0, countStrike = 0
// row and coloum
let n = m = 5

// room name
const x = $("#id").html();


// Declaration
const loader = document.querySelector('.loader');
const main = document.querySelector('.main');
const playArea = document.getElementById('play-area')
const getNu = document.querySelectorAll('.play-area')
const showPlayer = document.getElementById('show-player')
const playerName = prompt("Name")



socket.on("goto-main-page", () => { window.location = url; })


socket.emit("user-name", {
  name: playerName,
  room: x
})

socket.on("list_of_user", data => {
  byServer = data.number
  if (data.clients.length === data.max) runOnetime(), showName(data.clients), init()

})

$('#playName').text(`${playerName}`)

socket.on("swin", data => {
  $('#show').append(`<li><h2>You lose the game<h2></li>`)
})

socket.on("number", data => {
  if (data.clients.length !== 0 || data.clients !== null) {
    return checkStrike(data.number),
      serverName = data.name,
      showName(data.clients)
  }

})

// function
function shuffle(a) {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}


function init() {
  setTimeout(() => {
    loader.style.opacity = 0;
    loader.style.display = 'none';

    main.style.display = 'block';
    setTimeout(() => (main.style.opacity = 1), 50);
  }, 1000);
}

function shuffleOneTime() {
  let shu = shuffle(numberArr)
  while (shu.length) {
    martixArr.push(shu.splice(0, 5));
  }
  for (let i = 0; i < martixArr.length; i++) {
    for (let j = 0; j < martixArr[i].length; j++) {
      const make = document.createElement('button')
      make.setAttribute("id", `${martixArr[i][j]}`)
      make.innerText = martixArr[i][j]
      playArea.append(make)
    }
  }

}


function giveByServer() {
  for (let index = 1; index <= byServer; index++) {
    numberArr.push(index)
  }
  shuffleOneTime()
}

function getNumber(e) {
  let index = dummyList.indexOf(playerName)
  let addUp = index + 1
  let tempName = null
  if (dummyList.length > addUp) {
    tempName = dummyList[addUp]
  } else {
    tempName = dummyList[0]
  }
  if (e.target.tagName.toLowerCase() === 'button') {
    $(`#${e.target.id}`).addClass('already_press')
    document.getElementById("play-area").classList.add("dim")
    socket.emit("number", {
      number: parseInt(e.target.innerText),
      room: x,
      altName: tempName
    })

  }

}


// to strike bingo char
function checkMe() {
  if (countStrike === 1) return document.getElementById('iob').classList.add("done_color")

  if (countStrike === 2) return document.getElementById('ioi').classList.add("done_color")

  if (countStrike === 3) return document.getElementById('ion').classList.add("done_color")

  if (countStrike === 4) return document.getElementById('iog').classList.add("done_color")

  if (countStrike === 5) return document.getElementById('ioo').classList.add("done_color")

}

// check strike
function checkStrike(number) {
  $(`#${number}`).addClass('already_press')
  for (let i = 0; i < martixArr.length; i++) {
    for (let j = 0; j < martixArr[i].length; j++) {
      if (number === martixArr[i][j]) {
        martixArr[i][j] = 0
        l = i;
        k = j;
        ne = 1;
        break;
      }
    }
    if (ne == 1) {
      break;
    }
  }
  ne = 0;
  sum = 0;
  for (s = 0; s < m; s++) {
    sum = sum + martixArr[l][s];
  }
  if (sum == 0) {
    countStrike += 1
    checkMe()
    niv = niv - 1;
  }
  sum = 0;
  for (s = 0; s < n; s++) {
    sum = sum + martixArr[s][k];
  }
  if (sum == 0) {
    countStrike += 1
    checkMe()
    niv = niv - 1;
  }
  sum = 0;
  if ((l == k) && (wi != 1)) {
    for (s = 0; s < n; s++) {
      sum = sum + martixArr[s][s];
    }
    if (sum == 0) {
      countStrike += 1
      checkMe()
      niv = niv - 1;
      wi = 1;
    }
    sum = 0;
  }
  if (li != 1) {
    f = 0;
    for (s = 4; s >= 0; s--) {
      sum = sum + martixArr[s][f];
      f = f + 1;
    }
    if (sum == 0) {
      countStrike += 1
      checkMe()
      niv = niv - 1;
      li = 1;
    }
    sum = 0;
  }

  if (niv === 0) {
    $('#footer, #lead').fadeOut()
    $('#winBg').text("Bingo Go...!").addClass('leads')
    to_speak("bingo go..!")
    socket.emit("uwin", { name: playerName, room: x })
  }

}

// to speak
function to_speak(texts) {
  speech.text = texts
  window.speechSynthesis.speak(speech);
}

// show name
function showName(array) {
  showPlayer.innerHTML = ""
  dummyList = []
  array.forEach(element => {
    const spanName = document.createElement('span')
    dummyList.push(element.clientName)
    spanName.innerText = element.clientName;
    if (serverName === element.clientName) {
      spanName.setAttribute('class', 'active')
    }
    if (serverName === playerName) {
      document.getElementById("play-area").classList.remove("dim")
    }
    showPlayer.appendChild(spanName)
  });
}


// run for one time 

let runOnetime = (function () {
  let executed = false;
  return function () {
    if (!executed) {
      executed = true;
      giveByServer()
    } else {
      console.log("just one time running function")
    }
  };
})();




getNu.forEach((data) => data.addEventListener('click', getNumber))
