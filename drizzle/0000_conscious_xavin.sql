CREATE TABLE `auth_identities` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`provider_subject` varchar(255) NOT NULL,
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `auth_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_auth_identity_provider_subject` UNIQUE(`provider`,`provider_subject`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` varchar(36) NOT NULL,
	`owner_user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`business_type` varchar(255) NOT NULL DEFAULT 'sole_trader',
	`accounting_year_start` varchar(10) NOT NULL,
	`tax_estimate_rate` decimal(6,5) NOT NULL DEFAULT 0.2,
	`created_at` varchar(24) NOT NULL,
	`updated_at` varchar(24) NOT NULL,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_businesses_owner` UNIQUE(`owner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL DEFAULT '',
	`type` varchar(255) NOT NULL DEFAULT 'customer',
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`business_id` varchar(36),
	`kind` enum('sale','expense') NOT NULL,
	`party` varchar(255) NOT NULL,
	`category` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`vat_amount` decimal(15,2) NOT NULL DEFAULT 0,
	`entry_date` varchar(10) NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'paid',
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `entries_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`invoice_number` varchar(255) NOT NULL,
	`customer` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`due_date` varchar(10) NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'draft',
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` varchar(36) NOT NULL,
	`business_name` varchar(255) NOT NULL DEFAULT 'My business',
	`email` varchar(255) NOT NULL,
	`vat_registered` boolean NOT NULL DEFAULT false,
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `profiles_user_id` PRIMARY KEY(`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` varchar(24) NOT NULL,
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `sessions_token_hash` PRIMARY KEY(`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`picture_url` text,
	`created_at` varchar(24) NOT NULL,
	`updated_at` varchar(24) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE INDEX `idx_auth_identity_user` ON `auth_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_contacts_user_name` ON `contacts` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_entries_user_date` ON `entries` (`user_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_entries_user_kind` ON `entries` (`user_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_entries_business_date` ON `entries` (`business_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_entries_business_kind` ON `entries` (`business_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_invoices_user_status` ON `invoices` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expiry` ON `sessions` (`expires_at`);