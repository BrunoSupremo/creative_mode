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
	creativeModePlayableKingdomsComponents: {
		"kingdoms": {
			"*": {}
		}
	},
	creativeModeNPCKingdomsComponents: {
		"populations": {
			"*": {
				"kingdom": {}
			}
		}
	},
	creativeModeJobsComponents: {
		"jobs": {
			"*": {
				"description": "*"
			}
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
		self.$('#slider_colors').slider({
			value: 0,
			min: -2,
			max: 2,
			step: 1 / 10,
			slide: function (event, ui) {
				radiant.call('creative_mode:camera_colors_command',
					ui.value);
			}
		});
		self.$('#slider_snow').slider({
			value: 0.0001,
			min: 0.0001,
			max: 1,
			step: 1 / 100,
			slide: function (event, ui) {
				radiant.call('creative_mode:snow_layer_command',
					ui.value);
			}
		});

		self._creativeModeWeatherTrace  = new StonehearthDataTrace('/creative_mode/data/creative_mode.json', self.creativeModeWeatherComponents)
		.progress(function(response) {
			let weather_list_array = [];
			radiant.each(response.data.calendar.weather_list, function(k, v) {
				weather_list_array.push({
					uri: v.__self.__self,
					display_name: v.__self.display_name
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

		self._creativeModePlayableKingdomsTrace  = new StonehearthDataTrace('stonehearth:playable_kingdom_index', self.creativeModePlayableKingdomsComponents)
		.progress(function(response) {
			let kingdom_list_array = [];
			let current_kingdom = App.population.getKingdom();
			radiant.each(response.kingdoms, function(k, v) {
				kingdom_list_array.push({
					uri: v.__self,
					ordinal: current_kingdom == v.__self ? 0.01 : v.ordinal,
					display_name: v.display_name
				});
			});
			kingdom_list_array.sort(function(a, b){
				let aOrdinal = a.ordinal ? a.ordinal : 1000;
				let bOrdinal = b.ordinal ? b.ordinal : 1000;
				return aOrdinal - bOrdinal;
			});
			self.set('kingdom_list', kingdom_list_array);
		});
		self._creativeModeNPCKingdomsTrace  = new StonehearthDataTrace('stonehearth:data:npc_index', self.creativeModeNPCKingdomsComponents)
		.progress(function(response) {
			let npc_kingdom_list_array = [];
			radiant.each(response.populations, function(k, v) {
				npc_kingdom_list_array.push({
					uri: v.kingdom.__self,
					display_name: v.kingdom.kingdom_name
				});
			});
			self.set('npc_kingdom_list', npc_kingdom_list_array);
		});
		self._creativeModeJobsTrace  = new StonehearthDataTrace('stonehearth:jobs:index', self.creativeModeJobsComponents)
		.progress(function(response) {
			let jobs_array = [];
			radiant.each(response.jobs, function(k, v) {
				if(v.description.enabled){
					jobs_array.push({
						uri: k,
						display_name: v.description.display_name
					});
				}
			});
			self.set('job_list', jobs_array);
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
		if (self._creativeModePlayableKingdomsTrace) {
			self._creativeModePlayableKingdomsTrace.destroy();
			self._creativeModePlayableKingdomsTrace = null;
		}
		if (self._creativeModeNPCKingdomsTrace) {
			self._creativeModeNPCKingdomsTrace.destroy();
			self._creativeModeNPCKingdomsTrace = null;
		}
		if (self._creativeModeJobsTrace) {
			self._creativeModeJobsTrace.destroy();
			self._creativeModeJobsTrace = null;
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
				document.querySelector("#weatherOptions_div").value);
		},
		change_difficulty: function(){
			radiant.call('creative_mode:change_difficulty',
				document.querySelector("#difficultyOptions_div input:checked").id);
		},

		//entities
		teleport_entity: function(){
			radiant.call('creative_mode:teleport_entity', App.stonehearthClient.getSelectedEntity());
		},
		offset_entity: function(){
			radiant.call('creative_mode:offset_entity',
				App.stonehearthClient.getSelectedEntity(),
				parseFloat(document.querySelector("#entities_offset_x_input").value),
				parseFloat(document.querySelector("#entities_offset_y_input").value),
				parseFloat(document.querySelector("#entities_offset_z_input").value)
				);
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

		set_attributes: function(){
			radiant.call('creative_mode:set_attributes',
				App.stonehearthClient.getSelectedEntity(),
				parseInt(document.querySelector("#entities_citizens_mind_input").value),
				parseInt(document.querySelector("#entities_citizens_body_input").value),
				parseInt(document.querySelector("#entities_citizens_spirit_input").value)
				);
		},
		add_citizen: function(){
			radiant.call('creative_mode:add_citizen',
				document.querySelector("#citizenKingdomOptions_div").value
				);
		},
		add_npc: function(){
			radiant.call('creative_mode:add_npc',
				document.querySelector("#npcKingdomOptions_div").value
				);
		},
		turn_into_citizen: function(){
			radiant.call('creative_mode:turn_into_citizen',
				App.stonehearthClient.getSelectedEntity()
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
		promote: function(){
			radiant.call('creative_mode:promote',
				App.stonehearthClient.getSelectedEntity(),
				document.querySelector("#jobOptions_div").value
				);
		},
		spawn_talismans: function(){
			radiant.call('creative_mode:spawn_talismans');
		},
		levelup: function(){
			radiant.call('creative_mode:levelup',
				App.stonehearthClient.getSelectedEntity()
				);
		},
		levelup_town: function(){
			radiant.call('creative_mode:levelup_town');
		},
		levelup_multijobs: function(){
			radiant.call('creative_mode:levelup_multijobs',
				App.stonehearthClient.getSelectedEntity()
				);
		},
		unlock_crops: function(){
			radiant.call('creative_mode:unlock_crops');
		},
		unlock_recipes: function(){
			radiant.call('creative_mode:unlock_recipes');
		},

		//ui
		trees_visibility: function(){
			radiant.call('creative_mode:trees_visibility');
		},
	}
});