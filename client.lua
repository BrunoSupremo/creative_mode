swamp_goblins = {}

radiant.events.listen(swamp_goblins, 'radiant:init', function()
	radiant.events.listen(radiant, 'radiant:client:server_ready', function()
		local custom_entity_or_location_selector = require('services.client.selection.custom_entity_or_location_selector')
		local entity_or_location_selector = radiant.mods.require('stonehearth.services.client.selection.entity_or_location_selector')
		radiant.mixin(entity_or_location_selector, custom_entity_or_location_selector)
	end)
end)

return swamp_goblins