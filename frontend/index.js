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
  const exampleQuerystring = "?workerId=demo&dataset=natural_test"
  if (!datasetName) {
    throw new Error(`Please specify a dataset in the querystring. For example: <a href="/${exampleQuerystring}">${exampleQuerystring}</a>`);
  }
  if (!workerId) {
    throw new Error(`Please specify a worker id in the querystring. For example: <a href="/${exampleQuerystring}">${exampleQuerystring}</a>`);
  }
  const data = await $.get({
    url: '/api/dataset' + window.location.search,
  }).catch((e) => { 
    if (e.status == 404) {
      throw new Error(`Could not find dataset "${datasetName}"`);
    } else {
      throw new Error(`Error loading dataset "${datasetName}"`);
    }
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
    $main.html(`<b>Page not found.</b><p>${e.message || ""}</p>`);
    return;
  }
  navigate($main, data);
});
