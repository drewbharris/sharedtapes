var shortid = require('shortid');

// @todo: replace this with an incrementing counter that persists to disk or DB
function makeId(){
    return shortid.generate();
}

function isSoundcloudUrl(url){
	var domain = url.replace('http://','').replace('https://','').split(/[/?#]/)[0];
	if (domain === 'api.soundcloud.com'){
		return true;
	}
	return false;
}

module.exports = {
	'makeId': makeId,
	'isSoundcloudUrl': isSoundcloudUrl
}