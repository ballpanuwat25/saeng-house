// /film: the stage the portfolio video is recorded from (Stage.tsx). Only there with FILM_MODE=1 or on
// the dev server, and only against the public demo's book, which it resets before each take; everywhere
// else the address does not exist.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hotel } from '@/content/site';
import { filmOpen } from '@/lib/film';
import Stage from '@/app/film/Stage';
import './film.css';

export const metadata: Metadata = { title: `Film · ${hotel.name}`, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function Film() {
  if (!filmOpen()) notFound();
  return <Stage />;
}
