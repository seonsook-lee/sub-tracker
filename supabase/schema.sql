-- 플랜 목록. Supabase 대시보드의 SQL Editor에서 한 번 실행한다.
-- 이후 플랜 추가/수정은 Table Editor에서 하면 되고, 앱은 최대 5분 안에 반영한다.

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 읽기만 공개한다. 쓰기는 대시보드(service role)로만.
alter table public.plans enable row level security;

drop policy if exists "plans are publicly readable" on public.plans;
create policy "plans are publicly readable"
  on public.plans
  for select
  to anon, authenticated
  using (true);

insert into public.plans (name, sort_order) values
  ('Claude Pro', 10),
  ('Claude Max 5x', 20),
  ('Claude Max 20x', 30),
  ('ChatGPT Plus', 40),
  ('ChatGPT Pro', 50),
  ('GitHub Copilot Pro', 60),
  ('Cursor Pro', 70),
  ('Gemini (Google AI Pro)', 80),
  ('Gemini (Google AI Ultra)', 90),
  ('Perplexity Pro', 100)
on conflict (name) do nothing;
