var min_events = 10

var pswpElement = document.querySelectorAll('.pswp')[0];
var uniq = 'id' + (new Date()).getTime();
// build items array
var items = [
    {
        src: 'imgs/1.png',
        w: 1240,
        h: 1754
    },
    {
        src: 'imgs/2.png',
        w: 1240,
        h: 1754
    },
    {
        src: 'imgs/3.png',
        w: 1240,
        h: 1754
    },
    {
        src: 'imgs/4.png',
        w: 1754,
        h: 1240
    },
    {
        src: 'imgs/5.png',
        w: 1240,
        h: 1754
    },
    {
        src: 'imgs/6.png',
        w: 1240,
        h: 1754
    },
    {
        src: 'imgs/7.png',
        w: 1754,
        h: 1240
    },
    {
        src: 'imgs/8.png',
        w: 1240,
        h: 1754
    }
];

// define options (if needed)
var options = {
    // optionName: 'option value'
    // for example:
    index: 0, // start at first slide
    maxSpreadZoom: 4
};

// Initializes and opens PhotoSwipe
var pswp = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
pswp.init();

var src = '';
var data = [];

pswp.listen('position_change', function(item, x, y, zoom, time) {
  if (item.src !== src) {
    if (data.length > min_events) {
      console.log("saving to db")
      $.ajax({
            type: "POST",
            url: "/data",
            data: JSON.stringify({ src:item.src, data:data, id:uniq}),
            contentType: "application/json",
            success: function(res) {
                if (res.success) {
                } else {
                    console.log("failed message");
                }
            },
            error: function(err) {
                console.log("could not connect to db server");
            }
        });
    }
    src = item.src;
    data = [];
  }
  var x_min = x < 0 ? Math.floor(-x) : 0;
  var width = Math.floor(-x + screen.width / zoom);
  var x_max = width < item.w ? width : item.w;

  var y_min = y < 0 ? Math.floor(-y) : 0;
  var height = Math.floor(-y + screen.height / zoom);
  var y_max = height < item.h ? height : item.h;
  console.log('img.src:' + item.src + ' x_min:' + x_min + ' x_max:' + x_max + ' y_min:' + y_min + ' y_max:' + y_max + ' time:' + time);
  data.push({ x_min:x_min, x_max:x_max, y_min:y_min, y_max:y_max, time: time });
});
