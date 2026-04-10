CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`target_id` text,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drive_usage` (
	`drive_id` text PRIMARY KEY NOT NULL,
	`used_bytes` integer NOT NULL,
	`total_bytes` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`tags` text,
	`abstract` text,
	`year` integer,
	`authors` text,
	`angkatan_tags` text,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`drive_id` text NOT NULL,
	`gdrive_file_id` text NOT NULL,
	`visibility` text DEFAULT 'members' NOT NULL,
	`uploader_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pending_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`nim` text NOT NULL,
	`angkatan` integer NOT NULL,
	`whatsapp` text NOT NULL,
	`program` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`synced_at` integer NOT NULL,
	`approval_status` text DEFAULT 'pending' NOT NULL,
	`nim_format_valid` integer DEFAULT 0 NOT NULL,
	`nim_scope_flag` integer DEFAULT 0 NOT NULL,
	`nim_year_flag` integer DEFAULT 0 NOT NULL,
	`nim_duplicate` integer DEFAULT 0 NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`rejection_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_registrations_email_unique` ON `pending_registrations` (`email`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`nim` text NOT NULL,
	`angkatan` integer NOT NULL,
	`whatsapp` text,
	`program` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`last_seen` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_nim_unique` ON `users` (`nim`);