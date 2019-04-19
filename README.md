# ZoomMaps

## usage
- development: `npm run dev`
- produciton `npm run build` then `npm start`

## mLab
We have been hosting this project on Heroku and using the mLab add-on for storage.

`heroku config:get MONGODB_URI` gets url of form `mongodb://username:password@hostport/database`

do `mongoexport -h hostport -d database -c collection -u username -p password -o outfilename` to dump a collection to nsJSON.


To get to the mlab dashboard do `heroku addons:open mongolab`. From here you can do things like see how much of your storage you have used up and delete data.
