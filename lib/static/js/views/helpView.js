
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
