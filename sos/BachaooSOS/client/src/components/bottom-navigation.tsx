import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Heart, BarChart3, User } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home", testId: "nav-home" },
  { path: "/respond", icon: Heart, label: "Respond", testId: "nav-respond" },
  { path: "/dashboard", icon: BarChart3, label: "Stats", testId: "nav-stats" },
  { path: "/profile", icon: User, label: "Profile", testId: "nav-profile" },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="bg-card border-t border-border px-4 py-2 flex items-center justify-around sticky bottom-0 z-20">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        
        return (
          <button
            key={item.path}
            data-testid={item.testId}
            onClick={() => setLocation(item.path)}
            className={cn(
              "flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-colors",
              "text-muted-foreground hover:bg-muted",
              isActive && "text-primary bg-primary/10"
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
