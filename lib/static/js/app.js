(function ($) {

	var app = {};

	// This isn't really a model persay.  This is the wrapper
	// around SoundManager2, the HTML5+flash audio player
	var AudioPlayer = Backbone.Model.extend({
		initialize: function(){
			this.ready = false;
			soundManager.setup({
				'preferFlash': false,
				'url': '/static/js/soundmanager2/swf',
				onready: function(){
					this.ready = true;
				}.bind(this)
			});
		},
		play: function(){
			if (!this.ready || this.a === undefined){
				return;
			}
			this.a.play();
			this.render();
			this.timeUpdate = setInterval(function(){
				this.render();
			}.bind(this), 500);
		},
		load: function(url){
			if (!this.ready){
				return;
			}
			this.a = soundManager.createSound({
				'id': 'mixtapesAudioPlayer',
				'url': url
			});
		},
		stop: function(){
			if (!this.ready || this.a === undefined){
				return;
			}
			clearInterval(this.timeUpdate);
			this.a.pause();
		},
		remove: function(){
			if (!this.ready || this.a === undefined){
				return;
			}
			this.a.destruct();
			this.clearCurrentTime();
		},
		render: function(){
			if (!this.ready){
				return;
			}
			this.trigger('updateCurrentTime', util.toMinSec(this.a.position) + 
				' / ' + util.toMinSec(this.a.durationEstimate));
		},
		clearCurrentTime: function(){
			this.trigger('updateCurrentTime', '0:00 / 0:00');
		},
		onFinish: function(cb){
			this.a.options.onfinish = cb;
		}
	});

	// This is the song model for holding all the handy info.
	var Song = Backbone.Model.extend({
		title: null,
		artist: null,
		id: null,
		url: null
	});

	var SongCollection = Backbone.Collection.extend({
		model: Song
	});

	// This is a Mixtape, the playlist/mixtape collection of songs
	var Mixtape = Backbone.Model.extend({
		defaults: {
			title: 'untitled',
			author: 'anonymous',
			created: new Date()
		},
		parse: function(response){
			// this is called when stuff is coming from the server
			// since we have a collection inside of a model and the
			// server has no knowledge of this, we have to do it manually
			response.songs = new SongCollection(response.songs);
			return response;
		},
		urlRoot: '/api/v1/tapes',
	});

	// This is the 'player', or the controls
	var PlayerView = Backbone.View.extend({
		el: $("#controls"),
		template: _.template($("#player-template").html()),
		initialize: function(){
			var html = this.template();
			this.$el.append(html);
	        this.canvas = $("#loading-canvas")[0];
			this.context = this.canvas.getContext('2d');
			this.loadingImage = new Image();
			this.loadingImage.src = '/static/images/player/load_50_w.png';
			this.counter = 0;
			this.TO_RADIANS = Math.PI/180;
			this.rotateTimer;
			this.loadingImage.onload = function(){
			    this.context.clearRect(0,0,this.canvas.width, this.canvas.height);
			    this.drawRotatedImage(this.loadingImage,this.canvas.width/2,this.canvas.height/2,0); 
			}.bind(this);
		},
		events: {
			'click #play-image': 'emitPlay',
			'click #pause-image': 'emitPause',
			'click #next-image': 'emitNext',
			'click #back-image': 'emitBack'
		},
		emitPlay: function(){
			this.trigger('playClick');
		},
		emitPause: function(){
			this.trigger('pauseClick');
		},
		emitNext: function(){
			this.trigger('nextClick');
		},
		emitBack: function(){
			this.trigger('backClick');
		},
		render: function(){

		},
		startLoading: function(){
			$("#loading").show();
		    this.resetLoading();
		    this.rotateTimer = setInterval(function(){
		    	this.animate();
		    }.bind(this), 1000/60); 
		},
		stopLoading: function(){
			$("#loading").hide();
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
		showPause: function(){
			$("#play-image").hide();
    		$("#pause-image").show();
		},
		showPlay: function(){
			$("#pause-image").hide();
    		$("#play-image").show();
		},
		updateCurrentTime: function(time){
			$('#current-time').text(time);
		},
		setHasPrevious: function(hasPrevious){
			if (hasPrevious){
				$("#back-image").removeClass('inactive');
				$("#back-image").addClass('active');
			}
			else {
				$("#back-image").removeClass('active');
				$("#back-image").addClass('inactive');
			}
		},
		setHasNext: function(hasNext){
			if (hasNext){
				$("#next-image").removeClass('inactive');
				$("#next-image").addClass('active');
			}
			else {
				$("#next-image").removeClass('active');
				$("#next-image").addClass('inactive');
			}
		},
		setCanPlay: function(canPlay){
			if (canPlay){
				$("#play-image").removeClass('inactive');
				$("#play-image").addClass('active');
			}
			else {
				$("#play-image").removeClass('active');
				$("#play-image").addClass('inactive');
			}
		}
	});

	// The Mixtape view, for holding and playing the current mixtape
	// and adding stuff to it
	var MixtapeView = Backbone.View.extend({
		el: $("#mixtape"),
		songTemplate: _.template($("#mixtape-song-template").html()),
		initialize: function () {
			// Check if we're routed to a pre-existing mixtape
			if (this.options !== undefined && this.options.id !== undefined){
				this.bootstrapExistingMixtape(this.options.id);
			}
			// Otherwise, we're going to start a new mixtape.
			else {
				this.bootstrapNewMixtape();
			}
		},
		// These bootstrap functions are messy and should be rewritten.
		bootstrapNewMixtape: function(){
			this.mixtape = new Mixtape({
				'songs': new SongCollection(null)
			});

			this.mixtape.get('songs').on('change', function(model){
				this.render();
			}.bind(this));

			$("#title-text").text('untitled mixtape');

			this.setSortable();

			// Set up the rendering triggers
			this.mixtape.on('change', function(changes){
				this.render(changes);
			}.bind(this));

			this.currentSong = 0;
			this.currentSongId = null;
		},
		bootstrapExistingMixtape: function(id){
			this.mixtape = new Mixtape({
				'id': id
			});

			// Set up the rendering triggers
			this.mixtape.on('change', function(changes){
				this.render(changes);
			}.bind(this));

			// Grab the stuff from the server
			this.mixtape.fetch().then(function(){
				console.log('fetch succeeded');
				// make sure these events are set up
				this.mixtape.get('songs').on('change', function(model){
					this.render();
				}.bind(this));
				
				// Set up to retrieve realtime updates (via websocket)
				this.trigger('subscribe', {
					'id': this.mixtape.id
				});

				$("#title-text").text(this.mixtape.get('title'));
				$("#author-text").text(this.mixtape.get('author'));
				this.setSortable();

				this.currentSong = 0;
				if (this.mixtape.get('songs').length){
					this.currentSongId = this.mixtape.get('songs').at(this.currentSong).get('id');	
				}
				
				this.render();

			}.bind(this), function(){
				console.log('fetch failed :(');
				// window.location = '/';
			});
		},
		render: function(data){
			console.log('render');

			if ($("#songs-list").length === 0 &&
				this.mixtape.get('songs').length > 0){
				this.$el.append(
	            	'<div id="songs-list">' +
	            	'</div>'
	            );
			}

			$("#title-text").text(this.mixtape.get('title'));

			// Add in the public share link
			if(this.mixtape.id !== undefined){
				$("#public-link").html('edit link: <a href="/' + 
					this.mixtape.id + '">mixtapes.drewbharris.com/' + this.mixtape.id + '</a>');
			}
			else{
				$("#public-link").empty();
				$("#listeners").empty();
			}

			// Clear and redraw the songs list.
			$("#songs-list").empty();
			for (var i = 0; i < this.mixtape.get('songs').length; i++){
				this.addSongToList(i, this.mixtape.get('songs').at(i));
			}

			// Clear the 'recommendations' part of the Search,
			// and re-generate them
			this.trigger('emptyRecommendations');
			if (this.mixtape.get('songs').length){
				this.generateRecommendations();	
			}

			// This is messy and confusing,
			// but it necessary to keep track of which song we're currently playing,
			// which changes when remote changes come in, or if songs are dragged around.
			// There is a bug here.  @todo clean this up
			if (this.currentSongId !== undefined){
				var index = this.mixtape.get('songs').indexOf(this.mixtape.get('songs').get(this.currentSongId));
				if (index === -1){
					var song = this.mixtape.get('songs').at(this.currentSong);
					if (song !== undefined){
						this.currentSongId = song.get('id');	
					}
				}
				else {
					this.currentSong = index;	
				}
			}

			$("#song-" + this.currentSongId).addClass('playing');

			// Set up the events for removing songs
			$(".remove-song").click(function(event){
				this.removeSong($(event.target).parent().parent().attr('id').split('-')[1]);
			}.bind(this));

			// this is the event for making buttons active/inactive
			this.emitAvailable();
		},
		events: {
			"click .play-song": 'playSong'
		},
		setCurrentSong: function(index){
			this.currentSong = index;
			this.setCurrentSongId(index);
		},
		setCurrentSongId: function(index){
			this.currentSongId = this.mixtape.get('songs').at(index).get('id');
		},
		addSong: function(song){
			var songModel = new Song(song);
			this.mixtape.get('songs').add(songModel);
			this.create();
		},
		removeSong: function(id){
			// if we're removing the currently playing song, set the player
			// back to song 0 and stop playing.
			if (this.currentSongId === id){
				this.currentSong = 0;
				if (this.playing){
					this.playing = false;
					this.trigger('stopAudio');
					this.trigger('removeAudio');	
				}
			}
			// if we're removing a song before the currently playing song,
			// make sure we fix the indices
			else if (this.mixtape.get('songs')
				.indexOf(this.mixtape.get('songs').get(id)) < this.currentSong){
				this.currentSong--;
			}

			if (this.mixtape.get('songs').length){
				this.currentSongId = this.mixtape.get('songs').at(this.currentSong).get('id');
			}
			else {
				this.currentSongId = null;
			}

			this.mixtape.get('songs').remove(this.mixtape.get('songs').get(id));
			this.create();
		},
		load: function(){
			var songToPlay = this.mixtape.get('songs').get(this.currentSongId);
			$("#song-" + songToPlay.get('id')).addClass('playing');
			this.trigger('loadAudio', {
				'url': songToPlay.get('url')
			});
		},
		play: function(){
			if (!this.paused){
				this.load();
			}
			this.trigger('playAudio');
			this.playing = true;
			this.paused = false;
			this.emitAvailable();
			$("#play-" + this.currentSongId).attr('src', '/static/images/search/pause_25.png');
			$("#song-" + this.currentSongId).addClass('playing');
		},
		playSong: function(event){
			var id = $(event.target).attr('id').split('-')[1];
			// this is to pause the song
			if (this.currentSongId === id && this.playing){
				if (this.paused){
					$(".playing").removeClass("playing");
					this.play();
					$(event.target).attr('src', '/static/images/search/pause_25.png');
				}
				else {
					this.pause();
					$(event.target).attr('src', '/static/images/search/play_25.png');
				}
			}
			else{
				if (this.playing){
					this.stop();
					$("#play-" + this.currentSongId).attr('src', '/static/images/search/play_25.png');
				}
				var songToPlay = this.mixtape.get('songs').get(id);
				this.setCurrentSong(this.mixtape.get('songs').indexOf(songToPlay));
				$(".playing").removeClass("playing");
				this.load();
				this.play();
				$(event.target).attr('src', '/static/images/search/pause_25.png');
				
			}
			
		},
		stop: function(){
			$(".playing").removeClass("playing");
			this.playing = false;
			this.paused = false;
			this.trigger('stopAudio');
			this.trigger('removeAudio');
			$("#play-" + this.currentSongId).attr('src', '/static/images/search/play_25.png');
		},
		pause: function(){
			this.paused = true;
			this.trigger('stopAudio');
			$("#play-" + this.currentSongId).attr('src', '/static/images/search/play_25.png');
		},
		hasPrevious: function(){
			if (this.currentSong > 0){
				return true;
			}
			return false;
		},
		hasNext: function(){
			if (this.currentSong < (this.mixtape.get('songs').length - 1 )){
				return true;
			}
			return false;
		},
		canPlay: function(){
			// this isn't HTML5 canplay, this just checks if there is a song to play
			if (this.mixtape.get('songs').length){
				return true;
			}
			return false;
		},
		next: function(){
			console.log('next');
			if (this.hasNext()){
				$(".playing").removeClass("playing");
				if (this.playing){
					this.trigger('stopAudio');
					this.trigger('removeAudio');
				}
				$("#play-" + this.currentSongId).attr('src', '/static/images/search/play_25.png');
				this.currentSong++;
				this.currentSongId = this.mixtape.get('songs').at(this.currentSong).get('id');
				this.load();
				if (this.playing && !this.paused){
					$("#play-" + this.currentSongId).attr('src', '/static/images/search/pause_25.png');
					this.play();
				};
				this.emitAvailable();
			}
		},
		previous: function(){
			if (this.currentSong > 0){
				$(".playing").removeClass("playing");
				if (this.playing){
					this.trigger('stopAudio');
					this.trigger('removeAudio');
				}
				$("#play-" + this.currentSongId).attr('src', '/static/images/search/play_25.png');
				this.currentSong--;
				this.currentSongId = this.mixtape.get('songs').at(this.currentSong).get('id');
				this.load();
				if (this.playing && !this.paused){
					$("#play-" + this.currentSongId).attr('src', '/static/images/search/pause_25.png');
					this.play();
				};
				this.emitAvailable();
			}
		},
		create: function(){
			// @todo rename this to 'saveToServer' or something
			console.log('saving to server');
			var newMixtape = false;

			// this.currentSongId = this.mixtape.get('songs').at(this.currentSong).get('id');

			// this will run the first time something is saved
			if (this.mixtape.id === undefined){
				newMixtape = true;
			}
			this.trigger('loading');
			this.mixtape.save().then(function(data, textStatus, jqXHR){
				this.trigger('loadingComplete');
				this.mixtape.set('id', data.id);
				// publish
				if (newMixtape){

					if (this.currentSong === -1 && this.mixtape.get('songs').length){
						this.setCurrentSong(0);
					}
					// Set up to retrieve realtime updates
					this.trigger('subscribe', {
						'id': this.mixtape.id
					});
					this.trigger('save', {
						'id': this.mixtape.id
					});
					this.trigger('save_new', {
						'id': this.mixtape.id
					});
					this.mixtape.get('songs').on('change', function(model){
						this.render();
					}.bind(this));
					this.mixtape.on('change', function(model){
						this.render();
					}.bind(this));
					this.setSortable();
					$("#status-text").text('you can edit');
				}
				console.log('saved');
				this.trigger('publish', data);
				this.render();
			}.bind(this), function(jqXHR, textStatus, errorThrown) {
				console.log('error: ' + textStatus);
			});
		},
		addSongToList: function (number, model) {
			var imgSrc = 'play_25.png';
			if (model.get('id') === this.currentSongId && this.playing && !this.paused){
				imgSrc = 'pause_25.png';
			}
			var html = this.songTemplate({
				'imgSrc': imgSrc,
				'id': model.get('id'),
				'artist': model.get('artist'),
				'title': model.get('title'),
				'number': number + 1
			});
			$("#songs-list").append(html);
		},
		setTitle: function(newTitle) {
			this.mixtape.set('title', newTitle);
			this.create();
		},
		setSortable: function(){
			$("#songs-list").sortable({
				update: function(){
					var children = $("#songs-list").children(),
						updateSongs = [],
						id,
						song,
						newCollection;
					children.each(function(index){
						id = children[index].id.split('-')[1];
						song = new Song(this.mixtape.get('songs').get(id).attributes);
						updateSongs.push(song);
					}.bind(this));
					newCollection = new SongCollection(updateSongs);
					this.mixtape.set('songs', newCollection);
					this.create();
				}.bind(this)
			});
			$("#songs-list").disableSelection();
		},
		emitAvailable: function(){
			this.trigger('emitAvailable', {
				'hasPrev': this.hasPrevious(),
				'hasNext': this.hasNext(),
				'canPlay': this.canPlay()
			});
		},
		search: function(event){
			this.trigger('searchRecommendation', $(event.target).text());
		},
		generateRecommendations: function(){
			var similarArtists = [],
				uniqueSongs = {},
				frequency = {},
				value,
				uniques = [];

			this.mixtape.get('songs').map(function(song){
				if (!uniqueSongs.hasOwnProperty(song.get('artist'))){
					uniqueSongs[song.get('artist')] = song.get('similar_artists');	
					similarArtists = similarArtists.concat(song.get('similar_artists'));
				}
			});

		    similarArtists.sort(function(){ 
		    	return 0.5 - Math.random();
		    });

		    this.trigger('recommendations', similarArtists);

		}
	});

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
			"click .preview-song-play": "playPreview"
			// "click .preview-song-pause": "pausePreview"
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

	// @todo move the HTML into templates
	var HelpView = Backbone.View.extend({
		el: $("#help"),
		template: _.template($("#help-template").html()),
		initialize: function(){
			this.render();
		},
		render: function(){
			var html = this.template();
			this.$el.html(html);
			return this;
		},
		close: function(){
			this.$el.hide();
			if ($("#content " + "#" + this.el.id).length){
				this.content = this.$el.detach();
			}
		},
		open: function(){
			if (!$("#content " + "#" + this.el.id).length){
				this.content.appendTo("#content");
			}
			this.$el.show();
		},
		empty: function(){
			this.$el.empty();
		}

	});

	var BrowseView = Backbone.View.extend({
		el: $("#browse"),
		events: {
			'click .recently-added-item': 'goToMixtape'
		},
		initialize: function(){
			this.render();
		},
		render: function(){
			this.$el.empty();
			this.$el.append('<div class="text-heading">recently added: </div><div id="recently-added-list" class="text-body"></div>');
			this.fetch();
		},
		fetch: function(){
			$.get('/api/v1/recently-added', function(data){
				this.update(data);
			}.bind(this));
		},
		update: function(data){
			$("#recently-added-list").empty();
			var htmlString = '';
			data.map(function(item){
				htmlString += '<span class="fake-link recently-added-item" id="mixtape-' + item.id + '">' +
					item.title + '</span> (' + item.id + ')<br/>';
			});
			$("#recently-added-list").append(htmlString);
		},
		goToMixtape: function(event){
			window.location = $(event.target).attr('id').split('-')[1];
		},
		close: function(){
			this.$el.hide();
			if ($("#content " + "#" + this.el.id).length){
				this.content = this.$el.detach();
			}
		},
		open: function(){
			if (!$("#content " + "#" + this.el.id).length){
				this.content.appendTo("#content");
			}
			this.$el.show();
		},
		empty: function(){
			this.$el.empty();
		}
	});

	// SETUP STUFF
	//
	//
	//


	// Setup the HTML5+flash audio solution
	window.audioPlayer = new AudioPlayer();

	// Setup the music player view
	window.player = new PlayerView();

	// This is where the bootstrapping/publish/subscribe/event assignment happens.
	// I know it's gnarly, I'm in the process of breaking out the monolithic
	// 'bootstrapMixtape' function but it's difficult to full seperate everything.
	// Some things have to happen on root access, other things have to happen only
	// on hitting a specific mixtape.  Working on it.

	app.bootstrap = function(){
		app.bootstrapPlayer();
		app.bootstrapMixtape();
		app.boostrapRealtime();
	}

	app.bootstrapPlayer = function(){
		window.audioPlayer.on('updateCurrentTime', function(time){
			window.player.updateCurrentTime(time);
		});
	}

	app.bootstrapControls = function(){
		app.controlsBootstrapped = true;
		// Player events
		window.player.on('playClick', function(){
			if (window.mixtapeView.mixtape.get('songs').length > 0){
				window.mixtapeView.play();
				// window.player.showPause();
			}
		});
		window.player.on('pauseClick', function(){
			window.mixtapeView.pause();
			// window.player.showPlay();
		});
		window.player.on('nextClick', function(){
			window.mixtapeView.next();			
		});
		window.player.on('backClick', function(){
			window.mixtapeView.previous();			
		});
	}


	app.bootstrapMixtape = function(){
		// @todo: replace all of these with a nice publish/subscribe layer
		// SearchView events
		window.searchView.on('addSong', function(opts){
			window.mixtapeView.addSong(window.searchView.songs.get(opts.id));
		});
		
		window.searchView.on('playPreview', function(data){

			var song = window.searchView.songs.get(data.id);

			// if the mixtape is currently playing, don't do anything.
			// might change this in the future though.
			if (window.mixtapeView.playing && !window.mixtapeView.paused){
				$("#preview-play-" + data.id).attr('src', '/static/images/search/no_25.png');
				// $("#preview-unable-" + data.id).show();
				setTimeout(function(){
					// $("#preview-unable-" + data.id).hide();
					$("#preview-play-" + data.id).attr('src', '/static/images/search/play_25.png');
				}, 500);
				return;
			}

			// if the mixtape is paused, we're going to interrupt it to preview.
			if (window.mixtapeView.paused){
				window.audioPlayer.stop();
				window.audioPlayer.remove();
				window.mixtapeView.paused = false;
				window.mixtapeView.playing = false;
			}
			
			// if we're currently previewing another song, stop it and update the UI.
			if (window.searchView.previewPlaying){
				$("#preview-play-" + window.searchView.nowPlaying).attr('src', '/static/images/search/play_25.png');
				window.audioPlayer.stop();
				window.audioPlayer.remove();
				window.searchView.previewPlaying = false;
			}

			// if we're not currently paused or playing, load the data for playing
			if (!window.searchView.previewPlaying){
				window.audioPlayer.stop();
				window.audioPlayer.remove();
				window.audioPlayer.load(song.get('url'));
				window.audioPlayer.onFinish(function(){
					$("#preview-play-" + window.searchView.nowPlaying).attr('src', '/static/images/search/play_25.png');
					window.audioPlayer.stop();
					window.audioPlayer.remove();
					window.searchView.previewPlaying = false;
				});
				window.audioPlayer.render();
				window.searchView.nowPlaying = song.get('id');
				window.searchView.previewPlaying = true;
				window.audioPlayer.play();

				$("#preview-play-" + data.id).attr('src', '/static/images/search/pause_25.png');
			}
			
		});
		window.searchView.on('pausePreview', function(data){
			window.audioPlayer.stop();
			$("#preview-play-" + data.id).attr('src', '/static/images/search/play_25.png');
			window.searchView.previewPlaying = false;
		});
		window.searchView.on('stopPreview', function(data){
			window.audioPlayer.stop();
			window.audioPlayer.remove();
			window.searchView.previewPlaying = false;
			$("#preview-play-" + data.id).attr('src', '/static/images/search/play_25.png');
		});
		window.searchView.on('loading', function(){
			window.player.startLoading();
		});
		window.searchView.on('loadingComplete', function(){
			window.player.stopLoading();
		});
		window.searchView.on('playing', function(){
			window.player.showPlay();
		});
		// this has to happen to re-set the sortable on the 
		// mixtape song list after re-attaching the element
		window.searchView.on('open', function(){
			window.mixtapeView.setSortable();
		});

		// MixtapeView events
		window.mixtapeView.on('loading', function(){
			window.player.startLoading();
		});
		window.mixtapeView.on('loadingComplete', function(){
			window.player.stopLoading();
		});
		window.mixtapeView.on('loadAudio', function(data){
			window.audioPlayer.load(data.url);
			window.audioPlayer.onFinish(function(){
				if (window.mixtapeView.hasNext()){
					window.mixtapeView.next();
				}
				else {
					window.mixtapeView.stop();
					window.mixtapeView.setCurrentSong(0);
					window.audioPlayer.render();
				}
			});
			window.audioPlayer.render();

		});
		window.mixtapeView.on('playAudio', function(){
			// check if you're currently previewing something
			if (window.searchView.previewPlaying){
				window.searchView.stopPreview();
				// window.audioPlayer.remove();
				window.mixtapeView.load();
			}
			window.audioPlayer.play();
			window.player.showPause();
		});
		window.mixtapeView.on('stopAudio', function(){
			window.audioPlayer.stop();
			window.player.showPlay();
		});
		window.mixtapeView.on('removeAudio', function(){
			window.audioPlayer.remove();
		});
		window.mixtapeView.on('emitAvailable', function(available){
			window.player.setHasPrevious(available.hasPrev);
			window.player.setHasNext(available.hasNext);
			window.player.setCanPlay(available.canPlay);
		}.bind(this));

		window.mixtapeView.on('recommendations', function(recommendations){
			window.searchView.addRecommendations(recommendations);
		});
		window.mixtapeView.on('emptyRecommendations', function(){
			window.searchView.emptyRecommendations();
		});

		// set up the editable title
		// @todo: this doesn't style the form field
		$('#title-text').editable(function(value, settings) { 
			window.mixtapeView.setTitle(value);
			return(value);
		}, {
			'cssclass': 'title-editable'
		});
	};

	app.boostrapRealtime = function(){
		// socket.io realtime updating
		window.socket = io.connect('ws://' + document.domain);
		window.socket.on('data', function(data){
			// put in a check here on currently playing songs
			// in case it has been removed...
			// do something...
			console.log('new data...');
			var mixtape = new Mixtape(data);
			mixtape.set('songs', new SongCollection(mixtape.get('songs')));
			window.mixtapeView.mixtape = mixtape;
			window.mixtapeView.render();
		});
		window.socket.on('listeners', function(listeners){
			if (listeners === 1){
				$("#listeners").text(listeners + ' viewer');
			}
			else {
				$("#listeners").text(listeners + ' viewers');
			}
		});
		window.mixtapeView.on('subscribe', function(sub){
			window.socket.emit('subscribe', {
				'id': sub.id
			});
		});
		window.mixtapeView.on('publish', function(mixtapeData){
			console.log('publishing data');
			window.socket.emit('publish', JSON.stringify(mixtapeData));
		});
	}

	// view manager @todo
	// this is the makeshift view manager until i get organized
	// and use marionette or write something nice
	app.changeContentView = function(view, options){
		if (view === 'search'){
			if (window.helpView !== undefined){
				window.helpView.close();
			}
			if (window.browseView !== undefined){
				window.browseView.close();
			}
			// if (window.searchView !== undefined){
			// 	window.searchView.empty();
			// }
			if (window.searchView === undefined) {
				window.searchView = new SearchView();
			}
			window.searchView.open();
			window.searchView.render();
			$("#content-title").text('search');
			return;
		}
		if (view === 'help'){
			// if the searchview exists and is open, close it.
			// if an existing helpview exists, open it
			// otherwise, create a new helpview and attach it.
			// render
			if (window.searchView !== undefined){
				window.searchView.close();
			}
			if (window.browseView !== undefined){
				window.browseView.close();
			}
			if (window.helpView === undefined) {
				window.helpView = new HelpView();
			}
			window.helpView.open();
			window.helpView.render();
			$("#content-title").text('help');
			return;
		}
		if (view === 'browse'){
			// if the searchview exists and is open, close it.
			// if an existing helpview exists, open it
			// otherwise, create a new helpview and attach it.
			// render
			if (window.searchView !== undefined){
				window.searchView.close();
			}
			if (window.helpView !== undefined){
				window.helpView.close();
			}
			if (window.browseView === undefined) {
				window.browseView = new BrowseView();
			}
			window.browseView.open();
			window.browseView.render();
			$("#content-title").text('browse');
		}
	}

	
	// stuff that happens
	app.done = function(){
		// the header navigation stuff
		$("#click-help").click(function(){
			app.changeContentView('help');
			window.router.navigate('help');
		});
		$("#click-browse").click(function(){
			app.changeContentView('browse');
			window.router.navigate('browse');
		});
		$("#click-search").click(function(){
			app.changeContentView('search');
			if (window.mixtapeView.id !== undefined){
				window.router.navigate(window.mixtapeView.id);
			}
			else {
				window.router.navigate('');
			}
			
		});
		// @todo: make this AJAXy
		$("#click-new").click(function(){
			window.location = '/';
		});


		$("#wrapper").show();
	}

	// @todo fix the routing
	var Router = Backbone.Router.extend({
		routes: {
			'': 'root',
			'help': 'help',
			'browse': 'browse',
			':id': 'mixtape'
		},
		root: function(){
			// Define the Backbone views
			console.log('root');
			window.mixtapeView = new MixtapeView();
			window.mixtapeView.render();		
			app.changeContentView('search');
			app.bootstrap();
			app.bootstrapControls();
			this.navigate('');
			$("#status-text").text('add some songs');
			// // Set up any extra Router events
			window.mixtapeView.on('save_new', function(data){
				console.log('navigating');
				this.navigate(data.id);
			}.bind(this));
		},
		help: function(){
			console.log('help');
			if (window.mixtapeView === undefined){
				window.mixtapeView = new MixtapeView();
			}
			if (window.searchView === undefined){
				window.searchView = new SearchView();
			}
			app.changeContentView('help');
			app.bootstrap();
			if (!app.controlsBootstrapped){
				app.bootstrapControls();
			}
			this.navigate('help');
		},
		browse: function(){
			console.log('browse');
			if (window.mixtapeView === undefined){
				window.mixtapeView = new MixtapeView();
			}
			if (window.searchView === undefined){
				window.searchView = new SearchView();
			}
			app.changeContentView('browse');
			app.bootstrap();
			if (!app.controlsBootstrapped){
				app.bootstrapControls();
			}
			this.navigate('browse');
		},
		mixtape: function(id){
			// Define the Backbone views
			if (window.mixtapeView === undefined){
				window.mixtapeView = new MixtapeView({
					'id': id
				});
			}
			$("#status-text").text('you can edit');
			this.navigate(id);
			app.changeContentView('search');
			app.bootstrap();
			if (!app.controlsBootstrapped){
				app.bootstrapControls();
			}
		}
	});
	window.router = new Router();
	Backbone.history.start({pushState: true, hashChange: false, root: '/'});

	window.app = app;

	app.done();

})(jQuery);