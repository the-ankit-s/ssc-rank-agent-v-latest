CREATE TYPE "public"."agency" AS ENUM('SSC', 'RRB', 'IBPS', 'TCS', 'NTA', 'STATE_GOVT');--> statement-breakpoint
CREATE TYPE "public"."analysis_phase" AS ENUM('collecting', 'preliminary', 'intermediate', 'final');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'bulk_update', 'bulk_delete');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('exam', 'shift', 'submission', 'cutoff', 'admin_user', 'settings');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('UR', 'OBC', 'EWS', 'SC', 'ST');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."exam_status" AS ENUM('upcoming', 'active', 'answer_key_released', 'closed');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'O');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('rank_calculation', 'normalization', 'cutoff_prediction', 'backup', 'cleanup', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('DEBUG', 'INFO', 'WARN', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'sms', 'slack');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('system_alert', 'job_failed', 'high_error_rate', 'low_disk_space');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "api_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer,
	"entity" "audit_entity" NOT NULL,
	"entity_id" integer,
	"action" "audit_action" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cutoffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"category" text NOT NULL,
	"post_code" text,
	"post_name" text,
	"expected_cutoff" real NOT NULL,
	"safe_score" real,
	"minimum_score" real,
	"previous_year_cutoff" real,
	"previous_year_vacancy" integer,
	"current_year_vacancy" integer,
	"confidence_level" "confidence_level",
	"prediction_basis" jsonb,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"published_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"date" text NOT NULL,
	"new_submissions" integer DEFAULT 0,
	"total_submissions" integer DEFAULT 0,
	"avg_score" real,
	"median_score" real,
	"category_breakdown" jsonb,
	"peak_hour" integer,
	"peak_submissions" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"agency" "agency" NOT NULL,
	"year" integer NOT NULL,
	"tier" text,
	"total_marks" real NOT NULL,
	"total_questions" integer NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"default_positive" real DEFAULT 2 NOT NULL,
	"default_negative" real DEFAULT 0.5 NOT NULL,
	"section_config" jsonb NOT NULL,
	"has_sectional_timing" boolean DEFAULT false,
	"has_normalization" boolean DEFAULT true,
	"allow_multiple_submissions" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"status" "exam_status" DEFAULT 'upcoming',
	"analysis_phase" "analysis_phase" DEFAULT 'collecting',
	"exam_start_date" timestamp,
	"exam_end_date" timestamp,
	"answer_key_release_date" timestamp,
	"answer_key_url" text,
	"official_website" text,
	"is_featured" boolean DEFAULT false,
	"priority_order" integer DEFAULT 0,
	"meta_description" text,
	"og_image_url" text,
	"total_shifts" integer DEFAULT 0,
	"total_submissions" integer DEFAULT 0,
	"last_submission_at" timestamp,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "exams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"total_records" integer,
	"records_processed" integer DEFAULT 0,
	"progress_percent" integer DEFAULT 0,
	"error_message" text,
	"error_stack" text,
	"metadata" jsonb,
	"triggered_by" text DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parser_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"success" boolean NOT NULL,
	"parse_time" integer,
	"error_message" text,
	"timestamp" timestamp DEFAULT now(),
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"viewer_ip" text,
	"viewer_location" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"cron_expression" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"config" jsonb,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scheduled_jobs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "score_distribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"shift_id" integer,
	"bucket_start" real NOT NULL,
	"bucket_end" real NOT NULL,
	"count" integer DEFAULT 0,
	"percentage" real,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"shift_code" text NOT NULL,
	"date" text NOT NULL,
	"shift_number" integer NOT NULL,
	"time_slot" text,
	"start_time" text,
	"end_time" text,
	"candidate_count" integer DEFAULT 0,
	"avg_raw_score" real,
	"median_raw_score" real,
	"std_dev" real,
	"max_raw_score" real,
	"min_raw_score" real,
	"percentile_cutoffs" jsonb,
	"section_stats" jsonb,
	"difficulty_index" real,
	"difficulty_label" text,
	"normalization_factor" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"stats_updated_at" timestamp,
	CONSTRAINT "shifts_shift_code_unique" UNIQUE("shift_code")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"shift_id" integer NOT NULL,
	"roll_number" text NOT NULL,
	"roll_number_hash" text NOT NULL,
	"name" text NOT NULL,
	"father_name" text,
	"dob" text,
	"exam_centre" text,
	"exam_centre_code" text,
	"category" "category" NOT NULL,
	"gender" "gender" NOT NULL,
	"state" text,
	"horizontal_category" text DEFAULT 'NONE',
	"is_pwd" boolean DEFAULT false,
	"is_ex_serviceman" boolean DEFAULT false,
	"section_performance" jsonb NOT NULL,
	"responses" jsonb,
	"total_attempted" integer DEFAULT 0,
	"total_correct" integer DEFAULT 0,
	"total_wrong" integer DEFAULT 0,
	"accuracy" real,
	"raw_score" real NOT NULL,
	"normalized_score" real,
	"overall_rank" integer,
	"category_rank" integer,
	"shift_rank" integer,
	"state_rank" integer,
	"overall_percentile" real,
	"category_percentile" real,
	"shift_percentile" real,
	"source" text DEFAULT 'url_parser',
	"source_url" text,
	"url_hash" text,
	"submitter_ip" text,
	"result_view_count" integer DEFAULT 0,
	"is_result_public" boolean DEFAULT false,
	"result_share_token" text,
	"is_disputed" boolean DEFAULT false,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "submissions_result_share_token_unique" UNIQUE("result_share_token")
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"level" "log_level" NOT NULL,
	"component" text NOT NULL,
	"action" text,
	"message" text NOT NULL,
	"details" jsonb,
	"request_id" text,
	"user_id" text,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"feedback_type" text NOT NULL,
	"is_resolved" boolean DEFAULT false,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutoffs" ADD CONSTRAINT "cutoffs_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutoffs" ADD CONSTRAINT "cutoffs_published_by_admin_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_analytics" ADD CONSTRAINT "daily_analytics_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_views" ADD CONSTRAINT "result_views_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_distribution" ADD CONSTRAINT "score_distribution_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "admin_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "admin_sessions" USING btree ("admin_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "api_metrics_endpoint_idx" ON "api_metrics" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "api_metrics_date_idx" ON "api_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "api_metrics_timestamp_idx" ON "api_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_cutoff_idx" ON "cutoffs" USING btree ("exam_id","category","post_code");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_daily_analytics_idx" ON "daily_analytics" USING btree ("exam_id","date");--> statement-breakpoint
CREATE INDEX "daily_analytics_date_idx" ON "daily_analytics" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_exam_idx" ON "exams" USING btree ("name","year","tier");--> statement-breakpoint
CREATE INDEX "exam_slug_idx" ON "exams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "exam_status_idx" ON "exams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exam_agency_year_idx" ON "exams" USING btree ("agency","year");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_type_idx" ON "job_runs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "job_started_at_idx" ON "job_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "parser_domain_idx" ON "parser_stats" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "parser_date_idx" ON "parser_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "result_view_submission_idx" ON "result_views" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "result_view_timestamp_idx" ON "result_views" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_job_name_idx" ON "scheduled_jobs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "score_dist_exam_bucket_idx" ON "score_distribution" USING btree ("exam_id","bucket_start");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_shift_idx" ON "shifts" USING btree ("exam_id","date","shift_number");--> statement-breakpoint
CREATE INDEX "exam_date_idx" ON "shifts" USING btree ("exam_id","date");--> statement-breakpoint
CREATE INDEX "shift_difficulty_idx" ON "shifts" USING btree ("difficulty_index");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_roll_idx" ON "submissions" USING btree ("roll_number","exam_id");--> statement-breakpoint
CREATE UNIQUE INDEX "url_hash_idx" ON "submissions" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "submission_exam_shift_idx" ON "submissions" USING btree ("exam_id","shift_id");--> statement-breakpoint
CREATE INDEX "rank_raw_idx" ON "submissions" USING btree ("exam_id","raw_score");--> statement-breakpoint
CREATE INDEX "rank_norm_idx" ON "submissions" USING btree ("exam_id","normalized_score");--> statement-breakpoint
CREATE INDEX "cat_rank_idx" ON "submissions" USING btree ("exam_id","category","raw_score");--> statement-breakpoint
CREATE INDEX "shift_rank_idx" ON "submissions" USING btree ("shift_id","raw_score");--> statement-breakpoint
CREATE INDEX "state_rank_idx" ON "submissions" USING btree ("exam_id","state","raw_score");--> statement-breakpoint
CREATE INDEX "submission_category_idx" ON "submissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "submission_created_at_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submission_composite_rank_idx" ON "submissions" USING btree ("exam_id","category","normalized_score","raw_score");--> statement-breakpoint
CREATE INDEX "log_level_idx" ON "system_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "log_component_idx" ON "system_logs" USING btree ("component");--> statement-breakpoint
CREATE INDEX "log_timestamp_idx" ON "system_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "setting_key_idx" ON "system_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "setting_category_idx" ON "system_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "feedback_type_idx" ON "user_feedback" USING btree ("feedback_type");--> statement-breakpoint
CREATE INDEX "feedback_rating_idx" ON "user_feedback" USING btree ("rating");