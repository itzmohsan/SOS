import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

import Home from "@/pages/home";
import Emergency from "@/pages/emergency";
import Respond from "@/pages/respond";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin";
import NotFound from "@/pages/not-found";

import BottomNavigation from "@/components/bottom-navigation";
import RegistrationModal from "@/components/registration-modal";

function Router() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    // Check if user is already registered
    const savedUser = localStorage.getItem('bachaoo_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setShowRegistration(true);
    }
  }, []);

  const handleUserRegistered = (user: any) => {
    setCurrentUser(user);
    setShowRegistration(false);
    localStorage.setItem('bachaoo_user', JSON.stringify(user));
  };

  if (showRegistration) {
    return <RegistrationModal onUserRegistered={handleUserRegistered} />;
  }

  if (!currentUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Switch>
          <Route path="/" component={() => <Home user={currentUser} />} />
          <Route path="/emergency/:sosId" component={Emergency} />
          <Route path="/respond" component={() => <Respond user={currentUser} />} />
          <Route path="/dashboard" component={() => <Dashboard user={currentUser} />} />
          <Route path="/profile" component={() => <Profile user={currentUser} setUser={setCurrentUser} />} />
          <Route path="/admin" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
