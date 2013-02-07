"use strict";

var request = require('superagent'),
    when = require('when'),
    util = require('./util');

// MAKE SURE THESE ARE PRIVATE ALWAYS
var exfmAPIKey = 'yourAPIkey',
	soundcloudAPIKey = 'yourAPIkey',
	exfmRoot = 'http://ex.fm/api/v3';
// MAKE SURE THESE ARE PRIVATE ALWAYS

module.exports.getSong = function(id){
    var d = when.defer();
    request
        .get(exfmRoot + '/song/' + id)
        .end(function(res){
            d.resolve(res.body.song);
        });
    return d.promise;
}

// grab results from exfm's api.
// unfortunately, the exfm database has loads of bad links.
// on ex.fm, they are shown and just not played - i would rather check them
// before presenting to the user.  i'm allowing a timeout of 2s, which is kind of long.
// but i think it's okay.
module.exports.search = function(query, start, results){
	var d = when.defer(),
		results = [];
	if (start === undefined){
		start = 0;
	}
	request
		.get(exfmRoot + '/song/search/' + query + '?client_id=' + exfmAPIKey)
		.query({
			'start': start
		})
		.end(function(res){
			// d.resolve(res.body.songs);
			when.all(res.body.songs.map(function(song){
				var p = when.defer(),
					url = song.url;
				// Soundcloud doesn't support HEAD requests, so send a short GET request
				if (util.isSoundcloudUrl(url)){
					song.url = url.split('?')[0] + '?client_id=' + soundcloudAPIKey;
					request
						.get(song.url)
						.set('Range', 'bytes=0-100')
						.timeout(2000)
						.end(function(err, res){
							if (err !== null){
								// console.log('timeout error');
								p.resolve();
							}
							else if (res.statusCode === 200){
								// console.log('found ' + song.id + '...');
								results.push(song);
								p.resolve();
							}
							else{
								// console.log(res.statusCode + ' error for id ' + song.id);
								p.resolve();
							}
						});
				}
				else {
					request
					.head(song.url)
					.timeout(2000)
					.end(function(err, res){
						if (err !== null){
							// console.log('timeout error');
							p.resolve();
						}
						else if (res.statusCode === 200){
							// console.log('found ' + song.id + '...');
							results.push(song);
							p.resolve();
						}
						else{
							// console.log(res.statusCode + ' error for id ' + song.id);
							p.resolve();
						}
					});
				}
				return p.promise;
			})).then(function(){
				console.log('returning ' + results.length + ' results');
				d.resolve(results);
			});
		});
	return d.promise;
}
            
