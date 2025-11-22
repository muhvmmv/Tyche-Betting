import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Bet {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  selection: string;
  odds: number;
  stake: number;
  potential_win: number;
  status: string;
  placed_at: string;
}

const CurrentBets = () => {
  const { user } = useAuth();
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [settledBets, setSettledBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBets();
    }
  }, [user]);

  const fetchBets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user?.id)
        .order("placed_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setActiveBets(data.filter((bet) => bet.status === "pending"));
        setSettledBets(data.filter((bet) => bet.status !== "pending"));
      }
    } catch (error) {
      console.error("Error fetching bets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBetStatusIcon = (status: string) => {
    switch (status) {
      case "won":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "lost":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <TrendingUp className="h-5 w-5 text-primary" />;
    }
  };

  const getBetStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-success">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Current Bets</h1>
            <p className="text-muted-foreground">
              Track all your active and settled bets
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Active Bets</h2>
              </div>
              {activeBets.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No active bets at the moment</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Place a bet from the home page to see it here
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activeBets.map((bet) => (
                    <Card key={bet.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{bet.league}</p>
                          <p className="font-semibold text-foreground">
                            {bet.home_team} vs {bet.away_team}
                          </p>
                          <p className="text-sm text-primary font-medium mt-1">
                            {bet.selection} @ {Number(bet.odds).toFixed(2)}
                          </p>
                        </div>
                        {getBetStatusBadge(bet.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Stake</p>
                          <p className="font-semibold text-foreground">
                            ${Number(bet.stake).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Odds</p>
                          <p className="font-semibold text-foreground">
                            {Number(bet.odds).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Potential Win</p>
                          <p className="font-semibold text-success">
                            ${Number(bet.potential_win).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Settled Bets</h2>
              {settledBets.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No settled bets yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your betting history will appear here
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {settledBets.map((bet) => (
                    <Card key={bet.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{bet.league}</p>
                          <p className="font-semibold text-foreground">
                            {bet.home_team} vs {bet.away_team}
                          </p>
                          <p className="text-sm text-primary font-medium mt-1">
                            {bet.selection} @ {Number(bet.odds).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getBetStatusIcon(bet.status)}
                          {getBetStatusBadge(bet.status)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Stake</p>
                          <p className="font-semibold text-foreground">
                            ${Number(bet.stake).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Odds</p>
                          <p className="font-semibold text-foreground">
                            {Number(bet.odds).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            {bet.status === "won" ? "Won" : "Potential Win"}
                          </p>
                          <p
                            className={`font-semibold ${
                              bet.status === "won"
                                ? "text-success"
                                : "text-muted-foreground"
                            }`}
                          >
                            ${Number(bet.potential_win).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CurrentBets;
