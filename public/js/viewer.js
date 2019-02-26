/* global PhotoSwipeUI_Default PhotoSwipe */

var FINAL_SENTINEL_IMAGE = {
  "src": "/imgs/final-sentinel.jpg",
  "w": 1920,
  "h": 1080
};

/**
 * Find the first substring from an array in a string
 * @param {string} str string
 * @param {string[]} choices substrings
 * @return {string} first substring in string, else '?'
 */
function findFirstString(str, choices) {
  for (var j = 0; j < choices.length; j++) {
    if (str.indexOf(choices[j]) >= 0) {
      return choices[j];
    }
  }
  return '?';
}

/**
 * Get the user's browser, or ? if unknown
 */
function getBrowser() {
  return findFirstString(navigator.userAgent, [
    'Seamonkey', 'Firefox', 'Chromium', 'Chrome', 'Safari', 'OPR', 'Opera',
    'Edge', 'MSIE', 'Blink', 'Webkit', 'Gecko', 'Trident', 'Mozilla']);
}

/**
 * Get the user's OS, or ? if unknown
 */
function getOS() {
  return findFirstString(navigator.userAgent, [
    'Android', 'iOS', 'Symbian', 'Blackberry', 'Windows Phone', 'Windows',
    'OS X', 'Linux', 'iOS', 'CrOS']).replace(/ /g, '_');
}

/**
 * Get device orientation (just checks if width or height is greater)
 * @return {'Landscape' | 'Portrait'}
 */
function getOrientation() {
  var orientation = window.innerWidth > window.innerHeight ? "Landscape" : "Portrait";
  return orientation;
}

/**
 * Sample items randomly from an array
 * Source: Bergi, StackOverflow
 */
function getRandom(arr, n) {
  var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  if (n > len)
      throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
      var x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

$(document).ready(function () {
  var page_vars = new URLSearchParams(window.location.search);
  var workerID = page_vars.get('workerID') || '?';
  var dataset = page_vars.get('dataset');
  if (dataset) {
    checkEnd(function() {
      var numPhotos = 0;
      $.getJSON('../datasets/' + dataset + '.json', function (data) {
        if (data.length == 1) {
          data = data[0];
          numPhotos = data['sampleSize'] || data['data'].length;
          var photos = getRandom(data['data'], numPhotos);
          openPhotoSwipe(photos, dataset, workerID);
        } else {
          $.each(data, function (key, val) {
            var r = $('<input/>').attr({
              type: "button",
              id: "field",
              value: val["name"]
            });
            var numPhotosForSubtask = val['sampleSize'] || val['data'].length;
            var photos = getRandom(val['data'], numPhotosForSubtask);
            r.click(function () {
              openPhotoSwipe(photos, dataset, workerID);
            });
            $("#galleries").append(r);
            numPhotos += numPhotosForSubtask;
          });
        }
      });
    })
  }
});

// PHOTO VIEWER PAGE

/**
 * Opens the PhotoSwipe UI and sets up handlers for logging
 * @param {Object[]} items - photo objects from dataset JSON
 * @param {string} dataset - name of the dataset
 * @param {workerID} workerID
 */
function openPhotoSwipe(items, dataset, workerID) {
  if (!window.PhotoSwipe) return;

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

  // state for data logging
  var src = '';
  var x_min = [];
  var x_max = [];
  var y_min = [];
  var y_max = [];
  var times = [];
  var start_time = (new Date()).getTime();

  pswp.listen('position_change', function (item, x, y, zoom, time) {
    // new context, try to log
    if (item.src !== src || rotated) {
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
          workerID,
          orientation,
          browser: getBrowser(),
          os: getOS(),
          duration: (new Date()).getTime() - start_time
        }),
        contentType: "application/json"
      });
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
    var width;
    var height;
    if ((item.w / item.h) > (window.innerWidth / window.innerHeight)) {
      width = item.w * item.fitRatio / zoom;
      height = width * window.innerHeight / window.innerWidth;
    } else {
      height = item.h * item.fitRatio / zoom;
      width = height * window.innerWidth / window.innerHeight;
    }
    x_max.push(Math.floor(-x / zoom + width) < item.w ? Math.floor(-x / zoom + width) : item.w);
    y_max.push(Math.floor(-y / zoom + height) < item.h ? Math.floor(-y / zoom + height) : item.h);
    times.push(time - start_time);
  });

  // when we get to the last (sentinel) image
  // we need to hide the experiment and show a message
  pswp.listen('beforeChange', function() {
    if (pswp.getCurrentIndex() === pswp.options.getNumItemsFn() - 1) {
      $('#error-url').hide();
      $('#experiment').hide();
      checkEnd(function () {
        $('#incomplete-task').show();
        setTimeout(function() {
          location.href = location.href.split('#')[0]; // easiest way to do a reshuffle
        }, 5000);
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
  var page_vars = new URLSearchParams(window.location.search);
  var workerID = page_vars.get('workerID') || '?';
  var dataset = page_vars.get('dataset') || '?';

  $.ajax({
    type: "POST",
    url: "/end",
    data: JSON.stringify({ workerID, dataset }),
    contentType: "application/json",
    success: function (res) {
      if (res.success) {
        var done = res['done'];
        if (done) {
          $('#error-url').hide();
          $('#done').show();
        } else {
          onNotDone();
        }
      }
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
  }
}
