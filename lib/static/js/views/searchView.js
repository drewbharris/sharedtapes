// The Search view for getting new songs
var SearchView = Backbone.View.extend({
	el: $("#search"),
	setupTemplate: _.template($("#search-setup-template").html()),
	resultTemplate: _.template($("#search-result-template").html()),
	initialize: function(){
		// bootstrap css
		// $("#content").append('<div id="search"></div>');
		// this.el = $("#search");

		var html = this.setupTemplate();
		this.$el.append(html);

        // filters
        this.filters = {
            'artist': false
        };

		$("#results").empty();
		// define the SongCollection for search results
		this.songs = new SongCollection();
		// this is going to hold the song id we are previewing
		this.nowPlaying = null;
		this.playing = false;
		$("#query").keyup(function(event){
			if (event.keyCode === 13){
				$("#execute-search").click();
			}
		});
		this.canvas = $("#search-loading-canvas")[0];
		this.context = this.canvas.getContext('2d');
		this.loadingImage = new Image();
		this.loadingImage.src = '/static/images/player/load_25.png';
		this.counter = 0;
		this.TO_RADIANS = Math.PI/180;
		this.rotateTimer;
		this.loadingImage.onload = function(){
		    this.context.clearRect(0,0,this.canvas.width, this.canvas.height);
		    this.drawRotatedImage(this.loadingImage,this.canvas.width/2,this.canvas.height/2,0); 
		}.bind(this);
		this.stopPreview();
	},
	render: function(){
		// add the songs to the results pane
		$("#results").empty();
		this.songs.map(function(song){
			this.appendToResults(song);
		}.bind(this));
		if (!this.songs.isEmpty()){
			$("#more")
				.text('more')
				.addClass('fake-link')
				.addClass('search-more');
		}
		this.stopPreview();
	},
	appendToResults: function(song){
		var srcImg = '';
		if (song.get('sources') !== null && song.get('sources').length > 0){
			srcImg = '<a href="' + song.get('sources')[0] + '" alt="source"><img width=20 src="/static/images/search/source_25.png" /></a> ';
		}
		var html = this.resultTemplate({
			'id': song.get('id'),
			'title': song.get('title'),
			'artist': song.get('artist'),
			'srcImg': srcImg
		});
		$("#results").append(html);
	},
	events: {
		"click #execute-search":  "search",
		"click #more": "searchMore",
		"click .add-song": "addSong",
		"click .preview-song-play": "playPreview",
        "click #artist-filter": "toggleArtistFilter"
		// "click .preview-song-pause": "pausePreview"
	},
    toggleArtistFilter: function(){
        if ($('#artist-filter').is(':checked')){
            this.filters.artist = true;
        }
        else {
            this.filters.artist = false;
        }
        this.render();
    },
	search: function(){
		this.resultsStart = 0;
		this.startLoading();
		$.when(exfm.search($("#query").val())).then(function(data){
			this.stopLoading();
			this.songs.reset(data.results);
			this.render();
		}.bind(this));
	},
	searchMore: function(){
		this.resultsStart += 20;
		this.startLoading();
		$.when(exfm.search($("#query").val(), this.resultsStart)).then(function(data){
			this.stopLoading();
			var coll = new SongCollection(data.results);
			coll.map(function(song){
				this.appendToResults(song);
			}.bind(this));
			this.songs.add(data.results);
			// this.render();
		}.bind(this));
	},
	searchFor: function(artist){
		$("#query").val(artist);
		$("#execute-search").trigger('click');
	},
	addRecommendations: function(recommendations){
		var recs = recommendations.slice(0, 8),
			recsString = '';
		recs.map(function(rec){
			recsString += '<span class="fake-link search-artist">' + rec + '</span>, ';
		});
		$("#recommendations").html(
				'recommendations: ' + recsString
			);
		$("#recommendations").show();
		$(".search-artist").click(function(event){
			this.searchFor($(event.target).text());
		}.bind(this));
	},
	emptyRecommendations: function(){
		$("#recommendations").hide();
		$("#recommendations").empty();
	},
	addSong: function(event){
		this.trigger('addSong', {
			'id': $(event.target).attr('id').split('-')[1]
		});
	},
	getActionButtonType: function(element){
		if (element.attr('src') === '/static/images/search/pause_25.png'){
			return 'pause';
		}
		else if (element.attr('src') === '/static/images/search/play_25.png'){
			return 'play';
		}
		else if (element.attr('src') === '/static/images/search/no_25.png'){
			return 'unable';
		}
	},
	playPreview: function(event){
		var id = $(event.target).attr('id').split('-')[2],
			type = this.getActionButtonType($(event.target));

		if (type === 'play'){
			this.trigger('playPreview', {
				'id': id
			});
			this.nowPlaying = id;
		}
		else if (type === 'pause'){
			this.trigger('pausePreview', {
				'id': id
			});
		}
	},
	stopPreview: function(){
		if (this.previewPlaying && this.nowPlaying !== null){
			this.previewPlaying = false;
			this.trigger('stopPreview', {
				'id': this.nowPlaying
			});
		}
	},
	startLoading: function(){
		$("#search-loading").show();
	    this.resetLoading();
	    this.rotateTimer = setInterval(function(){
	    	this.animate();
	    }.bind(this), 1000/60); 
	},
	stopLoading: function(){
		$("#search-loading").hide();
		this.resetLoading();
	},
	resetLoading: function(){
		clearInterval(this.rotateTimer);
		delete this.rotateTimer;
	},
	animate: function(){
		this.context.clearRect(0,0,this.canvas.width, this.canvas.height); 
	    this.drawRotatedImage(this.loadingImage, 
	        this.canvas.width/2, 
	        this.canvas.height/2,
	        this.counter); 
	    this.counter+=5;
	},
	drawRotatedImage: function(image, x, y, angle) { 
	    this.context.save(); 
	    this.context.translate(x, y);
	    this.context.rotate(angle * this.TO_RADIANS);
	    this.context.drawImage(image, -(image.width/2), -(image.height/2));
	    this.context.restore(); 
	},
	close: function(){
		if ($("#content " + "#" + this.el.id).length){
			this.content = this.$el.detach();
		}
	},
	open: function(){
		if (!$("#content " + "#" + this.el.id).length){
			this.content.appendTo("#content");
		}
		this.trigger('open');
	},
	empty: function(){
		this.$el.empty();
	}
});