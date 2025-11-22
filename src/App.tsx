import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CurrentBets from "./pages/CurrentBets";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";   // ← ADD THIS

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bets" element={<CurrentBets />} />
          <Route path="/auth" element={<Auth />} />

          {/* NEW PASSWORD RESET ROUTE */}
          <Route path="/update-password" element={<UpdatePassword />} />

          <Route path="/deposit-success" element={<Home />} />

          {/* CATCH ALL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
