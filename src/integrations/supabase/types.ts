export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean
          last_purchase_date: string | null
          name: string
          phone: string | null
          postal_code: string | null
          total_purchases: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_purchase_date?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_purchase_date?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_items: {
        Row: {
          created_at: string
          dispatch_id: string
          dispatched_meterage: number | null
          id: string
          inventory_item_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          dispatched_meterage?: number | null
          id?: string
          inventory_item_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          dispatched_meterage?: number | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_items_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          created_at: string
          customer_id: string | null
          dispatch_date: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          dispatch_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          dispatch_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          payment_method: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          dispatched_at: string | null
          id: string
          location_id: string | null
          meterage: number | null
          notes: string | null
          packing_list_id: string | null
          product_id: string
          received_at: string | null
          serial_number: string
          status: Database["public"]["Enums"]["inventory_item_status"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          dispatched_at?: string | null
          id?: string
          location_id?: string | null
          meterage?: number | null
          notes?: string | null
          packing_list_id?: string | null
          product_id: string
          received_at?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["inventory_item_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          dispatched_at?: string | null
          id?: string
          location_id?: string | null
          meterage?: number | null
          notes?: string | null
          packing_list_id?: string | null
          product_id?: string
          received_at?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["inventory_item_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          from_location_id: string | null
          id: string
          inventory_item_id: string
          moved_at: string
          reason: string | null
          to_location_id: string | null
          user_id: string | null
        }
        Insert: {
          from_location_id?: string | null
          id?: string
          inventory_item_id: string
          moved_at?: string
          reason?: string | null
          to_location_id?: string | null
          user_id?: string | null
        }
        Update: {
          from_location_id?: string | null
          id?: string
          inventory_item_id?: string
          moved_at?: string
          reason?: string | null
          to_location_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          aisle: string
          barcode: string | null
          created_at: string
          id: string
          level: string
          position: string
          rack: string
          updated_at: string
        }
        Insert: {
          aisle: string
          barcode?: string | null
          created_at?: string
          id?: string
          level: string
          position: string
          rack: string
          updated_at?: string
        }
        Update: {
          aisle?: string
          barcode?: string | null
          created_at?: string
          id?: string
          level?: string
          position?: string
          rack?: string
          updated_at?: string
        }
        Relationships: []
      }
      packing_lists: {
        Row: {
          arrival_date: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["packing_list_status"]
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          arrival_date: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["packing_list_status"]
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          arrival_date?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["packing_list_status"]
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          default_meterage: number | null
          default_weight_kg: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          product_type: Database["public"]["Enums"]["product_type"] | null
          sku: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_meterage?: number | null
          default_weight_kg?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          product_type?: Database["public"]["Enums"]["product_type"] | null
          sku: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_meterage?: number | null
          default_weight_kg?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"] | null
          sku?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_dispatch: {
        Args: { p_customer_id: string; p_notes: string; p_dispatch_items: Json }
        Returns: string
      }
      move_inventory_item: {
        Args: {
          p_item_id: string
          p_new_location_id: string
          p_reason?: string
        }
        Returns: undefined
      }
      verify_and_place_item: {
        Args: { p_serial_number: string; p_location_barcode: string }
        Returns: undefined
      }
    }
    Enums: {
      dispatch_status:
        | "borrador"
        | "pendiente"
        | "procesando"
        | "completado"
        | "cancelado"
      inventory_item_status:
        | "en_verificacion"
        | "disponible"
        | "reservado"
        | "despachado"
        | "dado_de_baja"
      packing_list_status:
        | "pendiente"
        | "procesando"
        | "completado"
        | "discrepancia"
      product_type: "rollo_tela" | "tanque_ibc"
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
      dispatch_status: [
        "borrador",
        "pendiente",
        "procesando",
        "completado",
        "cancelado",
      ],
      inventory_item_status: [
        "en_verificacion",
        "disponible",
        "reservado",
        "despachado",
        "dado_de_baja",
      ],
      packing_list_status: [
        "pendiente",
        "procesando",
        "completado",
        "discrepancia",
      ],
      product_type: ["rollo_tela", "tanque_ibc"],
    },
  },
} as const
