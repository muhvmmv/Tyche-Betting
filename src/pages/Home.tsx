import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { MatchCard } from "@/components/MatchCard";
import { BettingSlip } from "@/components/BettingSlip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Bet {
  id: string;
  league: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  selection: string;
  odds: number;
  stake: number;
}

const Home = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [showBettingSlip, setShowBettingSlip] = useState(false);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, balance, refreshBalance } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      handleDepositVerification(sessionId);
    }
  }, [searchParams]);

  const handleDepositVerification = async (sessionId: string) => {
    try {
      console.log("Verifying deposit for session:", sessionId);
      
      // Refresh session before verifying deposit
      await supabase.auth.refreshSession();
      
      const { data, error } = await supabase.functions.invoke("verify-deposit", {
        body: { session_id: sessionId },
      });

      if (error) {
        console.error("Verify deposit error:", error);
        throw error;
      }

      console.log("Deposit verification response:", data);

      if (data?.success) {
        // Clear URL first
        window.history.replaceState({}, "", "/");
        
        // Force immediate balance refresh from database
        const { data: walletData } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", user!.id)
          .single();

        if (walletData) {
          console.log("New balance after deposit:", walletData.balance);
          // Use the refreshBalance from context which will update state
          await refreshBalance();
        }
        
        toast({
          title: "Deposit successful!",
          description: `$${data.amount} has been added to your wallet. New balance: $${walletData?.balance || balance}`,
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: "Please contact support if the amount was charged",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMatches();
    
    // Refresh matches every 30 seconds for live updates
    const interval = setInterval(() => {
      fetchMatches();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      console.log('Fetching matches...');

      const result = await supabase.functions.invoke('get_upcoming_matches');

      if (result.error) {
        console.error('Error fetching matches:', result.error);
        toast({
          title: "Failed to load matches",
          description: "Please try again later",
          variant: "destructive"
        });
        return;
      }

      const fixtures = result.data?.fixtures || [];
      console.log('Total fixtures received:', fixtures.length);

      // Split into live and upcoming
      const live = fixtures.filter((f: any) => f.isLive);
      const upcoming = fixtures.filter((f: any) => !f.isLive);

      console.log('Live matches:', live.length);
      console.log('Upcoming matches:', upcoming.length);

      setLiveMatches(live);
      setUpcomingMatches(upcoming);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Failed to load matches",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBetSlip = (
    matchId: string,
    league: string,
    homeTeam: string,
    awayTeam: string,
    selection: string,
    odds: number
  ) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to place bets",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const match = `${homeTeam} vs ${awayTeam}`;
    const betId = `${matchId}-${selection}`;
    const existingBet = bets.find((bet) => bet.id === betId);

    if (existingBet) {
      toast({
        title: "Already added",
        description: "This selection is already in your betting slip",
      });
      return;
    }

    const newBet: Bet = {
      id: betId,
      league,
      match,
      homeTeam,
      awayTeam,
      selection,
      odds,
      stake: 0,
    };
    setBets([...bets, newBet]);
    setShowBettingSlip(true);

    toast({
      title: "Added to slip",
      description: `${selection} @ ${odds.toFixed(2)}`,
    });
  };

  const handleRemoveBet = (id: string) => {
    setBets(bets.filter((bet) => bet.id !== id));
  };

  const handleUpdateStake = (id: string, stake: number) => {
    setBets(bets.map((bet) => (bet.id === id ? { ...bet, stake } : bet)));
  };

  const handleClearAll = () => {
    setBets([]);
  };

  const handlePlaceBet = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to place bets",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      // Refresh session before placing bet
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        toast({
          title: "Session expired",
          description: "Please sign in again to place bets",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("place-bet", {
        body: { bets },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your bets have been placed",
      });

      setBets([]);
      setShowBettingSlip(false);
      await refreshBalance();
    } catch (error: any) {
      console.error("Bet placement error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to place bet",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bet Smart, Win Big
          </h1>
          <p className="text-muted-foreground text-lg">
            Live betting with real-time odds and instant payouts
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">Loading matches...</p>
              </div>
            )}

            {!loading && liveMatches.length === 0 && upcomingMatches.length === 0 && (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground">No matches available at the moment</p>
              </div>
            )}

            {liveMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                  <h2 className="text-2xl font-bold text-foreground">Live Matches</h2>
                </div>
                <div className="grid gap-4">
                  {liveMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      league={match.league}
                      homeTeam={match.homeTeam}
                      awayTeam={match.awayTeam}
                      homeOdds={match.homeOdds}
                      drawOdds={match.drawOdds}
                      awayOdds={match.awayOdds}
                      isLive={true}
                      time={match.time}
                      homeScore={match.homeScore}
                      awayScore={match.awayScore}
                      highVolume={match.highVolume}
                      homeInitial={match.homeInitials}
                      awayInitial={match.awayInitials}
                      onAddToBetSlip={(selection, odds) =>
                        handleAddToBetSlip(
                          match.id,
                          match.league,
                          match.homeTeam,
                          match.awayTeam,
                          selection,
                          odds
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Upcoming Matches
                </h2>
                <div className="grid gap-4">
                  {upcomingMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      league={match.league}
                      homeTeam={match.homeTeam}
                      awayTeam={match.awayTeam}
                      homeOdds={match.homeOdds}
                      drawOdds={match.drawOdds}
                      awayOdds={match.awayOdds}
                      isLive={false}
                      time={match.time}
                      highVolume={match.highVolume}
                      homeInitial={match.homeInitials}
                      awayInitial={match.awayInitials}
                      onAddToBetSlip={(selection, odds) =>
                        handleAddToBetSlip(
                          match.id,
                          match.league,
                          match.homeTeam,
                          match.awayTeam,
                          selection,
                          odds
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="hidden lg:block">
              <BettingSlip
                bets={bets}
                onRemoveBet={handleRemoveBet}
                onUpdateStake={handleUpdateStake}
                onClearAll={handleClearAll}
                onPlaceBet={handlePlaceBet}
              />
            </div>

            {bets.length > 0 && (
              <Button
                className="lg:hidden fixed bottom-4 right-4 z-50 shadow-lg"
                onClick={() => setShowBettingSlip(true)}
              >
                View Slip ({bets.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showBettingSlip} onOpenChange={setShowBettingSlip}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betting Slip</DialogTitle>
          </DialogHeader>
          <BettingSlip
            bets={bets}
            onRemoveBet={handleRemoveBet}
            onUpdateStake={handleUpdateStake}
            onClearAll={handleClearAll}
            onPlaceBet={handlePlaceBet}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
