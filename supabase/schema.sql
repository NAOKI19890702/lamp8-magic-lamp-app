-- ================================================================
-- 魔法のランプnote — データベーススキーマ
-- ================================================================
-- 設計方針:
--   テナント = 1事業所(facility)
--   各 facility に複数の users (スタッフ)
--   各 facility が children, records, analyses を所有
--   RLS で自園のデータのみ可視化
-- ================================================================


-- ----------------------------------------------------------------
-- 1. Facilities (事業所)
-- ----------------------------------------------------------------
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.facilities enable row level security;


-- ----------------------------------------------------------------
-- 2. Profiles (スタッフ)
--    auth.users を拡張(facility_id, role など)
-- ----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  display_name text,
  role text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create index idx_profiles_facility on public.profiles(facility_id);


-- ----------------------------------------------------------------
-- 3. Children (子ども)
-- ----------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null,
  birthdate date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.children enable row level security;

create index idx_children_facility on public.children(facility_id) where archived_at is null;


-- ----------------------------------------------------------------
-- 4. Records (観察記録)
-- ----------------------------------------------------------------
create table public.records (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  question text,
  raw_text text not null,
  rewritten text,
  occurred_at timestamptz not null default now(),  -- 観察された時刻
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.records enable row level security;

create index idx_records_facility on public.records(facility_id);
create index idx_records_child on public.records(child_id, occurred_at desc);
create index idx_records_author on public.records(author_id);


-- ----------------------------------------------------------------
-- 5. Analyses (月次解析レポート)
-- ----------------------------------------------------------------
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  record_count int not null default 0,
  -- 構造化された分析結果(JSON)
  data jsonb not null,
  -- 生成時のメタ情報
  generated_by_id uuid references public.profiles(id),
  model text,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

alter table public.analyses enable row level security;

create unique index uniq_analyses_child_month
  on public.analyses(child_id, period_year, period_month);
create index idx_analyses_facility on public.analyses(facility_id);


-- ----------------------------------------------------------------
-- 6. Term Counts (私の学び - スタッフごとの用語出現回数)
-- ----------------------------------------------------------------
create table public.term_counts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  term_name text not null,
  count int not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, term_name)
);

alter table public.term_counts enable row level security;


-- ----------------------------------------------------------------
-- 7. Daily Questions Cache (ジーニーの今日の問いかけ - 日付ごと)
-- ----------------------------------------------------------------
create table public.daily_questions (
  facility_id uuid not null references public.facilities(id) on delete cascade,
  date date not null,
  principal_message text not null,
  question_2 text not null,
  question_3 text not null,
  generated_at timestamptz not null default now(),
  primary key (facility_id, date)
);

alter table public.daily_questions enable row level security;


-- ----------------------------------------------------------------
-- 8. Invitations (招待)
-- ----------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  token text not null unique,
  invited_by_id uuid references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invitations enable row level security;


-- ================================================================
-- ヘルパー関数 — 現在のユーザーの facility_id 取得
-- ================================================================
create or replace function public.current_facility_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select facility_id
  from public.profiles
  where id = auth.uid()
$$;


-- ================================================================
-- Row Level Security ポリシー
-- ================================================================

-- ============ facilities ============
-- 自分が所属する事業所のみ閲覧可
create policy "facilities_select_own"
  on public.facilities for select
  using (id = public.current_facility_id());

-- 認証済みユーザーは新規事業所を作成可(初回オンボーディング)
create policy "facilities_insert_self"
  on public.facilities for insert
  with check (auth.role() = 'authenticated');

-- 自園は owner/admin が更新可
create policy "facilities_update_own"
  on public.facilities for update
  using (
    id = public.current_facility_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );


-- ============ profiles ============
-- 自分のプロフィールは見える
create policy "profiles_select_self"
  on public.profiles for select
  using (id = auth.uid());

-- 同じ事業所の他スタッフのプロフィールも見える(担当の判別等)
create policy "profiles_select_same_facility"
  on public.profiles for select
  using (facility_id = public.current_facility_id());

-- 自分のプロフィールは作成可(初回サインアップ)
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- 自分のプロフィールは更新可
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid());


-- ============ children ============
create policy "children_select_facility"
  on public.children for select
  using (facility_id = public.current_facility_id());

create policy "children_insert_facility"
  on public.children for insert
  with check (facility_id = public.current_facility_id());

create policy "children_update_facility"
  on public.children for update
  using (facility_id = public.current_facility_id());

create policy "children_delete_facility"
  on public.children for delete
  using (facility_id = public.current_facility_id());


-- ============ records ============
create policy "records_select_facility"
  on public.records for select
  using (facility_id = public.current_facility_id());

create policy "records_insert_facility"
  on public.records for insert
  with check (
    facility_id = public.current_facility_id()
    and author_id = auth.uid()
  );

create policy "records_update_self"
  on public.records for update
  using (
    facility_id = public.current_facility_id()
    and author_id = auth.uid()
  );

create policy "records_delete_self"
  on public.records for delete
  using (
    facility_id = public.current_facility_id()
    and author_id = auth.uid()
  );


-- ============ analyses ============
create policy "analyses_select_facility"
  on public.analyses for select
  using (facility_id = public.current_facility_id());

create policy "analyses_insert_facility"
  on public.analyses for insert
  with check (facility_id = public.current_facility_id());

create policy "analyses_delete_facility"
  on public.analyses for delete
  using (facility_id = public.current_facility_id());


-- ============ term_counts ============
create policy "term_counts_select_self"
  on public.term_counts for select
  using (user_id = auth.uid());

create policy "term_counts_upsert_self"
  on public.term_counts for insert
  with check (user_id = auth.uid());

create policy "term_counts_update_self"
  on public.term_counts for update
  using (user_id = auth.uid());


-- ============ daily_questions ============
create policy "daily_questions_select_facility"
  on public.daily_questions for select
  using (facility_id = public.current_facility_id());

create policy "daily_questions_insert_facility"
  on public.daily_questions for insert
  with check (facility_id = public.current_facility_id());


-- ============ invitations ============
create policy "invitations_select_facility"
  on public.invitations for select
  using (facility_id = public.current_facility_id());

create policy "invitations_insert_admin"
  on public.invitations for insert
  with check (
    facility_id = public.current_facility_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );


-- ================================================================
-- updated_at トリガー
-- ================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_facilities
  before update on public.facilities
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_children
  before update on public.children
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_records
  before update on public.records
  for each row execute function public.handle_updated_at();


-- ================================================================
-- 新規ユーザー作成時に profiles 行を自動作成するトリガー
-- ================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
