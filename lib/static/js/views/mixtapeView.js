// The Mixtape view, for holding and playing the current mixtape
// and adding stuff to it
var MixtapeView = Backbone.View.extend({
    el: $("#mixtape"),
    songTemplate: _.template($("#mixtape-song-template").html()),
    initialize: function () {
        console.log('mixtape init');
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

        this.trigger('set-title', 'untitled mixtape');

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

            this.trigger('set-title', this.mixtape.get('title'));
            this.setSortable();

            this.currentSong = 0;
            if (this.mixtape.get('songs').length){
                this.currentSongId = this.mixtape.get('songs').at(this.currentSong).get('id');
            }
            
            this.render();

        }.bind(this), function(){
            console.log('fetch failed :(');
        });
    },
    render: function(data){
        console.log('mixtape render');

        if ($("#songs-list").length === 0 &&
            this.mixtape.get('songs').length > 0){
            this.$el.append(
                '<div id="songs-list">' +
                '</div>'
            );
        }

        this.trigger('set-title', this.mixtape.get('title'));

        // Add in the public share link
        if(this.mixtape.id !== undefined){
            $("#public-link").html('edit link: <a href="/' + 
                this.mixtape.id + '">sharedtapes.com/' + this.mixtape.id + '</a>');
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