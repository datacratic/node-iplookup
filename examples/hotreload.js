#!/usr/bin/env node
/* Hot reloading example
   - requires 2 files, countries.csv and countries.old.csv
   - ip was selected on purpose, may not always work
*/

var assert = require('assert');

var DB = require('./../index').DB;
var db = new(DB)('countries.csv.old');


var interval = setInterval(function () {
    console.log('lookup:' + JSON.stringify(db.lookup('112.207.252.57')));
}, 500);

setTimeout(function () {
    db.load('countries.csv');
}, 2000);

var readied = 0;
db.on('ready', function () {
    console.log('ready');
    if (++readied == 2) {
        console.log('lookup:' + JSON.stringify(db.lookup('112.207.252.57')));
        clearInterval(interval);
    }
});
