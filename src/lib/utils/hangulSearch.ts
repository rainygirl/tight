/**
 * 한글 초중종성 검색 유틸리티
 * 원본: ~/Workspace/restaurant.coroke.net/restaurant/html/report/hangul-search.js
 *
 * 규칙:
 *  1. 마지막 글자만 IME 조합 중 상태로 처리
 *  2. 마지막이 단독 자음(ㄱ~ㅎ) → 해당 초성 음절 전체 범위  예) ㅁ → [마-밓]
 *  3. 마지막이 종성 없는 음절 → 같은 초+중에서 종성 0~27 허용  예) 기 → [기-깋]
 *  4. 마지막이 종성 있는 음절 → 정확히 그 글자 OR 종성을 다음 초성으로 분리
 *     예) 긱 → (?:긱|기[가-낗])
 *  5. 중간 글자 → 정확히 매칭
 */

const HANGUL_START = 0xac00; // 가

// 종성 인덱스 → 초성 인덱스 (단일 자음 받침만; 겹받침 제외)
const JONG_TO_CHO: Record<number, number> = {
	1: 0,   // ㄱ
	2: 1,   // ㄲ
	4: 2,   // ㄴ
	7: 3,   // ㄷ
	8: 5,   // ㄹ
	16: 6,  // ㅁ
	17: 7,  // ㅂ
	19: 9,  // ㅅ
	20: 10, // ㅆ
	21: 11, // ㅇ
	22: 12, // ㅈ
	23: 14, // ㅊ
	24: 15, // ㅋ
	25: 16, // ㅌ
	26: 17, // ㅍ
	27: 18, // ㅎ
};

// 한글 호환 자모 자음 → 초성 인덱스 (U+3131 ~ U+314E)
const JAMO_TO_CHO: Record<number, number> = {
	0x3131: 0,  // ㄱ
	0x3132: 1,  // ㄲ
	0x3134: 2,  // ㄴ
	0x3137: 3,  // ㄷ
	0x3138: 4,  // ㄸ
	0x3139: 5,  // ㄹ
	0x3141: 6,  // ㅁ
	0x3142: 7,  // ㅂ
	0x3143: 8,  // ㅃ
	0x3145: 9,  // ㅅ
	0x3146: 10, // ㅆ
	0x3147: 11, // ㅇ
	0x3148: 12, // ㅈ
	0x3149: 13, // ㅉ
	0x314a: 14, // ㅊ
	0x314b: 15, // ㅋ
	0x314c: 16, // ㅌ
	0x314d: 17, // ㅍ
	0x314e: 18, // ㅎ
};

function escRx(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function choRange(choIdx: number): string {
	const base = HANGUL_START + choIdx * 21 * 28;
	return `[${String.fromCharCode(base)}-${String.fromCharCode(base + 20 * 28 + 27)}]`;
}

export function buildKoreanSearchPattern(query: string): string {
	if (!query) return '';
	let pattern = '';

	for (let i = 0; i < query.length; i++) {
		const ch = query[i];
		const code = ch.charCodeAt(0);
		const isLast = i === query.length - 1;

		// 단독 자음 자모 (ㄱ~ㅎ 호환 영역)
		if (code >= 0x3131 && code <= 0x314e) {
			const choIdx = JAMO_TO_CHO[code];
			if (choIdx !== undefined && isLast) {
				pattern += choRange(choIdx);
			} else {
				pattern += escRx(ch);
			}
			continue;
		}

		// 한글 음절 범위 바깥 (영문·숫자·특수문자 등)
		if (code < 0xac00 || code > 0xd7a3) {
			pattern += escRx(ch);
			continue;
		}

		// 한글 음절, 중간 글자 → 정확히 매칭
		if (!isLast) {
			pattern += escRx(ch);
			continue;
		}

		// 한글 음절, 마지막 글자
		const offset = code - HANGUL_START;
		const jong = offset % 28;
		const jung = Math.floor(offset / 28) % 21;
		const cho = Math.floor(offset / (21 * 28));
		const base = HANGUL_START + cho * 21 * 28 + jung * 28;

		if (jong === 0) {
			// 종성 없음: 아직 미입력 상태일 수 있으므로 0~27 전부 허용  예) 기 → [기-깋]
			pattern += `[${String.fromCharCode(base)}-${String.fromCharCode(base + 27)}]`;
		} else {
			// 종성 있음: 정확히 이 글자 OR 종성을 다음 초성으로 분리  예) 긱 → (?:긱|기[가-낗])
			const altExact = escRx(String.fromCharCode(base + jong));
			const choIdxFromJong = JONG_TO_CHO[jong];
			const altSplit = choIdxFromJong !== undefined
				? escRx(String.fromCharCode(base)) + choRange(choIdxFromJong)
				: '';
			pattern += altSplit ? `(?:${altExact}|${altSplit})` : altExact;
		}
	}

	return pattern;
}

export function matchKorean(query: string, text: string): boolean {
	if (!query) return true;
	if (!text) return false;
	try {
		const pat = buildKoreanSearchPattern(query);
		return pat ? new RegExp(pat, 'i').test(text) : text.toLowerCase().includes(query.toLowerCase());
	} catch {
		return text.toLowerCase().includes(query.toLowerCase());
	}
}
