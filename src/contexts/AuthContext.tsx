import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  balance: number;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refreshBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        console.log("Balance refreshed:", data.balance);
        setBalance(Number(data.balance));
      } else if (error) {
        console.error("Error refreshing balance:", error);
      }
    } catch (error) {
      console.error("Balance refresh failed:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer balance fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            supabase
              .from("user_wallets")
              .select("balance")
              .eq("user_id", session.user.id)
              .single()
              .then(({ data, error }) => {
                if (!error && data) {
                  console.log("Balance loaded on auth change:", data.balance);
                  setBalance(Number(data.balance));
                }
              });
          }, 0);
        } else {
          setBalance(0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          supabase
            .from("user_wallets")
            .select("balance")
            .eq("user_id", session.user.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                console.log("Initial balance loaded:", data.balance);
                setBalance(Number(data.balance));
              }
              setLoading(false);
            });
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (!error) {
      toast({
        title: "Account created!",
        description: "Welcome to the platform."
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (!error) {
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in."
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully."
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        balance,
        loading,
        signUp,
        signIn,
        signOut,
        refreshBalance
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
