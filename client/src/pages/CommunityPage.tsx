import { BRIDGE_FIGURES } from '../assets/images';
import { Audiences } from '../components/sections/Audiences';
import { PageIntro } from '../components/sections/PageIntro';
import { Picture } from '../components/ui/Picture';

export function CommunityPage() {
  return (
    <>
      <PageIntro
        title="Who the Blue Bridge is for"
        aside={
          <Picture
            image={BRIDGE_FIGURES}
            alt="Two women, one in blue and one in pink, joining hands at the centre of a bridge."
            sizes="(min-width: 64rem) 34rem, 100vw"
            priority
            imgClassName="aspect-figures object-cover"
          />
        }
      />
      <Audiences />
    </>
  );
}
