CREATE TABLE `document_types` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_types_code_unique` ON `document_types` (`code`);
--> statement-breakpoint
ALTER TABLE `files` ADD `doc_type` text;
--> statement-breakpoint
INSERT OR IGNORE INTO `document_types` (`id`, `code`, `label`, `is_system`, `is_active`, `sort_order`, `created_by`, `created_at`, `updated_at`)
VALUES
	('doctype_slide', 'SLIDE', '[SLIDE]', 1, 1, 0, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_ujian_1', 'UJIAN 1', '[UJIAN 1]', 1, 1, 1, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_ujian_2', 'UJIAN 2', '[UJIAN 2]', 1, 1, 2, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_ujian_3', 'UJIAN 3', '[UJIAN 3]', 1, 1, 3, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_latihan', 'LATIHAN', '[LATIHAN]', 1, 1, 4, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_solusi', 'SOLUSI', '[SOLUSI]', 1, 1, 5, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_textbook', 'TEXTBOOK', '[TEXTBOOK]', 1, 1, 6, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_spektra', 'SPEKTRA', '[SPEKTRA]', 1, 1, 7, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_keratin', 'KERATIN', '[KERATIN]', 1, 1, 8, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000),
	('doctype_other', 'OTHER', '[OTHER]', 1, 1, 9, null, CAST(strftime('%s', 'now') AS integer) * 1000, CAST(strftime('%s', 'now') AS integer) * 1000);
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'SLIDE'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND upper(`tags`) LIKE '%SLIDE%';
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'UJIAN 1'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND (upper(`tags`) LIKE '%UJIAN 1%' OR upper(`tags`) LIKE '%UJIAN1%');
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'UJIAN 2'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND (upper(`tags`) LIKE '%UJIAN 2%' OR upper(`tags`) LIKE '%UJIAN2%');
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'UJIAN 3'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND (upper(`tags`) LIKE '%UJIAN 3%' OR upper(`tags`) LIKE '%UJIAN3%');
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'LATIHAN'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND upper(`tags`) LIKE '%LATIHAN%';
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'SOLUSI'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND upper(`tags`) LIKE '%SOLUSI%';
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'TEXTBOOK'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND upper(`tags`) LIKE '%TEXTBOOK%';
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'SPEKTRA'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND upper(`tags`) LIKE '%SPEKTRA%';
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'KERATIN'
WHERE `doc_type` IS NULL
  AND `tags` IS NOT NULL
  AND upper(`tags`) LIKE '%KERATIN%';
--> statement-breakpoint
UPDATE `files`
SET `doc_type` = 'OTHER'
WHERE `doc_type` IS NULL;