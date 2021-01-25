const socket = io.connect(url)
const demo = document.getElementById('demo')

const btn = document.getElementById('btn')
btn.addEventListener("click", () => {
  axios.get(`${url}/create`)
  $('#btn').fadeOut()
  $('.hide_me').fadeIn()
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
