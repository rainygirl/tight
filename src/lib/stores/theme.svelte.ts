function createThemeStore() {
	let dark = $state(false);

	function apply(isDark: boolean) {
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
	}

	return {
		get dark() {
			return dark;
		},
		init() {
			if (typeof window === 'undefined') return;
			dark = localStorage.getItem('theme') === 'dark';
			apply(dark);
		},
		toggle() {
			dark = !dark;
			localStorage.setItem('theme', dark ? 'dark' : 'light');
			apply(dark);
		}
	};
}

export const themeStore = createThemeStore();
