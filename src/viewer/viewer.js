import { $ } from '../legacy-imports';
import html from './viewer.html';
import pswpHTML from './photoswipe.html';
import './viewer.scss';
import './photoswipe';
import { humanRange, getOrientation, getBrowser, getOS } from '../utils';
import formFromJSON from '../form/form';

/* global PhotoSwipeUI_Default PhotoSwipe */

const FINAL_SENTINEL_IMAGE = {
  "src": "final-sentinel.jpg",
  "w": 1920,
  "h": 1080
};

class Viewer {

  constructor($container, data) {
    $container.append($(html));
    if (!data) {
      $('#error-url').show();
      return;
    }
  
    this.data = data;
    this.groupIdx = 0;
    this.completed = this.data.groups.map(() => false); // TODO: get from server

    $('#sec-image').text(humanRange(this.data.minSecImage, 5, 1.5)[0]);
    if (this.data.groups.length === 1) {
      this.openPhotoSwipe(this.data.groups[0].data);
    } else {
      this.data.groups.forEach((group, i) => {
        const r = $('<input/>').attr({
          type: 'button',
          id: 'field',
          value: group.name
        });
        r.click(() => {
          this.groupIdx = i;
          this.openPhotoSwipe(group.data);
        });
        $("#galleries").append(r);
        this.showGalleries();
      });
    }
  }

  showGalleries() {
    $('form').hide();
    $('#experiment').hide();
    $("#galleries").show();
  }

  /**
   * Opens the PhotoSwipe UI and sets up handlers for logging
   * @param {Object[]} items - image objects from dataset JSON
   * @param {string} dataset - name of the dataset
   * @param {workerId} workerId
   */
  openPhotoSwipe(items) {
    $('#experiment').empty();
    $('#experiment').append($(pswpHTML));

    $('#experiment').show();
    $('form').hide();
    $("#galleries").hide();

    const pswpElement = $('#experiment').children()[0];

    const pswpOptions = {
      index: 0, // start at first slide
      maxSpreadZoom: 4,
      pinchToClose: false,
      closeOnScroll: false,
      closeOnVerticalDrag: false,
      escKey: false,
      loop: false
    };

    // orientation tracking
    let rotated = false;
    let orientation = getOrientation();
    window.onresize = () => {
      const newOrientation = getOrientation();
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
    // no need to randomize order since the server does that
    items = [...items, FINAL_SENTINEL_IMAGE];
    const pswp = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, pswpOptions);
    pswp.init();

    // state for data logging
    let src = items[0].src;
    let x_min = [];
    let x_max = [];
    let y_min = [];
    let y_max = [];
    let times = [];
    let start_time = (new Date()).getTime();

    // post a label to the server
    function postLabel(time) {
      $.post({
        url: "/api/data" + window.location.search,
        data: JSON.stringify({
          src,
          x_min,
          x_max,
          y_min,
          y_max,
          time: times,
          orientation,
          browser: getBrowser(),
          os: getOS(),
          duration: (new Date()).getTime() - start_time
        }),
        contentType: "application/json"
      });
      // clear data for next logging
      x_min = [];
      x_max = [];
      y_min = [];
      y_max = [];
      times = [];
      start_time = time;
      rotated = false;
    }

    // save data to log whenever the user zooms/moves the photo
    pswp.listen('position_change', (item, x, y, zoom, time) => {
      // if they rotated their screen then we start a new label
      if (rotated) {
        postLabel(time);
      }

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

    // when photo changes, send data and check for end
    pswp.listen('beforeChange', () => {
      postLabel((new Date()).getTime());
      src = items[pswp.getCurrentIndex()].src;
      // when we get to the last (sentinel) image
      if (pswp.getCurrentIndex() === pswp.options.getNumItemsFn() - 1) {
        pswp.goTo(0);
        $('#experiment').hide();
        this.checkGroupEnd(() => {
          $('#incomplete-task').show();
          setTimeout(() => {
            $('#incomplete-task').hide();
            $('#experiment').show();
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
  checkGroupEnd(onNotDone) {
    let search = window.location.search;
    search += search ? '&' : '?';
    search += `groupIdx=${this.groupIdx}`;
    $.get({
      url: "/api/end-group" + search,
      contentType: "application/json",
      success: (res) => {
        const { success, completed } = res;
        if (success && completed) {
          this.showGroupQuestions();
        } else {
          onNotDone();
        }
      }
    });
  }

  /**
   * Show the completion key
   * @param {string} key 
   */
  showSubmitKey(key) {
    $('#experiment').hide();
    $('form').hide();
    $('#galleries').hide();

    $('#submit-code').text(key);
    $('#succesful-submit').show();
  }

  showGroupQuestions() {
    $('#galleries').hide();
    $('#experiment').hide();
    $('form').show();

    const group = this.data.groups[this.groupIdx];
    const schemaform = {
      schema: {
        ...group.questions.schema,
        ...this.data.extraQuestionsEachGroup.schema
      },
      form: [
        ...group.questions.form,
        ...this.data.extraQuestionsEachGroup.form
      ]
    };
    const $form = $('form');
    $form.empty();
    formFromJSON($form, schemaform, (values) => {
      // TODO: post to server
      $.get({
        url: "/api/end-task" + window.location.search,
        contentType: "application/json",
        success: (res) => {
          const { success, completed, key } = res;
          if (success && completed && key) {
            this.showSubmitKey(key);
          } else {
            this.showGalleries();
          }
        }
      });
    })
  }

}

export default function render($container, data) {
  new Viewer($container, data);
}
