var MIN_EVENTS = 100;
var MIN_TIME = 15 * 1000;

var FINAL_SENTINEL_IMAGE = {
  "src": "/imgs/final-sentinel.jpg",
  "w": 1920,
  "h": 1080
};


/**
 * Get query params from URL
 * @return {{[key: string]: string}}
 */
function getUrlVars() {
  var vars = {}, hash;
  var hashes = window.location.href.replace('\#', '').slice(window.location.href.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars[hash[0]] = hash[1];
  }
  return vars;
}

/**
 * Get device orientation (just checks if width or height is greater)
 * @return {'Landscape' | 'Portrait'}
 */
function getOrientation() {
  var orientation = window.innerWidth > window.innerHeight ? "Landscape" : "Portrait";
  return orientation;
}


$(document).ready(function () {
  var page_vars = getUrlVars();
  var workerID = page_vars['workerID'] || 'none';
  if ('dataset' in page_vars) {
    checkEnd(function() {
      $.getJSON('../datasets/' + page_vars['dataset'] + '.json', function (data) {
        if (data.length == 1) {
          openPhotoSwipe(data[0]['data'], page_vars['dataset'], workerID);
        } else {
          $.each(data, function (key, val) {
            var r = $('<input/>').attr({
              type: "button",
              id: "field",
              value: val["name"]
            });
            r.click(function () {
              openPhotoSwipe(val['data'], page_vars['dataset'], workerID);
            });
            $("#galleries").append(r);
          });
        }
      });
    })
  }
  showLinksForMobile();
});


// PHOTO VIEWER PAGE

/**
 * Opens the PhotoSwipe UI and sets up handlers for logging
 * @param {Object[]} items - photo objects from dataset JSON
 * @param {string} dataset - name of the dataset
 * @param {workerID} workerID
 */
function openPhotoSwipe(items, dataset, workerID) {
  var pswpElement = document.querySelectorAll('.pswp')[0];
  var uniq = 'id' + (new Date()).getTime();

  var pswpOptions = {
    index: 0, // start at first slide
    maxSpreadZoom: 4,
    pinchToClose: false,
    closeOnScroll: false,
    closeOnVerticalDrag: false,
    escKey: false,
    loop: false
  };

  var rotated = false;
  var orientation = getOrientation();
  window.onresize = function () {
    var newOrientation = getOrientation();
    if (newOrientation !== orientation) {
      rotated = true;
      orientation = newOrientation;
    }
    // Catch IOS iPhone bug
    if (navigator.userAgent.match('CriOS')) {
      window.location.reload();
    }
  }

  // Initializes and opens PhotoSwipe
  items.sort(function(a, b) { return Math.random() - 0.5 });
  items.push(FINAL_SENTINEL_IMAGE);
  var pswp = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, pswpOptions);
  pswp.init();

  pswp.listen('setImageSize', function (w, h) {
    console.log('w:' + w + ' h:' + h);
  })

  // state for data logging
  var src = '';
  var x_min = [];
  var x_max = [];
  var y_min = [];
  var y_max = [];
  var times = [];
  var start_time = 0;

  pswp.listen('position_change', function (item, x, y, zoom, time) {
    // new context, try to log
    if (item.src !== src || rotated) {
      // only log if user moved around enough
      if (x_min.length > MIN_EVENTS) {
        console.log("saving to db");
        $.ajax({
          type: "POST",
          url: "/data",
          data: JSON.stringify({
            src,
            x_min,
            x_max,
            y_min,
            y_max,
            time: times,
            id: uniq,
            dataset,
            workerID
          }),
          contentType: "application/json",
          success: function (res) {
            if (res.success) {
            } else {
              console.log("failed message");
            }
          },
          error: function (err) {
            console.log("could not connect to db server");
          }
        });
      }
      // clear data for next logging
      src = item.src;
      x_min = [];
      x_max = [];
      y_min = [];
      y_max = [];
      times = [];
      start_time = time;
      rotated = false;
    }
    // store data for logging
    x_min.push(x < 0 ? Math.floor(-x / zoom) : 0);
    y_min.push(y < 0 ? Math.floor(-y / zoom) : 0);
    if ((item.w / item.h) > (window.innerWidth / window.innerHeight)) {
      var width = item.w * item.fitRatio / zoom;
      var height = width * window.innerHeight / window.innerWidth;
    } else {
      var height = item.h * item.fitRatio / zoom;
      var width = height * window.innerWidth / window.innerHeight;
    }
    x_max.push(Math.floor(-x / zoom + width) < item.w ? Math.floor(-x / zoom + width) : item.w);
    y_max.push(Math.floor(-y / zoom + height) < item.h ? Math.floor(-y / zoom + height) : item.h);
    times.push(time - start_time)
  });

  // when we get to the last (sentinel) image
  // we need to hide the experiment and show a message
  pswp.listen('beforeChange', function() {
    if (pswp.getCurrentIndex() === pswp.options.getNumItemsFn() - 1) {
      $('#error-url').hide();
      $('#experiment').hide();
      checkEnd(function () {
        $('#incomplete-task').show().delay(5000).fadeOut();
        pswp.prev();
        $('#experiment').delay(5000).fadeIn();;
      });
    }
  });
}

/**
 * Check if the task has been completed.
 * Shows the submit key if it has.
 * Calls onNotDone if it hasn't.
 * @param {() => void} onNotDone
 */
function checkEnd(onNotDone) {
  var startTime = window.localStorage.getItem("startTime");
  var curTime = new Date().getTime();
  var geqMinTime = (curTime - startTime) >= MIN_TIME;

  var page_vars = getUrlVars();
  var workerID = page_vars['workerID'] || 'none';
  var dataset = page_vars['dataset'] || 'none';

  $.ajax({
    type: "POST",
    url: "/end",
    data: JSON.stringify({ workerID, dataset }),
    contentType: "application/json",
    success: function (res) {
      if (res.success) {
        var submitKey = res['key'];
        if (geqMinTime && submitKey.length > 0) {
          showSubmitKey(submitKey);
        } else {
          onNotDone();
        }
      } else {
        console.log(res);
        console.log("ERROR: cannot find user labels");
      }
    },
    error: function (err) {
      console.log("ERROR: could not connect to db server", err);
    }
  });
}

/**
 * Show the completion key
 * @param {string} key 
 */
function showSubmitKey(key) {
  $('#error-url').hide();
  $('#submit-code').text(key);
  $('#submit-page').hide();
  $('#succesful-submit').show();
  selectText('submit-code');
}

/**
 * highlights/selects text within an html element
 * copied from:
 * https://stackoverflow.com/questions/985272/selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
 */
function selectText(node) {
  node = document.getElementById(node);

  if (document.body.createTextRange) {
    const range = document.body.createTextRange();
    range.moveToElementText(node);
    range.select();
  } else if (window.getSelection) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    console.warn("Could not select text in node: Unsupported browser.");
  }
}


// ERROR (BAD DEVICE) PAGE

/**
 * Shows a QR code and link of the current page
 * This should only render if the server has detected we are on desktop
 *   and sent the error page
 */
function showLinksForMobile() {
  if ($('#qrcode').length > 0) {
    $('#qrcode').qrcode(window.location.href);
  }
  $('#mobile-link').text(window.location.href);
}


// ENTER ID PAGE

/**
 * Callback for the submit button after entering workerID
 * Just redirects to the experiment
 */
function startTask() {
  window.localStorage.setItem("startTime", new Date().getTime());
  var workerID = document.getElementById('workerID').value;
  var pathquery = window.location.href.split('?');
  var path = pathquery[0];
  var query = pathquery[1];
  if ([path.length - 1] !== '/') {
    path += '/';
  }
  path += workerID;
  window.location.href = path + (query ? '?' + query : '' );
  return false;
}
