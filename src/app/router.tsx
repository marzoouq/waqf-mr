/**
 * App Router — M1.1 (Version I-R)
 * يجمع كل ملفات المسارات المقسّمة تحت RootLayout مشترك.
 */
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { RootLayout } from "@/app/root-layout";
import { publicRoutes, catchAllRoute } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { beneficiaryRoutes } from "@/routes/beneficiaryRoutes";
import { waqifRoutes } from "@/routes/waqifRoutes";
import { supportRoutes } from "@/routes/supportRoutes";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {publicRoutes}
      {adminRoutes}
      {beneficiaryRoutes}
      {waqifRoutes}
      {supportRoutes}
      {catchAllRoute}
    </Route>
  )
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
