import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// UpdatePassword component allows users to set a new password
const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Toast notification hook
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handles password update form submission
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirm) {
      toast({
        title: "Missing fields",
        description: "Please fill both password fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: "Passwords do not match",
        description: "Make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password updated",
        description: "You can now sign in with your new password",
      });

      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Failed to update password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Renders the password update form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Set new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default UpdatePassword;