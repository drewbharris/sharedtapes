var util = {};

util.toBase36 = function(id){
	return id.toString(36);
}

util.zfill = function(num, len){
	return (Array(len).join("0") + num).slice(-len);
}

util.toMinSec = function(ms){
	if (isNaN(ms)){
		return '0:00';
	};
	seconds = Math.round(ms/1000);
	var mins = Math.floor(seconds/60),
		secs = seconds%60;
	return mins + ':' + util.zfill(secs, 2);
}

