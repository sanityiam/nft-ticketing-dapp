import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import OrganizerPage from "./pages/OrganizerPage";
import VerifyPage from "./pages/VerifyPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import MarketplacePage from "./pages/MarketplacePage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/organizer" element={<OrganizerPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}