/**
 * Code for reading dataset files (which can take different forms)
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
        let data = JSON.parse(dataStr);
        if (Array.isArray(data)) {
          data = {
            subsets: data,
            extraQuestions: [],
          };
        }
        data.bigName = data.bigName || 'Images'
        data.smallName = data.smallName || 'image';
        data.numPhotos = 0;
        data.minSecPhoto = Infinity;
        data.minSecTotal = 0;
        data.subsets.forEach((subset) => {
          subset.minSecPhoto = subset.minSecPhoto || 0;
          subset.minSecTotal = subset.minSecTotal || 0;
          subset.sampleSize = subset.sampleSize || subset.data.length;
          data.numPhotos += subset.sampleSize;
          data.minSecPhoto = Math.min(data.minSecPhoto, subset.minSecPhoto);
          data.minSecTotal = data.minSecTotal + subset.minSecTotal;
        });
        if (data.minSecPhoto === Infinity) { data.minSecPhoto = 0; }
        f(null, data);
      } catch (parseErr) {
        debug('Error parsing dataset file.', parseErr);
        f(parseErr);
      }
    }
  });
}


/**
 * @typedef DatasetDetails
 * @prop {number} numPhotos
 * @prop {number} minSecPhoto
 * @prop {number} minSecTotal
 * @prop {string[]} extraQuestions
 */


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
