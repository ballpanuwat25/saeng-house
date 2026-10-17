'use client';

import { useEffect, useRef, useState } from 'react';
import { heroPhoto, hotel } from '@/content/site';
import { startCinemagraph } from '@/lib/cinemagraph';

export default function Hero() {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(matchMedia('(hover: none)').matches);
    if (!host.current || !canvas.current) return;
    // phones and tablets get the 1600px photo; the 3200px one is only worth it on wide screens
    const src = innerWidth > 1000 ? heroPhoto.large : heroPhoto.small;
    const stop = startCinemagraph({ host: host.current, canvas: canvas.current, src, onReady: () => setLive(true) });
    return () => stop?.();
  }, []);

  return (
    <section ref={host} className={`hero${live ? ' gl-on' : ''}`} id="hero" aria-label={hotel.fullName}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the still is the no-WebGL fallback and must match the canvas pixel for pixel */}
      <img className="still" src={heroPhoto.small} alt={heroPhoto.alt} />
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
