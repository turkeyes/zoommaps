var pswpElement = document.querySelectorAll('.pswp')[0];

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
    },
    {
        src: 'imgs/1.png',
        w: 1240,
        h: 1754
    },
];

// define options (if needed)
var options = {
    // optionName: 'option value'
    // for example:
    index: 0 // start at first slide
};

// Initializes and opens PhotoSwipe
var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
gallery.init();
