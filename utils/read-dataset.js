/**
 * Code for reading dataset files (which can take different forms)
 * It exports functions, but it can also be used from the command line
 *    so that the Python notebook can call it
 */

const fs = require('fs');
const path = require('path');
const debug = require('debug')('zoommaps');


const datasetCache = {};
/**
 * @param {string} dataset
 * @param {(err, data?: Dataset)} f
 */
function readDatasetFile(dataset, f) {
  if (dataset in datasetCache) return f(null, datasetCache[dataset]);
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
        data.subsets.forEach((subset) => {
          subset.minSecPhoto = subset.minSecPhoto || 0;
          subset.minSecTotal = subset.minSecTotal || 0;
          subset.sampleSize = subset.sampleSize || subset.data.length;
        });
        datasetCache[dataset] = data;
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
 * @prop {string} name
 */

/**
 * Get the number of photos in the dataset by name
 * Done by reading a local file, but the result is cached
 * @param {string} dataset
 * @param {(err, datasetDetails?: DatasetDetails) => void} f
 */
function getDatasetDetails(dataset, f) {
  readDatasetFile(dataset, (readDatasetErr, data) => {
    if (readDatasetErr) return f(readDatasetErr);
    let datasetDetails = {
      numPhotos: 0,
      minSecPhoto: Infinity,
      minSecTotal: 0,
    };
    datasetDetails = data.subsets.reduce((d, s) => ({
      numPhotos: d.numPhotos + s.sampleSize,
      minSecPhoto: Math.min(d.minSecPhoto, s.minSecPhoto),
      minSecTotal: d.minSecTotal + s.minSecTotal,
    }), datasetDetails);
    datasetDetails.extraQuestions = data.extraQuestions;
    f(null, datasetDetails);
  });
}


module.exports = {
  readDatasetFile,
  getDatasetDetails
};


/* eslint-disable no-console */
if (require.main === module) {
  getDatasetDetails(process.argv[2], (err, data) => {
    if (err) console.error(JSON.stringify(err));
    else console.log(JSON.stringify(data));
  });
}
