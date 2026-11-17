import { Hero } from '../components/sections/Hero';
import { Mission } from '../components/sections/Mission';
import { Pillars } from '../components/sections/Pillars';
import { JoinCta } from '../components/sections/JoinCta';

export function HomePage() {
  return (
    <>
      <Hero />
      <Mission />
      <Pillars />
      <JoinCta />
    </>
  );
}
