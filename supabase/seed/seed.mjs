#!/usr/bin/env node
/**
 * Loads the catalog (chains, items, tags, chain candidates) from menu.json.
 * Idempotent: upserts by slug / (chain, name). Catalog ONLY — never ratings,
 * scores, users, or reviews (SPEC.md Sections 1.3 and 13).
 *
 * Usage: node supabase/seed/seed.mjs
 * Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from .env).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Minimal .env loader so the script has no extra dependencies.
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Populate .env first (see .env.example).',
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const catalog = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'menu.json'), 'utf8'));

function fail(step, error) {
  console.error(`Seed failed at ${step}:`, error.message);
  process.exit(1);
}

// Tags
const { data: tagRows, error: tagErr } = await db
  .from('tags')
  .upsert(catalog.tags, { onConflict: 'slug' })
  .select('id, slug');
if (tagErr) fail('tags', tagErr);
const tagBySlug = new Map(tagRows.map((t) => [t.slug, t.id]));

let itemCount = 0;
for (const chain of catalog.chains) {
  const { data: chainRow, error: chainErr } = await db
    .from('chains')
    .upsert(
      { name: chain.name, slug: chain.slug, display_order: chain.display_order, is_active: true },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (chainErr) fail(`chain ${chain.slug}`, chainErr);

  for (const item of chain.items) {
    // No unique constraint on (chain_id, name) — emulate upsert by lookup.
    const { data: existing, error: findErr } = await db
      .from('items')
      .select('id')
      .eq('chain_id', chainRow.id)
      .eq('name', item.name)
      .maybeSingle();
    if (findErr) fail(`item lookup ${item.name}`, findErr);

    const payload = {
      chain_id: chainRow.id,
      name: item.name,
      description: item.description ?? null,
      bucket: item.bucket,
      attributes: item.attributes ?? {},
      image_url: item.image_url ?? null,
      is_active: true,
      is_new: item.is_new ?? false,
    };
    let itemId = existing?.id;
    if (itemId) {
      const { error } = await db.from('items').update(payload).eq('id', itemId);
      if (error) fail(`item update ${item.name}`, error);
    } else {
      const { data, error } = await db.from('items').insert(payload).select('id').single();
      if (error) fail(`item insert ${item.name}`, error);
      itemId = data.id;
    }
    itemCount += 1;

    const links = (item.tags ?? [])
      .map((slug) => {
        const tagId = tagBySlug.get(slug);
        if (!tagId) fail(`item ${item.name}`, new Error(`unknown tag slug: ${slug}`));
        return { item_id: itemId, tag_id: tagId };
      });
    if (links.length > 0) {
      const { error } = await db.from('item_tags').upsert(links, { onConflict: 'item_id,tag_id' });
      if (error) fail(`item_tags ${item.name}`, error);
    }
  }
  console.log(`Seeded chain ${chain.name} (${chain.items.length} items)`);
}

// Candidates that graduated into real chains stay on the ballot as "unlocked"
// (their votes are history, not future); never re-insert them as candidates.
const { error: unlockErr } = await db
  .from('chain_candidates')
  .update({ is_unlocked: true })
  .in('name', catalog.chains.map((c) => c.name));
if (unlockErr) fail('candidate graduation', unlockErr);

for (const candidate of catalog.chain_candidates) {
  const { data: existing, error: findErr } = await db
    .from('chain_candidates')
    .select('id')
    .eq('name', candidate.name)
    .maybeSingle();
  if (findErr) fail(`candidate lookup ${candidate.name}`, findErr);
  if (!existing) {
    const { error } = await db.from('chain_candidates').insert({ name: candidate.name });
    if (error) fail(`candidate ${candidate.name}`, error);
  }
}

console.log(
  `Done. ${catalog.chains.length} chains, ${itemCount} items, ${catalog.tags.length} tags, ${catalog.chain_candidates.length} candidates.`,
);
