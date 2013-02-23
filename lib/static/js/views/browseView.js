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
		this.$el.append('<div class="text-heading">currently listening: </div><div id="currently-listening-list" class="text-body"></div>'+
			'<div class="text-heading">recently added: </div><div id="recently-added-list" class="text-body"></div>');
		this.fetch();
	},
	fetch: function(){
		$.get('/api/v1/currently-listening', function(data){
			console.log(data);
			this.updateCurrentlyListening(data);
		}.bind(this));
		$.get('/api/v1/recently-added', function(data){
			this.updateRecentlyAdded(data);
		}.bind(this));
	},
	updateCurrentlyListening: function(data){
		$("#currently-listening-list").empty();
		var htmlString = '';
		data.map(function(item){
			htmlString += '<span class="fake-link currently-listening-item" id="mixtape-' + item.id + '">' +
				item.title + '</span> (' + item.id + ')<br/>';
		});
		$("#currently-listening-list").append(htmlString);
	},
	updateRecentlyAdded: function(data){
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