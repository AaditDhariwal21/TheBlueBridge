import { BrowserRouter, Route, Routes } from 'react-router';

import { BlogsProvider } from '../features/blogs/state/BlogsProvider';
import { RootLayout } from './RootLayout';
import { NOT_FOUND, ROUTES } from './routes';

export function App() {
  return (
    <BrowserRouter>
      {/* Session cache for the Blogs section; survives navigating between pages. */}
      <BlogsProvider>
        <Routes>
          <Route element={<RootLayout />}>
            {Object.values(ROUTES).map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<NOT_FOUND.Component />} />
          </Route>
        </Routes>
      </BlogsProvider>
    </BrowserRouter>
  );
}
