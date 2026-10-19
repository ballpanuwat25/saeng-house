import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Arrive from '@/components/Arrive';
import Rooms from '@/components/Rooms';
import Tea from '@/components/Tea';
import Walk from '@/components/Walk';
import Book from '@/components/Book';
import Footer from '@/components/Footer';
import Evening from '@/components/Evening';
import Lamp from '@/components/Lamp';
import LanternLoader from '@/components/LanternLoader';

export default function Home() {
  return (
    <>
      <LanternLoader />
      <Header />
      <Lamp below="hero" />
      <main id="home">
        <Hero />
        <Arrive />
        <Rooms />
        <Tea />
        <Walk />
        <Book />
      </main>
      <Footer />
      <Evening />
    </>
  );
}
