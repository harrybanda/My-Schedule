var token = "";
var tuid = "";
var ebs = "";

var twitch = window.Twitch.ext;

var color;

var requests = {
  add: createRequest("POST", "crud/add"),
  delete: createRequest("POST", "crud/delete"),
  edit: createRequest("POST", "crud/update"),
  color: createRequest("POST", "crud/color"),
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
    complete: function(data) {
      $("#loading").hide();
    },
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
  clearContent();
  if (events.length == 0) {
    $("#loading").hide();
    $("#events-list").addClass("center-text");
    $("#events-list").append(
      "<div id='no-data' class='has-text-grey-light is-size-4'>" +
        "No Events<br /><i class='far fa-meh'></i></div>"
    );
  } else {
    $("#loading").show();
    for (i in events) {
      addCards(events, i);
    }
  }
}

function addCards(events, i) {
  var gameName = events[i].name.toUpperCase();
  var eventDate = new Date(events[i].date);
  var eventSt = events[i].start;
  var eventEt = events[i].end;

  var day = moment(eventDate).format("D");
  var dayName = moment(eventDate)
    .format("ddd")
    .toUpperCase();
  var month = moment(eventDate)
    .format("MMM")
    .toUpperCase();

  var event =
    '<div class="box event-box animate-bottom"><div class="columns"> <div class="column"> <h1 class="title is-6">' +
    gameName +
    '</h1> <h2 class="subtitle is-7 has-text-grey"> ' +
    dayName +
    " &#8226; " +
    month +
    " " +
    day +
    " &#8226; " +
    eventSt +
    " - " +
    eventEt +
    '</h2></div> <div class="column event-buttons"> <div class="field is-grouped is-pulled-right"> <p class="control"> <a id=' +
    i +
    ' class="btn-edit button"> Edit </a> </p> <p class="control"> <a id=' +
    i +
    ' class="btn-delete button is-danger"> Delete </a> </p> </div> </div> </div> </div>';
  $("#events-list").append(event);
  $("#" + i + ".btn-edit").data("event-data", events[i]);
}

function logError(_, error, status) {
  twitch.rig.log("EBS request returned " + status + " (" + error + ")");
}

function logSuccess(hex, status) {
  twitch.rig.log("EBS request returned " + hex + " (" + status + ")");
}

function clearContent() {
  var eventList = $("#events-list");
  var loader = eventList.find("#loading");
  eventList.html(loader);
  $("#no-data").remove();
  $("#events-list").removeClass("center-text");
}

$(function() {
  // Date and Time Picker
  $(document).ready(function() {
    $(".timepicker").timepicker({ scrollDefault: "now" });
    $(".datepicker").datepicker();
  });

  // Close Modal Buttons
  $(".btn-close-mod").click(function() {
    $(".modal").removeClass("is-active");
    $("#event-form").trigger("reset");
  });

  $(".modal-btn-close").click(function() {
    $(".modal").removeClass("is-active");
    $("#event-form").trigger("reset");
  });

  // Auto Complete
  $("#event-title").autocomplete({
    selectFirst: true,
    change: function(event, ui) {
      if (ui.item == null) {
        $(this).val(ui.item ? ui.item.id : "");
      }
    },
    source: function(request, response) {
      $.ajax({
        url:
          "https://api.twitch.tv/kraken/search/games?query=" +
          $("#event-title").val(),
        headers: {
          "Client-ID": "5uc64q8bgi9vitka6t7f8zid4r28rm",
          Accept: "application/vnd.twitchtv.v5+json"
        },
        method: "GET",
        dataType: "json",
        success: function(data) {
          if (data.games) {
            response(
              $.map(data.games.slice(0, 10), function(obj) {
                return {
                  value: obj.name
                };
              })
            );
          } else {
            response(function() {});
          }
        }
      });
    }
  });

  // Form Submit
  $(document).ready(function() {
    $("#event-form").on("submit", function(e) {
      e.preventDefault();
      clearContent();
      $(".modal").removeClass("is-active");

      var modalID = $("#event-modal").data("modal-id");

      if (modalID === "add") {
        // Add new event
        var input = JSON.stringify({
          name: $("#event-title").val(),
          date: $("#event-date").val(),
          start: $("#event-st").val(),
          end: $("#event-et").val()
        });
        requests.add.data = input;
        $.ajax(requests.add);
      } else {
        // Edit event
        var input = JSON.stringify({
          id: modalID,
          name: $("#event-title").val(),
          date: $("#event-date").val(),
          start: $("#event-st").val(),
          end: $("#event-et").val()
        });
        requests.edit.data = input;
        $.ajax(requests.edit);
      }
    });
  });

  // Edit Button
  $(document).on("click", ".btn-edit", function() {
    var i = $(this).attr("id");
    var eventData = $("#" + i + ".btn-edit").data("event-data");

    $("#event-title").val(eventData.name);
    $("#event-date").val(eventData.date);
    $("#event-st").val(eventData.start);
    $("#event-et").val(eventData.end);

    $("#event-modal").data("modal-id", i);
    $("#event-modal").addClass("is-active");
    $(".modal-header").text("Edit Event");
  });

  // Create Event Button
  $("#btn-create-event").click(function() {
    $("#event-modal").data("modal-id", "add");
    $("#event-modal").addClass("is-active");
    $(".modal-header").text("New Event");
    $("#event-form").trigger("reset");
  });

   // Customize Button
   $("#btn-customize").click(function() {
    $("#customize-modal").addClass("is-active");
  });

  // Save Color Button
  $("#btn-save-style").click(function() {
    $(".modal").removeClass("is-active");
    requests.color.data = color;
    $.ajax(requests.color);
  });

  // Delete Event Button
  $(document).on("click", ".btn-delete", function() {
    clearContent();
    var id = $(this).attr("id");
    requests.delete.data = id;
    $.ajax(requests.delete);
  });

  /*** COLOR PICKER CODE ***/
  $(".handle").mousedown(function() {
    $(this).addClass("pop");
    $(this)
      .parent(".slider")
      .addClass("grad");
  });

  $(".handle").mouseup(function() {
    $(this).removeClass("pop");
    $(this)
      .parent(".slider")
      .removeClass("grad");
  });

  $(".handle").draggable({
    axis: "x",
    containment: "parent",
    drag: function(event, ui) {
      var thisOffset = $(this).position().left;
      var angle = (thisOffset / 280) * 360;
      var hslcolor = "hsla(" + angle + ", 60%, 50%, 1)";
      var hslcolor2 = "hsla(" + angle + ", 60%, 50%, 0.6)";

      color = hslcolor;

      $(this).css("background-color", hslcolor);
      $(".event-box-pre").css({ "--color": hslcolor, "--color2": hslcolor2 });
      $(this)
        .parent(".slider")
        .css("background-color", hslcolor);
    },
    stop: function(event, ui) {
      $(this).removeClass("pop");
      $(this)
        .parent(".slider")
        .removeClass("grad");
    }
  });

  // Broadcast Listener
  twitch.listen("broadcast", function(target, contentType, data) {
    update(JSON.parse(data));
  });
});
