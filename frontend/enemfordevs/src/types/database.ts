export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_app_data: {
        Row: {
          user_id: string;
          data: Json | null;
          revision: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data: Json | null;
          revision?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          data?: Json | null;
          revision?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
