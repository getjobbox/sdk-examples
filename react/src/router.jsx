import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import JobsPage from './pages/JobsPage.jsx'

/** Category slug for HR & People in the JobBox catalog. */
export const HR_CATEGORY_SLUG = 'hr'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <JobsPage />,
        handle: { title: 'All Jobs' },
      },
      {
        path: 'hr',
        element: <JobsPage />,
        handle: {
          title: 'HR Jobs',
          lockedCategory: HR_CATEGORY_SLUG,
        },
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

export default function Root() {
  return <RouterProvider router={router} />
}
