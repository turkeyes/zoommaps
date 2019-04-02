/**
 * Code for reading dataset files; creates some derived properties
 * It exports functions, but it can also be used from the command line
 *    so that the Python notebook can call it
 */

const fs = require('fs');
const path = require('path');
const debug = require('debug')('zoommaps');

/**
 * @param {string} dataset
 * @param {(err, data?: Dataset)} f
 */
function readDatasetFile(dataset, f) {
  const filePath = path.join(__dirname, '..', 'datasets', `${dataset}.json`);
  fs.readFile(filePath, 'utf8', (readErr, dataStr) => {
    if (readErr) {
      debug('Error finding dataset', readErr);
      f(readErr);
    } else {
      try {
        const data = JSON.parse(dataStr);
        data.numPhotos = 0;
        data.minSecPhoto = 0;
        data.minSecTotal = 0;
        data.groups.forEach((group) => {
          data.numPhotos += group.sampleSize;
          data.minSecImage = Math.max(data.minSecImage, group.minSecImage);
          data.minSecTotal = data.minSecTotal + group.minSecGroup;
        });
        f(null, data);
      } catch (parseErr) {
        debug('Error parsing dataset file.', parseErr);
        f(parseErr);
      }
    }
  });
}

module.exports = {
  readDatasetFile
};

/* eslint-disable no-console */
if (require.main === module) {
  readDatasetFile(process.argv[2], (err, data) => {
    if (err) console.error(JSON.stringify(err));
    else console.log(JSON.stringify(data));
  });
}
