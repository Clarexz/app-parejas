export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      couple_members: {
        Row: {
          couple_id: string;
          joined_at: string | null;
          spicy_opt_in: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          joined_at?: string | null;
          spicy_opt_in?: boolean;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          joined_at?: string | null;
          spicy_opt_in?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'couple_members_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      couples: {
        Row: {
          anniversary_date: string | null;
          created_at: string | null;
          id: string;
          invite_code: string;
          photo_path: string | null;
          spicy_enabled: boolean;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          anniversary_date?: string | null;
          created_at?: string | null;
          id?: string;
          invite_code: string;
          photo_path?: string | null;
          spicy_enabled?: boolean;
          timezone?: string;
        };
        Update: {
          anniversary_date?: string | null;
          created_at?: string | null;
          id?: string;
          invite_code?: string;
          photo_path?: string | null;
          spicy_enabled?: boolean;
          timezone?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          birthday: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string;
          nickname: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          birthday?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id: string;
          nickname?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          birthday?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          nickname?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      avatar_folder_readable: { Args: { p_name: string }; Returns: boolean };
      avatar_folder_writable: { Args: { p_name: string }; Returns: boolean };
      create_couple: {
        Args: { p_anniversary_date?: string; p_timezone?: string };
        Returns: {
          anniversary_date: string | null;
          created_at: string | null;
          id: string;
          invite_code: string;
          photo_path: string | null;
          spicy_enabled: boolean;
          timezone: string;
        };
        SetofOptions: {
          from: '*';
          to: 'couples';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_invite_code: { Args: Record<PropertyKey, never>; Returns: string };
      is_couple_member: { Args: { p_couple_id: string }; Returns: boolean };
      join_couple: {
        Args: { p_code: string };
        Returns: {
          anniversary_date: string | null;
          created_at: string | null;
          id: string;
          invite_code: string;
          photo_path: string | null;
          spicy_enabled: boolean;
          timezone: string;
        };
        SetofOptions: {
          from: '*';
          to: 'couples';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_couple: { Args: Record<PropertyKey, never>; Returns: undefined };
      my_couple_id: { Args: Record<PropertyKey, never>; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
