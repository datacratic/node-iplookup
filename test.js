var DB = require('./index').DB;

var db = new(DB)('countries.csv');
var assert = require('assert');

assert.ok(db.ipToInt('0.0.0.0') === 0);
assert.ok(db.ipToInt('255.255.255.255') === 4294967295);
assert.ok(db.ipToInt('1.2.3.4') === 16909060);
assert.ok(db.intToIp(16909060) === '1.2.3.4');

db.lookup('1.2.3.4', function (err, result) {
    assert.ok(!err);
    assert.ok(typeof result === 'object');
    assert.ok(result.country === 'Australia');
    assert.ok(result.start_ip === '1.2.3.0');
    assert.ok(result.end_ip === '1.2.3.255');
    console.log('rock and roll');
});

