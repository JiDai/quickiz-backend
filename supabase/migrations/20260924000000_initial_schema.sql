-- Quickiz — initial schema
-- Reconstructed from backend/app/api/** and frontend realtime subscriptions.

-- ---------------------------------------------------------------------------
-- streamer
-- ---------------------------------------------------------------------------
create table public.streamer (
	id          text primary key,              -- Twitch channel_id
	is_premium  boolean not null default false,
	created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- quiz
-- ---------------------------------------------------------------------------
create table public.quiz (
	id              uuid primary key default gen_random_uuid(),
	created_at      timestamptz not null default now(),
	streamer_id     text not null,             -- Twitch channel_id (no FK: quiz may be created before /api/streamer upsert)
	title           text not null,
	description     text,
	state           text not null default 'idle'
		check (state in ('idle', 'running', 'question', 'answer_reveal', 'leaderboard')),
	scoring_type    text not null default 'correct_count'
		check (scoring_type in ('correct_count', 'time_bonus', 'weighted')),
	timer_duration  integer not null default 30,
	deleted_at      timestamptz
);

create index quiz_streamer_id_idx on public.quiz (streamer_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- question
-- ---------------------------------------------------------------------------
create table public.question (
	id              uuid primary key default gen_random_uuid(),
	created_at      timestamptz not null default now(),
	quiz_id         uuid not null references public.quiz (id) on delete cascade,
	title           text not null,
	answer1         text,
	answer2         text,
	answer3         text,
	answer4         text,
	good_answer     smallint not null,
	position        integer not null default 1,
	points          integer not null default 1,
	state           text not null default 'idle'
		check (state in ('idle', 'running', 'finished')),
	started_at      timestamptz,
	timer_duration  integer,
	deleted_at      timestamptz
);

create index question_quiz_id_idx on public.question (quiz_id);

-- ---------------------------------------------------------------------------
-- viewer_answer
-- ---------------------------------------------------------------------------
create table public.viewer_answer (
	id           uuid primary key default gen_random_uuid(),
	created_at   timestamptz not null default now(),
	question_id  uuid not null references public.question (id) on delete cascade,
	viewer_id    text not null,                -- Twitch opaque_user_id
	viewer_name  text,
	answer       smallint not null,
	-- First answer counts: enforces the duplicate check done in /api/quiz/answer.
	unique (question_id, viewer_id)
);

create index viewer_answer_created_at_idx on public.viewer_answer (created_at); -- purge cron

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The backend uses the service_role key (bypasses RLS).
-- The frontend should use the anon key: it only needs read access for
-- useAnswerCounts and the realtime postgres_changes subscriptions.
-- ---------------------------------------------------------------------------
alter table public.streamer      enable row level security;
alter table public.quiz          enable row level security;
alter table public.question      enable row level security;
alter table public.viewer_answer enable row level security;

create policy "anon read quiz"          on public.quiz          for select to anon using (true);
create policy "anon read question"      on public.question      for select to anon using (true);
create policy "anon read viewer_answer" on public.viewer_answer for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes used by the frontend)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.quiz, public.question, public.viewer_answer;
