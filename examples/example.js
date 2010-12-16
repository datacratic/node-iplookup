var DB = require('./../index').DB;

var db = new(DB)('countries.csv');

db.lookup('1.2.3.4', function (err, result) {
    if (err) throw err;
    console.log(result);
});
