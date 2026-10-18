'use client';

import { useEffect, useRef, useState } from 'react';
import { heroPhoto, hotel } from '@/content/site';
import { startCinemagraph } from '@/lib/cinemagraph';
import { loadImage } from '@/lib/load-image';
import { openHero, setHeroProgress } from '@/lib/hero-load';

// how the photo is shown once loaded: the WebGL cinemagraph, or a plain image where WebGL2 is missing
type Look = 'cinemagraph' | 'still';

// the loader stays at least this long, so a cached photo still gets its lantern moment
const MIN_LOADER_MS = 1100;

export default function Hero() {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [look, setLook] = useState<Look>('cinemagraph');
  const [stillSrc, setStillSrc] = useState<string>();
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(matchMedia('(hover: none)').matches);
    const started = performance.now();
    const abort = new AbortController();
    let stop: (() => void) | null = null;
    let blobUrl = '';
    let timer = 0;
    const open = () => {
      timer = window.setTimeout(openHero, Math.max(0, MIN_LOADER_MS - (performance.now() - started)));
    };

    // phones and tablets get the 1600px photo; the 3200px one is only worth it on wide screens
    const src = innerWidth > 1000 ? heroPhoto.large : heroPhoto.small;
    loadImage(src, setHeroProgress, abort.signal)
      .then((url) => {
        blobUrl = url;
        stop = startCinemagraph({ host: host.current!, canvas: canvas.current!, src: url, onReady: open });
        if (!stop) {
          setLook('still');
          setStillSrc(url);
          open();
        }
      })
      .catch((err) => {
        if (abort.signal.aborted) return;
        console.error(err);
        setLook('still');
        setStillSrc(src);
        open();
      });

    return () => {
      abort.abort();
      clearTimeout(timer);
      stop?.();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  return (
    <section ref={host} className={`hero look-${look}`} id="hero" aria-label={hotel.fullName}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the still is the no-WebGL fallback, drawn from the same downloaded bytes */}
      {stillSrc && <img className="still" src={stillSrc} alt={heroPhoto.alt} />}
      <canvas ref={canvas} aria-hidden="true" />
      <div className="copy">
        <h1>
          <span>พักริมเจ้าพระยา</span>
          <span>ในตึกแถวร้อยปี</span>
        </h1>
        <p>
          โรงแรม {hotel.rooms} ห้องย่านตลาดน้อย เดินถึงท่าเรือสี่พระยา 6 นาที เริ่มต้นคืนละ ฿{hotel.fromPrice.toLocaleString('en-US')} รวมอาหารเช้า
        </p>
        <a className="btn" href="#book">ดูห้องว่างคืนนี้</a>
      </div>
      <p className="hint">{touch ? 'ลากนิ้วเพื่อส่องทางเดิน' : 'ขยับเมาส์เพื่อส่องทางเดิน'}</p>
    </section>
  );
}
