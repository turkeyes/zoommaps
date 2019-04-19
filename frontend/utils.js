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

/**
 * Find the first substring from an array in a string
 * @param {string} str string
 * @param {string[]} choices substrings
 * @return {string} first substring in string, else '?'
 */
function findFirstString(str, choices) {
  for (var j = 0; j < choices.length; j++) {
    if (str.indexOf(choices[j]) >= 0) {
      return choices[j];
    }
  }
  return '?';
}

/**
 * Get the user's browser, or ? if unknown
 */
export function getBrowser() {
  return findFirstString(navigator.userAgent, [
    'Seamonkey', 'Firefox', 'Chromium', 'Chrome', 'Safari', 'OPR', 'Opera',
    'Edge', 'MSIE', 'Blink', 'Webkit', 'Gecko', 'Trident', 'Mozilla']);
}

/**
 * Get the user's OS, or ? if unknown
 */
export function getOS() {
  return findFirstString(navigator.userAgent, [
    'Android', 'iOS', 'Symbian', 'Blackberry', 'Windows Phone', 'Windows',
    'OS X', 'Linux', 'iOS', 'CrOS']).replace(/ /g, '_');
}

/**
 * Get device orientation (just checks if width or height is greater)
 * @return {'Landscape' | 'Portrait'}
 */
export function getOrientation() {
  var orientation = window.innerWidth > window.innerHeight ? "Landscape" : "Portrait";
  return orientation;
}
