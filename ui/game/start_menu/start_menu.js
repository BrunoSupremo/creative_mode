App.StonehearthStartMenuView.reopen({
	init: function() {
		var self = this;

		self.menuActions.creative_mode_taskbar = function() {
			$(top).trigger('creative_mode_trigger');
		}

		self._super();
	}
});