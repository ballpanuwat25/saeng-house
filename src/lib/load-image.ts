// Downloads an image while reporting real progress (0 to 1). Returns the bytes, so the WebGL hero
// can decode them and the <img> fallback can show them without downloading twice.
export async function loadImage(url: string, onProgress: (p: number) => void, signal: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`could not load ${url}: ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    // without a length header, approach 90% so the lanterns still brighten while it waits
    onProgress(total ? received / total : 1 - Math.exp(-received / 1.5e6) * 0.9);
  }
  onProgress(1);
  return new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') ?? 'image/jpeg' });
}
