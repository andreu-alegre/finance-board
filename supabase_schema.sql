-- ============================================================
-- 🏠 Household Finance App — Supabase Schema
-- ============================================================
-- Run this in the Supabase SQL Editor (supabase.com > project > SQL Editor)
-- Make sure to enable the UUID extension first (it's enabled by default)
-- ============================================================


-- ============================================================
-- 1. PROFILES (extends Supabase Auth)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. HOUSEHOLDS
-- ============================================================

CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  income_share NUMERIC(5,2), -- optional: percentage for proportional splits
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);


-- ============================================================
-- 3. CATEGORIES
-- ============================================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT, -- emoji or icon name (e.g. 'home', 'cart', 'zap')
  color TEXT, -- hex color for UI
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique category names per household
CREATE UNIQUE INDEX idx_categories_household_name
  ON public.categories(household_id, name);


-- ============================================================
-- 4. EXPENSES
-- ============================================================

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id), -- who paid
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_shared BOOLEAN NOT NULL DEFAULT true, -- shared = split between household members
  split_type TEXT NOT NULL DEFAULT '50/50' CHECK (split_type IN ('50/50', 'proportional', 'custom')),
  notes TEXT,
  receipt_url TEXT, -- optional photo/receipt storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For custom splits (when split_type = 'custom')
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(12,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (expense_id, user_id)
);

-- Indexes for common queries
CREATE INDEX idx_expenses_household_date ON public.expenses(household_id, expense_date DESC);
CREATE INDEX idx_expenses_user ON public.expenses(user_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);


-- ============================================================
-- 5. BUDGETS
-- ============================================================

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL, -- NULL = total budget
  user_id UUID REFERENCES public.profiles(id), -- NULL = shared/household budget
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  is_shared BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  end_date DATE, -- NULL = recurring indefinitely
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_household ON public.budgets(household_id, is_shared);


-- ============================================================
-- 6. GOALS
-- ============================================================

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id), -- NULL = shared goal
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji for the goal (e.g. '✈️' for trip)
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update goal current_amount on contribution
CREATE OR REPLACE FUNCTION public.update_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.goals
  SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.goal_contributions
    WHERE goal_id = NEW.goal_id
  ),
  updated_at = now()
  WHERE id = NEW.goal_id;

  -- Auto-complete goal if target reached
  UPDATE public.goals
  SET status = 'completed', updated_at = now()
  WHERE id = NEW.goal_id
    AND current_amount >= target_amount
    AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_goal_contribution
  AFTER INSERT OR DELETE ON public.goal_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_amount();


-- ============================================================
-- 7. SETTLEMENTS (track who owes whom)
-- ============================================================

CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id), -- who pays
  to_user_id UUID NOT NULL REFERENCES public.profiles(id),   -- who receives
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 8. UPDATED_AT TRIGGER (reusable)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is in a household
CREATE OR REPLACE FUNCTION public.is_household_member(h_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = h_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users can read all profiles in their household, edit own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can view household members' profiles" ON public.profiles FOR SELECT USING (
  id IN (
    SELECT hm.user_id FROM public.household_members hm
    WHERE hm.household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  )
);

-- Households: members can read, creator can update
CREATE POLICY "Members can view household" ON public.households FOR SELECT USING (is_household_member(id));
CREATE POLICY "Anyone can create household" ON public.households FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can update household" ON public.households FOR UPDATE USING (created_by = auth.uid());

-- Household members: members can view co-members, admins can manage
CREATE POLICY "Members can view members" ON public.household_members FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "Users can join households" ON public.household_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave households" ON public.household_members FOR DELETE USING (user_id = auth.uid());

-- Categories: household members can CRUD
CREATE POLICY "Members can view categories" ON public.categories FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "Members can create categories" ON public.categories FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "Members can update categories" ON public.categories FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "Members can delete categories" ON public.categories FOR DELETE USING (is_household_member(household_id));

-- Expenses: household members can view all, CRUD own
CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "Members can create expenses" ON public.expenses FOR INSERT WITH CHECK (is_household_member(household_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update expense" ON public.expenses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete expense" ON public.expenses FOR DELETE USING (user_id = auth.uid());

-- Expense splits
CREATE POLICY "Members can view splits" ON public.expense_splits FOR SELECT USING (
  expense_id IN (SELECT id FROM public.expenses WHERE is_household_member(household_id))
);
CREATE POLICY "Expense owner can manage splits" ON public.expense_splits FOR ALL USING (
  expense_id IN (SELECT id FROM public.expenses WHERE user_id = auth.uid())
);

-- Budgets
CREATE POLICY "Members can view budgets" ON public.budgets FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "Members can create budgets" ON public.budgets FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "Members can update budgets" ON public.budgets FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "Members can delete budgets" ON public.budgets FOR DELETE USING (is_household_member(household_id));

-- Goals
CREATE POLICY "Members can view goals" ON public.goals FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "Members can create goals" ON public.goals FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "Members can update goals" ON public.goals FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "Members can delete goals" ON public.goals FOR DELETE USING (is_household_member(household_id));

-- Goal contributions
CREATE POLICY "Members can view contributions" ON public.goal_contributions FOR SELECT USING (
  goal_id IN (SELECT id FROM public.goals WHERE is_household_member(household_id))
);
CREATE POLICY "Members can contribute" ON public.goal_contributions FOR INSERT WITH CHECK (
  user_id = auth.uid() AND goal_id IN (SELECT id FROM public.goals WHERE is_household_member(household_id))
);

-- Settlements
CREATE POLICY "Members can view settlements" ON public.settlements FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "Members can create settlements" ON public.settlements FOR INSERT WITH CHECK (
  is_household_member(household_id) AND from_user_id = auth.uid()
);


-- ============================================================
-- 10. SEED DATA — Default Categories
-- ============================================================
-- These will be inserted per household when created.
-- Use this function to seed categories for a new household.

CREATE OR REPLACE FUNCTION public.seed_default_categories(h_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.categories (household_id, name, icon, color, is_default, sort_order) VALUES
    (h_id, 'Alquiler',                '🏠', '#6366F1', true, 1),
    (h_id, 'Supermercado',            '🛒', '#22C55E', true, 2),
    (h_id, 'Electricidad',            '⚡', '#F59E0B', true, 3),
    (h_id, 'Agua',                    '💧', '#3B82F6', true, 4),
    (h_id, 'Wifi',                    '📶', '#8B5CF6', true, 5),
    (h_id, 'Restaurantes',            '🍽️', '#EF4444', true, 6),
    (h_id, 'Cafés',                   '☕', '#D97706', true, 7),
    (h_id, 'Ocio',                    '🎬', '#EC4899', true, 8),
    (h_id, 'Accesorios Hogar',        '🛋️', '#14B8A6', true, 9),
    (h_id, 'Limpieza',               '🧹', '#06B6D4', true, 10),
    (h_id, 'Salud',                   '💊', '#F43F5E', true, 11),
    (h_id, 'Transporte',             '🛵', '#64748B', true, 12),
    (h_id, 'Suscripciones',          '📱', '#A855F7', true, 13),
    (h_id, 'Ropa',                    '👕', '#FB923C', true, 14),
    (h_id, 'Otros',                   '📦', '#94A3B8', true, 99);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-seed categories when a household is created
CREATE OR REPLACE FUNCTION public.on_household_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as admin member
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');

  -- Seed default categories
  PERFORM public.seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_household_created
  AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.on_household_created();


-- ============================================================
-- 11. USEFUL VIEWS (for analytics)
-- ============================================================

-- Monthly expense summary per category
CREATE OR REPLACE VIEW public.monthly_category_summary AS
SELECT
  e.household_id,
  date_trunc('month', e.expense_date)::DATE AS month,
  e.category_id,
  c.name AS category_name,
  c.icon AS category_icon,
  c.color AS category_color,
  e.is_shared,
  SUM(e.amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM public.expenses e
LEFT JOIN public.categories c ON c.id = e.category_id
GROUP BY e.household_id, month, e.category_id, c.name, c.icon, c.color, e.is_shared;

-- Balance between household members (who owes whom)
CREATE OR REPLACE VIEW public.household_balance AS
SELECT
  e.household_id,
  e.user_id AS paid_by,
  p.full_name AS paid_by_name,
  SUM(e.amount) AS total_paid,
  SUM(CASE WHEN e.is_shared THEN e.amount / 2.0 ELSE 0 END) AS shared_half,
  SUM(CASE WHEN e.is_shared THEN e.amount / 2.0 ELSE e.amount END) AS effective_cost
FROM public.expenses e
JOIN public.profiles p ON p.id = e.user_id
GROUP BY e.household_id, e.user_id, p.full_name;

-- Budget vs actual spending
CREATE OR REPLACE VIEW public.budget_vs_actual AS
SELECT
  b.id AS budget_id,
  b.household_id,
  b.category_id,
  c.name AS category_name,
  c.icon AS category_icon,
  b.amount AS budget_amount,
  b.period,
  b.is_shared,
  COALESCE(SUM(e.amount), 0) AS actual_amount,
  b.amount - COALESCE(SUM(e.amount), 0) AS remaining,
  CASE WHEN b.amount > 0
    THEN ROUND((COALESCE(SUM(e.amount), 0) / b.amount) * 100, 1)
    ELSE 0
  END AS percentage_used
FROM public.budgets b
LEFT JOIN public.categories c ON c.id = b.category_id
LEFT JOIN public.expenses e ON
  e.household_id = b.household_id
  AND e.category_id = b.category_id
  AND e.is_shared = b.is_shared
  AND e.expense_date >= b.start_date
  AND (b.end_date IS NULL OR e.expense_date <= b.end_date)
  AND e.expense_date >= date_trunc('month', CURRENT_DATE)::DATE
GROUP BY b.id, b.household_id, b.category_id, c.name, c.icon, b.amount, b.period, b.is_shared;
