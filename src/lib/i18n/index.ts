import { localeStore } from '$lib/stores/locale.svelte';
import translations from './translations';

// 날짜/시간 포매팅에 쓸 BCP 47 로케일 태그
const TIME_LOCALE: Record<string, string> = {
	ko:       'ko-KR',
	en:       'en-US',
	es:       'es-ES',
	fr:       'fr-FR',
	ja:       'ja-JP',
	'zh-Hans':'zh-Hans-CN',
	'zh-Hant':'zh-Hant-TW',
	yue:      'zh-HK',
	vi:       'vi-VN',
	id:       'id-ID',
};

/**
 * 현재 로케일의 번역 문자열을 반환합니다.
 * vars 객체를 넘기면 #{key} 플레이스홀더를 치환합니다.
 *
 * Svelte 5 템플릿에서 {t('key')} 형태로 사용하면
 * localeStore.code($state)가 바뀔 때 자동으로 리렌더링됩니다.
 */
export function t(key: string, vars?: Record<string, string>): string {
	const dict = translations[localeStore.code] ?? translations['ko'];
	let str = dict[key] ?? translations['ko'][key] ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			str = str.replaceAll(`#{${k}}`, v);
		}
	}
	return str;
}

/** 현재 로케일에 맞는 BCP 47 태그 (toLocaleTimeString 등에 사용) */
export function timeLocale(): string {
	return TIME_LOCALE[localeStore.code] ?? 'ko-KR';
}
