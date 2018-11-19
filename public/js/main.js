var min_events = 100

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.replace('\#', '').slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        // vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

$(document).ready(function() {
  var page_vars = getUrlVars();
  var tag = 'none'
  if ('tag' in page_vars) {
    tag = page_vars['tag']
  }
  if ('dataset' in page_vars) {
    $.getJSON('../datasets/' + page_vars['dataset'] + '.json', function( data ) {
      if (data.length == 1) {
        openPhotoSwipe(data[0]['data'], page_vars['dataset'], tag);
      } else {
        $.each( data, function( key, val ) {
          var r=$('<input/>').attr({
              type: "button",
              id: "field",
              value: val["name"]
          });
          r.click(function(){
              openPhotoSwipe(val['data'], page_vars['dataset'], tag);
          });
          $("#galleries").append(r);
        });
      }
    });
  }
});

// items = [{
//         src: 'imgs/4.png',
//         w: 1754,
//         h: 1240
//     },
//     {
//         src: 'imgs/5.png',
//         w: 1240,
//         h: 1754
//     },
//     {
//         src: 'imgs/6.png',
//         w: 1240,
//         h: 1754
//     }]
// openPhotoSwipe(items)


function openPhotoSwipe(items, dataset, tag) {
  var pswpElement = document.querySelectorAll('.pswp')[0];
  var uniq = 'id' + (new Date()).getTime();
  var rotated = false;

  // define options (if needed)
  var options = {
      // optionName: 'option value'
      // for example:
      index: 0, // start at first slide
      maxSpreadZoom: 4,
      pinchToClose: false,
      closeOnScroll: false,
      closeOnVerticalDrag: false,
      escKey: false
  };

  function getOrientation(){
      var orientation = window.innerWidth > window.innerHeight ? "Landscape" : "Portrait";
      return orientation;
  }


  window.onresize = function(){
    orientation = getOrientation();
    console.log(orientation)
    if(navigator.userAgent.match('CriOS')) {
      // Catch IOS iPhone bug
      window.location.reload();
    }
  }

  // Initializes and opens PhotoSwipe
  function randomize(a, b) {
      return Math.random() - 0.5;
  }
  items.sort(randomize);

  var pswp = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
  pswp.init();

  var src = '';
  var x_min = [];
  var x_max = [];
  var y_min = [];
  var y_max = [];
  var times = [];
  var start_time = 0;

  pswp.listen('setImageSize', function(w, h) {
    console.log('w:'+ w + ' h:' + h)
  })

  pswp.listen('position_change', function(item, x, y, zoom, time) {
    if (item.src !== src || rotated) {
      if (x_min.length > min_events) {
        console.log("saving to db");
        $.ajax({
              type: "POST",
              url: "/data",
              data: JSON.stringify({ src:src, x_min:x_min, x_max:x_max, y_min:y_min, y_max:y_max, time:times, id:uniq, dataset:dataset, tag:tag}),
              contentType: "application/json",
              success: function(res) {
                  if (res.success) {
                  } else {
                      console.log("failed message");
                  }
              },
              error: function(err) {
                  alert(err.message);
                  console.log("could not connect to db server");
              }
          });
      }
      src = item.src;
      x_min = [];
      x_max = [];
      y_min = [];
      y_max = [];
      times = [];
      start_time = time;
    }
    x_min.push(x < 0 ? Math.floor(-x / zoom) : 0);
    y_min.push(y < 0 ? Math.floor(-y / zoom) : 0);

    if ((item.w / item.h) > (window.innerWidth / window.innerHeight)) {
      var width = item.w*item.fitRatio / zoom;
      var height = width * window.innerHeight / window.innerWidth;
    } else {
      var height = item.h*item.fitRatio / zoom;
      var width = height * window.innerWidth / window.innerHeight;
    }


    x_max.push(Math.floor(-x / zoom + width) < item.w ? Math.floor(-x / zoom + width) : item.w);
    y_max.push(Math.floor(-y / zoom + height) < item.h ? Math.floor(-y / zoom + height) : item.h);
    times.push(time - start_time)
    // console.log(item)
    // console.log('x:' + -x/zoom + ' y:' + -y/zoom + ' zoom:' + zoom)
    // console.log('y_offset:' + 37/zoom)
    // console.log(Math.floor(-y/zoom + width * window.innerHeight / window.innerWidth))
    // console.log(1754 - Math.floor((-y + item.h*item.fitRatio) / zoom))
    // console.log((y_max[x_max.length - 1] - y_min[x_min.length - 1]) / (x_max[x_max.length - 1] - x_min[x_min.length - 1]))
    // console.log('img.src:' + item.src + ' x_min:' + x_min[x_min.length - 1] + ' x_max:' + x_max[x_max.length - 1] + ' y_min:' + y_min[y_min.length - 1] + ' y_max:' + y_max[y_max.length - 1] + ' time:' + times[times.length - 1]);
    // data.push({ x_min:x_min, x_max:x_max, y_min:y_min, y_max:y_max, time: time });
  });
}
