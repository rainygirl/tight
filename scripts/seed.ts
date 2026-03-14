import Database from 'better-sqlite3';

const db = new Database('tight.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function nanoid() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 기존 워크스페이스 찾기
const workspace = db.prepare('SELECT * FROM workspaces LIMIT 1').get() as any;
if (!workspace) {
	console.error('워크스페이스가 없습니다. 먼저 앱에서 워크스페이스를 만들어주세요.');
	process.exit(1);
}

const seedUsers = [
	{ name: 'Alex Morgan',   email: 'alex.morgan@example.com',   avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=alex' },
	{ name: 'Jamie Rivera',  email: 'jamie.rivera@example.com',  avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=jamie' },
	{ name: 'Sam Chen',      email: 'sam.chen@example.com',      avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=sam' },
	{ name: 'Taylor Brooks', email: 'taylor.brooks@example.com', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=taylor' },
	{ name: 'Jordan Lee',    email: 'jordan.lee@example.com',    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=jordan' },
	{ name: 'Casey Kim',     email: 'casey.kim@example.com',     avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=casey' },
	{ name: 'Riley Park',    email: 'riley.park@example.com',    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=riley' },
];

// 채널 목록
const channels = db.prepare('SELECT * FROM channels WHERE workspace_id = ? AND is_dm = 0').all(workspace.id) as any[];

let addedCount = 0;

for (const u of seedUsers) {
	const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email) as any;
	if (existing) {
		console.log(`  이미 존재: ${u.name}`);
		continue;
	}

	const userId = nanoid();
	db.prepare('INSERT INTO users (id, email, name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)').run(
		userId, u.email, u.name, u.avatar, Math.floor(Date.now() / 1000)
	);

	db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(
		workspace.id, userId, 'member'
	);

	for (const ch of channels) {
		db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(
			ch.id, userId
		);
	}

	console.log(`  추가됨: ${u.name} (${u.email})`);
	addedCount++;
}

console.log(`\n완료: ${addedCount}명 추가, 워크스페이스 "${workspace.name}"에 가입됨`);
