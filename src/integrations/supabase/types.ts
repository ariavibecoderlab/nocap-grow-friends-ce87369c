export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      merchant_applications: {
        Row: {
          bank_account_holder: string | null
          bank_account_no: string | null
          bank_name: string | null
          bank_verified: boolean
          business_address: string | null
          business_name: string
          business_registration_no: string | null
          business_type: string | null
          created_at: string
          document_urls: Json | null
          id: string
          min_withdrawal_amount: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          bank_verified?: boolean
          business_address?: string | null
          business_name: string
          business_registration_no?: string | null
          business_type?: string | null
          created_at?: string
          document_urls?: Json | null
          id?: string
          min_withdrawal_amount?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          bank_verified?: boolean
          business_address?: string | null
          business_name?: string
          business_registration_no?: string | null
          business_type?: string | null
          created_at?: string
          document_urls?: Json | null
          id?: string
          min_withdrawal_amount?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_branches: {
        Row: {
          balance: number
          branch_address: string | null
          branch_name: string
          commission_percent: number
          created_at: string
          id: string
          is_active: boolean
          merchant_user_id: string
          owner_user_id: string | null
          qr_code_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          branch_address?: string | null
          branch_name: string
          commission_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_user_id: string
          owner_user_id?: string | null
          qr_code_id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          branch_address?: string | null
          branch_name?: string
          commission_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_user_id?: string
          owner_user_id?: string | null
          qr_code_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      merchant_qr_codes: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_used: boolean
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "merchant_qr_codes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          has_pin: boolean
          id: string
          phone: string | null
          pin_hash: string | null
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_pin?: boolean
          id?: string
          phone?: string | null
          pin_hash?: string | null
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_pin?: boolean
          id?: string
          phone?: string | null
          pin_hash?: string | null
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_tree: {
        Row: {
          ancestor_id: string
          created_at: string
          id: string
          tier: number
          user_id: string
        }
        Insert: {
          ancestor_id: string
          created_at?: string
          id?: string
          tier: number
          user_id: string
        }
        Update: {
          ancestor_id?: string
          created_at?: string
          id?: string
          tier?: number
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          commission_amount: number | null
          created_at: string
          description: string | null
          fee_amount: number | null
          id: string
          metadata: Json | null
          net_amount: number | null
          reference_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          commission_amount?: number | null
          created_at?: string
          description?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          commission_amount?: number | null
          created_at?: string
          description?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          branch_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wallet_type: string
        }
        Insert: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          wallet_type?: string
        }
        Update: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount: number
          bank_account_holder: string
          bank_account_no: string
          bank_name: string
          branch_id: string | null
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_type: string
        }
        Insert: {
          amount: number
          bank_account_holder: string
          bank_account_no: string
          bank_name: string
          branch_id?: string | null
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_type?: string
        }
        Update: {
          amount?: number
          bank_account_holder?: string
          bank_account_no?: string
          bank_name?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "member" | "merchant" | "admin" | "branch"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type:
        | "top_up"
        | "payment"
        | "transfer_in"
        | "transfer_out"
        | "cashback"
        | "commission"
        | "withdrawal"
        | "refund"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["member", "merchant", "admin", "branch"],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: [
        "top_up",
        "payment",
        "transfer_in",
        "transfer_out",
        "cashback",
        "commission",
        "withdrawal",
        "refund",
      ],
    },
  },
} as const
