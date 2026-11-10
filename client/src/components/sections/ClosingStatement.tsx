import { Container } from '../layout/Container';
import { Section } from '../layout/Section';
import { Constellation } from '../ui/Constellation';
import { Reveal } from '../ui/Reveal';

interface ClosingStatementProps {
  children: string;
}

/** A large italic statement on a navy band. */
export function ClosingStatement({ children }: ClosingStatementProps) {
  return (
    <Section tone="inverse" className="overflow-hidden">
      <Constellation />
      <Container width="reading">
        <Reveal>
          <p className="text-center font-display text-lead italic">{children}</p>
        </Reveal>
      </Container>
    </Section>
  );
}
