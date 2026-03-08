import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-write-token',
};

// Validation limits (must match DB trigger)
const LIMITS = {
  rubles: { min: 0, max: 500000 },
  xp: { min: 0, max: 100000 },
  level: { min: 1, max: 50 },
  raid_count: { min: 0, max: 10000 },
  extraction_count: { min: 0, max: 10000 },
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(val)));
}

function validateProgress(body: any): { valid: boolean; sanitized?: any; error?: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Invalid body' };

  const { player_name, rubles, xp, level, raid_count, extraction_count, stash_items, upgrades } = body;

  if (!player_name || typeof player_name !== 'string' || player_name.trim().length === 0 || player_name.length > 20) {
    return { valid: false, error: 'Invalid player_name' };
  }

  if (typeof rubles !== 'number' || typeof xp !== 'number' || typeof level !== 'number') {
    return { valid: false, error: 'Missing numeric fields' };
  }

  if (!Array.isArray(stash_items)) return { valid: false, error: 'stash_items must be array' };
  if (stash_items.length > 100) return { valid: false, error: 'Too many stash items' };

  if (typeof upgrades !== 'object' || Array.isArray(upgrades)) {
    return { valid: false, error: 'upgrades must be object' };
  }

  return {
    valid: true,
    sanitized: {
      player_name: player_name.trim().slice(0, 20),
      rubles: clamp(rubles, LIMITS.rubles.min, LIMITS.rubles.max),
      xp: clamp(xp, LIMITS.xp.min, LIMITS.xp.max),
      level: clamp(level, LIMITS.level.min, LIMITS.level.max),
      raid_count: clamp(raid_count ?? 0, LIMITS.raid_count.min, LIMITS.raid_count.max),
      extraction_count: clamp(extraction_count ?? 0, LIMITS.extraction_count.min, LIMITS.extraction_count.max),
      stash_items: stash_items,
      upgrades: upgrades,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { valid, sanitized, error } = validateProgress(body);

    if (!valid) {
      return new Response(JSON.stringify({ error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const writeToken = req.headers.get('x-write-token');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if player exists
    const { data: existing } = await supabase
      .from('player_progress')
      .select('id, write_token')
      .eq('player_name', sanitized.player_name)
      .maybeSingle();

    if (existing) {
      // UPDATE — verify write token
      if (!writeToken || existing.write_token !== writeToken) {
        return new Response(JSON.stringify({ error: 'Invalid write token' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: updateError } = await supabase
        .from('player_progress')
        .update({
          rubles: sanitized.rubles,
          xp: sanitized.xp,
          level: sanitized.level,
          raid_count: sanitized.raid_count,
          extraction_count: sanitized.extraction_count,
          stash_items: sanitized.stash_items,
          upgrades: sanitized.upgrades,
        })
        .eq('id', existing.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      // INSERT — create new record
      const { data: inserted, error: insertError } = await supabase
        .from('player_progress')
        .insert({
          player_name: sanitized.player_name,
          rubles: sanitized.rubles,
          xp: sanitized.xp,
          level: sanitized.level,
          raid_count: sanitized.raid_count,
          extraction_count: sanitized.extraction_count,
          stash_items: sanitized.stash_items,
          upgrades: sanitized.upgrades,
        })
        .select('write_token')
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Insert failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ ok: true, write_token: inserted?.write_token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
