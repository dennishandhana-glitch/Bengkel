CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`size` text NOT NULL,
	`photo` text NOT NULL
);
