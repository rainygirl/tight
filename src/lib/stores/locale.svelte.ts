export const LANGUAGES = [
	{ code: 'ko', label: '한국어' },
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Español' },
	{ code: 'fr', label: 'Français' },
	{ code: 'ja', label: '日本語' },
	{ code: 'zh-Hans', label: '中文（简体）' },
	{ code: 'zh-Hant', label: '中文（繁體）' },
	{ code: 'yue', label: '廣東話' },
	{ code: 'vi', label: 'Tiếng Việt' },
	{ code: 'id', label: 'Bahasa Indonesia' },
] as const;

export type LangCode = typeof LANGUAGES[number]['code'];

function createLocaleStore() {
	let code = $state<LangCode>('ko');

	return {
		get code() { return code; },
		get label() { return LANGUAGES.find(l => l.code === code)?.label ?? code; },
		init() {
			if (typeof window === 'undefined') return;
			const saved = localStorage.getItem('locale') as LangCode | null;
			if (saved && LANGUAGES.some(l => l.code === saved)) code = saved;
		},
		set(c: LangCode) {
			code = c;
			localStorage.setItem('locale', c);
		}
	};
}

export const localeStore = createLocaleStore();
