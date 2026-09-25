-- Persist the "Hide overlay" toggle so viewers resyncing (reconnect, late join,
-- Postgres Changes) stay hidden instead of getting the live state back.
alter table public.quiz
	add column hidden boolean not null default false;
