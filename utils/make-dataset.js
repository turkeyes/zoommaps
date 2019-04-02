/**
 * A command-line tool for building dataset files from a folder of images
 */

const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const argparse = require('argparse');
const camelCase = require('lodash.camelcase');

function camelCaseKeys(obj) {
  const newObj = {};
  Object.entries(obj).forEach(([key, val]) => {
    newObj[camelCase(key)] = val;
  });
  return newObj;
}

const parser = new argparse.ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Build a dataset file from a folder of images'
});
parser.addArgument(
  'dir',
  {
    help: '`images/${dir}` containing images'
  }
);
parser.addArgument(
  ['-b', '--big-name'],
  {
    help: 'completely descriptive of the image type, plural',
    defaultValue: 'images'
  }
);
parser.addArgument(
  ['-s', '--small-name'],
  {
    help: 'briefly descriptive of the image type, singular',
    defaultValue: 'image'
  }
);
parser.addArgument(
  ['-i', '--individuals'],
  {
    help: 'present each image in its own group',
    action: 'storeTrue',
    defaultValue: false
  }
);
parser.addArgument(
  ['-gss', '--group-sample-size'],
  {
    help: 'number of groups to randomly sample per user',
    type: 'int'
    // default (null) means use all groups
  }
);
parser.addArgument(
  ['-iss', '--image-sample-size'],
  {
    help: 'number of images to randomly sample per group per user',
    type: 'int'
    // default (null) means use all images per group
  }
);
parser.addArgument(
  ['-msi', '--min-sec-image'],
  {
    help: 'number of seconds the user must spend on each image',
    type: 'float',
    defaultValue: 0
  }
);
parser.addArgument(
  ['-msg', '--min-sec-group'],
  {
    help: 'number of seconds the user must spend on each group',
    type: 'float',
    defaultValue: 0
  }
);
const {
  dir,
  smallName,
  bigName,
  individuals,
  groupSampleSize,
  imageSampleSize,
  minSecImage,
  minSecGroup
} = camelCaseKeys(parser.parseArgs());

const root = path.join(__dirname, '..');
const imgDirPath = path.join(root, 'images', dir);
const images = fs.readdirSync(imgDirPath);
const imgObjs = images.map((filename) => {
  const absolutePath = path.join(imgDirPath, filename);
  const { width: w, height: h } = sizeOf(absolutePath);
  const src = path.join('images', dir, filename);
  return { src, w, h };
});

// cap n to max, defaulting to max if n is falsey
function capIfGiven(n, max) {
  return n ? Math.min(n, max) : max;
}

function makeGroup(name, data) {
  return {
    name,
    data,
    imageSampleSize: capIfGiven(imageSampleSize, data.length),
    minSecImage,
    minSecGroup,
    questions: { schema: {}, form: [] },
  };
}

const groups = individuals
  ? imgObjs.map((io, idx) => makeGroup(`Image ${idx+1}`, [io]))
  : makeGroup(dir, imgObjs);
const datasetFileContent = {
  bigName,
  smallName,
  groups,
  groupSampleSize: capIfGiven(groupSampleSize, groups.length),
  extraQuestionsEachGroup: { schema: {}, form: [] },
  extraQuestionsEnd: { schema: {}, form: [] },
};

const writePath = path.join(root, 'datasets', `${dir}.json`);
fs.writeFileSync(
  writePath,
  JSON.stringify(datasetFileContent, null, 4),
  'utf8'
);

/* eslint-disable no-console */
console.log('Dataset has been created.');
console.log(writePath);
console.log('Edit file to set thresholds and extra questions.');
