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
      api_access_tokens: {
        Row: {
          access_token_hash: string
          app_id: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          scopes: Json
          user_id: string
        }
        Insert: {
          access_token_hash: string
          app_id: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          scopes?: Json
          user_id: string
        }
        Update: {
          access_token_hash?: string
          app_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          scopes?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_access_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "api_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      api_applications: {
        Row: {
          api_key: string
          api_secret_hash: string
          branch_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_sandbox: boolean
          merchant_user_id: string
          name: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string
          api_secret_hash: string
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          merchant_user_id: string
          name: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          api_secret_hash?: string
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          merchant_user_id?: string
          name?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_applications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      api_authorization_codes: {
        Row: {
          app_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          redirect_uri: string
          scopes: Json
          state: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          redirect_uri: string
          scopes?: Json
          state?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          redirect_uri?: string
          scopes?: Json
          state?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_authorization_codes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "api_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      api_charges: {
        Row: {
          amount: number
          app_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_sandbox: boolean
          metadata: Json | null
          reference: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          app_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sandbox?: boolean
          metadata?: Json | null
          reference?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          app_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sandbox?: boolean
          metadata?: Json | null
          reference?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_charges_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "api_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_charges_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          app_id: string
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          status_code: number
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          product_id: string
          sender_id: string
          sender_type: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          product_id: string
          sender_id: string
          sender_type?: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          product_id?: string
          sender_id?: string
          sender_type?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_chat_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_chat_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          store_id: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          store_id: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          store_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_flash_sales: {
        Row: {
          created_at: string
          ends_at: string
          flash_price: number
          id: string
          is_active: boolean
          max_quantity: number
          original_price: number
          product_id: string
          sold_quantity: number
          starts_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          flash_price: number
          id?: string
          is_active?: boolean
          max_quantity?: number
          original_price: number
          product_id: string
          sold_quantity?: number
          starts_at: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          flash_price?: number
          id?: string
          is_active?: boolean
          max_quantity?: number
          original_price?: number
          product_id?: string
          sold_quantity?: number
          starts_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_flash_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_flash_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string
          product_name: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          bill_id: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          buyer_user_id: string | null
          created_at: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          platform_fee: number
          shipping_address: string
          shipping_fee: number
          status: string
          store_id: string
          subtotal: number
          total_amount: number
          tracking_number: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          bill_id?: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          buyer_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          shipping_address: string
          shipping_fee?: number
          status?: string
          store_id: string
          subtotal?: number
          total_amount?: number
          tracking_number?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          bill_id?: string | null
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string
          buyer_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          platform_fee?: number
          shipping_address?: string
          shipping_fee?: number
          status?: string
          store_id?: string
          subtotal?: number
          total_amount?: number
          tracking_number?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_product_variants: {
        Row: {
          created_at: string
          id: string
          price_adjustment: number
          product_id: string
          sku: string | null
          sort_order: number
          stock_quantity: number
          variant_name: string
          variant_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_adjustment?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          variant_name: string
          variant_value: string
        }
        Update: {
          created_at?: string
          id?: string
          price_adjustment?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          variant_name?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: Json
          is_featured: boolean
          name: string
          price: number
          sku: string | null
          sold_count: number
          status: string
          stock_quantity: number
          store_id: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          is_featured?: boolean
          name: string
          price?: number
          sku?: string | null
          sold_count?: number
          status?: string
          stock_quantity?: number
          store_id: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          is_featured?: boolean
          name?: string
          price?: number
          sku?: string | null
          sold_count?: number
          status?: string
          stock_quantity?: number
          store_id?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          buyer_user_id: string | null
          comment: string | null
          created_at: string
          id: string
          merchant_reply: string | null
          order_id: string
          product_id: string
          rating: number
          replied_at: string | null
        }
        Insert: {
          buyer_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          merchant_reply?: string | null
          order_id: string
          product_id: string
          rating: number
          replied_at?: string | null
        }
        Update: {
          buyer_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          merchant_reply?: string | null
          order_id?: string
          product_id?: string
          rating?: number
          replied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_store_managers: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          status: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          status?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          status?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_store_managers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_stores: {
        Row: {
          banner_url: string | null
          branch_id: string
          created_at: string
          description: string | null
          email: string | null
          free_shipping_min: number | null
          id: string
          logo_url: string | null
          merchant_user_id: string
          primary_color: string
          settings: Json
          shipping_flat_rate: number
          slug: string
          status: string
          store_name: string
          tagline: string | null
          theme: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          branch_id: string
          created_at?: string
          description?: string | null
          email?: string | null
          free_shipping_min?: number | null
          id?: string
          logo_url?: string | null
          merchant_user_id: string
          primary_color?: string
          settings?: Json
          shipping_flat_rate?: number
          slug: string
          status?: string
          store_name: string
          tagline?: string | null
          theme?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          branch_id?: string
          created_at?: string
          description?: string | null
          email?: string | null
          free_shipping_min?: number | null
          id?: string
          logo_url?: string | null
          merchant_user_id?: string
          primary_color?: string
          settings?: Json
          shipping_flat_rate?: number
          slug?: string
          status?: string
          store_name?: string
          tagline?: string | null
          theme?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_stores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
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
          report_frequency: string[]
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
          report_frequency?: string[]
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
          report_frequency?: string[]
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
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          has_password: boolean
          has_pin: boolean
          id: string
          phone: string | null
          pin_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          referral_code: string
          referred_by: string | null
          reset_otp_expires_at: string | null
          reset_otp_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_password?: boolean
          has_pin?: boolean
          id?: string
          phone?: string | null
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          referral_code: string
          referred_by?: string | null
          reset_otp_expires_at?: string | null
          reset_otp_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_password?: boolean
          has_pin?: boolean
          id?: string
          phone?: string | null
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          referral_code?: string
          referred_by?: string | null
          reset_otp_expires_at?: string | null
          reset_otp_hash?: string | null
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
      rate_limit_requests: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
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
      sla_settings: {
        Row: {
          first_response_minutes: number
          id: string
          priority: string
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          first_response_minutes?: number
          id?: string
          priority: string
          resolution_minutes?: number
          updated_at?: string
        }
        Update: {
          first_response_minutes?: number
          id?: string
          priority?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_replies: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
          metadata?: Json | null
          net_amount?: number | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      transactions_backup: {
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
      wallet_balance_audit: {
        Row: {
          branch_id: string | null
          changed_at: string
          changed_by: string | null
          delta: number
          id: string
          new_balance: number
          old_balance: number
          user_id: string
          wallet_id: string
          wallet_type: string
        }
        Insert: {
          branch_id?: string | null
          changed_at?: string
          changed_by?: string | null
          delta: number
          id?: string
          new_balance: number
          old_balance?: number
          user_id: string
          wallet_id: string
          wallet_type: string
        }
        Update: {
          branch_id?: string | null
          changed_at?: string
          changed_by?: string | null
          delta?: number
          id?: string
          new_balance?: number
          old_balance?: number
          user_id?: string
          wallet_id?: string
          wallet_type?: string
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
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_api_logs: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      credit_wallet: {
        Args: {
          p_amount: number
          p_branch_id?: string
          p_user_id: string
          p_wallet_type: string
        }
        Returns: number
      }
      debit_wallet: {
        Args: {
          p_amount: number
          p_branch_id?: string
          p_user_id: string
          p_wallet_type: string
        }
        Returns: number
      }
      debit_wallet_allow_negative: {
        Args: {
          p_amount: number
          p_branch_id?: string
          p_user_id: string
          p_wallet_type: string
        }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      get_all_user_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_deep_network_count: {
        Args: { p_user_id: string }
        Returns: {
          beyond_tier5: number
          tier5_count: number
          total_descendants: number
        }[]
      }
      get_referral_emails: {
        Args: { referral_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_referral_tier_counts: {
        Args: { p_user_id: string }
        Returns: {
          count: number
          tier: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { _product_id: string; _store_id: string; _user_id: string }
        Returns: boolean
      }
      is_store_manager: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      reconcile_wallet_balances: {
        Args: never
        Returns: {
          branch_id: string
          computed_balance: number
          drift: number
          user_id: string
          wallet_balance: number
          wallet_type: string
        }[]
      }
    }
    Enums: {
      app_role: "member" | "merchant" | "admin" | "branch" | "support"
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
        | "distribution"
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
      app_role: ["member", "merchant", "admin", "branch", "support"],
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
        "distribution",
      ],
    },
  },
} as const
