-- Migrasi verifikasi kredensial app_users untuk integrasi SIIRS dan modul tindakan Cathlab
create extension if not exists pgcrypto;

create or replace function public.verify_app_user_credentials(
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user record;
  v_normalized_hash text;
  v_match boolean := false;
begin
  select id, username, password_hash, role, ruangan_id into v_user
  from public.app_users
  where lower(username) = lower(trim(p_username))
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Pengguna tidak ditemukan di database app_users.');
  end if;

  -- Normalisasi format hash $2b$ ke $2a$ agar kompatibel dengan pgcrypto crypt()
  v_normalized_hash := replace(v_user.password_hash, '$2b$', '$2a$');

  if extensions.crypt(p_password, v_normalized_hash) = v_normalized_hash then
    v_match := true;
  end if;

  if v_match then
    return jsonb_build_object(
      'success', true,
      'id', v_user.id,
      'username', v_user.username,
      'role', v_user.role,
      'ruangan_id', v_user.ruangan_id
    );
  else
    return jsonb_build_object('success', false, 'message', 'Kata sandi tidak cocok.');
  end if;
end;
$$;

grant execute on function public.verify_app_user_credentials(text, text) to anon, authenticated, service_role;
comment on function public.verify_app_user_credentials is 'Fungsi verifikasi login terpadu aman (SECURITY DEFINER) untuk SIIRS & IDIK-App.';
