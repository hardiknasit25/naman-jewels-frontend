import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { CustomerTypesPage } from "@/features/customers/CustomerTypesPage";
import { InquiriesPage } from "@/features/inquiries/InquiriesPage";
import { BannersPage } from "@/features/banners/BannersPage";
import { PagesPage } from "@/features/pages/PagesPage";
import { SessionLogsPage } from "@/features/logs/SessionLogsPage";
// import { AuditLogsPage } from '@/features/logs/AuditLogsPage'
import { ProfilePage } from "@/pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        {/* Dashboard is the default landing page. */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="category" element={<CategoriesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customer-types" element={<CustomerTypesPage />} />
        <Route path="inquiries" element={<InquiriesPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="pages" element={<PagesPage />} />
        <Route path="session-logs" element={<SessionLogsPage />} />
        {/* <Route path="audit-logs" element={<AuditLogsPage />} /> */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
