'use strict'

var message_timer;
var default_message_timeout = 5000;

var host_timer;
var host_refresh_interval = 10000;
var host = {};

function http_send_async(method, url, handler) {
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (this.readyState == 4) {
      handler(this.responseText);
    }
  };
  request.open(method, url, true);
  request.send();
}

function clear_message() {
  clearTimeout(message_timer);
  var box = document.getElementById('messagebox');
  box.innerHTML = '';
  box.className = 'hidden';
}

function set_message(message, type, timeout) {
  if (!timeout) {
    timeout = default_message_timeout;
  }
  var box = document.getElementById('messagebox');
  if (type === 'success' || type === 'error' || type === 'info') {
    clearTimeout(message_timer);
    box.innerHTML = message;
    box.className = type;
    if (timeout > 0) {
      message_timer = setTimeout(clear_message, timeout);
    }
  } else {
    clear_message();
  }
}

function update_host_status() {
  http_send_async("GET", "api/status/" + host.id, function(res) {
    res = JSON.parse(res);
    host.status = res;

    // Set the status light and powerbutton text
    var online = document.getElementById("online");
    var offline = document.getElementById("offline");
    var powerbutton = document.getElementById("powerbutton");
    online.className = '';
    offline.className = '';
    if (res.status === 'online') {
      online.className = 'light-on';
      powerbutton.innerHTML = "Power Off";
    } else {
      powerbutton.innerHTML = "Power On";
      if (res.status === 'offline') {
        offline.className = 'light-on';
      }
    }

    // Set the usingbutton text
    var usingbutton = document.getElementById("usingbutton");
    if (res.using) {
      usingbutton.innerHTML = "Stop Using";
    } else {
      usingbutton.innerHTML = "Start Using";
    }

    // Set the usersbox
    var usersbox = document.getElementById("usersbox");
    if (res.users.length > 0) {
      usersbox.innerHTML = "Users: " + res.users.join(", ");
    } else {
      usersbox.innerHTML = "No online users"
    }
  });
}

function host_changed() {
    clearInterval(host_timer);
    var select = document.getElementById("hostselector");
    host.id = select.options[select.selectedIndex].value;
    host.name = select.options[select.selectedIndex].textContent;
    host_timer = setInterval(update_host_status, host_refresh_interval);
    update_host_status();
}

function usingbutton_click() {
  http_send_async("POST", "api/" + (host.status.using ? "unusehost" : "usehost") + "/" + host.id, function(res) {
    res = JSON.parse(res);
    if (res.status === 'success') {
      set_message((host.status.using ? "Stopped" : "Started") + " using " + host.name, 'success');
    } else {
      set_message("Couldn't " + (host.status.using ? "stop" : "start") + " using " + host.name, 'error');
    }
    host_changed();
  })
}

function powerbutton_click() {
  var op = (host.status.status === 'online') ? 'off' : 'on';
  http_send_async("POST", "api/power" + op + "/" + host.id, function(res) {
    res = JSON.parse(res);
    if (res.status === 'success') {
      set_message(host.name + " powered " + op, 'success');
    } else if (res.message) {
      set_message(res.message, 'error');
    } else {
      set_message("Couldn't power " + op + " " + host.name, 'error');
    }
  });
}

http_send_async("GET", "api/hosts", function(res) {
  try {
    var hosts = JSON.parse(res);
    var select = document.getElementById("hostselector");
    hosts.forEach(function(elem) {
      var el = document.createElement("option");
      el.textContent = elem.name;
      el.value = elem.id;
      select.appendChild(el);
    });
    host_changed();
  } catch (ex) {
    set_message("Error fetching systems", 'error', 0);
  }
});

http_send_async("GET", "api/user", function(res) {
  var user = JSON.parse(res);
  if (user.admin) {
    var powerbutton = document.getElementById("powerbutton");
    powerbutton.className = '';
  }
});
