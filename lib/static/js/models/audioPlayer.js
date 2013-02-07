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