import qrcode from 'qrcode-generator';
import { $, _ } from '../legacy-imports';
import html from './instructions.html';
import overviewHTML from './overview.html';
import './instructions.scss';
import { humanRange } from '../utils';

export default function main($container, data, onValidKey) {
  const $instructions = $(html);
  $instructions.find('.title').text(`Zoom Maps: ${data.bigName}`);
  const $overview = $instructions.find('.overview');
  $overview.html(overviewHTML);

  // overview text
  const numImages = data.groups.reduce((s, g) => s + g.data.length, 0);
  const minSecTotal = Math.max(
    data.minSecImage * numImages,
    data.minSecGroup * data.groups.length
  );
  const [minSecImage, maxSecImage] = humanRange(data.minSecImage, 5, 1.25);
  const [minMinTotal, maxMinTotal] = humanRange(minSecTotal / 60, 1, 1.5);
  $overview.find('.num-images').text(numImages);
  $overview.find('.big-name').text(data.bigName);
  $overview.find('.small-name').text(data.smallName);
  $overview.find('.min-sec-image').text(minSecImage);
  $overview.find('.max-sec-image').text(maxSecImage);
  $overview.find('.min-min-total').text(minMinTotal);
  $overview.find('.max-min-total').text(maxMinTotal);

  const extraQuestions = data.extraQuestionsEnd;
  if (_.size(extraQuestions.schema) > 0) {
    const $eq = $instructions.find('.extra-questions');
    $eq.append($('<p>At the end of the task, you will be asked:</p>'));
    const $ul = $('<ul></ul>');
    const eqUsedSchemas = extraQuestions.form
      ? extraQuestions.form.map(({ key }) => extraQuestions.schema[key])
      : _.values(extraQuestions.schema);
    eqUsedSchemas.forEach(({ title }) => { // TODO: alternatives to title
      const $li = $('<li></li>');
      $li.text(title);
      $ul.append($li);
    });
    $eq.append($ul);
  }

  // qr code
  const urlParams = new URLSearchParams(window.location.search);
  let workerId = urlParams.get('workerId');
  const dataset = urlParams.get('dataset');
  const mobileLink = window.location.origin
    + '/viewer'
    + `?dataset=${dataset}&workerId=${workerId}`;
  const qr = qrcode(0, 'L');
  qr.addData(mobileLink);
  qr.make();
  $instructions.find('.qr .code')
    .append(qr.createSvgTag({ scalable: true, margin: 0 }));
  $instructions.find('.qr .link').text(mobileLink);

  // on submit key
  $instructions.find('.enter-key').submit(async (e) => {
    e.preventDefault();
    const submitKey = $instructions.find('.enter-key input').val();
    const keyIsValid = await $.get(`/api/validate?key=${submitKey}`);
    if (keyIsValid) {
      onValidKey();
    } else {
      alert('This key is not valid. Please complete the task.');
    }
  });

  $container.append($instructions);
}