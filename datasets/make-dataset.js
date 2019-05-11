/**
 * A command-line tool for building dataset files from a folder of images
 * This also defines the schema of a dataset file
 */

/**
 * @typedef ImageInfo
 * @prop {string} src
 * @prop {number} w
 * @prop {number} h
 */

/**
 * @typedef DatasetGroup
 * @prop {string} key
 * @prop {string} name
 * @prop {ImageInfo[]} data
 * @prop {number} sampleSize
 * @prop {FormJSON} questions
 */

/**
 * @typedef Dataset
 * @prop {string} bigName
 * @prop {string} smallName
 * @prop {DatasetGroup[]} groups
 * @prop {number} sampleSize
 * @prop {number} minSecGroup
 * @prop {number} minSecImage
 * @prop {FormJSON} extraQuestionsEachGroup
 * @prop {FormJSON} extraQuestionsEnd
 */

/**
 * @typedef FormJSON
 * @prop {{ [key: string]: any }} schema
 * @prop {{ key: string, [s: string]: any }[]} [form]
 * @see https://github.com/jsonform/jsonform to understand what any is
 */

const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const argparse = require('argparse');
const camelCase = require('lodash.camelcase');
const recursiveReaddir = require('recursive-readdir');

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
parser.addArgument(
  ['-eqe', '--extra-questions-end'],
  {
    help: 'JSON file containing FormJSON specifying questions to show at end',
    defaultValue: ''
  }
);
parser.addArgument(
  ['-eqg', '--extra-questions-group'],
  {
    help: 'JSON file containing FormJSON specifying questions to show at end',
    defaultValue: ''
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
  minSecGroup,
  extraQuestionsEnd,
  extraQuestionsGroup
} = camelCaseKeys(parser.parseArgs());

/**
 * cap n to max, defaulting to max if n is falsey
 * @param {number} n
 * @param {number} max
 * @return {number}
 */
function capIfGiven(n, max) {
  return n ? Math.min(n, max) : max;
}

/**
 * Parses a file representing questions to show in the interface. 
 * Input file should contain FormJSON.
 * Returns a default empty schema if name is the empty string.
 * 
 * @param {string} name : name of the file to parse relative to 
 * `datasets/questions`
 */
function parseQuestionFile(name) {
  const defaultSchema =  { schema: {}, form: [] };
  if (!name.length) return defaultSchema;
  
  const fname = path.join(__dirname, '..', 'datasets', 'questions', `${name}.json`);
  
  const rawData = fs.readFileSync(fname);
  return JSON.parse(rawData);
}

async function main() {
  const root = path.join(__dirname);
  const imgDirPath = path.join(root, 'images', dir);
  const images = await recursiveReaddir(imgDirPath);
  const imgObjs = images.map((filepath) => {
    const { width: w, height: h } = sizeOf(filepath);
    const src = path.relative(path.join(root, 'images'), filepath);
    return { src, w, h };
  });

  /**
   * @param {string} name 
   * @param {ImageInfo[]} data 
   * @return {DatasetGroup}
   */
  function makeGroup(key, name, data) {
    return {
      key,
      name,
      data,
      sampleSize: capIfGiven(imageSampleSize, data.length),
      questions: { schema: {}, form: [] },
    };
  }
  const groups = individuals
    ? imgObjs.map((io, idx) => {
      const key = path.basename(io.src).split('.')[0]; // just the filename
      return makeGroup(key, `Image ${idx+1}`, [io]);
    })
    : [makeGroup('0', 'Click to Re-View Images', imgObjs)];

  const datasetFileContent = {
    bigName,
    smallName,
    groups,
    sampleSize: capIfGiven(groupSampleSize, groups.length),
    minSecGroup,
    minSecImage,
    extraQuestionsEachGroup: parseQuestionFile(extraQuestionsGroup),
    extraQuestionsEnd: parseQuestionFile(extraQuestionsEnd),
  };

  const writePath = path.join(root, 'definitions', `${dir}.json`);
  fs.writeFileSync(
    writePath,
    JSON.stringify(datasetFileContent, null, 4),
    'utf8'
  );

  /* eslint-disable no-console */
  console.log('Dataset has been created.');
  console.log(writePath);
}

main()
  .catch((err) => {
    console.log("ERROR:", err);
  });
