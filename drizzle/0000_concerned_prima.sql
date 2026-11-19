CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`time` integer NOT NULL,
	`kind` text NOT NULL,
	`role` text NOT NULL,
	`payment` text NOT NULL,
	`lines` text NOT NULL,
	`labor` integer NOT NULL,
	`total` integer NOT NULL,
	`memo` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY NOT NULL,
	`qty` integer NOT NULL,
	`price` integer NOT NULL,
	`approved` integer NOT NULL,
	CONSTRAINT "available" CHECK("products"."qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`role` text PRIMARY KEY NOT NULL,
	`salt` text NOT NULL,
	`digest` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`expires` integer NOT NULL,
	`actor` text NOT NULL
);
