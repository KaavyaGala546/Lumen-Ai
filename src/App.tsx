import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Protected } from "./components/Protected";
import { CamerasPage } from "./pages/Cameras";
import { Checkout } from "./pages/Checkout";
import { BillingSuccess } from "./pages/BillingSuccess";
import { FloorPage } from "./pages/Floor";
import { Forgot } from "./pages/Forgot";
import { LaborPage } from "./pages/Labor";
import { LivePage } from "./pages/Live";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Reset } from "./pages/Reset";
import { RevenuePage } from "./pages/Revenue";
import { SettingsPage } from "./pages/Settings";
import { Signup } from "./pages/Signup";
import { StaffPage } from "./pages/Staff";
import { AuthProvider } from "./state/AuthContext";
import { FloorProvider } from "./state/FloorContext";

export default function App() {
  return (
    <AuthProvider>
      <FloorProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/reset" element={<Reset />} />
            <Route
              path="/onboarding"
              element={
                <Protected>
                  <Onboarding />
                </Protected>
              }
            />
            <Route
              path="/checkout"
              element={
                <Protected needHouse>
                  <Checkout />
                </Protected>
              }
            />
            <Route
              path="/billing/success"
              element={
                <Protected>
                  <BillingSuccess />
                </Protected>
              }
            />
            <Route
              path="/app"
              element={
                <Protected needHouse needPaid>
                  <AppShell />
                </Protected>
              }
            >
              <Route index element={<FloorPage />} />
              <Route path="live" element={<LivePage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="labor" element={<LaborPage />} />
              <Route path="revenue" element={<RevenuePage />} />
              <Route path="cameras" element={<CamerasPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FloorProvider>
    </AuthProvider>
  );
}
