import { Hero } from '../components/sections/Hero';
import { Mission } from '../components/sections/Mission';
import { Pillars } from '../components/sections/Pillars';
import { WaitlistCta } from '../components/sections/WaitlistCta';

export function HomePage() {
  return (
    <>
      <Hero />
      <Mission />
      <Pillars />
      <WaitlistCta />
    </>
  );
}
