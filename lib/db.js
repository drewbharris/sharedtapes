"use strict";

var level = require('leveldb'),
    when = require('when'),
    events = require('events'),
    sequence = require('sequence'),
    util = require('util');

var Db = function(dbName){
    this.db = null;
    this.dbName = dbName;
    this.recentlyAddedLimit = 100;
};
util.inherits(Db, events.EventEmitter);

Db.prototype.connect = function(){
    var d = when.defer();

    level.open(this.dbName, {
        'create_if_missing': true
    }, function(err, db){
        this.db = db;
        return d.resolve();
    }.bind(this));

    return d.promise;
};

Db.prototype.insert = function(key, value){
    var d = when.defer();
    this.db.put(key, JSON.stringify(value), function(err){
        return d.resolve();
    });
    return d.promise;
};

Db.prototype.insertMixtape = function(id, value){
    var d = when.defer();
    this.db.put('mixtape:' + id, JSON.stringify(value), function(err){
        this.addToRecent({
            'id': id,
            'title': value.title,
            'created': value.created
        });
        return d.resolve();
    }.bind(this));
    return d.promise;
};

Db.prototype.addToRecent = function(value){
    // keep this.recentlyAddedLimit most recently made
    // no promise here because the client doesn't care when this finishes executing
    var data,
        replace = false;

    sequence(this).then(function(next){
        this.db.get('set:recently-added', function(err, value){
            data = (value === null) ? [] : JSON.parse(value);
            next(data);
        });
    }).then(function(next, recentlyAdded){

        // first, if this is just a renamed one, update the record in here
        for (var i = 0; i < recentlyAdded.length; i++){
            if (recentlyAdded[i].id === value.id){
                recentlyAdded.splice(i, 1);
                replace = true;
            }
        }

        // if we aren't replacing, we might have to trim
        if (!replace){
            // if there are this.recentlyAddedLimit, cut it down to this.recentlyAddedLimit - 1 and
            // put our new one at the beginning
            if (recentlyAdded.length > this.recentlyAddedLimit - 1){
                recentlyAdded = recentlyAdded.slice(0, this.recentlyAddedLimit - 2);
            }
        }

        recentlyAdded.unshift(value);

        this.db.put('set:recently-added', JSON.stringify(recentlyAdded), function(err){
            if (err){
                console.log(err);
            }
            next();
        });
    });
};

Db.prototype.get = function(key){
    var d = when.defer();
    this.db.get(key, function(err, value){
        d.resolve(JSON.parse(value));
    });
    return d.promise;
};

Db.prototype.del = function(key){
    this.db.del(key);
};

function create(dbName){
    return new Db(dbName);
}

module.exports = {
    'create': create
};
