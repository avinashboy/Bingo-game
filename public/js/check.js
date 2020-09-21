var element = new Image;
var devtoolsOpen = false;
element.__defineGetter__("id", function () {
  devtoolsOpen = true; // This only executes when devtools is open.
});
setInterval(function () {
  devtoolsOpen = false;
  console.log(element);
  (devtoolsOpen ? alert("Close your dev tool") : "");
}, 1);

$(document).bind("contextmenu", function (e) {
  e.preventDefault();
});

$(document).keydown(function (e) {
  if (e.which === 123) {
    return false;
  }
});

document.onkeydown = function (e) {
  if (event.keyCode == 123) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'E'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'S'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'H'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'A'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'F'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'E'.charCodeAt(0)) {
    return false;
  }
}

if (document.addEventListener) {
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  }, false);
} else {
  document.attachEvent('oncontextmenu', function () {
    window.event.returnValue = false;
  });
}
