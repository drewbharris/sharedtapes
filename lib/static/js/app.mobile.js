// THIS IS PRETTY OLD
// @todo bring changes over from mainline

(function ($) {

	var app = {};

	var AudioPlayer = Backbone.Model.extend({
		initialize: function(){
			this.ready = false;
			soundManager.setup({
				'url': '/static/js/soundmanager2/swf',
				onready: function(){
					this.ready = true;
				}.bind(this)
			});
		},
		play: function(){
			if (!this.ready){
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
				'id': 'extapesAudioPlayer',
				'url': url
			});
		},
		stop: function(){
			if (!this.ready){
				return;
			}
			clearInterval(this.timeUpdate);
			this.a.pause();
		},
		remove: function(){
			if (!this.ready){
				return;
			}
			this.a.destruct();
		},
		render: function(){
			if (!this.ready){
				return;
			}
			$('#currentTime').text(util.toMinSec(this.a.position) + 
				' / ' + util.toMinSec(this.a.durationEstimate));
		},
		onFinish: function(cb){
			this.a.options.onfinish = cb;
		}
	});

	var Song = Backbone.Model.extend({
		title: null,
		artist: null,
		id: null,
		url: null
	});

	var SongCollection = Backbone.Collection.extend({
		model: Song
	});

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

	var PlayerView = Backbone.View.extend({
		el: $("#controls"),
		initialize: function(){
			this.$el.append(
				'<div id="back">' + 
	                '<img id="backImage" src="/static/images/player/back_50.png">' + 
	                '</img>' + 
	            '</div>' +
	            '<div id="playpause">' +
	                '<img id="playImage" src="/static/images/player/play_50.png">' +
	                '</img>' +
	                '<img id="pauseImage" src="/static/images/player/pause_50.png">' +
	                '</img>' +
	            '</div>' +
	            '<div id="next">' +
	                '<img id="nextImage" src="/static/images/player/forward_50.png">' +
	                '</img>' +
	            '</div>' +
	            '<div id="loading">' +
	                '<canvas id="loadingCanvas" width=50 height=50>' +
	                '</canvas>' +
	            '</div>'
	        );
	        this.canvas = $("#loadingCanvas")[0];
			this.context = this.canvas.getContext('2d');
			this.loadingImage = new Image();
			this.loadingImage.src = '/static/images/player/load_50.png';
			this.counter = 0;
			this.TO_RADIANS = Math.PI/180;
			this.rotateTimer;
			this.loadingImage.onload = function(){
			    this.context.clearRect(0,0,this.canvas.width, this.canvas.height);
			    this.drawRotatedImage(this.loadingImage,this.canvas.width/2,this.canvas.height/2,0); 
			}.bind(this);
		},
		events: {
			'click #playImage': 'emitPlay',
			'click #pauseImage': 'emitPause',
			'click #nextImage': 'emitNext',
			'click #backImage': 'emitBack'
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
			$("#playImage").hide();
    		$("#pauseImage").show();
		},
		showPlay: function(){
			$("#pauseImage").hide();
    		$("#playImage").show();
		}
	});

	// The Mixtape view, for holding and playing the current mixtape
	// and adding stuff to it
	var MixtapeView = Backbone.View.extend({
		el: $("#mixtape"),
		initialize: function () {
			// Check if we're routed to a pre-existing mixtape
			if (this.options !== undefined && this.options.id !== undefined){

				this.mixtape = new Mixtape({
					'id': this.options.id
				});

				// Grab the stuff from the server
				this.mixtape.fetch().then(function(){
					
					console.log('fetch succeeded');

					this.mixtape.get('songs').on('change', function(model){
						this.render();
					}.bind(this));
					
					// Set up to retrieve realtime updates
					this.trigger('subscribe', {
						'id': this.mixtape.id
					});

					$("#title-text").text(this.mixtape.get('title'));
				}.bind(this), function(){
					console.log('fetch failed');
				});
			}
			// Otherwise, we're going to start a new mixtape.
			else {
				this.mixtape = new Mixtape({
					'songs': new SongCollection(null)
				});

				this.mixtape.get('songs').on('change', function(model){
					this.render();
				}.bind(this));

				$("#title-text").text('untitled mixtape');
			}

			// Set up the rendering triggers
			this.mixtape.on('change', function(changes){
				this.render(changes);
			}.bind(this));

			this.currentSong = 0;

			// _.bindAll(this, 'render');

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
				$("#public-link").html('share: <a href="/' + 
					this.mixtape.id + '">extapes.drewbharris.com/' + this.mixtape.id + '</a>');
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

			// Redraw the currently playing song
			if (this.playing){
				$("#song-" + this.mixtape.get('songs')
					.at(this.currentSong)
					.get('id')).addClass('playing');
			}

			// Set up the events for removing songs
			$(".remove-song").click(function(event){
				this.removeSong($(event.target).parent().attr('id').split('-')[1]);
			}.bind(this));

		},
		events: {
			"click .play-song": 'playSong'
		},
		setCurrentSong: function(index){
			this.currentSong = index;
		},
		addSong: function(song){
			var songModel = new Song(song);
			this.mixtape.get('songs').add(songModel);
			this.create();
		},
		removeSong: function(id){
			// if we're removing the currently playing song, set the player
			// back to song 0 and stop playing.
			if (this.mixtape.get('songs').at(this.currentSong).id === id){
				this.currentSong = 0;
				this.playing = false;
				this.trigger('stopAudio');
				this.trigger('removeAudio');
			}
			// if we're removing a song before the currently playing song,
			// make sure we fix the indices
			else if (this.mixtape.get('songs')
				.indexOf(this.mixtape.get('songs').get(id)) < this.currentSong){
				this.currentSong--;
			}

			this.mixtape.get('songs').remove(this.mixtape.get('songs').get(id));
			this.create();
		},
		load: function(){
			var songToPlay = this.mixtape.get('songs').at(this.currentSong);
			$("#song-" + songToPlay.get('id')).addClass('playing');
			this.playing = true;
			this.trigger('loadAudio', {
				'url': songToPlay.get('url')
			});
		},
		play: function(){
			if (!this.paused){
				this.load();
			}
			this.trigger('playAudio');
			this.paused = false;
		},
		playSong: function(event){
			if (this.playing){
				this.stop();
			}
			var id = $(event.target).attr('id').split('-')[1];
			var songToPlay = this.mixtape.get('songs').get(id);
			this.currentSong = this.mixtape.get('songs').indexOf(songToPlay);
			this.load();
			this.play();
		},
		stop: function(){
			$(".playing").removeClass("playing");
			this.playing = false;
			this.trigger('stopAudio');
			this.trigger('removeAudio');
		},
		pause: function(){
			this.paused = true;
			this.trigger('stopAudio');
		},
		hasNext: function(){
			if (this.currentSong < (this.mixtape.get('songs').length - 1 )){
				return true;
			}
			else {
				return false;
			}
		},
		next: function(){
			if (this.currentSong < (this.mixtape.get('songs').length - 1 )){
				$(".playing").removeClass("playing");
				this.trigger('stopAudio');
				this.trigger('removeAudio');
				this.currentSong++;
				this.load();
				if (!this.paused){
					this.play();
				};
			}
		},
		previous: function(){
			if (this.currentSong > 0){
				$(".playing").removeClass("playing");
				this.trigger('stopAudio');
				this.trigger('removeAudio');
				this.currentSong--;
				this.load();
				if (this.playing){
					this.play();
				};
			}
		},
		create: function(){
			// @todo rename this
			console.log('saving to server');
			var newMixtape = false;

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
					console.log('saved new mixtape');
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
				}
				console.log('saved');
				this.trigger('publish', data);
				this.render();
			}.bind(this), function(jqXHR, textStatus, errorThrown) {
				console.log('error: ' + textStatus);
			});
		},
		addSongToList: function (number, model) {
			$("#songs-list").append('<div class="mixtape-song" id="song-' + model.get('id') + '">' + 
				'<span id="play-' + model.get('id') + '" class="play-song">' + 
				(number + 1) + '. </span>' + 
				model.get('artist') + ' - ' + 
				model.get('title') + 
				' <span class="remove-song fake-link">x</span></div>');
			$("#play-" + model.get('id')).mouseover(function(){
				$(this).text('▶ ');
			}).mouseout(function(){
				$(this).text(number + 1 + '. ');
			});
		}
	});

	// The Search view for getting new songs
	var SearchView = Backbone.View.extend({
		el: $("#search"),
		initialize: function(){
			this.$el.append(
				'search: <input type="text" id="query"></input>' + 
                '<button id="execute-search">search </button>' + 
                '<div id="results">' + 
                '</div>' + 
                '<div id="more">' + 
                '</div>'
            );
			$("#results").empty();
			// define the SongCollection for search results
			this.songs = new SongCollection();
			// this is going to hold the song id we are previewing
			this.nowPlaying = null;
			this.playing = false;
		},
		render: function(){
			// add the songs to the results pane
			$("#results").empty();
			this.songs.map(function(song){
				var srcString = null;
				if (song.get('sources') !== null && song.get('sources').length > 0){
					srcImg = '<a href="' + song.get('sources')[0] + '" alt="source"><img src="/static/images/search/source_25.png" /></a> ';
				}
				$("#results").append(
					'<div class="result-item">' + 
						'<div class="result-item-metadata">' + 
							song.get('artist') + ' - ' + song.get('title') + 
						'</div>' + 
						'<div class="result-item-links"> ' + 
							// '<span class="img-link preview-song" id="preview-' + 
							// song.get('id') + '" src="/static/images/search/play_25.png" alt="play">' + 
							// '<img class="img-link preview-song-play" id="preview-play-' + 
							// song.get('id') + '" src="/static/images/search/play_25.png" />' + 
							// '<img class="img-link preview-song-pause" id="preview-pause-' + 
							// song.get('id') + '" src="/static/images/search/pause_25.png" />' + 
							// '<img class="img-link preview-song-unable" id="preview-unable-' + 
							// song.get('id') + '" src="/static/images/search/no_25.png" />' + 
							// '</span>' + 
							'<img class="img-link add-song" ' + 
							'src="/static/images/search/add_25.png" ' + 
							'id="add-' + song.get('id') + '" alt="add"/> ' + 
							// srcImg + 
							// '<a href="http://ex.fm/song/' + song.id + '">exfm</a> ' + 
						'</div>' + 
					'</div>'
				);
			});
			if (!this.songs.isEmpty()){
				$("#more")
					.text('more')
					.addClass('fake-link');
			}
		},
		events: {
			"click #execute-search":  "search",
			"click #more": "searchMore",
			"click .add-song": "addSong",
			"click .preview-song-play": "playPreview",
			"click .preview-song-pause": "pausePreview"
		},
		search: function(){
			this.resultsStart = 0;
			this.trigger('loading');
			$.when(exfm.search($("#query").val())).then(function(data){
				this.trigger('loadingComplete');
				this.songs.reset(data.results);
				this.render();
			}.bind(this));
		},
		searchMore: function(){
			this.resultsStart += 20;
			this.trigger('loading');
			$.when(exfm.search($("#query").val(), this.resultsStart)).then(function(data){
				this.trigger('loadingComplete');
				this.songs.add(data.results);
				this.render();
			}.bind(this));
		},
		addSong: function(event){
			this.trigger('add-song', {
				'id': $(event.target).attr('id').split('-')[1]
			});
		},
		playPreview: function(event){
			var id = $(event.target).attr('id').split('-')[2];
			this.trigger('play-preview', {
				'id': id
			});
		},
		pausePreview: function(event){
			var id = $(event.target).attr('id').split('-')[2];
			this.trigger('pause-preview', {
				'id': id
			});
		},
		close: function(){
			this.content = this.$el.detach();
		},
		open: function(){
			this.content.appendTo("#content");
		},
		empty: function(){
			this.$el.empty();
		}
	});

	var HelpView = Backbone.View.extend({
		el: $("#help"),
		initialize: function(){
			this.render();
		},
		render: function(){
			this.$el.text('yo');
			return this;
		},
		close: function(){
			this.content = this.$el.detach();
		},
		open: function(){
			this.content.appendTo("#content");
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

	// header
	$("#new").click(function(){
		window.location = '/';
	});
	$("#help").click(function(){
		window.location = '/help';
	});

	// do the event binding for mixtape + search
	// @todo abstract all this garbage
	// this is kind of the ugly bootstrap
	// should be somewhere else....
	app.setupMixtape = function(elements){
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

		// @todo: replace all of these with a nice publish/subscribe layer
		// SearchView events
		window.searchView.on('add-song', function(opts){
			window.mixtapeView.addSong(window.searchView.songs.get(opts.id));
		});
		
		window.searchView.on('play-preview', function(data){

			var song = window.searchView.songs.get(data.id);

			// if the mixtape is currently playing, don't do anything.
			// might change this in the future though.
			if (window.mixtapeView.playing && !window.mixtapeView.paused){
				$("#preview-play-" + data.id).hide();
				$("#preview-unable-" + data.id).show();
				setTimeout(function(){
					$("#preview-unable-" + data.id).hide();
					$("#preview-play-" + data.id).show();
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
			if (window.searchView.playing && window.searchView.nowPlaying !== data.id){
				$("#preview-pause-" + window.searchView.nowPlaying).hide();
				$("#preview-play-" + window.searchView.nowPlaying).show();
				window.audioPlayer.stop();
				window.audioPlayer.remove();
				window.searchView.playing = false;
			}

			// if we're not currently paused or playing, load the data for playing
			if (!window.searchView.playing){
				window.audioPlayer.load(song.get('url'));
				window.audioPlayer.onFinish(function(){
					$("#preview-pause-" + window.searchView.nowPlaying).hide();
					$("#preview-play-" + window.searchView.nowPlaying).show();
					window.audioPlayer.stop();
					window.audioPlayer.remove();
					window.searchView.playing = false;
				});
				window.audioPlayer.render();
			}

			window.searchView.nowPlaying = song.get('id');
			window.searchView.playing = true;

			window.audioPlayer.play();

			$("#preview-play-" + data.id).hide();
			$("#preview-pause-" + data.id).show();

		});
		window.searchView.on('pause-preview', function(data){
			window.audioPlayer.stop();
			$("#preview-pause-" + data.id).hide();
			$("#preview-play-" + data.id).show();
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

		// MixtapeView events
		window.mixtapeView.on('loading', function(){
			window.player.startLoading();
		});
		window.mixtapeView.on('loadingComplete', function(){
			window.player.stopLoading();
		});
		window.mixtapeView.on('loadAudio', function(data){
			// check if you're currently previewing something
			if (window.searchView.playing){
				$("#preview-pause-" + window.searchView.nowPlaying).hide();
				$("#preview-play-" + window.searchView.nowPlaying).show();
				window.audioPlayer.stop();
				// window.audioPlayer.remove();
				window.searchView.playing = false;
			}
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
		// set up the editable title
		$('#title-text').editable(function(value, settings) { 
			window.mixtapeView.setTitle(value);
			return(value);
		});

		// socket.io realtime updating
		window.socket = io.connect('ws://' + document.domain);
		window.socket.on('data', function(data){
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
	};

	// view manager @todo
	app.changeContentView = function(view, options){
		if (view === 'search'){
			// if we are transitioning back from the help view, 
			// reattach the searchview element
			if (window.searchView !== undefined && window.helpView !== undefined){
				window.helpView.close();
				window.searchView.open();
			}
			// otherwise, clean up the current searchview
			else if (window.searchView !== undefined){
				window.searchView.empty();
			}
			// $("#content").empty();
			// $("#content").append('<div id="search"></div>');

			window.searchView = new SearchView();
			window.searchView.render();
			return;
		}
		if (view === 'help'){
			if (window.searchView !== undefined){
				window.searchView.close();
			}
			window.helpView = new HelpView();
			window.helpView.render();
			return;
		}
	}

	var Router = Backbone.Router.extend({
		routes: {
			'': 'root',
			'help': 'help',
			':id': 'mixtape'
		},
		root: function(){
			// Define the Backbone views
			console.log('root');
			window.mixtapeView = new MixtapeView();
			window.mixtapeView.render();		
			app.changeContentView('search');
			app.setupMixtape();
			this.navigate('');
			// // Set up any extra Router events
			window.mixtapeView.on('save_new', function(data){
				console.log('navigating');
				this.navigate(data.id);
			}.bind(this));
		},
		help: function(){
			console.log('help');
			window.mixtapeView = new MixtapeView();
			// window.mixtapeView.render();	
			app.changeContentView('help');
			this.navigate('help');
		},
		mixtape: function(id){
			// Define the Backbone views
			window.mixtapeView = new MixtapeView({
				'id': id
			});
			// window.mixtapeView.render();
			this.navigate(id);
			app.changeContentView('search');
			app.setupMixtape();
		}
	});
	window.router = new Router();
	Backbone.history.start({pushState: true, root: '/'});

	window.app = app;


})(jQuery);