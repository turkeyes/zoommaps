/**
 * A command-line tool for building dataset files from a folder of images
 */

const path = require('path');
const fs = require('fs');
var sizeOf = require('image-size');

const dir = process.argv[2];
const images = fs.readdirSync(path.join(__dirname, 'public', 'imgs', dir));
const datasetFileContent = {
  subsets: [{
    name: dir,
    data: images.map((filename) => {
      const absolutePath = path.join(__dirname, 'public', 'imgs', dir, filename);
      const { width: w, height: h } = sizeOf(absolutePath);
      const src = path.join('imgs', dir, filename);
      return { src, w, h };
    }),
    sampleSize: images.length,
    minSecPhoto: 0,
    minSecTotal: 0,
  }],
  extraQuestions: [],
  category: dir
};
const writePath = path.join(__dirname, 'datasets', `${dir}.json`);
fs.writeFileSync(
  path.join(__dirname, 'datasets', `${dir}.json`),
  JSON.stringify(datasetFileContent, null, 4),
  'utf8'
);

/* eslint-disable no-console */
console.log('Dataset has been created.');
console.log(writePath);
console.log('Edit file to set thresholds, image category, and extra questions.');
