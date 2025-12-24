import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Tests from "./pages/Tests";
import Courses from "./pages/Courses";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Roadmap from "./pages/Roadmap";
import StudentStudyHub from "./pages/StudentStudyHub";
import StudyMaterials from "./pages/StudyMaterials";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/study-materials" element={<StudyMaterials />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/student-study-hub" element={<StudentStudyHub />} /> {/* Add the new route */}
            <Route path="*" element={<Navigate to="/" />} /> {/* Redirect all other paths to home */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
