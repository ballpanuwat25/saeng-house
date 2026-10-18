'use client';

import { useEffect, useRef, useState } from 'react';
import { heroPhoto, hotel } from '@/content/site';
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
    const abort = new AbortController();
    let stop: (() => void) | null = null;
    let blobUrl = '';
    let creep = 0;

    const showStill = (url: string) => {
      clearInterval(creep);
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
        blobUrl = URL.createObjectURL(photo);
        stop = startCinemagraph({
          host: host.current!,
          canvas: canvas.current!,
          photo,
          onReady: () => {
            clearInterval(creep);
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
