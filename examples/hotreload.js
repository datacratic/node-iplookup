#!/usr/bin/env node
/* Hot reloading example
   - requires 2 files, countries.csv and countries.old.csv
   - ip was selected on purpose, may not always work
*/

var assert = require('assert');

var DB = require('./../index').DB;
var db = new(DB)('countries.csv.old');

db.lookup('64.254.247.159', function (err, original) {
    db.load('countries.csv');
    db.on('ready', function (err) {
        db.lookup('64.254.247.159', function (err, updated) {
            assert.notEqual(original, updated);
        });
    });
});
