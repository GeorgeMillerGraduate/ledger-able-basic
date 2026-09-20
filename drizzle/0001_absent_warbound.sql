CREATE TABLE `accounting_audit` (
	`id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`record_id` varchar(36) NOT NULL,
	`action` varchar(80) NOT NULL,
	`detail` mediumtext NOT NULL,
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `accounting_audit_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`business_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`bank_name` varchar(255) NOT NULL,
	`reference` varchar(80) NOT NULL,
	`account_type` varchar(40) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'GBP',
	`opening_balance` decimal(15,2) NOT NULL,
	`opening_date` varchar(10) NOT NULL,
	`archived` boolean NOT NULL DEFAULT false,
	`created_at` varchar(24) NOT NULL,
	`updated_at` varchar(24) NOT NULL,
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(36) NOT NULL,
	`transaction_date` varchar(10) NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'UNREVIEWED',
	`classification` varchar(40),
	`category` varchar(255),
	`entry_id` varchar(36),
	`created_at` varchar(24) NOT NULL,
	`updated_at` varchar(24) NOT NULL,
	CONSTRAINT `bank_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `bank_match_once` UNIQUE(`entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` varchar(36) NOT NULL,
	`invoice_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`description` text NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unit_price` decimal(15,2) NOT NULL,
	`tax_rate` decimal(5,2) NOT NULL,
	`net` decimal(15,2) NOT NULL,
	`tax` decimal(15,2) NOT NULL,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `invoice_payments` (
	`id` varchar(36) NOT NULL,
	`invoice_id` varchar(36) NOT NULL,
	`entry_id` varchar(36) NOT NULL,
	`payment_date` varchar(10) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`created_at` varchar(24) NOT NULL,
	CONSTRAINT `invoice_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_payment_once` UNIQUE(`invoice_id`),
	CONSTRAINT `invoice_sale_once` UNIQUE(`entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `contacts` ADD `business_id` varchar(36);--> statement-breakpoint
ALTER TABLE `contacts` ADD `company` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `telephone` varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `address` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `updated_at` varchar(24);--> statement-breakpoint
ALTER TABLE `invoices` ADD `business_id` varchar(36);--> statement-breakpoint
ALTER TABLE `invoices` ADD `contact_id` varchar(36);--> statement-breakpoint
ALTER TABLE `invoices` ADD `customer_snapshot` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `issue_date` varchar(10);--> statement-breakpoint
ALTER TABLE `invoices` ADD `reference` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `subtotal` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `tax_total` decimal(15,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `updated_at` varchar(24);--> statement-breakpoint
ALTER TABLE `accounting_audit` ADD CONSTRAINT `accounting_audit_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_account_id_bank_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_entry_id_entries_id_fk` FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_entry_id_entries_id_fk` FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bank_account_owner` ON `bank_accounts` (`business_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `bank_fingerprint` ON `bank_transactions` (`account_id`,`fingerprint`);--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_business_id_businesses_id_fk` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE contacts c JOIN businesses b ON b.owner_user_id=c.user_id SET c.business_id=b.id, c.updated_at=c.created_at WHERE c.business_id IS NULL;
--> statement-breakpoint
UPDATE invoices i JOIN businesses b ON b.owner_user_id=i.user_id SET i.business_id=b.id, i.updated_at=i.created_at WHERE i.business_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX invoice_business_number ON invoices (business_id,invoice_number);
