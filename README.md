# ZoomMaps

A web-based image viewing library that tracks pinch zoom gestures when used on mobile. We present this as a proxy to eye-tracking that can be deployed as a crowdsourced task, and leverages the mobile screen as a restricted viewing window.

A running web demo of this interface is available [here](http://zoommaps.csail.mit.edu:5136/?workerId=demo&dataset=natural_test).

If you use this code, please consider citing:

> Newman, A., McNamara, B., Fosco, C., Zhang, Y.B., Sukhum, P., Tancik, M., Kim, N.W., Bylinskii, Z. [TurkEyes: A Web-Based Toolbox for Crowdsourcing Attention Data.](http://turkeyes.mit.edu/) In ACM CHI, 2020.

## Getting Started
Here is how to get the example app running locally on your machine. 

1. This app relies on npm for package management and MongoDB for data storage. Install [`npm`](https://www.npmjs.com/get-npm) and [`MongoDB`](https://docs.mongodb.com/manual/installation/) if you do not have them yet. Make sure MongoDB is running. By default, the interface will use the database at `mongodb://localhost/zoommaps`, but you can override this url by setting the environment variable `$MONGODB_URI`.
3. Clone this repo and run `npm install` to install the dependencies. 
4. Run `npm run dev` to start the app in dev mode. This will start a local server at port 3000.
5. To test out the interface with a sample task composed of natural images, navigate to [localhost:3000/?workerId=demo&dataset=natural_test](http://localhost:3000/?workerId=demo&dataset=natural_test).

## Running and Viewing the App 

There are two ways to run ZoomMaps: 
* **dev mode** (will automatically rebuild when you make changes): `npm run dev`
* **production mode**: `npm run build` then `npm start`

The app expects two query parameters to be passed in the url:
* `workerId`: the unique ID of the user (for instance, the workerId provided by Mechanical Turk)
* `dataset`: the name of the dataset to view. Should correspond to the name of a file in `datasets/definitions`, without the `.json` extension. 

For example, the url [localhost:3000/?workerId=demo&dataset=natural_test](http://localhost:3000/?workerId=demo&dataset=natural_test) points to a ZoomMaps gallery displaying the dataset "natural_test" for a participant with id "demo". 

## Collecting Data With ZoomMaps

Collecting your own data will require 1) creating a "dataset" of your own images and 2) deploying the app to participants. 

### Adding a Dataset
A "dataset" is a collection of images and experiment parameters that define the behavior of a ZoomMaps task. A dataset is specified by a "definition" file (see [`datasets/definitions`](https://github.com/turkeyes/zoommaps/tree/master/datasets/definitions)), and its images are contained in a directory inside the folder [`datasets/images`](https://github.com/turkeyes/zoommaps/tree/master/datasets/images). For example, for the `natural_test` dataset of natural images, the definition file is located at [`datasets/definitions/natural_test.json`](https://github.com/turkeyes/zoommaps/blob/master/datasets/definitions/natural_test.json) and the images are located at [`datasets/images/natural`](https://github.com/turkeyes/zoommaps/tree/master/datasets/images/natural).

We provide a script [`datasets/make-dataset.js`](https://github.com/turkeyes/zoommaps/blob/master/datasets/make-dataset.js) that automatically generates a dataset definition file given a folder of images and a set of parameters. Run `node make-dataset.js -h` for usage information. 

### Deploying the task 

#### Hosting
Set the environment variable `$MONGODB_URI` to specify the uri of the MongoDB database where ZoomMaps should save the data (defaults to `mongodb://localhost/zoommaps`). If you have a publicly accesible server that can run MongoDB, you can simply run the application in production mode and store the data on that server. 

Alternatively, [`Heroku`](https://www.heroku.com/) with the [`mLab`](https://elements.heroku.com/addons/mongolab) MongoDB add-on provides a convenient option in the cloud. Simply set the value of `$MONGODB_URI` in your Heroku app to point to your mLab instance (should be of the form `mongodb://username:password@hostport/database`). 

#### Mechanical Turk
ZoomMaps can be deployed as an MTurk task using the `ExternalQuestion` task type. Crowdworkers view the ZoomMaps landing page within an MTurk iframe. The landing page contains a QR code and link that crowdworkers can open in a separate window on their mobile phone to open the ZoomMaps gallery. When they complete the task on mobile, crowdworkers receive a completion code that they enter on the landing page and submit back to MTurk as proof of completion. The requester can use the completion code to link the HIT back to data stored in the MongoDB database, if desired. See [this iPython notebook](https://github.com/a-newman/mturk-template/blob/master/mturk/mturk.ipynb) for an example of how to deploy an MTurk task.

#### Downloading data
You can dump data from a MongoDB database to JSON by running `mongoexport -h hostport -d database -c collection -u username -p password -o outfilename`. 
