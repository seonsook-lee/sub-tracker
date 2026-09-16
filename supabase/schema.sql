-- 플랜 목록. Supabase 대시보드의 SQL Editor에서 한 번 실행한다.
-- 이후 플랜 추가/수정은 Table Editor에서 하면 되고, 앱은 최대 5분 안에 반영한다.

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 월 정가(달러). 비워 두면 앱에서 결제 달러를 직접 입력한다.
alter table public.plans add column if not exists price_usd numeric(10, 2);

-- 읽기만 공개한다. 쓰기는 대시보드(service role)로만.
alter table public.plans enable row level security;

drop policy if exists "plans are publicly readable" on public.plans;
create policy "plans are publicly readable"
  on public.plans
  for select
  to anon, authenticated
  using (true);

-- 정가는 2026-09 기준 기본값이다. 이미 값이 있으면 그대로 둔다.
insert into public.plans (name, sort_order, price_usd) values
  ('Claude Pro', 10, 20),
  ('Claude Max 5x', 20, 100),
  ('Claude Max 20x', 30, 200),
  ('ChatGPT Plus', 40, 20),
  ('ChatGPT Pro', 50, 200),
  ('GitHub Copilot Pro', 60, 10),
  ('Cursor Pro', 70, 20),
  ('Gemini (Google AI Pro)', 80, 19.99),
  ('Gemini (Google AI Ultra)', 90, 249.99),
  ('Perplexity Pro', 100, 20)
on conflict (name) do update
  set price_usd = coalesce(public.plans.price_usd, excluded.price_usd);
