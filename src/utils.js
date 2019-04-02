import { _ } from './legacy-imports';

export function humanRange(base, nearest, exaggeration) {
  base += 0.0001;
  const rmin = Math.ceil((base * exaggeration) / nearest) * nearest;
  let rmax = Math.ceil((base * exaggeration ** 2) / nearest) * nearest;
  rmax = Math.max(rmin + nearest, rmax);
  return [rmin, rmax];
}

/**
 * Sends a POST request to a URL via an HTML form
 * This is the *only* way to send data to AMT
 * @param {string} url
 * @param {Object.<string, any>} data
 */
export function formPOST(url, data) {
  const form = document.createElement('form');
  form.action = url;
  form.method = 'POST';
  form.setAttribute('style', 'display:none!important');
  Object.entries(data).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.name = name;
    input.value = _.isString(value) ? value : JSON.stringify(value);
    input.type = 'hidden';
    form.append(input);
  });
  const body = document.getElementsByTagName('body').item(0);
  body.appendChild(form);
  form.submit();
  body.removeChild(form);
}
