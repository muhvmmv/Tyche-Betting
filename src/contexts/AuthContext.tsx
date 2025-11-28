import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Defines the shape of the authentication context
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

// Creates the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provides authentication context to child components
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Refreshes the user's wallet balance from the database
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

  // Sets up authentication state listener and initializes user session
  useEffect(() => {
    // Sets up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defers balance fetching to avoid deadlock
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

    // Checks for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Defers initial balance fetching to avoid deadlock
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

  // Handles user sign-up process
  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    // Notify user of successful account creation
    if (!error) {
      toast({
        title: "Account created!",
        description: "Welcome to the platform."
      });
    }

    return { error };
  };

  // Handles user sign-in process 
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Notify user of successful sign-in
    if (!error) {
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in."
      });
    }

    return { error };
  };

  // Handles user sign-out process
  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully."
    });
  };

  // Provides the authentication context to child components
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

// Custom hook to access authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
