import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";

// Bet interface defines the structure of each bet added to the slip
interface Bet {
  id: string;
  league: string;
  match: string;
  selection: string;
  odds: number;
  stake: number;
}

// Props for the BettingSlip component, containing state handlers
interface BettingSlipProps {
  bets: Bet[];
  onRemoveBet: (id: string) => void;
  onUpdateStake: (id: string, stake: number) => void;
  onClearAll: () => void;
  onPlaceBet: () => void;
}

// Betting slip component responsible for showing selected bets and totals
export const BettingSlip = ({
  bets,
  onRemoveBet,
  onUpdateStake,
  onClearAll,
  onPlaceBet,
}: BettingSlipProps) => {
  const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalOdds = bets.reduce((product, bet) => product * bet.odds, 1);
  const potentialWin = totalStake * totalOdds;

  // Renders the betting slip UI with bet details and action buttons
  return (
    <div className="bg-card border border-border rounded-lg p-4 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">Betting Slip</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Clear All
        </Button>
      </div>

      {bets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Add selections to your betting slip
        </p>
      ) : (
        <>
          <div className="space-y-4 mb-4">
            {bets.map((bet) => (
              <div key={bet.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{bet.league}</p>
                    <p className="text-sm font-medium text-foreground">{bet.match}</p>
                    <p className="text-sm text-primary font-semibold">
                      {bet.selection} @ {bet.odds.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemoveBet(bet.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="Enter stake"
                  value={bet.stake || ""}
                  onChange={(e) =>
                    onUpdateStake(bet.id, parseFloat(e.target.value) || 0)
                  }
                  className="bg-input border-border"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-4 bg-secondary/50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Stake:</span>
              <span className="font-semibold text-foreground">
                ${totalStake.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Odds:</span>
              <span className="font-semibold text-primary">
                {totalOdds.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span className="text-foreground">Potential Win:</span>
              <span className="text-success">${potentialWin.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={onPlaceBet}
            disabled={bets.some((bet) => bet.stake === 0)}
          >
            Place Bet
          </Button>
        </>
      )}
    </div>
  );
};