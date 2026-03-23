-- Paste into Supabase SQL Editor (Dashboard → SQL → New query).
-- Run once. Requires: Auth (email provider enabled) for sign-up / login.

-- Extensions
create extension if not exists "pgcrypto";

-- Payment methods per user (dropdown: Chase Ink, Costco Citi Card, etc.)
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index payment_methods_user_id_idx on public.payment_methods (user_id);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null,
  date date not null,
  merchant text not null,
  category text,
  receipt_storage_path text,
  reimbursement_billed boolean not null default false,
  reimbursement_paid boolean not null default false,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_user_date_idx on public.transactions (user_id, date desc);

-- Seed default payment options when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.payment_methods (user_id, name, sort_order) values
    (new.id, 'Chase Ink', 1),
    (new.id, 'Costco Citi Card', 2),
    (new.id, 'Amex Business', 3),
    (new.id, 'Debit / checking', 4),
    (new.id, 'Other', 5);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;

create policy "Users read own payment_methods"
  on public.payment_methods for select
  using (auth.uid() = user_id);

create policy "Users insert own payment_methods"
  on public.payment_methods for insert
  with check (auth.uid() = user_id);

create policy "Users update own payment_methods"
  on public.payment_methods for update
  using (auth.uid() = user_id);

create policy "Users delete own payment_methods"
  on public.payment_methods for delete
  using (auth.uid() = user_id);

create policy "Users read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Storage: private bucket for receipt images
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Path layout: {user_id}/{transaction_id}/{filename}
create policy "receipts_select_own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername (name)) [1]
  );

create policy "receipts_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername (name)) [1]
  );

create policy "receipts_update_own"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername (name)) [1]
  );

create policy "receipts_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername (name)) [1]
  );

-- Optional: backfill payment_methods for users created before this migration
-- (Run manually if needed, after replacing with a real user id from auth.users)
-- insert into public.payment_methods (user_id, name, sort_order)
-- select id, 'Other', 99 from auth.users u
-- where not exists (select 1 from public.payment_methods pm where pm.user_id = u.id);
