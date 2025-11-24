-- Fix function search path  drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_wallet();

CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_wallet();