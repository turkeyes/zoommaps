const path = require('path');
const fs = require('fs');
var sizeOf = require('image-size');

const dir = process.argv[2];
const images = fs.readdirSync(path.join(__dirname, 'public', 'imgs', dir));
const datasetFileContent = [
  {
    name: dir,
    data: images.map((filename) => {
      const absolutePath = path.join(__dirname, 'public', 'imgs', dir, filename);
      const { width: w, height: h } = sizeOf(absolutePath);
      const src = path.join('imgs', dir, filename);
      return { src, w, h };
    }),
    sampleSize: images.length,
    minTimePerPhoto: 0,
    minTimeTotal: 0,
  }
];
fs.writeFileSync(
  path.join(__dirname, 'public', 'datasets', `${dir}.json`),
  JSON.stringify(datasetFileContent, null, 4),
  'utf8'
);
