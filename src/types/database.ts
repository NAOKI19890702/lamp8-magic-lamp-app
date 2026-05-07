/**
 * Supabase の自動生成型は将来 `supabase gen types typescript` で作成。
 * いまは手書きで主要テーブルだけ定義(Phase 1 用の最小セット)。
 */

export type Database = {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          facility_id: string | null;
          display_name: string | null;
          role: 'owner' | 'admin' | 'staff';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          facility_id?: string | null;
          display_name?: string | null;
          role?: 'owner' | 'admin' | 'staff';
        };
        Update: {
          facility_id?: string | null;
          display_name?: string | null;
          role?: 'owner' | 'admin' | 'staff';
        };
        Relationships: [];
      };

      children: {
        Row: {
          id: string;
          facility_id: string;
          name: string;
          birthdate: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          facility_id: string;
          name: string;
          birthdate?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          birthdate?: string | null;
          notes?: string | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };

      records: {
        Row: {
          id: string;
          facility_id: string;
          child_id: string;
          author_id: string;
          question: string | null;
          raw_text: string;
          rewritten: string | null;
          occurred_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          child_id: string;
          author_id: string;
          question?: string | null;
          raw_text: string;
          rewritten?: string | null;
          occurred_at?: string;
        };
        Update: {
          question?: string | null;
          raw_text?: string;
          rewritten?: string | null;
        };
        Relationships: [];
      };

      analyses: {
        Row: {
          id: string;
          facility_id: string;
          child_id: string;
          period_year: number;
          period_month: number;
          record_count: number;
          data: AnalysisData;
          generated_by_id: string | null;
          model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          created_at: string;
        };
        Insert: {
          facility_id: string;
          child_id: string;
          period_year: number;
          period_month: number;
          record_count: number;
          data: AnalysisData;
          generated_by_id?: string | null;
          model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
        };
        Update: {
          data?: AnalysisData;
        };
        Relationships: [];
      };

      term_counts: {
        Row: {
          user_id: string;
          term_name: string;
          count: number;
          last_seen_at: string;
        };
        Insert: {
          user_id: string;
          term_name: string;
          count?: number;
          last_seen_at?: string;
        };
        Update: {
          count?: number;
          last_seen_at?: string;
        };
        Relationships: [];
      };

      daily_questions: {
        Row: {
          facility_id: string;
          date: string;
          principal_message: string;
          question_1: string;
          question_2: string;
          question_3: string;
          generated_at: string;
        };
        Insert: {
          facility_id: string;
          date: string;
          principal_message: string;
          question_1: string;
          question_2: string;
          question_3: string;
        };
        Update: {
          principal_message?: string;
          question_1?: string;
          question_2?: string;
          question_3?: string;
        };
        Relationships: [];
      };

      invitations: {
        Row: {
          id: string;
          facility_id: string;
          email: string;
          role: 'admin' | 'staff';
          token: string;
          invited_by_id: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          email: string;
          role?: 'admin' | 'staff';
          token: string;
          invited_by_id?: string | null;
          expires_at: string;
        };
        Update: {
          accepted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_facility_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      create_facility_for_me: {
        Args: {
          facility_name: string;
          facility_description?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * 解析データの構造化型(server.py の ANALYSIS_SCHEMA に対応)
 */
export type AnalysisData = {
  summary_period: string;
  developmental_evidence: {
    current_stage: string;
    stage_progression: string;
    evidence_quotes: Array<{
      date: string;
      observation: string;
      interpretation: string;
    }>;
  };
  five_domains: {
    health_life: string;
    motor_sense: string;
    cognition_behavior: string;
    language_communication: string;
    social_relations: string;
  };
  family_story: string;
};
