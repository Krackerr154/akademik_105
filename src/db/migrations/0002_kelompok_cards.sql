CREATE TABLE `kelompok_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`photo_url` text,
	`card_style` text DEFAULT 'rect' NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kelompok_cards_code_unique` ON `kelompok_cards` (`code`);
--> statement-breakpoint
CREATE TABLE `subject_kelompok_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_key` text NOT NULL,
	`subject_label` text NOT NULL,
	`kelompok_code` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_kelompok_mappings_subject_key_unique` ON `subject_kelompok_mappings` (`subject_key`);
--> statement-breakpoint
INSERT OR IGNORE INTO `kelompok_cards`
	(`id`, `code`, `name`, `description`, `photo_url`, `card_style`, `is_system`, `is_active`, `sort_order`, `created_by`, `created_at`, `updated_at`)
VALUES
	('kelompok_kimia_umum', 'KIMIA_UMUM', 'Kimia Umum', 'Fondasi konsep dan prinsip kimia dasar.', null, 'rect', 1, 1, 0, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_kimia_analitik', 'KIMIA_ANALITIK', 'Kimia Analitik', 'Analisis kualitatif dan kuantitatif senyawa kimia.', null, 'rect', 1, 1, 1, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_kimia_anorganik', 'KIMIA_ANORGANIK', 'Kimia Anorganik', 'Struktur, reaktivitas, dan aplikasi senyawa anorganik.', null, 'rect', 1, 1, 2, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_kimia_fisik', 'KIMIA_FISIK', 'Kimia Fisik', 'Fenomena kimia melalui pendekatan fisika dan matematika.', null, 'rect', 1, 1, 3, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_kimia_organik', 'KIMIA_ORGANIK', 'Kimia Organik', 'Senyawa karbon, mekanisme reaksi, dan sintesis organik.', null, 'rect', 1, 1, 4, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_biokimia', 'BIOKIMIA', 'Biokimia', 'Kajian molekul hayati dan proses biokimia dalam sel.', null, 'rect', 1, 1, 5, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_non_ki', 'MATA_KULIAH_NON_KI', 'Mata Kuliah Non KI', 'Mata kuliah pelengkap di luar kelompok keilmuan inti.', null, 'drive', 1, 1, 6, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('kelompok_software', 'SOFTWARE', 'Software', 'Perangkat lunak, panduan, dan resource pendukung.', null, 'drive', 1, 1, 7, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000);
--> statement-breakpoint
INSERT OR IGNORE INTO `subject_kelompok_mappings`
	(`id`, `subject_key`, `subject_label`, `kelompok_code`, `created_by`, `created_at`, `updated_at`)
VALUES
	('subject_map_kix1x1', 'KIX1X1 KIMIA UMUM', 'KIX1X1 Kimia Umum', 'KIMIA_UMUM', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_kixx2x', 'KIXX2X KIMIA ANALITIK', 'KIXX2X Kimia Analitik', 'KIMIA_ANALITIK', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_kixx3x', 'KIXX3X KIMIA ANORGANIK', 'KIXX3X Kimia Anorganik', 'KIMIA_ANORGANIK', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_kixx4x', 'KIXX4X KIMIA FISIK', 'KIXX4X Kimia Fisik', 'KIMIA_FISIK', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_kixx5x', 'KIXX5X KIMIA ORGANIK', 'KIXX5X Kimia Organik', 'KIMIA_ORGANIK', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_kixx6x', 'KIXX6X BIOKIMIA', 'KIXX6X Biokimia', 'BIOKIMIA', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_non_ki', 'MATA KULIAH NON KI', 'Mata Kuliah Non KI', 'MATA_KULIAH_NON_KI', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('subject_map_software', 'SOFTWARE', 'Software', 'SOFTWARE', null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000);
