export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          currency: string
          net_salary: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          currency?: string
          net_salary?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          currency?: string
          net_salary?: number | null
          updated_at?: string
        }
      }
      households: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_by: string
          created_at?: string
        }
        Update: {
          name?: string
        }
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: 'admin' | 'member'
          income_share: number | null
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role?: 'admin' | 'member'
          income_share?: number | null
          joined_at?: string
        }
        Update: {
          role?: 'admin' | 'member'
          income_share?: number | null
        }
      }
      categories: {
        Row: {
          id: string
          household_id: string | null
          name: string
          icon: string | null
          color: string | null
          is_default: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id?: string | null
          name: string
          icon?: string | null
          color?: string | null
          is_default?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          icon?: string | null
          color?: string | null
          sort_order?: number
        }
      }
      expenses: {
        Row: {
          id: string
          household_id: string
          user_id: string
          category_id: string | null
          description: string
          amount: number
          expense_date: string
          is_shared: boolean
          paid_from_shared_card: boolean
          split_type: '50/50' | 'proportional' | 'custom'
          notes: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          category_id?: string | null
          description: string
          amount: number
          expense_date?: string
          is_shared?: boolean
          paid_from_shared_card?: boolean
          split_type?: '50/50' | 'proportional' | 'custom'
          notes?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          description?: string
          amount?: number
          expense_date?: string
          is_shared?: boolean
          paid_from_shared_card?: boolean
          split_type?: '50/50' | 'proportional' | 'custom'
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
      }
      balance_topups: {
        Row: {
          id: string
          household_id: string
          user_id: string
          amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          amount: number
          note?: string | null
          created_at?: string
        }
        Update: {
          amount?: number
          note?: string | null
        }
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount: number
          is_paid: boolean
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          amount: number
          is_paid?: boolean
        }
        Update: {
          amount?: number
          is_paid?: boolean
        }
      }
      budgets: {
        Row: {
          id: string
          household_id: string
          category_id: string | null
          user_id: string | null
          amount: number
          period: 'weekly' | 'monthly' | 'yearly'
          is_shared: boolean
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id?: string | null
          user_id?: string | null
          amount: number
          period?: 'weekly' | 'monthly' | 'yearly'
          is_shared?: boolean
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          user_id?: string | null
          amount?: number
          period?: 'weekly' | 'monthly' | 'yearly'
          is_shared?: boolean
          end_date?: string | null
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          household_id: string
          user_id: string | null
          name: string
          description: string | null
          icon: string | null
          target_amount: number
          current_amount: number
          target_date: string | null
          is_shared: boolean
          status: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id?: string | null
          name: string
          description?: string | null
          icon?: string | null
          target_amount: number
          current_amount?: number
          target_date?: string | null
          is_shared?: boolean
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          icon?: string | null
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          is_shared?: boolean
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          updated_at?: string
        }
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          amount: number
          note: string | null
          contributed_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          amount: number
          note?: string | null
          contributed_at?: string
        }
        Update: {
          amount?: number
          note?: string | null
        }
      }
      settlements: {
        Row: {
          id: string
          household_id: string
          from_user_id: string
          to_user_id: string
          amount: number
          note: string | null
          settled_at: string
        }
        Insert: {
          id?: string
          household_id: string
          from_user_id: string
          to_user_id: string
          amount: number
          note?: string | null
          settled_at?: string
        }
        Update: {
          amount?: number
          note?: string | null
        }
      }
    }
    Views: {
      monthly_category_summary: {
        Row: {
          household_id: string | null
          month: string | null
          category_id: string | null
          category_name: string | null
          category_icon: string | null
          category_color: string | null
          is_shared: boolean | null
          total_amount: number | null
          transaction_count: number | null
        }
      }
      household_balance: {
        Row: {
          household_id: string | null
          paid_by: string | null
          paid_by_name: string | null
          total_paid: number | null
          shared_half: number | null
          effective_cost: number | null
        }
      }
      budget_vs_actual: {
        Row: {
          budget_id: string | null
          household_id: string | null
          category_id: string | null
          category_name: string | null
          category_icon: string | null
          budget_amount: number | null
          period: string | null
          is_shared: boolean | null
          actual_amount: number | null
          remaining: number | null
          percentage_used: number | null
        }
      }
    }
    Functions: {
      is_household_member: {
        Args: { h_id: string }
        Returns: boolean
      }
      seed_default_categories: {
        Args: { h_id: string }
        Returns: undefined
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type Goal = Database['public']['Tables']['goals']['Row']
export type GoalContribution = Database['public']['Tables']['goal_contributions']['Row']
export type Settlement = Database['public']['Tables']['settlements']['Row']
export type BalanceTopup = Database['public']['Tables']['balance_topups']['Row']

export type BudgetVsActual = Database['public']['Views']['budget_vs_actual']['Row']
export type MonthlyCategorySummary = Database['public']['Views']['monthly_category_summary']['Row']
export type HouseholdBalance = Database['public']['Views']['household_balance']['Row']
