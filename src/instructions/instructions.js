import $ from 'jquery';
import qrcode from 'qrcode-generator';
import html from './instructions.html';
import overviewHTML from './overview.html';
import './instructions.scss';
import { humanRange } from '../utils';

export default function main($container, data, onValidKey) {
  const $instructions = $(html);
  $instructions.find('.title').text(`Zoom Maps: ${data.bigName}`);

  const $overview = $instructions.find('.overview');
  $overview.html(overviewHTML);

  const [minSecPhoto, maxSecPhoto] = humanRange(data.minSecPhoto, 5, 1.25);
  const [minMinTotal, maxMinTotal] = humanRange(data.minSecTotal / 60, 1, 1.5);

  $overview.find('.num-photos').text(15);
  $overview.find('.big-name').text(data.bigName);
  $overview.find('.small-name').text(data.smallName);
  $overview.find('.min-sec-photo').text(minSecPhoto);
  $overview.find('.max-sec-photo').text(maxSecPhoto);
  $overview.find('.min-min-total').text(minMinTotal);
  $overview.find('.max-min-total').text(maxMinTotal);

  const mobileLink = window.location.origin + '/viewer' + window.location.search;
  const qr = qrcode(0, 'L');
  qr.addData(mobileLink);
  qr.make();
  $instructions.find('.qr .code')
    .append(qr.createSvgTag({ scalable: true, margin: 0 }));
  $instructions.find('.qr .link').text(mobileLink);
  $instructions.find('.enter-key button').click(async () => {
    const submitKey = $instructions.find('.enter-key input').val();
    const keyIsValid = await $.get(`/api/validate?key=${submitKey}`);
    if (keyIsValid) {
      onValidKey(submitKey);
    } else {
      alert('This key is not valid. Please complete the task.');
    }
  });

  $container.append($instructions);
}