import { Link, useNavigate } from 'react-router';

import { Button } from '../components/ui/Button';
import { buttonClasses } from '../components/ui/buttonClasses';
import { useAuth } from '../features/auth/authContext';
import { AccountSummary } from '../features/auth/components/AccountSummary';
import { AuthShell } from '../features/auth/components/AuthShell';
import { MyBlogs, MyComments } from '../features/blogs/components/mine/MyActivity';
import type { Me } from '../features/auth/types';
import { formatReferralCode } from '../features/auth/validation';

/**
 * The signed-in user's status. Pending users see that they are waiting for
 * approval (and can keep browsing); approved users see their referral code.
 * Rendered inside RequireAuth, so there is always a profile.
 */
export function AccountPage() {
  const { state, signOut, reload } = useAuth();
  const navigate = useNavigate();
  if (state.status !== 'signedIn') return null;
  const { me } = state;
  const firstName = me.name.split(' ')[0] ?? me.name;

  const handleSignOut = () => {
    // Leave the protected page first, so RequireAuth doesn't bounce to sign-in.
    void navigate('/');
    void signOut();
  };

  const signOutButton = (
    <Button variant="outline" onClick={handleSignOut}>
      Sign out
    </Button>
  );

  if (me.status === 'pending') {
    return (
      <AuthShell
        eyebrow="Your account"
        title="Your account is waiting for approval"
        intro={
          <p>
            Thank you for applying, {firstName}. An admin reviews every application personally, so
            this can take a little while.
          </p>
        }
      >
        <div role="status" className="flex flex-col gap-6">
          <AccountSummary me={me} roleLabel="Applied as" />
          <p className="text-sm text-text-muted">
            Until then you can read everything on the site. Writing, commenting and asking questions
            open up once you’re approved.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/blogs" className={buttonClasses({ variant: 'outline' })}>
              Read the blogs
            </Link>
            <Button variant="outline" onClick={reload}>
              Check again
            </Button>
            {signOutButton}
          </div>
        </div>
      </AuthShell>
    );
  }

  if (me.status !== 'approved') {
    return (
      <AuthShell
        eyebrow="Your account"
        title="Your account isn’t active"
        intro={<p>If you think this is a mistake, please contact the member who invited you.</p>}
      >
        <div className="flex flex-wrap gap-3">{signOutButton}</div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Your account"
      title={`Welcome, ${firstName}`}
      intro={<p>{welcomeLine(me)}</p>}
      after={
        <>
          <MyBlogs />
          <MyComments />
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {me.referralCode && (
          <section aria-labelledby="referral-code-title" className="border border-border p-4">
            <h2 id="referral-code-title" className="font-sans text-sm text-text-muted">
              Your referral code
            </h2>
            <p className="mt-1 font-display text-h3 tracking-caps select-all">
              {formatReferralCode(me.referralCode)}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Share it with women you’d like to invite. It works while your account is active.
            </p>
          </section>
        )}
        <AccountSummary me={me} roleLabel="Role" />
        <div className="flex flex-wrap gap-3">
          <Link to="/blogs" className={buttonClasses({ variant: 'outline' })}>
            Go to the blogs
          </Link>
          {signOutButton}
        </div>
      </div>
    </AuthShell>
  );
}

function welcomeLine(me: Me): string {
  if (me.role === 'admin') return 'You’re an admin of The Blue Bridge.';
  if (me.role === 'ambassador') {
    const names = me.categories.map((category) => category.name).join(' and ');
    return names ? `You’re an ambassador for ${names}.` : 'You’re an ambassador.';
  }
  return 'You’re a member of The Blue Bridge.';
}
