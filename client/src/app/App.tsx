import { BrowserRouter, Route, Routes } from 'react-router';

import { ToastProvider } from '../components/ui/Toaster';
import { AuthProvider } from '../features/auth/AuthProvider';
import { RequireAuth } from '../features/auth/RequireAuth';
import { RootLayout } from './RootLayout';
import { NOT_FOUND, ROUTE_LIST } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
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
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
