// copyright 2010 Recoset Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var EventEmitter = require('events').EventEmitter;
var csv = require('ya-csv');

var firstOctet  = 256 * 256 * 256;
var secondOctet = 256 * 256;
var thirdOctet  = 256;
var fourthOctet = 1;

var DB = function (csvfile) {
    if (!csvfile) throw new(Error)('Please provide a ip database file');

    this.ready = false;
    this.queue = [];
    this.items = [];
    this.emitter = new(EventEmitter)();
    this.load(csvfile);
};

/* Load a csv file into memory for lookup
 * - lookups performed this action is completed will be queued.
 * - On load complete, the queue will be trained with lookups performed
 * - If an error occurs during the csv parsing, the queue will be drained
 *   and callbacks called with an error.
 * - If the database is already loaded, the new file will be parsed in
 *   it's entirety and replace the old database on completion. Lookups
 *   performed during the load will be performed on the old database. */
DB.prototype.load = function (csvfile) {
    var that = this;
    var items = [];

    var reader = csv.createCsvFileReader(csvfile, {
        'separator': ',',
        'quote': '"',
        'escapechar': '"',
        'comment': '#',
    });

    reader.on('data', function(line) {
        var current = {};
        current.start   = parseInt(line[0]);
        current.end     = parseInt(line[1]);
        current.code    = line[4];
        current.country = line[6];

        items.push(current);
    });

    reader.on('error', function (err) {
        var error = new(Error)('csv parsing error, did you specify the database correctly?');
        var req;
        while (req = that.queue.pop()) {
            req.callback(error);
        }

        that.emit('ready', error);
    });

    reader.on('end', function () {
        that.ready = true;
        that.items = items;

        that.emit('ready', null, that);

        var req;
        while (req = that.queue.pop()) {
            that.lookup(req.ip, req.callback);
        }
    });
};

DB.prototype.on = function (event, callback) {
    this.emitter.on(event, callback);
};

DB.prototype.removeListener = function (event, callback) {
    this.emitter.removeListener(event, callback);
};

DB.prototype.emit = function () {
    this.emitter.emit.apply(this.emitter, arguments);
};

DB.prototype.ipToInt = function(ip) {
    var octets = ip.split('.').map(function (octet) { return parseInt(octet) });

    octets[0] = octets[0] * firstOctet;
    octets[1] = octets[1] * secondOctet
    octets[2] = octets[2] * thirdOctet
    octets[3] = octets[3] * fourthOctet;

    return octets.reduce(function(sum, octet) { return octet + sum });
}

DB.prototype.intToIp = function(intIp) {
    var octets = [(intIp / firstOctet)  & 255,
                  (intIp / secondOctet) & 255,
                  (intIp / thirdOctet)  & 255,
                  (intIp / fourthOctet) & 255];

    return octets.join('.');
}

DB.prototype.bsearch = function (needle, heystack) {
    var start = 0,
        end = heystack.length - 1,
        middle, target;

    while (start < end) {
        middle = Math.floor((end - start) / 2) + start;
        target = heystack[middle];

        if (needle >= target.start && needle <= target.end) {
            return target;
        }

        if (needle < target.start)
            end = middle - 1;
        else
            start = middle + 1;
    }
};

DB.prototype._lookup = function (ip, callback) {
    var intIp = this.ipToInt(ip);

    var result = this.bsearch(intIp, this.items);
    if (result) {
        result.start_ip = this.intToIp(result.start);
        result.end_ip   = this.intToIp(result.end);
        callback && callback(null, result);
        return result;
    } else {
        callback && callback(new(Error)('ip not found'))
    }
};

DB.prototype.lookup = function (ip, callback) {
    if (!this.ready) {
        this.queue.push({ip: ip, callback: callback});
    } else {
        return this._lookup(ip, callback);
    }
}

var loadDB = function (dbfile, callback) {
    var db = new(DB)(dbfile);
    var loadOnce = function () {
        callback.apply(null, arguments);
        db.removeListener('ready', loadOnce);
    }
    db.on('ready', loadOnce);
};

exports.DB = DB;
exports.loadDB = loadDB;
