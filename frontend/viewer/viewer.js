import Cookies from 'js-cookie';
import { $ } from '../legacy-imports';
import html from './viewer.html';
import pswpHTML from './photoswipe.html';
import './viewer.scss';
import './photoswipe';
import { humanRange, getOrientation, getBrowser, getOS } from '../utils';
import formFromJSON from '../form/form';

/* global PhotoSwipeUI_Default PhotoSwipe */

const FINAL_SENTINEL_IMAGE = {
  "src": "final-sentinel.png",
  "w": 1920,
  "h": 1080
};

class Viewer {

  constructor($container, data) {
    this.$container = $container;
    // data may be undefined if URL is bad
    if (!data) {
      $container.find('#error-url').show();
      return;
    }

    this.$container.append($(html));
    this.$experiment = this.$container.find('#experiment');
    this.$experiment.append($(pswpHTML));
    this.$form = this.$container.find('#form');
    this.$galleries = this.$container.find('#galleries');

    this.data = data;
    this.groupIdx = parseInt(Cookies.get('groupIdx'), 10) || 0;
    this.dones = [];

    // navigation handling
    $(window).on('hashchange pushstate replacestate', () => {
      const hash = window.location.hash.slice(1); // remove leading #
      if (hash === this.lastHash) return;
      const oldHashParams = new URLSearchParams(this.lastHash);
      const newHashParams = new URLSearchParams(hash);
      const newPID = parseInt(newHashParams.get('pid'), 10);
      const group = this.data.groups[this.groupIdx];

      switch (hash) {
        case 'questions':
          this.showGroupQuestions();
          break;
        case 'galleries':
          this.showGalleries();
          break;
        default: // it's from pswp
          // reject hash for final sentinel image
          if (!newPID || newPID > group.data.length) {
            window.location.hash = this.lastHash;
            return;
          }
          // load pswp if it's not already loaded
          if (
            !this.pswpOpen
            && (
              this.initialLoad
              || (!oldHashParams.get('pid') && !oldHashParams.get('gid'))
            )
          ) {
            this.openPhotoSwipe(this.groupIdx);
          }
      }
      this.lastHash = hash;
      this.initialLoad = false;
      this.pswpOpen = false;
    });

    // initialize UI elements
    $container.find('#sec-image')
      .text(humanRange(this.data.minSecImage, 5, 1.5)[0]);
    this.data.groups.forEach((group, i) => {
      const r = $('<input/>').attr({
        type: 'button',
        id: 'field',
        value: group.name
      });
      r.click(() => {
        this.openPhotoSwipe(i);
      });
      this.$galleries.append(r);
    });

    // check if task is already completed
    // jump straight to images if only 1 group, otherwise show buttons
    // TODO: only jump straight in if not done
    this.checkTaskEnd(false).then(() => {
      if (this.data.groups.length === 1) {
        this.openPhotoSwipe(0);
      }
      this.initialLoad = true;
      $(window).trigger('hashchange');
    });
  }

  showExperiment() {
    this.$form.hide();
    this.$galleries.hide();
    this.$experiment.show();
  }

  showGalleries() {
    this.pswpOpen = false;
    this.$form.hide();
    this.$experiment.hide();
    this.$galleries.show();
  }

  /**
   * Show the form for the end of the current group
   * Calls checkTaskEnd when the form is completed
   * Does so immediately if the group has already been completed
   * Or there is no form defined in the dataset JSON file
   */
  showGroupQuestions() {
    const onDone = () => {
      return this.checkTaskEnd();
    };

    if (this.dones[this.groupIdx]) {
      return onDone();
    }

    // show form
    this.pswpOpen = false;
    this.$galleries.hide();
    this.$experiment.hide();
    this.$form.show();

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

    this.$form.empty();
    formFromJSON(this.$form, schemaform, (values) => {
      $.post({
        url: "/api/group-survey" + window.location.search,
        data: JSON.stringify({
          values,
          groupIdx: this.groupIdx
        }),
        contentType: "application/json"
      }).done(() => onDone());
    });
  }

  /**
   * Show the completion key
   * @param {string} key 
   */
  showSubmitKey(key) {
    this.$container.find('#submit-code').text(key);
    this.$container.find('#succesful-submit').show();
  }

  /**
   * Opens the PhotoSwipe UI and sets up handlers for logging
   */
  openPhotoSwipe(groupIdx) {
    this.pswpOpen = true;
    this.groupIdx = groupIdx;
    Cookies.set('groupIdx', groupIdx);
    let items = this.data.groups[this.groupIdx].data;

    this.showExperiment();

    const pswpElement = $('#experiment').children()[0];

    const pswpOptions = {
      index: 0, // start at first slide
      maxSpreadZoom: 4,
      pinchToClose: false,
      closeOnScroll: false,
      closeOnVerticalDrag: false,
      escKey: false,
      loop: false,
      allowPanToNext: false
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
    this.hideBackForFirstImage(pswp);

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
      if (src !== FINAL_SENTINEL_IMAGE.src) $.post({
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
          duration: time - start_time
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
      this.hideBackForFirstImage(pswp);
      // when we get to the last (sentinel) image
      if (pswp.getCurrentIndex() === pswp.options.getNumItemsFn() - 1) {
        this.$experiment.hide();
        this.checkGroupEnd(pswp);
      }
    });
  }

  hideBackForFirstImage(pswp) {
    // hide the back button for first image
    if (pswp.getCurrentIndex() === 0) {
      this.$experiment.find('.pswp__top-bar .pswp__button--arrow--left').hide();
    } else {
      this.$experiment.find('.pswp__top-bar .pswp__button--arrow--left').show();
    }
  }

  /**
   * Check if the task has been completed.
   * Shows the submit key if it has.
   * If it hasn't, shows a message and then restarts the experiment
   */
  checkGroupEnd(pswp) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('groupIdx', this.groupIdx);
    $.get({
      url: "/api/end-group?" + searchParams.toString(),
      contentType: "application/json",
      success: (res) => {
        const { success, completed } = res;
        if (success && completed) {
          window.location.hash = 'questions';
        } else {
          const $incomplete = this.$container.find('#incomplete-task');
          $incomplete.show();
          setTimeout(() => {
            pswp.goTo(0);
          }, 2000);
          setTimeout(() => {
            $incomplete.hide();
            this.showExperiment();
          }, 5000);
        }
      }
    });
  }

  /**
   * Check if the entire task has been completed
   * Update the completion status of each group
   * If all are complete, show the completion key
   * Either way, show the galleries page (unless redirectToGalleries is false)
   */
  checkTaskEnd(redirectToGalleries = true) {
    return $.get({
      url: "/api/end-task" + window.location.search,
      contentType: "application/json"
    })
      .then((res) => {
        const { success, key, dones } = res;
        this.dones = dones;
        const buttons = this.$galleries.children('input');
        dones.forEach((done, i) => {
          if (done) {
            $(buttons[i]).addClass('done');
          }
        });
        if (redirectToGalleries) {
          window.location.hash = 'galleries';
        }
        if (success && key) {
          this.showSubmitKey(key);
        }
      });
  }

}

export default function render($container, data) {
  new Viewer($container, data);
}
