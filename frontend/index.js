import './index.scss';
import './polyfills';
import MobileDetect from 'mobile-detect';
import { $ } from './legacy-imports';
import viewer from './viewer/viewer';
import survey from './demographic-survey/demographic-survey';
import instructions from './instructions/instructions';

function navigate($container, data) {
  const md = new MobileDetect(window.navigator.userAgent);
  const mobile = md.mobile() || md.phone() || md.tablet();
  if (mobile && window.location.pathname.startsWith('/viewer')) {
    viewer($container, data);
  } else {
    instructions($container, data, () => {
      $container.empty();
      survey($container, data);
    });
  }
}

async function checkCompleted() {
  const { completed } = await $.get({
    url: '/api/end-task' + window.location.search,
  });
  return completed;
}

async function getData() {
  const query = new URLSearchParams(window.location.search);
  const workerId = query.get('workerId');
  var datasetName = query.get('dataset');
  if (!workerId || !datasetName) {
    throw new Error();
  }
  const data = await $.get({
    url: '/api/dataset' + window.location.search,
  });
  return data;
}

$(document).ready(async () => {
  const $main = $('#main');
  if (window.supportedBrowser === false) {
    $main.html('<p>Your browser is not able to run this HIT.</p>');
    return;
  }

  const completed = await checkCompleted();
  if (completed) {
    $main.html('<p>You already did this HIT.</p>');
    return;
  }

  let data;
  try {
    data = await getData();
  } catch (e) {
    $main.html('<p>HIT could not be found. Check the URL.</p>');
    return;
  }
  navigate($main, data);
});
