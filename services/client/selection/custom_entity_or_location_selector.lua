local CreativeModeEntityOrLocationSelector = class()

function CreativeModeEntityOrLocationSelector:set_free_rotation(rotation)
	self._rotation = rotation
	self:_update_cursor_rotation()

	if self._can_select_locations and self._pt then
		self:notify(self._pt, self._rotation)
	end
	return self
end

return CreativeModeEntityOrLocationSelector