/**
 * seed-sample.ts
 * tight.db를 샘플 데이터로 초기화합니다.
 * 기존 데이터를 모두 삭제하고 가상의 팀 데이터를 삽입합니다.
 *
 * 사용법: npx tsx scripts/seed-sample.ts
 */

import Database from 'better-sqlite3';
import { copyFileSync } from 'fs';

const db = new Database('tight.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // 삭제 순서 무시하기 위해 임시로 off

// ── 기존 데이터 초기화 ──────────────────────────────────────────────────────
console.log('기존 데이터 초기화 중...');
db.exec(`
  DELETE FROM messages;
  DELETE FROM channel_members;
  DELETE FROM channels;
  DELETE FROM workspace_members;
  DELETE FROM workspaces;
  DELETE FROM users;
`);

db.pragma('foreign_keys = ON');

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
let counter = 0;
function uid() {
	counter++;
	return `seed_${counter.toString().padStart(4, '0')}_${Math.random().toString(36).slice(2, 7)}`;
}

function ts(daysAgo: number, hour = 10, min = 0) {
	const d = new Date('2026-03-14T00:00:00Z');
	d.setDate(d.getDate() - daysAgo);
	d.setHours(hour, min, 0, 0);
	return Math.floor(d.getTime() / 1000);
}

// ── 샘플 유저 ───────────────────────────────────────────────────────────────
const seedUsers = [
	{
		name: 'Alice Jang',
		email: 'alice@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=alice',
		bio: 'Engineering lead. Coffee-driven.',
		roleTitle: 'Engineering Lead'
	},
	{
		name: 'Bob Kim',
		email: 'bob@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=bob',
		bio: 'Full-stack. Loves TypeScript and long walks.',
		roleTitle: 'Software Engineer'
	},
	{
		name: 'Carol Park',
		email: 'carol@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=carol',
		bio: 'Product designer. Figma evangelist.',
		roleTitle: 'Product Designer'
	},
	{
		name: 'David Lee',
		email: 'david@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=david',
		bio: 'PM. Spreadsheets are my love language.',
		roleTitle: 'Product Manager'
	},
	{
		name: 'Emma Choi',
		email: 'emma@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=emma',
		bio: 'Frontend engineer. CSS whisperer.',
		roleTitle: 'Frontend Engineer'
	},
	{
		name: 'Frank Oh',
		email: 'frank@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=frank',
		bio: 'DevOps. Kubernetes or bust.',
		roleTitle: 'DevOps Engineer'
	},
	{
		name: 'Grace Shin',
		email: 'grace@example.com',
		avatar: 'https://api.dicebear.com/9.x/thumbs/svg?seed=grace',
		bio: 'QA engineer. I find bugs so you don\'t have to.',
		roleTitle: 'QA Engineer'
	}
];

const insertUser = db.prepare(`
  INSERT INTO users (id, email, name, avatar_url, bio, role_title, avatar_source, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 'google', ?)
`);

const userIds: Record<string, string> = {};
for (const u of seedUsers) {
	const id = uid();
	userIds[u.email] = id;
	insertUser.run(id, u.email, u.name, u.avatar, u.bio, u.roleTitle, ts(30));
}

const [alice, bob, carol, david, emma, frank, grace] = seedUsers.map(u => userIds[u.email]);

// ── 워크스페이스 ────────────────────────────────────────────────────────────
const workspaceId = uid();
db.prepare(`
  INSERT INTO workspaces (id, name, slug, owner_id, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(workspaceId, 'Demo', 'demo', alice, ts(30));

const insertMember = db.prepare(`
  INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)
`);
insertMember.run(workspaceId, alice, 'owner');
for (const id of [bob, carol, david, emma, frank, grace]) {
	insertMember.run(workspaceId, id, 'member');
}

// ── 채널 생성 헬퍼 ──────────────────────────────────────────────────────────
function makeChannel(name: string, topic: string | null, memberIds: string[]) {
	const chId = uid();
	db.prepare(`
    INSERT INTO channels (id, workspace_id, name, topic, is_private, is_dm, created_at)
    VALUES (?, ?, ?, ?, 0, 0, ?)
  `).run(chId, workspaceId, name, topic, ts(30));

	const ins = db.prepare(`INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)`);
	memberIds.forEach((uid, i) => ins.run(chId, uid, i === 0 ? 'owner' : 'member'));
	return chId;
}

function makeDm(userA: string, userB: string) {
	const chId = uid();
	db.prepare(`
    INSERT INTO channels (id, workspace_id, name, topic, is_private, is_dm, created_at)
    VALUES (?, ?, '', NULL, 1, 1, ?)
  `).run(chId, workspaceId, ts(20));

	db.prepare(`INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, 'member')`).run(chId, userA);
	db.prepare(`INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, 'member')`).run(chId, userB);
	return chId;
}

// ── 채널 ────────────────────────────────────────────────────────────────────
const allMembers = [alice, bob, carol, david, emma, frank, grace];
const chGeneral      = makeChannel('general',      '팀 전체 공지 및 일반 대화', allMembers);
const chEngineering  = makeChannel('engineering',  '개발 관련 논의', [alice, bob, emma, frank, grace]);
const chDesign       = makeChannel('design',       '디자인 피드백 및 에셋 공유', [carol, alice, david, emma]);
const chProduct      = makeChannel('product',      '기획 / 로드맵', [david, alice, carol, bob]);
const chRandom       = makeChannel('random',       '업무 외 잡담 환영', allMembers);

// ── 메시지 삽입 헬퍼 ────────────────────────────────────────────────────────
const insertMsg = db.prepare(`
  INSERT INTO messages (id, channel_id, author_id, body, image_url, parent_id, created_at)
  VALUES (?, ?, ?, ?, NULL, NULL, ?)
`);
const insertReply = db.prepare(`
  INSERT INTO messages (id, channel_id, author_id, body, image_url, parent_id, created_at)
  VALUES (?, ?, ?, ?, NULL, ?, ?)
`);

function msg(channelId: string, authorId: string, body: string, daysAgo: number, hour: number, min = 0) {
	const id = uid();
	insertMsg.run(id, channelId, authorId, body, ts(daysAgo, hour, min));
	return id;
}

function reply(channelId: string, authorId: string, body: string, parentId: string, daysAgo: number, hour: number, min = 0) {
	const id = uid();
	insertReply.run(id, channelId, authorId, body, parentId, ts(daysAgo, hour, min));
	return id;
}

// ── #general ────────────────────────────────────────────────────────────────
msg(chGeneral, alice,  '안녕하세요 여러분 👋 오늘부터 Tight으로 팀 커뮤니케이션을 시작합니다!', 14, 9, 0);
msg(chGeneral, bob,    '오 드디어! Slack 요금제 걱정 없이 쓸 수 있겠네요 😄', 14, 9, 3);
msg(chGeneral, carol,  'UI가 깔끔해서 좋은데요. 다크모드도 있나요?', 14, 9, 5);
msg(chGeneral, alice,  '있습니다! 오른쪽 상단 설정에서 바꿀 수 있어요.', 14, 9, 7);
msg(chGeneral, david,  '채널 구조가 딱 저희 팀에 맞게 잘 되어있네요. 바로 적응될 것 같아요.', 14, 9, 10);
msg(chGeneral, frank,  '배포 알림은 어느 채널로 보내면 좋을까요?', 14, 10, 0);
msg(chGeneral, alice,  '#engineering 채널 쓰면 될 것 같아요.', 14, 10, 2);

const m_standup = msg(chGeneral, alice, '📢 오늘 스탠드업 요약\n\n**Alice** — 인증 리팩토링 마무리\n**Bob** — 메시지 편집 기능 구현 중\n**Carol** — 온보딩 플로우 디자인 리뷰\n**David** — Q2 로드맵 작성\n**Emma** — 반응형 레이아웃 버그 수정\n**Frank** — 스테이징 서버 업그레이드\n**Grace** — 회원가입 시나리오 테스트', 7, 9, 30);
reply(chGeneral, bob,   '고생하셨어요 🙏', m_standup, 7, 9, 35);
reply(chGeneral, grace, '테스트 결과 공유는 오후에 할게요!', m_standup, 7, 9, 40);

msg(chGeneral, david, '이번 주 금요일 오후 5시에 팀 회식 있습니다. 참석 여부 DM 주세요!', 5, 11, 0);
msg(chGeneral, emma,  '저 참석이요! 🙋', 5, 11, 5);
msg(chGeneral, bob,   '저도요!', 5, 11, 7);
msg(chGeneral, grace, '저도 갑니다 😊', 5, 11, 10);
msg(chGeneral, frank, '저는 배포 일정 확인하고 알려드릴게요.', 5, 11, 15);

// ── #engineering ────────────────────────────────────────────────────────────
const m_pr = msg(chEngineering, bob, 'PR 올렸습니다! 메시지 편집/삭제 기능 추가했어요.\nhttps://github.com/example/tight/pull/42\n\n주요 변경사항:\n- 편집 후 `(edited)` 표시\n- 작성자만 편집/삭제 가능\n- 삭제 시 확인 다이얼로그', 3, 14, 0);
reply(chEngineering, alice, '확인해볼게요! 낙관적 업데이트도 같이 처리됐나요?', m_pr, 3, 14, 10);
reply(chEngineering, bob,   '아, 그건 빠졌네요. 다음 PR에 추가할게요.', m_pr, 3, 14, 15);
reply(chEngineering, emma,  '프론트 쪽 UI 부분은 제가 같이 리뷰할게요.', m_pr, 3, 14, 20);
reply(chEngineering, grace, '테스트 케이스 작성해서 별도로 올릴게요.', m_pr, 3, 14, 25);

msg(chEngineering, frank, '스테이징 서버 Node 22로 업그레이드 완료했습니다. 혹시 이상한 점 있으면 알려주세요.', 2, 10, 0);
msg(chEngineering, emma,  '확인했어요. 빌드 시간이 좀 빨라진 것 같네요 🚀', 2, 10, 30);
msg(chEngineering, bob,   '저도 문제없어요. 잘 됩니다!', 2, 10, 35);

const m_bug = msg(chEngineering, grace, '🐛 버그 리포트: 모바일 Safari에서 메시지 입력창이 키보드에 가려지는 이슈 발견했습니다. iOS 18에서 재현 가능.', 1, 11, 0);
reply(chEngineering, emma,  '아 이거 저도 봤어요. `viewport` 메타태그 설정 문제일 수 있어요.', m_bug, 1, 11, 10);
reply(chEngineering, emma,  '`interactive-widget=resizes-content` 추가해보면 어떨까요?', m_bug, 1, 11, 12);
reply(chEngineering, bob,   '저도 찾아보니까 iOS Safari는 `dvh` 단위로 처리하는 게 더 안정적이더라고요.', m_bug, 1, 11, 20);
reply(chEngineering, grace, '두 방법 다 테스트해볼게요. 결과 공유드릴게요!', m_bug, 1, 11, 25);

// ── #design ─────────────────────────────────────────────────────────────────
msg(chDesign, carol,  '온보딩 플로우 1차 시안 공유합니다!\n\n주요 흐름: 워크스페이스 생성 → 팀원 초대 → 채널 소개 → 첫 메시지 보내기\n\n피드백 주시면 반영할게요 😊', 10, 14, 0);
msg(chDesign, david,  '흐름이 자연스럽네요! 초대 단계에서 "나중에 하기" 옵션도 있으면 좋을 것 같아요.', 10, 14, 20);
msg(chDesign, alice,  '동의해요. 초대 없이도 바로 시작할 수 있게 해주면 좋겠어요.', 10, 14, 30);
msg(chDesign, carol,  '반영할게요! 그리고 다크모드 색상도 같이 작업 중이에요.', 10, 14, 35);

const m_comp = msg(chDesign, carol, '컴포넌트 라이브러리 정리했어요. 버튼, 인풋, 모달, 아바타 컴포넌트 기준 정의했습니다.', 5, 11, 0);
reply(chDesign, emma,  '개발하면서 애매했던 부분들이 정리됐네요. 감사해요!', m_comp, 5, 11, 30);
reply(chDesign, carol, '앞으로 새 컴포넌트 추가할 때는 여기 먼저 정의하고 개발 들어가면 좋겠어요.', m_comp, 5, 11, 35);

msg(chDesign, carol, '알림 뱃지 디자인 변경 제안: 현재 빨간 원 → 숫자만 보이는 미니멀 스타일로 바꾸면 어떨까요?', 2, 15, 0);
msg(chDesign, alice, '오 더 깔끔해보일 것 같아요. Emma, 구현 어렵지 않을까요?', 2, 15, 10);
msg(chDesign, emma,  'CSS 몇 줄이면 될 것 같아요. 바꿔볼게요!', 2, 15, 15);

// ── #product ────────────────────────────────────────────────────────────────
msg(chProduct, david, 'Q2 로드맵 초안 공유합니다.\n\n**4월**: 모바일 웹 최적화, 파일 업로드\n**5월**: 슬래시 커맨드, 이모지 반응\n**6월**: 알림 설정, 채널 아카이브\n\n우선순위 조정 의견 있으시면 말씀해주세요!', 7, 10, 0);
msg(chProduct, alice, '파일 업로드는 4월에 꼭 들어갔으면 해요. 사용자 요청이 많아서요.', 7, 10, 20);
msg(chProduct, carol, '이모지 반응은 디자인 이미 해뒀으니 5월 전에도 가능할 것 같아요.', 7, 10, 25);
msg(chProduct, bob,   '슬래시 커맨드 구조만 잘 잡아두면 이후 확장이 훨씬 편해질 것 같아요.', 7, 10, 35);
msg(chProduct, david, '좋아요! 알림 설정은 사용자 피드백 좀 더 모아보고 6월에 하는 걸로 합시다.', 7, 11, 0);

// ── #random ─────────────────────────────────────────────────────────────────
msg(chRandom, bob,   '주말에 등산 다녀왔는데 날씨가 너무 좋았어요 ⛰️', 6, 19, 0);
msg(chRandom, grace, '어디 다녀오셨어요?', 6, 19, 5);
msg(chRandom, bob,   '북한산이요! 날씨 맑고 공기도 좋았어요.', 6, 19, 7);
msg(chRandom, emma,  '저도 가고 싶다... 요즘 운동 못 하고 있어서 😅', 6, 19, 10);
msg(chRandom, frank, '다음에 팀 등산 어떠세요? 저도 오랜만에 가고 싶네요.', 6, 19, 15);
msg(chRandom, alice, '좋아요! 날 잡아봐요 🙌', 6, 19, 20);

msg(chRandom, carol, '요즘 좋은 폰트 발견했어요. Pretendard 써보신 분 있나요? 가독성이 진짜 좋더라고요.', 4, 14, 0);
msg(chRandom, emma,  '저 쓰고 있어요! 한글 웹폰트 중에 제일 좋은 것 같아요.', 4, 14, 5);
msg(chRandom, bob,   '이 프로젝트에도 써봐야겠네요.', 4, 14, 10);

msg(chRandom, grace, '오늘 점심 뭐 드셨어요? 저는 비빔밥 먹었는데 너무 맛있었어요 🍚', 1, 13, 0);
msg(chRandom, david, '저는 김치찌개요. 요즘 날씨에 딱이더라고요!', 1, 13, 5);
msg(chRandom, frank, '저는 샌드위치... 바빠서 대충 먹었어요 😞', 1, 13, 10);
msg(chRandom, alice, 'Frank 밥은 제대로 드세요! 건강이 최고예요 😄', 1, 13, 12);

// ── DM: Alice ↔ Bob ─────────────────────────────────────────────────────────
const dmAliceBob = makeDm(alice, bob);
msg(dmAliceBob, alice, 'Bob, PR 리뷰 봤어요. 전반적으로 코드 깔끔하게 잘 짜셨어요!', 3, 15, 0);
msg(dmAliceBob, bob,   '감사합니다! 낙관적 업데이트 부분은 다음 PR에 꼭 추가할게요.', 3, 15, 5);
msg(dmAliceBob, alice, '그리고 에러 핸들링도 좀 더 세분화하면 좋을 것 같아요. 사용자한테 보여줄 메시지 다듬어서요.', 3, 15, 8);
msg(dmAliceBob, bob,   '알겠어요, 반영해볼게요 👍', 3, 15, 10);

// ── DM: Carol ↔ Emma ─────────────────────────────────────────────────────────
const dmCarolEmma = makeDm(carol, emma);
msg(dmCarolEmma, carol, 'Emma, 알림 뱃지 변경 건은 내일 작업 시작해도 될까요?', 2, 16, 0);
msg(dmCarolEmma, emma,  '넵! 시안 파일 공유해주시면 바로 작업할게요.', 2, 16, 5);
msg(dmCarolEmma, carol, '피그마 링크 드릴게요. 컴포넌트 파일에 추가해뒀어요!', 2, 16, 7);
msg(dmCarolEmma, emma,  '확인했어요. 내일 오전 중에 작업해볼게요 😊', 2, 16, 10);

// ── 완료 ────────────────────────────────────────────────────────────────────
const stats = {
	users: (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n,
	workspaces: (db.prepare('SELECT COUNT(*) as n FROM workspaces').get() as any).n,
	channels: (db.prepare('SELECT COUNT(*) as n FROM channels').get() as any).n,
	messages: (db.prepare('SELECT COUNT(*) as n FROM messages').get() as any).n,
};

db.close();
copyFileSync('tight.db', 'tight.db.sample');

console.log('\n✅ 샘플 데이터 생성 완료');
console.log(`   유저: ${stats.users}명`);
console.log(`   워크스페이스: ${stats.workspaces}개`);
console.log(`   채널: ${stats.channels}개`);
console.log(`   메시지: ${stats.messages}개`);
console.log('\n📦 tight.db.sample 업데이트됨');
console.log('⚠️  Google OAuth로 로그인한 실제 유저 데이터는 포함되지 않습니다.');
console.log('   앱에 로그인하면 새 유저로 자동 추가됩니다.\n');
