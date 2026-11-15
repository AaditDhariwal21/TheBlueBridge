import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { useToast } from '../components/ui/toast';
import { reapply } from '../features/application/api';
import { ApplicationForm } from '../features/application/components/ApplicationForm';
import { draftFromMe, type ApplicationDraft } from '../features/application/model';
import { useAuth } from '../features/auth/authContext';
import { AuthShell } from '../features/auth/components/AuthShell';
import { TeamMessage } from '../features/auth/components/TeamMessage';
import { AUTH_PATHS } from '../features/auth/paths';
import { canReapply } from '../features/auth/permissions';
import type { Me } from '../features/auth/types';

/**
 * A rejected applicant applies again: the same steps as sign-up (without the account step),
 * filled in with her previous answers. She may keep or change her role and categories.
 * Rendered inside RequireAuth; anyone who can't reapply goes back to their account.
 */
export function ReapplyPage() {
  const { state } = useAuth();
  if (state.status !== 'signedIn') return null;
  if (!canReapply(state.me)) return <Navigate to={AUTH_PATHS.account} replace />;
  return <Reapply me={state.me} />;
}

function Reapply({ me }: { me: Me }) {
  const { setMe } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // Her answers as they were when she opened the page; later profile refreshes don't reset them.
  const [initialDraft] = useState<ApplicationDraft>(() => draftFromMe(me));
  const note = me.reviewNote;

  return (
    <AuthShell
      eyebrow="Your account"
      title="Apply again"
      intro={
        <p>
          Your previous answers are filled in. Check each step, change what’s needed, and send it
          when you’re ready.
        </p>
      }
      footer={
        <p>
          Changed your mind?{' '}
          <Link
            to={AUTH_PATHS.account}
            className="text-text underline decoration-accent-2-soft underline-offset-4 hover:decoration-text"
          >
            Back to your account
          </Link>
        </p>
      }
    >
      <ApplicationForm
        mode="reapply"
        initialDraft={initialDraft}
        header={note && <TeamMessage note={note} />}
        submitLabel="Send application"
        busyLabel="Sending…"
        footnote={
          <p className="text-center text-xs text-text-subtle">
            An admin reviews every application. We’ll show the outcome on your account page.
          </p>
        }
        onSubmit={async (input) => {
          const updated = await reapply(input);
          setMe(updated);
          toast.success('Your application has been sent. An admin will review it soon.');
          void navigate(AUTH_PATHS.account, { replace: true });
        }}
      />
    </AuthShell>
  );
}
