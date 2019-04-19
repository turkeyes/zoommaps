import "babel-polyfill";
import 'url-search-params-polyfill';
import { $, _ } from "./legacy-imports";

// monkey-patch the history API to dispatch events
if (window.history) {
  ['pushState', 'replaceState'].forEach((methodName) => {
    if (_.isFunction(history[methodName])) {
      const method = history[methodName].bind(history);
      history[methodName] = (...args) => {
        method(...args);
        $(window).trigger(methodName.toLowerCase())
      }
    }
  });
}
