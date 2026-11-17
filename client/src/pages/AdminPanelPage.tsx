import { Link, Navigate, Route, Routes } from 'react-router';

import { usePageHead } from '../app/head';
import { Container } from '../components/layout/Container';
import { DeadEnd } from '../components/ui/DeadEnd';
import { buttonClasses } from '../components/ui/buttonClasses';
import { AdminActivityLog } from '../features/admin/components/AdminActivityLog';
import { AdminLayout } from '../features/admin/components/AdminLayout';
import { AdminMembers } from '../features/admin/components/AdminMembers';
import { AdminOverview } from '../features/admin/components/AdminOverview';
import { AdminQueryBlogs } from '../features/admin/components/AdminQueryBlogs';
import { ADMIN_PATH } from '../features/admin/paths';
import { AUTH_PATHS } from '../features/auth/paths';
import { canUseAdminPanel } from '../features/auth/permissions';
import { useBlogActor } from '../features/blogs/state/viewer';

/**
 * /adminpanel and its sections. Signed-out visitors are sent to sign in (RequireAuth, from
 * the route table); anyone signed in who isn't an approved admin is told they have no access.
 * This only shapes the UI: every /api/admin request is checked by the server.
 */
export function AdminPanelPage() {
  const actor = useBlogActor();
  if (!canUseAdminPanel(actor)) return <NoAccess />;

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="query-blogs" element={<AdminQueryBlogs />} />
        <Route path="activity" element={<AdminActivityLog />} />
        <Route path="*" element={<Navigate to={ADMIN_PATH} replace />} />
      </Routes>
    </AdminLayout>
  );
}

function NoAccess() {
  usePageHead({
    title: 'No access — The Blue Bridge',
    description: 'The admin panel is only for Blue Bridge admins.',
    noindex: true,
  });
  return (
    <Container width="reading" className="py-14 sm:py-20">
      <DeadEnd
        size="page"
        headingLevel="h1"
        eyebrow="Admins only"
        title="You don’t have access to this page"
        actions={
          <>
            <Link to={AUTH_PATHS.account} className={buttonClasses({ size: 'lg' })}>
              Go to your account
            </Link>
            <Link to="/" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
              Back to home
            </Link>
          </>
        }
      >
        <p>
          The admin panel is only for Blue Bridge admins. If you think you should have access,
          please ask an admin.
        </p>
      </DeadEnd>
    </Container>
  );
}
