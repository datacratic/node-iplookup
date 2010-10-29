#!/usr/bin/env node

var csv = require('ya-csv');

var firstOctet  = 256 * 256 * 256;
var secondOctet = 256 * 256;
var thirdOctet  = 256;
var fourthOctet = 1;

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

var sys = require('sys');
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
