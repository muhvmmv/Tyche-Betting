import { Trophy, Wallet, LogOut, RefreshCw } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DepositDialog } from "./DepositDialog";
import { useState } from "react";


// Navigation component providing site-wide navigation and user actions
export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, balance, signOut, refreshBalance } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Defines the main navigation links
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Current Bets", path: "/bets" },
    { name: "Dashboard", path: "/dashboard" },
  ];

  // Handles user sign-out and redirects to home
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Refreshes user balance from backend
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Renders the navigation bar with links and user actions
  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Tyche</span>
            </Link>

            <div className="hidden md:flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === link.path
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-md">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    ${balance.toFixed(2)}
                  </span>
                  <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="ml-2 hover:bg-secondary-foreground/10 rounded p-1 transition-colors"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`h-3 w-3 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <DepositDialog />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
