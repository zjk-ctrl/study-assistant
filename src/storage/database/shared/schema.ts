import { pgTable, serial, timestamp, varchar, boolean, integer, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 用户资料表
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // 关联 auth.users.id
    username: varchar("username", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }),
    avatar: text("avatar"),
    bio: text("bio"),
    totalStudyMinutes: integer("total_study_minutes").default(0).notNull(),
    totalPomodoros: integer("total_pomodoros").default(0).notNull(),
    currentStreak: integer("current_streak").default(0).notNull(), // 连续学习天数
    longestStreak: integer("longest_streak").default(0).notNull(),
    lastStudyDate: varchar("last_study_date", { length: 10 }), // YYYY-MM-DD
    isPublic: boolean("is_public").default(true).notNull(), // 是否公开学习数据
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_profiles_username_idx").on(table.username),
  ]
);

// 好友关系表
export const friendships = pgTable(
  "friendships",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    requesterId: varchar("requester_id", { length: 36 }).notNull().references(() => userProfiles.id),
    addresseeId: varchar("addressee_id", { length: 36 }).notNull().references(() => userProfiles.id),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, rejected
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("friendships_requester_idx").on(table.requesterId),
    index("friendships_addressee_idx").on(table.addresseeId),
    index("friendships_status_idx").on(table.status),
  ]
);

// 学习记录表
export const studyRecords = pgTable(
  "study_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => userProfiles.id),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    studyMinutes: integer("study_minutes").default(0).notNull(),
    pomodorosCompleted: integer("pomodoros_completed").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("study_records_user_idx").on(table.userId),
    index("study_records_date_idx").on(table.date),
  ]
);

// 学习计划表（用户的学习目标）
export const userPlans = pgTable(
  "user_plans",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => userProfiles.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    targetHours: integer("target_hours").default(1).notNull(),
    completedHours: integer("completed_hours").default(0).notNull(),
    deadline: varchar("deadline", { length: 10 }), // YYYY-MM-DD
    isCompleted: boolean("is_completed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_plans_user_idx").on(table.userId),
    index("user_plans_deadline_idx").on(table.deadline),
  ]
);

// 番茄钟设置表
export const timerSettings = pgTable(
  "timer_settings",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => userProfiles.id).unique(),
    focusDuration: integer("focus_duration").default(25).notNull(), // 分钟
    shortBreak: integer("short_break").default(5).notNull(),
    longBreak: integer("long_break").default(15).notNull(),
    sessionsBeforeLongBreak: integer("sessions_before_long_break").default(4).notNull(),
    reminderEnabled: boolean("reminder_enabled").default(true).notNull(),
    reminderInterval: integer("reminder_interval").default(30).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("timer_settings_user_idx").on(table.userId),
  ]
);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
