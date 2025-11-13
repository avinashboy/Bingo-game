const socket = io.connect(url)
const demo = document.getElementById('demo')

const btn = document.getElementById('btn')
btn.addEventListener("click", () => {
  axios.get(`${url}/create`)
    .then(response => {
      if (response.data && response.data.roomId) {
        demo.value = `${url}/join?game=${response.data.roomId}`
        $('#btn').fadeOut()
        $('.hide_me').fadeIn()
      }
    })
    .catch(error => {
      console.error('Error creating room:', error)
      alert('Failed to create room. Please try again.')
    })
})


$("#year").text((new Date).getFullYear());
socket.on("new-room", data => {
  demo.value = `${url}/join?game=${data}`
})

var clipboard = new ClipboardJS('.btn');

clipboard.on('success', function (e) {
  e.clearSelection();
});

clipboard.on('error', function (e) {
  // console.error('Action:', e.action);
  // console.error('Trigger:', e.trigger);
});
