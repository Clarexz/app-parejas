// Edge Function `stories-cleanup`: la dispara pg_cron cada hora (private.run_stories_cleanup).
// Con service role pide el lote de stories/archivos por limpiar, borra los archivos del bucket
// `stories` con la API de Storage (SQL no puede: Storage protege storage.objects) y confirma
// con stories_cleanup_commit para que Postgres borre las filas.
// También limpia el bucket `memories`: memories_cleanup_batch lista los archivos huérfanos
// (más de 24 h sin fila en memory_photos) y aquí se borran; no hay nada que confirmar.
// Igual con el bucket `answer-audio` (answer_audio_cleanup_batch: audios sin respuesta).
// Protegida con el secreto compartido `x-notify-secret` (JWT desactivado en el servidor).
import {
  BATCH_LIMIT,
  MAX_BATCHES,
  REMOVE_CHUNK_SIZE,
  chunk,
  parseBatch,
  parsePaths,
  storiesToCommit,
  timingSafeEqual,
} from './logic.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function errText(e: unknown): string {
  return e instanceof Error ? e.message : 'desconocido';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const expected = Deno.env.get('NOTIFY_SECRET');
  if (!expected) return json(500, { error: 'notify_secret_not_configured' });
  if (!timingSafeEqual(req.headers.get('x-notify-secret') ?? '', expected)) {
    return json(401, { error: 'unauthorized' });
  }

  const base = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json(500, { error: 'supabase_env_missing' });
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const rpc = async (name: string, args: unknown): Promise<unknown> => {
    const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`${name} respondió ${res.status}`);
    return await res.json();
  };

  // Borra un lote de archivos de un bucket; true si Storage lo aceptó.
  const removeChunk = async (bucket: string, prefixes: string[]): Promise<boolean> => {
    try {
      const res = await fetch(`${base}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ prefixes }),
      });
      if (!res.ok) console.error(`Storage DELETE (${bucket}) respondió ${res.status}`);
      return res.ok;
    } catch (e) {
      console.error(`Storage DELETE (${bucket}) falló:`, errText(e));
      return false;
    }
  };

  let removed = 0;
  let committed = 0;
  let failed = 0;
  let batches = 0;
  let storiesFailed = false;
  try {
    for (; batches < MAX_BATCHES; batches++) {
      const batch = parseBatch(await rpc('stories_cleanup_batch', { p_limit: BATCH_LIMIT }));
      if (!batch) throw new Error('stories_cleanup_batch devolvió una forma inesperada');
      if (batch.storyIds.length === 0 && batch.paths.length === 0) break;

      const failedPaths = new Set<string>();
      let removedNow = 0;
      for (const part of chunk(batch.paths, REMOVE_CHUNK_SIZE)) {
        if (await removeChunk('stories', part)) removedNow += part.length;
        else for (const p of part) failedPaths.add(p);
      }

      const ids = storiesToCommit(batch.items, failedPaths);
      let committedNow = 0;
      if (ids.length > 0) {
        const n = await rpc('stories_cleanup_commit', { p_story_ids: ids });
        committedNow = typeof n === 'number' ? n : 0;
      }
      removed += removedNow;
      committed += committedNow;
      failed += failedPaths.size;
      // Sin avance, el siguiente lote traería lo mismo: se reintenta en la próxima hora.
      if (removedNow === 0 && committedNow === 0) break;
    }
  } catch (e) {
    console.error('stories-cleanup falló:', errText(e));
    storiesFailed = true;
  }

  // Archivos huérfanos de un bucket (`memories`, `answer-audio`). Va aparte para que un fallo
  // no frene a las stories ni al otro bucket. Devuelve { removed, failed, error }.
  const cleanOrphans = async (bucket: string, rpcName: string) => {
    let removedTotal = 0;
    let failedTotal = 0;
    let error = false;
    try {
      for (let b = 0; b < MAX_BATCHES; b++) {
        const paths = parsePaths(await rpc(rpcName, { p_limit: BATCH_LIMIT }));
        if (!paths) throw new Error(`${rpcName} devolvió una forma inesperada`);
        if (paths.length === 0) break;
        let removedNow = 0;
        for (const part of chunk(paths, REMOVE_CHUNK_SIZE)) {
          if (await removeChunk(bucket, part)) removedNow += part.length;
          else failedTotal += part.length;
        }
        removedTotal += removedNow;
        // Sin avance, el siguiente lote traería lo mismo: se reintenta en la próxima hora.
        if (removedNow === 0) break;
      }
    } catch (e) {
      console.error(`${bucket}-cleanup falló:`, errText(e));
      error = true;
    }
    return { removed: removedTotal, failed: failedTotal, error };
  };

  const memories = await cleanOrphans('memories', 'memories_cleanup_batch');
  const audio = await cleanOrphans('answer-audio', 'answer_audio_cleanup_batch');
  const memoriesRemoved = memories.removed;
  const memoriesFailed = memories.failed;
  const answerAudioRemoved = audio.removed;
  const answerAudioFailed = audio.failed;

  console.log(
    `stories-cleanup: removed=${removed} committed=${committed} failed=${failed}` +
      ` memories_removed=${memoriesRemoved} memories_failed=${memoriesFailed}` +
      ` answer_audio_removed=${answerAudioRemoved} answer_audio_failed=${answerAudioFailed}`,
  );
  if (storiesFailed || memories.error || audio.error) {
    return json(500, {
      error: 'cleanup_failed',
      removed,
      committed,
      failed,
      memoriesRemoved,
      memoriesFailed,
      answerAudioRemoved,
      answerAudioFailed,
    });
  }
  return json(200, {
    removed,
    committed,
    failed,
    batches,
    memoriesRemoved,
    memoriesFailed,
    answerAudioRemoved,
    answerAudioFailed,
  });
});
