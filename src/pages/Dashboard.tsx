import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  method?: string | null;
  created_at: string;
  processed_at?: string | null;
}

// Dashboard component displays user betting statistics and allows withdrawals
const Dashboard = () => {
  const { user, balance, refreshBalance } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalBets: 0,
    activeBets: 0,
    totalWagered: 0,
  });

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Fetches user betting statistics and withdrawal history on component mount or user change
  useEffect(() => {
    if (user) {
      fetchStats();
      fetchWithdrawals();
    }
  }, [user]);

  // Fetches user betting statistics from the database
  const fetchStats = async () => {
    try {
      const { data: bets, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user?.id);

      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      if (bets) {
        const totalBets = bets.length;
        const activeBets = bets.filter((bet) => bet.status === "pending").length;
        const totalWagered = bets.reduce(
          (sum, bet) => sum + Number(bet.stake),
          0,
        );

        setStats({ totalBets, activeBets, totalWagered });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetches the user's withdrawal history
  const fetchWithdrawals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching withdrawals:", error);
        return;
      }

      setWithdrawals(
        (data || []).map((w) => ({
          ...w,
          amount: Number(w.amount),
        })),
      );
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    }
  };

  // Handles withdrawal form submission
  const handleWithdrawSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to request a withdrawal",
        variant: "destructive",
      });
      return;
    }

    const value = Number(withdrawAmount);

    // Validate withdrawal amount
    if (!value || value <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    // Check for sufficient balance
    if (value > balance) {
      toast({
        title: "Insufficient balance",
        description: "You cannot withdraw more than your wallet balance",
        variant: "destructive",
      });
      return;
    }

    try {
      setWithdrawLoading(true);

      // Invoke Supabase function to request withdrawal
      const { data, error } = await supabase.functions.invoke(
        "request-withdrawal",
        {
          body: { amount: value, method: "manual" },
        },
      );

      // Handle errors from the withdrawal request
      if (error || !data?.success) {
        console.error("Withdrawal error:", error ?? data?.error);
        toast({
          title: "Withdrawal failed",
          description: data?.error ?? "Please try again later",
          variant: "destructive",
        });
        return;
      }

      // Notify user of successful withdrawal request
      toast({
        title: "Withdrawal requested",
        description: `A request for $${value.toFixed(
          2,
        )} has been created and will be processed by admin`,
      });

      // Reset form
      setWithdrawAmount("");
      setWithdrawOpen(false);

      // Refresh balance and withdrawals list
      await refreshBalance();
      await fetchWithdrawals();
    } catch (error) {
      console.error("Withdrawal exception:", error);
      toast({
        title: "Withdrawal failed",
        description: "Something went wrong, please try again",
        variant: "destructive",
      });
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Renders the Dashboard component with user stats and withdrawal functionality
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                My Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back. Here is your betting overview
              </p>
            </div>

            <Button onClick={() => setWithdrawOpen(true)}>Withdraw</Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${balance.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Active Bets
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.activeBets}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Wagered
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ${stats.totalWagered.toFixed(2)}
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Quick Stats
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Total Bets Placed
                  </span>
                  <span className="font-semibold text-foreground">
                    {stats.totalBets}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending Bets</span>
                  <span className="font-semibold text-foreground">
                    {stats.activeBets}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Withdrawal History
              </h2>

              {withdrawals.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You have not made any withdrawal requests yet
                </p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          ${w.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(w.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            w.status === "paid"
                              ? "text-emerald-500"
                              : w.status === "rejected"
                              ? "text-red-500"
                              : "text-amber-500"
                          }`}
                        >
                          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                        </p>
                        {w.processed_at && (
                          <p className="text-xs text-muted-foreground">
                            processed{" "}
                            {new Date(w.processed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Request withdrawal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your current balance is ${balance.toFixed(2)}. Enter the amount
                you want to withdraw. An admin will process the request
                manually.
              </p>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount"
              />
              <Button
                className="w-full"
                onClick={handleWithdrawSubmit}
                disabled={withdrawLoading}
              >
                {withdrawLoading ? "Submitting..." : "Confirm withdrawal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;