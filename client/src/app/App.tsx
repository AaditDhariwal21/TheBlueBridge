import { BrowserRouter, Route, Routes } from 'react-router';

import { ToastProvider } from '../components/ui/Toaster';
import { AuthProvider } from '../features/auth/AuthProvider';
import { RequireAuth } from '../features/auth/RequireAuth';
import { BlogsProvider } from '../features/blogs/state/BlogsProvider';
import { RootLayout } from './RootLayout';
import { NOT_FOUND, ROUTE_LIST } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          {/* Session cache for the Blogs section; survives navigating between pages. */}
          <BlogsProvider>
            <Routes>
              <Route element={<RootLayout />}>
                {ROUTE_LIST.map(({ path, Component, requiresAuth }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      requiresAuth ? (
                        <RequireAuth>
                          <Component />
                        </RequireAuth>
                      ) : (
                        <Component />
                      )
                    }
                  />
                ))}
                <Route path="*" element={<NOT_FOUND.Component />} />
              </Route>
            </Routes>
          </BlogsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
