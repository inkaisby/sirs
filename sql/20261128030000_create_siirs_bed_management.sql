-- ==============================================================================
-- Migration: SIIRS (Sistem Informasi Integrasi Rumah Sakit) - Bed & IGD Management
-- RSUD Dr. M. Soewandhie Surabaya
-- Basis Data Terpadu (Shared with IDIK-App)
-- ==============================================================================

-- 1. Master Bed Management
create table if not exists public.siirs_beds (
  id uuid primary key default gen_random_uuid(),
  ward_id text not null,               -- slug: 'dahlia', 'teratai', 'icu', 'igd', dsb.
  ward_name text not null,             -- nama bangsal: 'Ruang Dahlia', 'ICU', dsb.
  class_type text not null,            -- 'Kelas 1', 'Kelas 2', 'Kelas 3', 'VIP', 'VVIP', 'Isolasi', 'Intensif', 'Non-Kelas'
  bed_number text not null,            -- e.g. 'D-01', 'ICU-03'
  status text not null check (status in ('available', 'occupied', 'reserved', 'cleaning')) default 'available',
  patient_mrn text,                    -- No Rekam Medis (terhubung dgn public.pasien.no_rm)
  patient_name text,
  patient_gender text check (patient_gender in ('L', 'P')),
  admission_date timestamptz,
  expected_discharge_date timestamptz,
  notes text,
  updated_by text default 'system',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_siirs_ward_bed unique (ward_id, bed_number)
);

create index if not exists idx_siirs_beds_ward on public.siirs_beds (ward_id);
create index if not exists idx_siirs_beds_status on public.siirs_beds (status);
create index if not exists idx_siirs_beds_class on public.siirs_beds (class_type);
create index if not exists idx_siirs_beds_patient_mrn on public.siirs_beds (patient_mrn);

-- 2. Antrean Masuk IGD & Transfer Ruangan
create table if not exists public.siirs_igd_queue (
  id uuid primary key default gen_random_uuid(),
  queue_number text not null unique,   -- e.g. 'IGD-001'
  patient_mrn text not null,           -- No Rekam Medis
  patient_name text not null,
  gender text check (gender in ('L', 'P')),
  triage_level text not null check (triage_level in ('P1', 'P2', 'P3')),
  diagnosis text,
  target_ward_id text,
  target_class text,
  status text not null check (status in ('waiting', 'allocated', 'transferred', 'cancelled')) default 'waiting',
  allocated_bed_id uuid references public.siirs_beds (id) on delete set null,
  admitted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_siirs_igd_status on public.siirs_igd_queue (status);
create index if not exists idx_siirs_igd_triage on public.siirs_igd_queue (triage_level);

-- 3. Audit Log Mutasi, Autentikasi, & Perubahan Status Bed (Anti-Tampering Immutable Table)
create table if not exists public.siirs_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,                -- 'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED', 'AUTH_LOCKED_OUT', 'STATUS_CHANGE', 'BED_ALLOCATION', 'AUTH_LOGOUT'
  bed_id uuid references public.siirs_beds (id) on delete cascade,
  actor_username text not null,
  actor_role text not null,            -- 'admin_yanmed', 'igd_admission', 'nurse_ward', 'system'
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_siirs_logs_created_at on public.siirs_audit_logs (created_at desc);
create index if not exists idx_siirs_logs_action on public.siirs_audit_logs (action);

-- 4. Trigger auto-update timestamp
create or replace function public.set_siirs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_siirs_beds_updated_at on public.siirs_beds;
create trigger trg_siirs_beds_updated_at
  before update on public.siirs_beds
  for each row execute procedure public.set_siirs_updated_at();

drop trigger if exists trg_siirs_igd_updated_at on public.siirs_igd_queue;
create trigger trg_siirs_igd_updated_at
  before update on public.siirs_igd_queue
  for each row execute procedure public.set_siirs_updated_at();

-- 5. Safe Public View (Data Masking untuk Display Publik Web RS)
create or replace view public.siirs_public_beds_view as
select
  id,
  ward_id,
  ward_name,
  class_type,
  bed_number,
  status,
  case when status = 'available' then 'Tersedia' else 'Terisi' end as status_label,
  updated_at
from public.siirs_beds;

-- 6. Row Level Security (RLS) & Anti-Tampering Rules
alter table public.siirs_beds enable row level security;
alter table public.siirs_igd_queue enable row level security;
alter table public.siirs_audit_logs enable row level security;

-- Public Display & Staff Read Access
create policy "SIIRS Bed read by all" on public.siirs_beds for select using (true);
create policy "SIIRS IGD queue read by all" on public.siirs_igd_queue for select using (true);
create policy "SIIRS Audit log read by all" on public.siirs_audit_logs for select using (true);

-- Modifikasi data oleh authenticated & service_role
create policy "SIIRS Bed modify by authenticated and service" on public.siirs_beds
  for all using (auth.role() in ('authenticated', 'service_role'))
  with check (auth.role() in ('authenticated', 'service_role'));

create policy "SIIRS IGD modify by authenticated and service" on public.siirs_igd_queue
  for all using (auth.role() in ('authenticated', 'service_role'))
  with check (auth.role() in ('authenticated', 'service_role'));

-- Anti-tampering: Audit log HANYA boleh INSERT. UPDATE dan DELETE tidak diberikan policy.
create policy "SIIRS Audit insert by authenticated and service" on public.siirs_audit_logs
  for insert with check (auth.role() in ('authenticated', 'service_role'));

-- Izinkan dev/demo lokal operasional
create policy "SIIRS Anon modify for local dev" on public.siirs_beds
  for all using (true) with check (true);
create policy "SIIRS Anon modify IGD for local dev" on public.siirs_igd_queue
  for all using (true) with check (true);
create policy "SIIRS Anon insert log for local dev" on public.siirs_audit_logs
  for insert with check (true);

-- 7. Stored Procedure: Pencatatan Audit Keamanan
create or replace function public.siirs_record_security_audit(
  p_action text,
  p_username text,
  p_role text,
  p_details jsonb default '{}'::jsonb
)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into public.siirs_audit_logs (action, actor_username, actor_role, details)
  values (p_action, p_username, p_role, p_details)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

-- 8. Enable Realtime Publications
do $$
begin
  begin
    alter publication supabase_realtime add table public.siirs_beds;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.siirs_igd_queue;
  exception when duplicate_object then null;
  end;
end $$;

-- 9. Seed Initial Data (Sampling Bangsal RSUD Dr. M. Soewandhie)
insert into public.siirs_beds (ward_id, ward_name, class_type, bed_number, status, patient_mrn, patient_name, patient_gender, admission_date)
values
  ('dahlia', 'Ruang Dahlia', 'Kelas 1', 'D-01', 'occupied', 'RM-882190', 'Budi Santoso', 'L', now() - interval '2 days'),
  ('dahlia', 'Ruang Dahlia', 'Kelas 1', 'D-02', 'available', null, null, null, null),
  ('dahlia', 'Ruang Dahlia', 'Kelas 1', 'D-03', 'cleaning', null, null, null, null),
  ('teratai', 'Ruang Teratai', 'Kelas 2', 'T-01', 'occupied', 'RM-771204', 'Siti Aminah', 'P', now() - interval '1 day'),
  ('teratai', 'Ruang Teratai', 'Kelas 2', 'T-02', 'reserved', 'RM-994321', 'Agus Wibowo', 'L', now()),
  ('icu', 'Intensive Care Unit (ICU)', 'Intensif', 'ICU-01', 'occupied', 'RM-112093', 'Hendro Prayitno', 'L', now() - interval '3 days'),
  ('icu', 'Intensive Care Unit (ICU)', 'Intensif', 'ICU-02', 'available', null, null, null, null),
  ('igd', 'Instalasi Gawat Darurat (IGD)', 'Non-Kelas', 'IGD-01', 'occupied', 'RM-990123', 'Dewi Lestari', 'P', now()),
  ('igd', 'Instalasi Gawat Darurat (IGD)', 'Non-Kelas', 'IGD-02', 'available', null, null, null, null)
on conflict (ward_id, bed_number) do nothing;

insert into public.siirs_igd_queue (queue_number, patient_mrn, patient_name, gender, triage_level, diagnosis, target_ward_id, target_class, status)
values
  ('Q-01', 'RM-990123', 'Dewi Lestari', 'P', 'P1', 'Akut Abdomen Suspek Apendisitis', 'dahlia', 'Kelas 1', 'waiting'),
  ('Q-02', 'RM-667123', 'Rudi Hermawan', 'L', 'P2', 'Fraktur Femur Sinistra Tertutup', 'teratai', 'Kelas 2', 'waiting')
on conflict (queue_number) do nothing;
