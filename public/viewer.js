var token = "";
var tuid = "";
var ebs = "";

var twitch = window.Twitch.ext;

var requests = {
  get: createRequest("GET", "events")
};

function createRequest(type, method) {
  return {
    type: type,
    url:
      "https://sh7d0rt8bk.execute-api.us-east-1.amazonaws.com/prod/" + method,
    beforeSend: function() {
      $("#loading").show();
    },
    success: update,
    error: logError
  };
}

function setAuth(token) {
  Object.keys(requests).forEach(req => {
    twitch.rig.log("Setting auth headers");
    requests[req].headers = { Authorization: "Bearer " + token };
  });
}

twitch.onContext(function(context) {
  twitch.rig.log(context);
});

twitch.onAuthorized(function(auth) {
  token = auth.token;
  tuid = auth.userId;
  setAuth(token);
  $.ajax(requests.get);
});

function update(data) {
  var events = data.events;
  var color = data.color;
  clearContent();
  if (events.length == 0) {
    $("#loading").hide();
    $("#app").addClass("center-text");
    $("#app").append(
      "<div id='no-data' class='has-text-grey-light is-size-5'>" +
        "No Events<br /><i class='far fa-meh'></i></div>"
    );
  } else {
    $("#loading").show();
    for (i in events) {
      addCards(events, i, color);
    }
  }
}

function addCards(events, i, color) {
  $.ajax({
    url: "https://api.twitch.tv/helix/games?name=" + events[i].name,
    headers: {
      "Client-ID": "5uc64q8bgi9vitka6t7f8zid4r28rm"
    },
    method: "GET",
    dataType: "json",
    success: function(data) {
      var name = events[i].name.toUpperCase();
      var date = new Date(events[i].date);
      var start = events[i].start;
      var end = events[i].end;
      var color1 = color;
      var color2 = color.replace("1)", "0.6)");

      var day = moment(date).format("D");
      var dayName = moment(date)
        .format("ddd")
        .toUpperCase();
      var month = moment(date)
        .format("MMM")
        .toUpperCase();

      var url = data.data[0].box_art_url
        .replace("{width}", "300")
        .replace("{height}", "400");
      $("#app").append(
        '<div class="box tinted-image event-box animate-bottom" style="--url: url(' +
          url +
          "); --color: " +
          color1 +
          "; --color2: " +
          color2 +
          ';" > <h1 class="title is-6 has-text-white">' +
          name +
          '</h1> <h2 class="subtitle is-7 has-text-white">' +
          dayName +
          '<span class="separator"> &#8226; </span>' +
          month +
          " " +
          day +
          ' </h2> <p class="is-size-7 has-text-white">' +
          start +
          " - " +
          end +
          "</p> </div>"
      );
    },
    complete: function(data) {
      $("#loading").hide();
    }
  });
}

function logError(_, error, status) {
  twitch.rig.log("EBS request returned " + status + " (" + error + ")");
}

function logSuccess(hex, status) {
  twitch.rig.log("EBS request returned " + hex + " (" + status + ")");
}

function clearContent() {
  var eventList = $("#app");
  var loader = eventList.find("#loading");
  eventList.html(loader);
  $("#no-data").remove();
  $("#app").removeClass("center-text");
}

$(function() {
  twitch.listen("broadcast", function(target, contentType, data) {
    update(JSON.parse(data));
  });
});
