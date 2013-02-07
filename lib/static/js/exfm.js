var exfm = {};

exfm.getSong = function(id){
	var d = new jQuery.Deferred();
	$.get('/api/v1/song/' + id, function(data){
		d.resolve(data);
	});
	return d.promise();
}

exfm.search = function(query, start){
	if (start === undefined){
		start = 0;
	}
	var d = new jQuery.Deferred();

	// check query to see if it's a web address
	// if it is, get that exfm site instead

	$.get('/api/v1/search/' + query + '?start=' + start, function(data){
		d.resolve(data);
	});
	return d.promise();
}