import { Navigate, Route, Routes } from 'react-router';

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
 * the route table); anyone signed in who isn't an approved admin goes to their account.
 * This only shapes the UI: every /api/admin request is checked by the server.
 */
export function AdminPanelPage() {
  const actor = useBlogActor();
  if (!canUseAdminPanel(actor)) return <Navigate to={AUTH_PATHS.account} replace />;

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
