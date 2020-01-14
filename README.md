# ZoomMaps

A web-based image viewing library that tracks pinch zoom gestures when used on mobile. We present this as a proxy to eye-tracking that can be deployed as a crowdsourced task, and leverages the mobile screen as a restricted viewing window.

A running web demo of this interface is available [here](http://zoommaps.csail.mit.edu:5136/?workerId=demo&dataset=natural_test).

If you use this code, please consider citing:

> Newman, A., McNamara, B., Fosco, C., Zhang, Y.B., Sukhum, P., Tancik, M., Kim, N.W., Bylinskii, Z. [TurkEyes: A Web-Based Toolbox for Crowdsourcing Attention Data.](http://turkeyes.mit.edu/) In ACM CHI, 2020.

## Starting the App
- development: `npm run dev`
- produciton `npm run build` then `npm start`

## Adding a Dataset
The script `datasets/make-dataset.js` creates a dataset (JSON) file from a folder of images. It also defines what a dataset file should contain.

To add a dataset, add your images to a folder in `datasets/images`. If your folder's name is `foo`, the script creates a file `datasets/definitions/foo.json`.

## Query Parameters
The app expects two query parameters:
- `workerId` -- the unique ID of the user (provided by Amazon Mechanical Turk)
- `dataset` -- the name of a file in `datasets/definitions` (without the `.json` extension)

## mLab
We have been hosting this project on Heroku and using the mLab add-on for storage.

`heroku config:get MONGODB_URI` gets url of form `mongodb://username:password@hostport/database`

do `mongoexport -h hostport -d database -c collection -u username -p password -o outfilename` to dump a collection to nsJSON.

To get to the mlab dashboard do `heroku addons:open mongolab`. From here you can do things like see how much of your storage you have used up and delete data.
