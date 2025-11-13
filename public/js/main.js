const btn = document.getElementById('btn')
btn.addEventListener("click", () => {
  const playerCount = document.getElementById('playerCount').value

  axios.get(`${url}/create?maxPlayers=${playerCount}`)
    .then(response => {
      if (response.data && response.data.roomId) {
        // Redirect creator to join the game as the first player
        window.location.href = `${url}/join?game=${response.data.roomId}`
      }
    })
    .catch(error => {
      console.error('Error creating room:', error)
      alert('Failed to create room. Please try again.')
    })
})

$("#year").text((new Date).getFullYear());
