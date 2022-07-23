function creative_mode_set_buttons_visibility() {
	radiant.call('radiant:get_config', 'mods.creative_mode.visibility')
	.done(function(response) {
		let visibility = response['mods.creative_mode.visibility'];
		if (visibility.visible_at_taskbar) {
			document.querySelector("#creative_mode_taskbar").style.display = "";
		}else{
			document.querySelector("#creative_mode_taskbar").style.display = "none";
		}
		if (App.StonehearthDebugDockView) {
			if (visibility.visible_at_debugtools) {
				document.querySelector("#creative_mode_debugIcon").style.display = "";
			}else{
				document.querySelector("#creative_mode_debugIcon").style.display = "none";
			}
		}
	});
}

function waitForElm(selector) {
	return new Promise(resolve => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(mutations => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	});
}

$(document).on('stonehearthReady', function(){
	if (App.StonehearthDebugDockView) {
		App.debugDock.addToDock(App.creative_mode_debugIcon);
	}
	waitForElm('#creative_mode_taskbar').then((elm) => {
		radiant.call('radiant:get_config', 'mods.creative_mode.visibility')
		.done(function(response) {
			let visibility = response['mods.creative_mode.visibility'];
			if (visibility) {
				if (visibility.visible_at_taskbar) {
					document.querySelector("#creative_mode_taskbar").style.display = "";
				}else{
					document.querySelector("#creative_mode_taskbar").style.display = "none";
				}
			}
		});
	});
	waitForElm('#creative_mode_debugIcon').then((elm) => {
		radiant.call('radiant:get_config', 'mods.creative_mode.visibility')
		.done(function(response) {
			let visibility = response['mods.creative_mode.visibility'];
			if (visibility) {
				if (visibility.visible_at_debugtools) {
					document.querySelector("#creative_mode_debugIcon").style.display = "";
				}else{
					document.querySelector("#creative_mode_debugIcon").style.display = "none";
				}
			}
		});
	});

	$(top).on('creative_mode_trigger', function (_, e) {
		if (App.stonehearth.CreativeModeView) {
			App.stonehearth.CreativeModeView.destroy();
		}
		else{
			App.stonehearth.CreativeModeView = App.gameView.addView(App.CreativeModeView);
		}
	});
	radiant.call('creative_mode:get_all_item_uris_command')
	.done(function(response) {
		allUris = response;
		// allUris.sort();
	})
	.fail(function() {
	});
});
var allUris = {};

App.creative_mode_debugIcon = App.View.extend({
	templateName: 'creative_mode_debugIcon',
	classNames: ['debugDockIcon'],

	didInsertElement: function() {
		$('#creative_mode_debugIcon').tooltipster();
		this.$().click(function () {
			$(top).trigger('creative_mode_trigger');
		});
		this._super();
	}
});

App.CreativeModeView = App.View.extend({
	templateName: 'creative_mode_window',
	modal: false,
	closeOnEsc: true,

	creativeModeWeatherComponents: {
		"data": {
			"calendar": {
				"weather_list": {
					"*": {}
				}
			}
		}
	},
	creativeModeGameModeComponents: {
		"game_modes": {
			"*": {}
		}
	},

	didInsertElement: function() {
		var self = this;
		self.$().draggable();

		$('#creative_mode_window button').click(function() {
			radiant.call('radiant:play_sound', {'track' : 'stonehearth:sounds:ui:action_click' });
		});

		$('#creative_mode_window h2').click(function() {
			this.classList.toggle("collapsed");
			if(!this.id) return false;
			radiant.call('radiant:set_config',
				'mods.creative_mode.is_collapsed.'+this.id,
				this.classList.contains("collapsed"));
			radiant.call('radiant:play_sound', {'track' : 'stonehearth:sounds:ui:action_click' });
		});
		radiant.call('radiant:get_config', 'mods.creative_mode.is_collapsed')
		.done(function(response) {
			if(response['mods.creative_mode.is_collapsed']){
				for (const [key, value] of Object.entries(response['mods.creative_mode.is_collapsed'])) {
					if(value == true){
						$("#creative_mode_window #"+key).addClass("collapsed");
					}
				}
			}
		});

		self.slider_being_dragged = false;
		self.$('#slider_time').slider({
			value: 0,
			min: 0,
			max: 23.99,
			step: 1 / 60,
			stop: function(event, ui) {
				self.slider_being_dragged = false;
			},
			slide: function (event, ui) {
				self.slider_being_dragged = true;
				radiant.call('stonehearth:set_time', {
					hour: Math.floor(ui.value % 24),
					minute: Math.floor((ui.value * 60)) % 60
				});
			}
		});
		radiant.call('stonehearth:get_clock_object')
		.done(function (o) {
			self.timerTrace = radiant.trace(o.clock_object)
			.progress(function (date) {
				if(!(self.isDestroying || self.isDestroyed) && !self.slider_being_dragged){
					self.$('#slider_time').slider('option', 'value', (date.hour % 24) + date.minute / 60);
				}
			})
		});
		self.$('#slider_rotate').slider({
			value: 0,
			min: 0,
			max: 360,
			slide: function (event, ui) {
				radiant.call('creative_mode:rotate_entity_command',
					App.stonehearthClient.getSelectedEntity(),
					ui.value);
			}
		});

		self._creativeModeWeatherTrace  = new StonehearthDataTrace('/creative_mode/data/creative_mode.json', self.creativeModeWeatherComponents)
		.progress(function(response) {
			let weather_list_array = [];
			radiant.each(response.data.calendar.weather_list, function(k, v) {
				weather_list_array.push({
					uri: v.__self.__self,
					display_name: v.__self.display_name,
					icon: v.__self.icon
				});
			});
			self.set('weather_list', weather_list_array);
		});

		self._creativeModeGameModeTrace  = new StonehearthDataTrace('stonehearth:game_mode:index', self.creativeModeGameModeComponents)
		.progress(function(response) {
			let game_modes_array = [];
			radiant.each(response.game_modes, function(k, v) {
				game_modes_array.push({
					uri: v.alias,
					ordinal: v.ordinal,
					display_name: v.display_name
				});
			});
			game_modes_array.sort(function(a, b){
				let aOrdinal = a.ordinal ? a.ordinal : 1000;
				let bOrdinal = b.ordinal ? b.ordinal : 1000;
				return aOrdinal - bOrdinal;
			});
			self.set('game_modes', game_modes_array);
		});

		let visibilityOptions_div = document.querySelector("#creative_mode_window #visibilityOptions_div");
		$('#creative_mode_window #visibilityOptions_div input').click(function() {
			let visibility = {}
			visibility.visible_at_taskbar = visibilityOptions_div.querySelector("#visible_at_taskbar").checked;
			visibility.visible_at_debugtools = visibilityOptions_div.querySelector("#visible_at_debugtools").checked;
			radiant.call('radiant:set_config',
				'mods.creative_mode.visibility',
				visibility);
			creative_mode_set_buttons_visibility();
			radiant.call('radiant:play_sound', {'track' : 'stonehearth:sounds:ui:action_click' });
		});
		radiant.call('radiant:get_config', 'mods.creative_mode.visibility')
		.done(function(response) {
			let visibility = response['mods.creative_mode.visibility'];
			if(visibility){
				visibilityOptions_div.querySelector("#visible_at_taskbar").checked = visibility.visible_at_taskbar;
				visibilityOptions_div.querySelector("#visible_at_debugtools").checked = visibility.visible_at_debugtools;
			}else{
				visibilityOptions_div.querySelector("#visible_at_taskbar").checked = true;
				visibilityOptions_div.querySelector("#visible_at_debugtools").checked = false;
			}
		});
	},

	destroy: function() {
		if (self.timerTrace) {
			self.timerTrace.destroy();
			self.timerTrace = null;
		}
		if (self._creativeModeWeatherTrace) {
			self._creativeModeWeatherTrace.destroy();
			self._creativeModeWeatherTrace = null;
		}
		if (self._creativeModeGameModeTrace) {
			self._creativeModeGameModeTrace.destroy();
			self._creativeModeGameModeTrace = null;
		}
		App.stonehearth.CreativeModeView = null;

		this._super();
	},

	actions:{
		show_page: function(page_id){
			let creative_mode_window = document.querySelector("#creative_mode_window");
			let old_active = creative_mode_window.querySelector("nav button.active");
			if(old_active){
				old_active.classList.remove("active");
			}
			creative_mode_window.querySelector("button:focus").classList.add("active");

			creative_mode_window.querySelector(".current_page").classList.remove("current_page");
			creative_mode_window.querySelector("#"+page_id).classList.add("current_page");
		},

		remove: function(type){
			radiant.call('creative_mode:remove', type);
		},

		destroy_entity: function(){
			radiant.call('stonehearth:destroy_entity', App.stonehearthClient.getSelectedEntity());
		},

		add_citizen: function(){
			radiant.call('creative_mode:add_citizen');
		},

		spawn_item: function(item){
			radiant.call('creative_mode:spawn_item', item);
		},

		load_manifest: function(manifest){
			if (!manifest) {
				// manifest = "/swamp_goblins/swamp_biome_selected/manifest.json";
				manifest = "/archipelago_biome/archipelago_selected/manifest.json";
			}
			radiant.call('radiant:hotload_manifest', manifest);
		},
		unload_manifest: function(){
			radiant.call("creative_mode:hot_reload_server");
			radiant.call("creative_mode:hot_reload_client");
			radiant.call("radiant:debug_clear_rm_json_cache");
		},

		//data
		change_weather: function(){
			radiant.call('creative_mode:change_weather',
				document.querySelector("#weatherOptions_div input:checked").id);
		},
		change_difficulty: function(){
			radiant.call('creative_mode:change_difficulty',
				document.querySelector("#difficultyOptions_div input:checked").id);
		},

		//entities
		teleport_entity: function(){
			radiant.call('stonehearth:teleport_entity', App.stonehearthClient.getSelectedEntity());
		},
		change_scale: function(){
			radiant.call('creative_mode:change_scale',
				App.stonehearthClient.getSelectedEntity(),
				parseFloat(document.querySelector("#entities_scale_input").value)
				);
		},
		rename: function(){
			radiant.call('stonehearth:set_custom_name',
				App.stonehearthClient.getSelectedEntity(),
				document.querySelector("#entities_rename_input").value
				);
		},

		//inventory
		add_gold: function(){
			radiant.call('creative_mode:add_gold',
				parseInt(document.querySelector("#inventory_gold_input").value));
		},
		spawn_trader: function(){
			radiant.call('creative_mode:spawn_trader');
		},
		spawn_traveler: function(){
			radiant.call('creative_mode:spawn_traveler');
		},

		//jobs
		spawn_talismans: function(){
			radiant.call('creative_mode:spawn_talismans');
		},
		levelup: function(){
			radiant.call('creative_mode:levelup');
		},
		unlock_crops: function(){
			radiant.call('creative_mode:unlock_crops');
		},
		unlock_recipes: function(){
			radiant.call('creative_mode:unlock_recipes');
		},
	}
});