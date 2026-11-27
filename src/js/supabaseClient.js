/**
 * Client Supabase untuk SIIRS (Sistem Informasi Integrasi Rumah Sakit)
 * Berbagi database yang sama dengan D:\website\idik-app
 */

import { SIIRS_CONFIG } from './config.js';

let supabaseClient = null;
let connectionState = {
  isConnected: false,
  mode: 'offline', // 'local' | 'cloud' | 'offline'
  error: null
};

export async function initSupabase() {
  const url = SIIRS_CONFIG.supabaseUrl;
  const key = SIIRS_CONFIG.supabaseAnonKey;

  if (!url || !key || key.includes('replace-with-status')) {
    connectionState.mode = 'offline';
    connectionState.isConnected = false;
    return null;
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabaseClient = createClient(url, key, {
      auth: { persistSession: true },
      realtime: { params: { eventsPerSecond: 10 } }
    });

    // Uji koneksi ringan ke tabel siirs_beds
    const { data, error } = await supabaseClient.from('siirs_beds').select('id').limit(1);
    if (!error) {
      connectionState.isConnected = true;
      connectionState.mode = SIIRS_CONFIG.isLocal ? 'local' : 'cloud';
    } else {
      console.warn('Supabase terhubung tapi tabel siirs_beds belum dimigrasi:', error.message);
      connectionState.isConnected = false;
      connectionState.mode = 'migration_needed';
      connectionState.error = error.message;
    }
  } catch (err) {
    console.warn('Supabase offline / menggunakan mock lokal:', err.message);
    connectionState.isConnected = false;
    connectionState.mode = 'offline';
    connectionState.error = err.message;
  }

  return supabaseClient;
}

export function getSupabase() {
  return supabaseClient;
}

export function getConnectionState() {
  return connectionState;
}

/**
 * Mendapatkan data bed dari Supabase atau fallback ke cache lokal
 */
export async function fetchBedsFromDb(wardId) {
  if (!supabaseClient || !connectionState.isConnected) {
    return null;
  }
  try {
    let query = supabaseClient.from('siirs_beds').select('*');
    if (wardId) {
      query = query.eq('ward_id', wardId.toLowerCase());
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Gagal mengambil data bed dari DB:', e);
    return null;
  }
}

/**
 * Update status bed ke Supabase dan catat ke siirs_audit_logs
 */
export async function updateBedStatusDb(bedId, newStatus, actorUsername, actorRole, details = {}) {
  if (!supabaseClient || !connectionState.isConnected) {
    return { success: false, offline: true };
  }
  try {
    const { data: updatedBed, error: updateError } = await supabaseClient
      .from('siirs_beds')
      .update({
        status: newStatus,
        updated_by: actorUsername,
        updated_at: new Date().toISOString()
      })
      .eq('id', bedId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Catat log mutasi
    await supabaseClient.from('siirs_audit_logs').insert({
      action: 'STATUS_CHANGE',
      bed_id: bedId,
      actor_username: actorUsername,
      actor_role: actorRole,
      details: {
        new_status: newStatus,
        ...details
      }
    });

    return { success: true, data: updatedBed };
  } catch (e) {
    console.error('Gagal update status bed di DB:', e);
    return { success: false, error: e.message };
  }
}
