'use client';

import { useEffect, useRef, useState } from 'react';
import { hero, heroPhoto, hotel } from '@/content/site';
import Rich from '@/components/Rich';
import { startCinemagraph } from '@/lib/cinemagraph';
import { loadImage } from '@/lib/load-image';
import { heroPhotoReady, setHeroProgress } from '@/lib/hero-load';

// how the photo is shown once loaded: the WebGL cinemagraph, or a plain image where WebGL2 is missing
type Look = 'cinemagraph' | 'still';

// share of the loader's 0–100% that is the download; the rest is decoding the photo and handing it
// to the GPU, so 100% means the page is ready to show
const DOWNLOAD_SHARE = 0.85;

export default function Hero() {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [look, setLook] = useState<Look>('cinemagraph');
  const [stillSrc, setStillSrc] = useState<string>();
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(matchMedia('(hover: none)').matches);
    // the page is one evening told from the top; a reload starts it again rather than mid-story
    history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    const abort = new AbortController();
    let stop: (() => void) | null = null;
    let blobUrl = '';
    let creep = 0;
    let safety = 0;

    const showStill = (url: string) => {
      clearInterval(creep);
      clearTimeout(safety);
      setLook('still');
      setStillSrc(url);
      heroPhotoReady();
    };

    // phones and tablets get the 1600px photo; the 2400px one is only worth it on wide screens
    const src = innerWidth > 1000 ? heroPhoto.large : heroPhoto.small;
    loadImage(src, (p) => setHeroProgress(p * DOWNLOAD_SHARE), abort.signal)
      .then((photo) => {
        // decoding and the GPU upload report no progress of their own, so ease toward 99% meanwhile
        let p = DOWNLOAD_SHARE;
        creep = window.setInterval(() => setHeroProgress((p += (0.99 - p) * 0.08)), 60);
        // never leave a visitor at 99%: if preparing the photo stalls, open the page anyway
        safety = window.setTimeout(() => {
          clearInterval(creep);
          heroPhotoReady();
        }, 6000);
        blobUrl = URL.createObjectURL(photo);
        stop = startCinemagraph({
          host: host.current!,
          canvas: canvas.current!,
          photo,
          plate: heroPhoto.plate,
          mask: heroPhoto.mask,
          sprites: heroPhoto.sprites,
          onReady: () => {
            clearInterval(creep);
            clearTimeout(safety);
            heroPhotoReady();
          },
          onFail: () => showStill(blobUrl),
        });
        if (!stop) showStill(blobUrl);
      })
      .catch((err) => {
        if (abort.signal.aborted) return;
        console.error(err);
        showStill(src);
      });

    return () => {
      abort.abort();
      clearInterval(creep);
      clearTimeout(safety);
      stop?.();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  return (
    <section ref={host} className={`hero look-${look}`} id="hero" aria-label={hotel.name}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the still is the no-WebGL fallback, drawn from the same downloaded bytes */}
      {stillSrc && <img className="still" src={stillSrc} alt={heroPhoto.alt} />}
      <canvas ref={canvas} aria-hidden="true" />
      <div className="copy">
        <h1>
          {hero.headline.map((line) => (
            <span key={line}>
              <Rich text={line} />
            </span>
          ))}
        </h1>
        <p>{hero.text}</p>
        <a className="btn" href="#book">{hero.action}</a>
      </div>
      <p className="hint">{touch ? hero.hint.touch : hero.hint.pointer}</p>
    </section>
  );
}
