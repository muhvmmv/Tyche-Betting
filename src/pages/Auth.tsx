import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";

// Auth component handles user sign-in, sign-up, and password reset
const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handles form submission for sign-in and sign-up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Perform sign-up or sign-in based on current mode
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handles sending password reset email
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      if (!resetEmail) {
        throw new Error("Please enter your email");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset email sent",
        description: "Check your inbox for the reset link",
      });

      setResetOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Could not send reset email",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Renders the authentication form and reset password dialog
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold text-foreground">Tyche</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground">
            {isSignUp
              ? "Sign up to start betting"
              : "Sign in to your account"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  disabled={loading}
                  onClick={() => setResetOpen(true)}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={resetLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetLoading}
            >
              {resetLoading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;