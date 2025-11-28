import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";

// DepositDialog component allows users to deposit funds into their betting wallet
export const DepositDialog = () => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Handles deposit creation via Supabase function
  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);

    // Validation: enforce minimum deposit value
    if (!depositAmount || depositAmount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit is $10",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Refresh session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        toast({
          title: "Session expired",
          description: "Please sign in again to continue",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Invoke Supabase edge function to create deposit session
      const { data, error } = await supabase.functions.invoke("create-deposit", {
        body: { amount: depositAmount },
      });

      if (error) throw error;

      // Redirect user to payment page
      if (data?.url) {
        window.open(data.url, "_blank");
        setOpen(false);
        setAmount("");
      }
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Error",
        description: "Failed to create deposit session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Renders the deposit dialog with input and action button
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" />
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Add money to your betting wallet. Minimum deposit is $10.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              step="10"
            />
          </div>
          <Button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className="w-full"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};