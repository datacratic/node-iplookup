#!/usr/bin/env node

var csv = require('ya-csv');

var firstOctet  = (8 * 3);
var secondOctet = (8 * 2);
var thirdOctet  = (8 * 1);
var fourthOctet = (8 * 0);

var ipToInt = function(ip) {
    var octets = ip.split('.').map(function (octet) { return parseInt(octet) });

    octets[0] = octets[0] << firstOctet;
    octets[1] = octets[1] << secondOctet;
    octets[2] = octets[2] << thirdOctet;
    octets[3] = octets[3] << fourthOctet;

    return octets.reduce(function(sum, octet) { return octet + sum });
}

var intToIp = function(intIp) {
    var octets = [(intIp >> firstOctet)  & 255,
                  (intIp >> secondOctet) & 255,
                  (intIp >> thirdOctet)  & 255,
                  (intIp >> fourthOctet) & 255];


    return octets.join('.');
}

var inRange = function (needle, heystack) {
    return (needle >= heystack.start && needle <= heystack.end);
}

var DB = function (csvfile) {
    this.ready = false;
    this.queue = [];
    this.items = [];

    var that = this;
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

        that.items.push(current);
    });

    reader.on('error', function (err) {
        console.log('csv parsing error: ' + err);
    });

    reader.on('end', function () {
        that.ready = true;
        that.queue.forEach(function (req) {
            that.lookup(req.ip, req.callback);
        });
    });
}

DB.prototype.bsearch = function(needle, start, end, probes) {
    if (probes < 0) { console.log('ran out of probes'); return }

    start = start || 0;
    end = end || this.items.length;
    var range = end - start;

    var offset = Math.floor(range / 2) + start;
    var target = this.items[offset];

    if (inRange(needle, target)) {
        return target;
    } else {
        if (needle < target.start) {
            return this.bsearch(needle, start, offset, --probes);
        } else {
            return this.bsearch(needle, offset, end, --probes);
        }
    }
};

DB.prototype._lookup = function (ip, callback) {
    var intIp = ipToInt(ip);

    var worstCase = Math.log(this.items.length) / Math.log(2);
    var result = this.bsearch(intIp, 0, this.items.length, worstCase);
    if (result) {
        result.start_ip = intToIp(result.start);
        result.end_ip   = intToIp(result.end);
        callback(null, result);
    } else {
        callback(new(Error)('ip not found'));
    }
};

DB.prototype.lookup = function (ip, callback) {
    if (!this.ready) {
        this.queue.push({ip: ip, callback: callback});
    } else {
        this._lookup(ip, callback);
    }
}

exports.DB = DB;
