import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(), // Google sub claim
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	avatarUrl: text('avatar_url'),
	bio: text('bio'),
	roleTitle: text('role_title'),
	phone: text('phone'),
	avatarSource: text('avatar_source').default('google'), // 'google' | 'custom'
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const workspaces = sqliteTable('workspaces', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const workspaceMembers = sqliteTable('workspace_members', {
	workspaceId: text('workspace_id')
		.notNull()
		.references(() => workspaces.id),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	role: text('role', { enum: ['owner', 'member'] })
		.notNull()
		.default('member')
});

export const channels = sqliteTable('channels', {
	id: text('id').primaryKey(),
	workspaceId: text('workspace_id')
		.notNull()
		.references(() => workspaces.id),
	name: text('name').notNull(),
	topic: text('topic'),
	isPrivate: integer('is_private', { mode: 'boolean' }).notNull().default(false),
	isDm: integer('is_dm', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const channelMembers = sqliteTable('channel_members', {
	channelId: text('channel_id')
		.notNull()
		.references(() => channels.id),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	role: text('role', { enum: ['owner', 'member'] })
		.notNull()
		.default('member')
});

export const messages = sqliteTable('messages', {
	id: text('id').primaryKey(),
	channelId: text('channel_id')
		.notNull()
		.references(() => channels.id),
	authorId: text('author_id')
		.notNull()
		.references(() => users.id),
	body: text('body').notNull(),
	imageUrl: text('image_url'),
	parentId: text('parent_id'),
	editedAt: integer('edited_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
