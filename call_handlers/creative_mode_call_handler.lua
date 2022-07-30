local validator = radiant.validator
local Point3 = _radiant.csg.Point3

local CreativeModeHandler = class()

function CreativeModeHandler:drop_at_banner(player_id, entity)
	local town = stonehearth.town:get_town(player_id)
	local centroid = town:get_landing_location()
	local spawn_point = radiant.terrain.find_placement_point(centroid, 1, 3)
	radiant.terrain.place_entity(entity, spawn_point)
end

function CreativeModeHandler:get_all_item_uris_command(session, response)
	local uri_map = stonehearth.catalog:get_all_entity_uris()
	local uri_table = {}

	for uri in pairs(uri_map) do
		table.insert(uri_table, uri)
	end

	return uri_table
end

function CreativeModeHandler:remove(session, response, type)
	local deletion_list = {}
	deletion_list[type] = 0
	if type == "water" then
		deletion_list["waterfall"] = 0
	end
	for _, entity in pairs(_radiant.sim.get_all_entities()) do
		for _, target_string in ipairs(radiant.util.split_string(entity:get_uri(), ":")) do
			if deletion_list[target_string] ~= nil then
				radiant.entities.destroy_entity(entity)
			end
		end
	end

	return true
end

function CreativeModeHandler:spawn_item(session, response, item)
	local player_id = session.player_id
	item = "stonehearth:resources:"..item
	local entity = radiant.entities.create_entity(item, { owner = player_id })
	self:drop_at_banner(player_id, entity)

	return true
end

function CreativeModeHandler:hot_reload_server(session, response, entity)
	radiant.resources.reset()
	return true
end

function CreativeModeHandler:hot_reload_client(session, response, entity)
	radiant.resources.reset()
	return true
end

-- data

function CreativeModeHandler:change_weather(session, response, uri)
	if not uri or uri == "" then
		uri = "stonehearth:weather:sunny"
	end
	stonehearth.weather:_switch_to(uri, session.player_id)
	return true
end

function CreativeModeHandler:change_season(session, response, uri)
	stonehearth.weather:_switch_to(uri, session.player_id)
	stonehearth.weather:_switch_to(uri, session.player_id)
	return true
end

function CreativeModeHandler:change_difficulty(session, response, uri)
	stonehearth.game_creation._sv._game_mode_initialized = false
	stonehearth.game_creation:set_game_mode(uri)
	return true
end

-- entities

function CreativeModeHandler:teleport_entity(session, response, entity)
	validator.expect_argument_types({'Entity'}, entity)

	local scale = entity:get_component("render_info"):get_scale()
	local cursor_entity = radiant.entities.create_entity(entity:get_uri())
	cursor_entity:add_component('render_info')
	:set_material('materials/ghost_item.json')
	:set_scale(scale)

	stonehearth.selection:select_location()
	:set_free_rotation(radiant.entities.get_facing(entity))
	:set_rotation_disabled(true)
	:set_cursor_entity(cursor_entity)
	:set_filter_fn(function (result, selector)
		local normal = result.normal:to_int()
		local location = result.brick:to_int()

		if normal.y ~= 1 then
			return stonehearth.selection.FILTER_IGNORE
		end
		if not radiant.terrain.is_standable(location) then
			return stonehearth.selection.FILTER_IGNORE
		end
		return true
	end)
	:done(function(selector, location, rotation)
		_radiant.call('stonehearth:reset_entity', entity, location.x, location.y, location.z)
		:always(function()
			selector:destroy()
		end)
		response:resolve({})
	end)
	:fail(function(selector)
		selector:destroy()
		response:reject('no location')
	end)
	:always(function()
		radiant.entities.destroy_entity(cursor_entity)
	end)
	:go()
end

function CreativeModeHandler:offset_entity(session, response, entity, x,y,z)
	if not entity then
		return false
	end
	local mob = entity:add_component('mob')
	mob:set_model_origin(Point3(x, y, z))
	mob:move_to(mob:get_world_location())
	return true
end

function CreativeModeHandler:change_scale(session, response, entity, scale)
	if not entity then
		return false
	end
	entity:get_component("render_info"):set_scale(scale)
	return true
end

function CreativeModeHandler:rotate_entity_command(session, response, entity, degrees)
	if not entity then
		return false
	end
	radiant.entities.turn_to(entity, degrees)
	local destination_component = entity:get_component('destination')
	if destination_component then
		destination_component:set_region(destination_component:get_region())
	end

	local region_collision_shape_component = entity:get_component('region_collision_shape')
	if region_collision_shape_component then
		region_collision_shape_component:set_region(region_collision_shape_component:get_region())
	end
	return true
end

function CreativeModeHandler:set_attributes(session, response, entity, mind, body, spirit)
	if not entity then
		return false
	end
	radiant.entities.set_attribute(entity, "mind", mind)
	radiant.entities.set_attribute(entity, "body", body)
	radiant.entities.set_attribute(entity, "spirit", spirit)
	return true
end

function CreativeModeHandler:add_citizen(session, response, kingdom)
	local player_id = session.player_id
	local pop = stonehearth.population:get_population(player_id)
	if not kingdom or kingdom == "" then
		kingdom = stonehearth.player:get_kingdom(player_id)
	end
	local citizen = pop:create_new_foreign_citizen(kingdom)

	local job_component = citizen:get_component('stonehearth:job')
	job_component:promote_to('stonehearth:jobs:worker', {skip_visual_effects=true})

	self:drop_at_banner(player_id, citizen)

	return true
end

function CreativeModeHandler:add_npc(session, response, kingdom)
	local player_id = session.player_id
	local pop = stonehearth.population:get_population(player_id)
	if not kingdom or kingdom == "" then
		kingdom = "stonehearth:kingdoms:amberstone"
	end
	local foreign_pop_json = radiant.resources.load_json(kingdom)
	local role = radiant.get_random_map_key(foreign_pop_json.roles)
	local role_data = foreign_pop_json.roles[role]
	local gender = pop:_pick_random_gender()
	local citizen = pop:_generate_citizen_from_role(role, role_data, gender)
	pop:_set_citizen_initial_state(citizen, gender, role_data, {})

	self:drop_at_banner(player_id, citizen)
	radiant.entities.set_player_id(citizen, player_id)

	return true
end

-- inventory

function CreativeModeHandler:add_gold(session, response, gold_amount)
	local inventory = stonehearth.inventory:get_inventory(session.player_id)

	if inventory == nil then
		return
	end

	if (gold_amount > 0) then
		pcall(function()
			inventory:add_gold(gold_amount)
		end)
	else
		gold_amount = -gold_amount;
		inventory:subtract_gold(gold_amount)
	end
	return true
end

function CreativeModeHandler:spawn_trader(session, response)
	local population = stonehearth.population:get_population(session.player_id)
	local city_tier = population:get_city_tier() or 0
	if city_tier < 1 then
		city_tier = 1
	end
	stonehearth.game_master:get_game_master(session.player_id):debug_trigger_campaign_encounter({
		campaign_name = 'trader',
		encounter_name = 'tier_' .. city_tier .. '_shops',
		arc = 'trigger'
	})
	return true
end

function CreativeModeHandler:spawn_traveler(session, response)
	local town = stonehearth.town:get_town(session.player_id)
	town:spawn_traveler()
	return true
end

-- jobs

function CreativeModeHandler:spawn_talismans(session, response)
	local player_id = session.player_id
	local all_uris = stonehearth.catalog:get_all_entity_uris()
	for k,v in pairs(all_uris) do
		local uri_parts = radiant.util.split_string(k, ":")
		if uri_parts[3] == "talisman" then
			local talisman = radiant.entities.create_entity(k, { owner = player_id })
			self:drop_at_banner(player_id, talisman)
		end
	end
	local talisman = radiant.entities.create_entity("stonehearth:footman:wooden_sword_talisman", { owner = player_id })
	self:drop_at_banner(player_id, talisman)
	return true
end

function CreativeModeHandler:levelup(session, response)
	local population = stonehearth.population:get_population(session.player_id)
	for _, citizen in population:get_citizens():each() do
		local job_component = citizen:get_component('stonehearth:job')
		for i=2,6 do
			if not job_component:is_max_level() then
				job_component:level_up(true)
			end
		end
	end
	return true
end

function CreativeModeHandler:unlock_crops(session, response)
	local farmer_job_info = stonehearth.job:get_job_info(session.player_id, "stonehearth:jobs:farmer")

	if farmer_job_info.manually_unlock_all_crops then
		-- if there is ace stuff, use this instead
		farmer_job_info:manually_unlock_all_crops()
		return true
	end

	local all_crops = stonehearth.farming._all_crops
	for key,value in pairs(all_crops) do
		farmer_job_info._sv.manually_unlocked[key] = true
	end
	
	farmer_job_info.__saved_variables:mark_changed()
	return true
end

function CreativeModeHandler:unlock_recipes(session, response)
	local job_index = stonehearth.player:get_jobs(session.player_id)
	for alias,data in pairs(job_index) do
		local job_info = stonehearth.job:get_job_info(session.player_id, alias)
		if job_info._sv.recipe_list then
			for category, category_data in pairs(job_info._sv.recipe_list) do
				if category_data.recipes then
					for recipe_short_key, recipe_data in pairs(category_data.recipes) do
						if recipe_data.recipe and recipe_data.recipe.recipe_key then
							job_info._sv.manually_unlocked[recipe_data.recipe.recipe_key] = true
						end
					end
				end
			end
		end
		job_info.__saved_variables:mark_changed()
	end

	return true
end

return CreativeModeHandler