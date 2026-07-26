CREATE TABLE "documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"title" text,
	"content" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"metadata" jsonb DEFAULT '{"font":"serif","font_size":18}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"image_url" text,
	"username" varchar(255),
	"stripe_customer_id" varchar(255),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_owner_created_idx" ON "documents" USING btree ("owner_id","created_at");