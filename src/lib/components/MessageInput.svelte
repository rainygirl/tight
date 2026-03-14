<script lang="ts">
	import { onMount } from 'svelte';
	import { matchKorean } from '$lib/utils/hangulSearch';
	import { t } from '$lib/i18n';

	interface Member { id: string; name: string; avatarUrl: string | null; }
	interface Channel { id: string; name: string; }

	let {
		channelName,
		onSend,
		members = [],
		channels = [],
		workspaceSlug = ''
	}: {
		channelName: string;
		onSend: (body: string, imageUrl?: string) => void;
		members?: Member[];
		channels?: Channel[];
		workspaceSlug?: string;
	} = $props();

	let uploading = $state(false);

	onMount(() => editorEl?.focus());
	let pendingImageUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let editorEl: HTMLDivElement;
	let editorEmpty = $state(true);

	// 링크 입력
	let showLinkInput = $state(false);
	let linkInputEl: HTMLInputElement;
	let linkInputValue = $state('');
	let savedSelection: Range | null = null;

	// IME 조합 상태
	let composing = false;

	// 멘션 자동완성
	let currentMentionQuery = ''; // 현재 @뒤 쿼리 (IME 조합 중에도 추적)
	let pendingSelectMember = false; // IME 조합 중 Enter → compositionend 후 선택 실행
	let showPicker = $state(false);
	let pickerIndex = $state(0);
	let pickerEl: HTMLDivElement;
	let filtered = $state<Member[]>([]);

	function updateFiltered(query: string) {
		filtered = query === ''
			? members.slice(0, 8)
			: members.filter((m) => matchKorean(query, m.name)).slice(0, 8);
	}

	// 채널 자동완성
	let currentChannelQuery = '';
	let showChannelPicker = $state(false);
	let channelPickerIndex = $state(0);
	let channelPickerEl: HTMLDivElement;
	let filteredChannels = $state<Channel[]>([]);

	function updateFilteredChannels(query: string) {
		filteredChannels = query === ''
			? channels.slice(0, 8)
			: channels.filter((c) => c.name.includes(query.toLowerCase())).slice(0, 8);
	}

	$effect(() => {
		if (!showChannelPicker) return;
		function onKey(e: KeyboardEvent) {
			const len = filteredChannels.length;
			if (len === 0) return;
			if (e.key === 'ArrowDown') {
				e.preventDefault(); e.stopPropagation();
				channelPickerIndex = (channelPickerIndex + 1) % len;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault(); e.stopPropagation();
				channelPickerIndex = (channelPickerIndex - 1 + len) % len;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault(); e.stopPropagation();
				const ch = filteredChannels[channelPickerIndex];
				if (ch) setTimeout(() => selectChannel(ch), 0);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				showChannelPicker = false;
			}
		}
		window.addEventListener('keydown', onKey, { capture: true });
		return () => window.removeEventListener('keydown', onKey, { capture: true });
	});

	$effect(() => {
		if (!showChannelPicker || !channelPickerEl) return;
		channelPickerEl.querySelectorAll<HTMLElement>('.channel-item')[channelPickerIndex]
			?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});

	function selectChannel(channel: Channel) {
		editorEl.focus();
		const sel = window.getSelection();
		if (!sel) return;

		const deleteLen = 1 + currentChannelQuery.length; // # + query
		for (let i = 0; i < deleteLen; i++) {
			sel.modify('extend', 'backward', 'character');
		}
		const range = sel.getRangeAt(0);
		range.deleteContents();

		const span = document.createElement('span');
		span.className = 'editor-channel';
		span.setAttribute('data-id', channel.id);
		span.setAttribute('contenteditable', 'false');
		span.textContent = `#${channel.name}`;
		range.insertNode(span);

		const space = document.createTextNode(' ');
		span.after(space);
		const r = document.createRange();
		r.setStart(space, space.length);
		r.collapse(true);
		sel.removeAllRanges();
		sel.addRange(r);

		showChannelPicker = false;
		currentChannelQuery = '';
		editorEmpty = false;
		isBoldActive = false;
	}

	$effect(() => {
		if (!showPicker) return;

		function onKey(e: KeyboardEvent) {
			const len = filtered.length;
			if (len === 0) return;
			if (e.key === 'ArrowDown') {
				e.preventDefault(); e.stopPropagation();
				pickerIndex = (pickerIndex + 1) % len;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault(); e.stopPropagation();
				pickerIndex = (pickerIndex - 1 + len) % len;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault(); e.stopPropagation();
				if (e.isComposing) {
					// IME 조합 중: 조합 완료 후 선택하도록 플래그만 세움
					// (compositionend → onCompositionEnd에서 실행)
					pendingSelectMember = true;
				} else if (!pendingSelectMember) {
					// pendingSelectMember가 이미 세워진 경우: @ㄱ처럼 IME 조합 중 Enter를 누르면
					// isComposing=true keydown → pendingSelectMember=true → compositionend →
					// isComposing=false keydown 순서로 이벤트가 두 번 오는데,
					// 두 번째에서 또 selectMember를 예약하면 더블 멘션이 발생하므로 건너뜀
					const m = filtered[pickerIndex];
					if (m) setTimeout(() => selectMember(m), 0);
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				showPicker = false;
				pendingSelectMember = false;
			}
		}

		window.addEventListener('keydown', onKey, { capture: true });
		return () => window.removeEventListener('keydown', onKey, { capture: true });
	});

	$effect(() => {
		if (!showPicker || !pickerEl) return;
		pickerEl.querySelectorAll<HTMLElement>('.mention-item')[pickerIndex]
			?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});

	// 에디터 커서 앞 전체 텍스트 반환 (IME 조합 중 span 포함)
	// - endContainer/endOffset: composition span이 있을 때 start는 span 앞을 가리킬 수 있으므로 end 기준
	// - normalize('NFC'): macOS IME가 NFD 분리 자모(U+1100–11FF)로 쓰는 경우 완성형으로 변환
	function getTextBeforeCursor(): string {
		const sel = window.getSelection();
		if (!sel?.rangeCount) return '';
		const range = sel.getRangeAt(0);
		const pre = range.cloneRange();
		pre.selectNodeContents(editorEl);
		pre.setEnd(range.endContainer, range.endOffset);
		return pre.toString().normalize('NFC');
	}

	function onInput() {
		editorEmpty = !(editorEl?.textContent?.trim());
		// 한글 IME 조합 중에는 oninput이 DOM 업데이트보다 먼저 발생하므로 defer
		setTimeout(() => {
			checkMention();
			if (!composing) checkMarkdown();
		}, 0);
	}

	// ** 마크다운 굵게 자동변환
	// 커서 직전 텍스트에서 **text** 패턴을 감지하면 <strong>으로 치환
	function checkMarkdown() {
		const sel = window.getSelection();
		if (!sel?.rangeCount || !sel.isCollapsed) return;
		const range = sel.getRangeAt(0);
		if (range.startContainer.nodeType !== Node.TEXT_NODE) return;

		const textNode = range.startContainer as Text;
		const offset = range.startOffset;
		const before = (textNode.textContent ?? '').slice(0, offset);

		const match = before.match(/\*\*([^*\n]+)\*\*$/);
		if (!match) return;

		const inner = match[1];
		const matchStart = offset - match[0].length;

		// afterNode: 텍스트 중 커서 이후 부분
		const afterNode = textNode.splitText(offset);
		// textNode를 match 시작점에서 잘라냄
		textNode.textContent = (textNode.textContent ?? '').slice(0, matchStart);

		const strong = document.createElement('strong');
		strong.textContent = inner;
		textNode.parentNode?.insertBefore(strong, afterNode);

		// 커서를 strong 바로 뒤로
		const newRange = document.createRange();
		if (afterNode.length > 0) {
			newRange.setStart(afterNode, 0);
		} else {
			newRange.setStartAfter(strong);
		}
		newRange.collapse(true);
		sel.removeAllRanges();
		sel.addRange(newRange);
		updateToolbarState();
	}

	// IME 조합 완료 후 재갱신 + 대기 중인 멘션 선택 실행
	function onCompositionEnd() {
		composing = false;
		setTimeout(() => {
			checkMention();
			if (pendingSelectMember && showPicker) {
				pendingSelectMember = false;
				const m = filtered[pickerIndex];
				if (m) selectMember(m);
			} else {
				pendingSelectMember = false;
			}
		}, 0);
	}

	function checkMention() {
		const sel = window.getSelection();
		if (!sel?.rangeCount) { showPicker = false; showChannelPicker = false; return; }

		const textBefore = getTextBeforeCursor();

		// 채널 자동완성 (#)
		const channelMatch = textBefore.match(/#(\S*)$/);
		if (channelMatch) {
			currentChannelQuery = channelMatch[1];
			updateFilteredChannels(channelMatch[1]);
			channelPickerIndex = 0;
			showChannelPicker = filteredChannels.length > 0;
			showPicker = false;
			currentMentionQuery = '';
			return;
		}
		showChannelPicker = false;

		// 멘션 자동완성 (@)
		const match = textBefore.match(/@(\S*)$/);
		if (match) {
			currentMentionQuery = match[1];
			updateFiltered(match[1]);
			pickerIndex = 0;
			showPicker = filtered.length > 0;
		} else {
			showPicker = false;
			currentMentionQuery = '';
		}
	}

	function selectMember(member: Member) {
		editorEl.focus();
		const sel = window.getSelection();
		if (!sel) return;

		// Selection.modify으로 "@쿼리" 길이만큼 뒤로 확장 (node 경계 무관하게 동작)
		const deleteLen = 1 + currentMentionQuery.length; // @ + query
		for (let i = 0; i < deleteLen; i++) {
			sel.modify('extend', 'backward', 'character');
		}

		const range = sel.getRangeAt(0);
		range.deleteContents();

		const span = document.createElement('span');
		span.className = 'editor-mention';
		span.setAttribute('data-id', member.id);
		span.setAttribute('contenteditable', 'false');
		span.textContent = `@${member.name}`;
		range.insertNode(span);

		const space = document.createTextNode(' ');
		span.after(space);

		// 커서를 공백 뒤로 이동하는 함수
		// - 동기적으로 즉시 실행: 이벤트 처리 중 다른 코드가 커서를 읽을 때 올바른 위치 반환
		// - requestAnimationFrame으로 재실행: Enter keydown 이벤트 완료 후 Chrome이 selection을
		//   이벤트 전 상태로 되돌리는 경우, 공백 앞/멘션 span 내부에 커서가 놓여
		//   한글 첫 자음이 contenteditable=false span 안에 삽입되어 사라지는 것을 방지
		const placeCursor = () => {
			const r = document.createRange();
			r.setStart(space, space.length);
			r.collapse(true);
			const s = window.getSelection();
			s?.removeAllRanges();
			s?.addRange(r);
		};

		placeCursor();

		showPicker = false;
		currentMentionQuery = '';
		editorEmpty = false;
		isBoldActive = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.isComposing) return; // IME 조합 중 무시 (한글 입력 등)
		if (showPicker) return;
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	// 툴바 상태 (커서 위치 기준)
	let isBoldActive = $state(false);

	let editorFocused = $state(false);

	function updateToolbarState() {
		// 에디터에 포커스가 있을 때만 bold 상태 반영
		if (editorFocused) isBoldActive = document.queryCommandState('bold');
		else isBoldActive = false;
	}

	$effect(() => {
		document.addEventListener('selectionchange', updateToolbarState);
		return () => document.removeEventListener('selectionchange', updateToolbarState);
	});

	// 툴바: 굵게
	function handleBold(e: MouseEvent) {
		e.preventDefault();
		document.execCommand('bold');
		editorEl.focus();
		updateToolbarState();
	}

	// 툴바: 링크
	function handleLinkBtn(e: MouseEvent) {
		e.preventDefault();
		const sel = window.getSelection();
		if (sel?.rangeCount) {
			savedSelection = sel.getRangeAt(0).cloneRange();
		}
		linkInputValue = '';
		showLinkInput = true;
	}

	function confirmLink() {
		const raw = linkInputValue.trim();
		showLinkInput = false;
		if (!raw) { editorEl.focus(); return; }

		const href = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;

		editorEl.focus();
		if (savedSelection) {
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(savedSelection);
		}

		const sel = window.getSelection();
		const a = document.createElement('a');
		a.href = href;

		if (sel && !sel.isCollapsed) {
			const range = sel.getRangeAt(0);
			try {
				const fragment = range.extractContents();
				a.appendChild(fragment);
				range.insertNode(a);
			} catch {
				a.textContent = href;
				range.deleteContents();
				range.insertNode(a);
			}
		} else {
			a.textContent = href;
			const range = sel?.getRangeAt(0) ?? document.createRange();
			range.insertNode(a);
		}

		const space = document.createTextNode(' ');
		a.after(space);
		const newRange = document.createRange();
		newRange.setStartAfter(space);
		newRange.collapse(true);
		sel?.removeAllRanges();
		sel?.addRange(newRange);

		savedSelection = null;
		editorEmpty = false;
	}

	function cancelLink() {
		showLinkInput = false;
		editorEl.focus();
	}

	function handleLinkKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); confirmLink(); }
		if (e.key === 'Escape') { e.preventDefault(); cancelLink(); }
	}

	function focusOnMount(el: HTMLElement) {
		requestAnimationFrame(() => el.focus());
	}

	// 직렬화
	function serializeNode(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return (node.textContent ?? '').replace(/\u00A0/g, ' ');
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return '';
		const el = node as HTMLElement;
		const tag = el.tagName.toLowerCase();
		const ch = () => [...el.childNodes].map(serializeNode).join('');

		if (tag === 'br') return '\n';
		if (tag === 'div' || tag === 'p') return '\n' + ch();
		if (tag === 'strong' || tag === 'b') return `**${ch()}**`;
		if (tag === 'a') {
			const href = el.getAttribute('href') ?? '';
			const text = ch();
			return text === href ? href : `[${text}](${href})`;
		}
		if (el.classList.contains('editor-mention')) {
			const id = el.getAttribute('data-id') ?? '';
			const name = el.textContent?.replace(/^@/, '') ?? '';
			return `@[${id}:${name}]`;
		}
		if (el.classList.contains('editor-channel')) {
			const id = el.getAttribute('data-id') ?? '';
			const name = el.textContent?.replace(/^#/, '') ?? '';
			return `#[${id}:${name}]`;
		}
		return ch();
	}

	function serialize(): string {
		if (!editorEl) return '';
		const raw = [...editorEl.childNodes].map(serializeNode).join('');
		return raw.replace(/^\n/, '').trimEnd();
	}

	function submit() {
		const body = serialize();
		if (!body && !pendingImageUrl) return;
		onSend(body, pendingImageUrl ?? undefined);
		editorEl.innerHTML = '';
		pendingImageUrl = null;
		showPicker = false;
		editorEmpty = true;
		editorEl.focus();
	}

	// 붙여넣기 sanitize
	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const html = e.clipboardData?.getData('text/html') ?? '';
		const plain = e.clipboardData?.getData('text/plain') ?? '';

		let insertHtml: string;
		if (html) {
			insertHtml = sanitizePasteHtml(html);
		} else {
			insertHtml = escapeHtml(plain).replace(/\n/g, '<br>');
		}
		document.execCommand('insertHTML', false, insertHtml);
		onInput();
	}

	function sanitizePasteHtml(html: string): string {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		return sanitizePasteNode(doc.body);
	}

	function sanitizePasteNode(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '');
		if (node.nodeType !== Node.ELEMENT_NODE) return '';
		const el = node as HTMLElement;
		const tag = el.tagName.toLowerCase();
		const ch = () => [...el.childNodes].map(sanitizePasteNode).join('');

		if (tag === 'br') return '<br>';
		if (tag === 'strong' || tag === 'b') return `<strong>${ch()}</strong>`;
		if (tag === 'a') {
			const href = el.getAttribute('href') ?? '';
			if (/^https?:\/\//.test(href)) {
				return `<a href="${escapeAttr(href)}">${ch()}</a>`;
			}
			return ch();
		}
		if (tag === 'p' || tag === 'div') {
			const c = ch();
			return c ? c + '<br>' : '';
		}
		if (tag === 'li') return ch() + '<br>';
		if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return `<strong>${ch()}</strong><br>`;
		return ch();
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
	function escapeAttr(s: string): string {
		return s.replace(/"/g, '&quot;');
	}

	async function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) { alert(t('input.imageOnly')); return; }
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) throw new Error();
			const { publicUrl } = await res.json();
			pendingImageUrl = publicUrl;
		} catch {
			alert(t('input.uploadFail'));
		} finally {
			uploading = false;
			fileInput.value = '';
		}
	}
</script>

<div class="input-area">
	{#if pendingImageUrl}
		<div class="image-preview">
			<img src={pendingImageUrl} alt="첨부 이미지" />
			<button class="remove-image" onclick={() => (pendingImageUrl = null)}>✕</button>
		</div>
	{/if}

	{#if showChannelPicker && filteredChannels.length > 0}
		<div class="mention-picker" bind:this={channelPickerEl}>
			{#each filteredChannels as channel, i}
				<button
					class="mention-item"
					class:active={i === channelPickerIndex}
					onmousedown={(e) => { e.preventDefault(); selectChannel(channel); }}
				>
					<span class="channel-hash">#</span>
					<span>{channel.name}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if showPicker && filtered.length > 0}
		<div class="mention-picker" bind:this={pickerEl}>
			{#each filtered as member, i}
				<button
					class="mention-item"
					class:active={i === pickerIndex}
					onmousedown={(e) => { e.preventDefault(); selectMember(member); }}
				>
					{#if member.avatarUrl}
						<img src={member.avatarUrl} alt={member.name} class="mention-avatar" />
					{:else}
						<div class="mention-avatar-placeholder">{member.name[0].toUpperCase()}</div>
					{/if}
					<span>{member.name}</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="input-wrapper" onclick={() => editorEl?.focus()} role="none">
		<!-- 툴바 -->
		<div class="toolbar">
			<button class="toolbar-btn" class:active={isBoldActive} onmousedown={handleBold} title={t('input.boldTitle')}>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M3 2h5a3 3 0 0 1 0 6H3V2zm0 6h5.5a3 3 0 0 1 0 6H3V8z" fill="currentColor"/>
				</svg>
				<span>{t('input.bold')}</span>
			</button>
			<button class="toolbar-btn" onmousedown={handleLinkBtn} title={t('input.linkTitle')}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
					<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
				</svg>
				<span>{t('input.link')}</span>
			</button>
			<div class="toolbar-divider"></div>
			<button class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); fileInput.click(); }} disabled={uploading} title={t('input.fileTitle')}>
				{#if uploading}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/>
					</svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
					</svg>
				{/if}
				<span>{t('input.file')}</span>
			</button>
		</div>

		<div
			class="editor"
			class:is-empty={editorEmpty}
			contenteditable="true"
			bind:this={editorEl}
			data-placeholder={t('input.placeholder', { name: channelName })}
			onkeydown={handleKeydown}
			oninput={onInput}
			oncompositionstart={() => { composing = true; }}
			oncompositionend={onCompositionEnd}
			onpaste={handlePaste}
			onfocus={() => { editorFocused = true; updateToolbarState(); }}
			onblur={() => { editorFocused = false; isBoldActive = false; }}
			role="textbox"
			aria-multiline="true"
		></div>

		<div class="input-footer">
			<button class="send-btn" onclick={submit} disabled={editorEmpty && !pendingImageUrl}>
				{t('input.send')}
			</button>
		</div>
	</div>

	<input bind:this={fileInput} type="file" accept="image/*" style="display:none" onchange={handleFileChange} />
</div>

{#if showLinkInput}
	<div class="link-modal-overlay" onclick={cancelLink} role="presentation">
		<div class="link-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<div class="link-modal-title">{t('input.linkTitle')}</div>
			<input
				bind:this={linkInputEl}
				bind:value={linkInputValue}
				class="link-modal-input"
				placeholder={t('input.urlPh')}
				type="url"
				onkeydown={handleLinkKeydown}
				use:focusOnMount
			/>
			<div class="link-modal-actions">
				<button class="link-modal-cancel" onclick={cancelLink}>{t('nick.cancel')}</button>
				<button class="link-modal-confirm" onclick={confirmLink}>{t('input.confirm')}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.input-area {
		padding: 12px 20px 20px;
		border-top: 1px solid var(--border-color);
		position: relative;
		background: var(--main-bg);
	}

	@media (max-width: 768px) {
		.input-area { padding: 8px 12px 16px; }
	}

	.image-preview {
		position: relative;
		display: inline-block;
		margin-bottom: 8px;
	}

	.image-preview img {
		max-height: 120px;
		max-width: 200px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		display: block;
	}

	.remove-image {
		position: absolute;
		top: -8px;
		right: -8px;
		background: #e01e5a;
		color: #fff;
		border: none;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		font-size: 11px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* 멘션 피커 */
	.mention-picker {
		position: absolute;
		bottom: calc(100% - 8px);
		left: 20px;
		right: 20px;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		box-shadow: 0 -4px 16px rgba(0,0,0,0.12);
		overflow-y: auto;
		max-height: 240px;
		z-index: 100;
	}

	.mention-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 14px;
		color: var(--text-primary);
		text-align: left;
		transition: background 0.1s, color 0.1s;
	}

	.mention-item:hover { background: var(--hover-bg); }

	.mention-item.active {
		background: var(--sidebar-active);
		color: #fff;
	}

	.mention-item.active .mention-avatar-placeholder {
		background: rgba(255, 255, 255, 0.25);
	}

	.mention-avatar {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.mention-avatar-placeholder {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		background: var(--sidebar-active);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* 입력 래퍼 */
	.input-wrapper {
		border: 1px solid var(--input-border);
		border-radius: 8px;
		background: var(--input-bg);
		transition: border-color 0.15s;
		overflow: hidden;
	}

	.input-wrapper:focus-within {
		border-color: var(--input-border-focus);
		box-shadow: 0 0 0 3px rgba(18, 100, 163, 0.15);
	}

	/* 툴바 */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--border-color);
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 7px;
		border-radius: 4px;
		font-size: 12px;
		color: var(--text-secondary);
		transition: background 0.1s, color 0.1s;
		flex-shrink: 0;
	}

	.toolbar-btn:hover:not(:disabled) {
		background: var(--hover-bg);
		color: var(--text-primary);
	}

	.toolbar-btn.active {
		background: var(--hover-bg);
		color: var(--text-primary);
		font-weight: 700;
	}

	.toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.toolbar-divider {
		width: 1px;
		height: 16px;
		background: var(--border-color);
		margin: 0 4px;
		flex-shrink: 0;
	}

	/* 링크 모달 */
	.link-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.65);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.link-modal {
		background: var(--main-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		width: 360px;
		padding: 20px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.2);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.link-modal-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.link-modal-input {
		width: 100%;
		padding: 9px 12px;
		border: 1px solid var(--input-border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--input-bg);
		color: var(--text-primary);
		outline: none;
		box-sizing: border-box;
	}

	.link-modal-input:focus {
		border-color: var(--input-border-focus);
		box-shadow: 0 0 0 3px rgba(18,100,163,0.15);
	}

	.link-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.link-modal-cancel {
		padding: 7px 14px;
		background: none;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.link-modal-cancel:hover { background: var(--hover-bg); color: var(--text-primary); }

	.link-modal-confirm {
		padding: 7px 16px;
		background: var(--sidebar-active);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}

	.link-modal-confirm:hover { filter: brightness(1.1); }

	/* 에디터 안 링크 */
	:global(.editor a) {
		color: var(--link-color, #1264a3);
		text-decoration: underline;
	}

	/* 에디터 */
	.editor {
		min-height: 40px;
		max-height: 200px;
		overflow-y: auto;
		font-size: 15px;
		line-height: 1.5;
		font-family: inherit;
		background: transparent;
		color: var(--text-primary);
		outline: none;
		word-break: break-word;
		white-space: pre-wrap;
		padding: 10px 14px;
	}

	.editor.is-empty::before {
		content: attr(data-placeholder);
		color: var(--text-secondary);
		pointer-events: none;
		float: left;
		height: 0;
	}

	:global(.editor-channel) {
		background: var(--mention-bg);
		color: var(--link-color, #1264a3);
		border-radius: 4px;
		padding: 0 3px;
		font-weight: 600;
		font-size: 14px;
		cursor: default;
		user-select: all;
	}

	.channel-hash {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-secondary);
		width: 16px;
		text-align: center;
		flex-shrink: 0;
	}

	:global(.editor-mention) {
		background: var(--mention-bg);
		color: var(--link-color, #1264a3);
		border-radius: 4px;
		padding: 0 3px;
		font-weight: 600;
		font-size: 14px;
		cursor: default;
		user-select: all;
	}

	/* 하단 전송 버튼 행 */
	.input-footer {
		display: flex;
		justify-content: flex-end;
		padding: 6px 10px;
	}

	.send-btn {
		background: #007a5a;
		color: #fff;
		border: none;
		border-radius: 4px;
		padding: 6px 16px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.1s;
	}

	.send-btn:hover:not(:disabled) { background: #006044; }
	.send-btn:disabled { background: #aaa; cursor: not-allowed; }
</style>
