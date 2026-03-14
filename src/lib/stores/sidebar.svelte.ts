let _open = $state(false);

export const sidebarStore = {
	get isOpen() { return _open; },
	show() { _open = true; },
	hide() { _open = false; },
	toggle() { _open = !_open; }
};
