
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