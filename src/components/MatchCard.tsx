import { Clock, TrendingUp } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// Props for MatchCard component
interface MatchCardProps {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  isLive?: boolean;
  time?: string;
  highVolume?: boolean;
  homeInitial?: string;
  awayInitial?: string;
  homeScore?: number;
  awayScore?: number;
  onAddToBetSlip?: (team: string, odds: number) => void;
}
// MatchCard component displays information about a sports match and betting options
export const MatchCard = ({
  league,
  homeTeam,
  awayTeam,
  homeOdds,
  drawOdds,
  awayOdds,
  isLive = false,
  time,
  highVolume = false,
  homeInitial,
  awayInitial,
  homeScore,
  awayScore,
  onAddToBetSlip,
}: MatchCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Badge
          variant="secondary"
          className="bg-primary/20 text-primary hover:bg-primary/30 text-xs"
        >
          {league}
        </Badge>
        <div className="flex items-center gap-2">
          {time && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{time}</span>
            </div>
          )}
          {isLive && (
            <Badge variant="destructive" className="text-xs">
              LIVE
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {homeInitial && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{homeInitial}</span>
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{homeTeam}</span>
          </div>
          {isLive && homeScore !== undefined && (
            <span className="text-lg font-bold text-foreground">{homeScore}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {awayInitial && (
              <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                <span className="text-xs font-bold text-destructive">{awayInitial}</span>
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{awayTeam}</span>
          </div>
          {isLive && awayScore !== undefined && (
            <span className="text-lg font-bold text-foreground">{awayScore}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Button
          variant="secondary"
          className="flex flex-col items-center py-3 h-auto hover:bg-primary/20 hover:border-primary transition-colors"
          onClick={() => onAddToBetSlip?.(homeTeam, homeOdds)}
        >
          <span className="text-xs text-muted-foreground mb-1">Home</span>
          <span className="text-sm font-bold text-foreground">{homeOdds.toFixed(2)}</span>
        </Button>
        <Button
          variant="secondary"
          className="flex flex-col items-center py-3 h-auto hover:bg-primary/20 hover:border-primary transition-colors"
          onClick={() => onAddToBetSlip?.("Draw", drawOdds)}
        >
          <span className="text-xs text-muted-foreground mb-1">Draw</span>
          <span className="text-sm font-bold text-foreground">{drawOdds.toFixed(2)}</span>
        </Button>
        <Button
          variant="secondary"
          className="flex flex-col items-center py-3 h-auto hover:bg-primary/20 hover:border-primary transition-colors"
          onClick={() => onAddToBetSlip?.(awayTeam, awayOdds)}
        >
          <span className="text-xs text-muted-foreground mb-1">Away</span>
          <span className="text-sm font-bold text-foreground">{awayOdds.toFixed(2)}</span>
        </Button>
      </div>

      {highVolume && (
        <div className="flex items-center gap-1 text-xs text-success">
          <TrendingUp className="h-3 w-3" />
          <span>High betting volume</span>
        </div>
      )}
    </div>
  );
};
