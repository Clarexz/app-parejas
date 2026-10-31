export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      answer_comments: {
        Row: {
          body: string;
          couple_id: string;
          created_at: string;
          id: string;
          question_id: string;
          reactions: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          couple_id: string;
          created_at?: string;
          id?: string;
          question_id: string;
          reactions?: NonNullable<Json>;
          user_id: string;
        };
        Update: {
          body?: string;
          couple_id?: string;
          created_at?: string;
          id?: string;
          question_id?: string;
          reactions?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'answer_comments_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'answer_comments_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      answers: {
        Row: {
          audio_path: string | null;
          choice: number | null;
          couple_id: string;
          created_at: string;
          day: string | null;
          id: string;
          question_id: string;
          text: string | null;
          updated_at: string;
          user_id: string;
          answer_json: Json | null;
        };
        ComputedFields: 'answer_json';
        Insert: {
          audio_path?: string | null;
          choice?: number | null;
          couple_id: string;
          created_at?: string;
          day?: string | null;
          id?: string;
          question_id: string;
          text?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audio_path?: string | null;
          choice?: number | null;
          couple_id?: string;
          created_at?: string;
          day?: string | null;
          id?: string;
          question_id?: string;
          text?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'answers_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
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
      daily_questions: {
        Row: {
          couple_id: string;
          created_at: string;
          day: string;
          question_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          day: string;
          question_id: string;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          day?: string;
          question_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_questions_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_questions_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      drawing_challenges: {
        Row: {
          couple_id: string;
          created_at: string;
          drawer_id: string;
          drawn_at: string | null;
          finished_at: string | null;
          guesser_id: string;
          guesses: NonNullable<Json>;
          id: string;
          rerolls: number;
          status: string;
          strokes: Json | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          drawer_id: string;
          drawn_at?: string | null;
          finished_at?: string | null;
          guesser_id: string;
          guesses?: NonNullable<Json>;
          id?: string;
          rerolls?: number;
          status?: string;
          strokes?: Json | null;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          drawer_id?: string;
          drawn_at?: string | null;
          finished_at?: string | null;
          guesser_id?: string;
          guesses?: NonNullable<Json>;
          id?: string;
          rerolls?: number;
          status?: string;
          strokes?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'drawing_challenges_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      drawing_secrets: {
        Row: {
          challenge_id: string;
          word_slug: string;
        };
        ComputedFields: never;
        Insert: {
          challenge_id: string;
          word_slug: string;
        };
        Update: {
          challenge_id?: string;
          word_slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'drawing_secrets_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: true;
            referencedRelation: 'drawing_challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'drawing_secrets_word_slug_fkey';
            columns: ['word_slug'];
            isOneToOne: false;
            referencedRelation: 'drawing_words';
            referencedColumns: ['slug'];
          },
        ];
      };
      drawing_words: {
        Row: {
          alternates: string[];
          created_at: string;
          intensity: string;
          is_active: boolean;
          slug: string;
          word: string;
        };
        ComputedFields: never;
        Insert: {
          alternates?: string[];
          created_at?: string;
          intensity: string;
          is_active?: boolean;
          slug: string;
          word: string;
        };
        Update: {
          alternates?: string[];
          created_at?: string;
          intensity?: string;
          is_active?: boolean;
          slug?: string;
          word?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          couple_id: string;
          created_at: string;
          created_by: string;
          date: string;
          emoji: string | null;
          id: string;
          kind: string;
          note: string | null;
          recurring_yearly: boolean;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          created_by: string;
          date: string;
          emoji?: string | null;
          id?: string;
          kind?: string;
          note?: string | null;
          recurring_yearly?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          date?: string;
          emoji?: string | null;
          id?: string;
          kind?: string;
          note?: string | null;
          recurring_yearly?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      game_answers: {
        Row: {
          choice: number;
          couple_id: string;
          created_at: string;
          question_id: string;
          round_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          choice: number;
          couple_id: string;
          created_at?: string;
          question_id: string;
          round_id: string;
          user_id: string;
        };
        Update: {
          choice?: number;
          couple_id?: string;
          created_at?: string;
          question_id?: string;
          round_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_answers_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_answers_round_id_fkey';
            columns: ['round_id'];
            isOneToOne: false;
            referencedRelation: 'game_rounds';
            referencedColumns: ['id'];
          },
        ];
      };
      game_rounds: {
        Row: {
          couple_id: string;
          created_at: string;
          created_by: string;
          finished_at: string | null;
          game: string;
          id: string;
          item_ids: string[];
          spicy: boolean;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          created_by: string;
          finished_at?: string | null;
          game: string;
          id?: string;
          item_ids: string[];
          spicy?: boolean;
          status?: string;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          finished_at?: string | null;
          game?: string;
          id?: string;
          item_ids?: string[];
          spicy?: boolean;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_rounds_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      list_items: {
        Row: {
          couple_id: string;
          created_at: string;
          created_by: string;
          done: boolean;
          done_at: string | null;
          done_by: string | null;
          id: string;
          list_id: string;
          position: number;
          text: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          created_by: string;
          done?: boolean;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          list_id: string;
          position?: number;
          text: string;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          done?: boolean;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          list_id?: string;
          position?: number;
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'list_items_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'list_items_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
        ];
      };
      lists: {
        Row: {
          couple_id: string;
          created_at: string;
          created_by: string;
          emoji: string | null;
          id: string;
          kind: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          created_by: string;
          emoji?: string | null;
          id?: string;
          kind?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          emoji?: string | null;
          id?: string;
          kind?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      locations: {
        Row: {
          city: string | null;
          couple_id: string;
          lat: number;
          lng: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          couple_id: string;
          lat: number;
          lng: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          city?: string | null;
          couple_id?: string;
          lat?: number;
          lng?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'locations_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      love_language_results: {
        Row: {
          answers: string[];
          created_at: string;
          quiz_version: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answers: string[];
          created_at?: string;
          quiz_version?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: string[];
          created_at?: string;
          quiz_version?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          body: string | null;
          couple_id: string;
          created_at: string;
          created_by: string;
          happened_on: string;
          id: string;
          lat: number | null;
          lng: number | null;
          place_name: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          couple_id: string;
          created_at?: string;
          created_by: string;
          happened_on: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          place_name?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          happened_on?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          place_name?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memories_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      memory_photos: {
        Row: {
          couple_id: string;
          created_at: string;
          height: number | null;
          id: string;
          memory_id: string;
          path: string;
          position: number;
          thumb_path: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          memory_id: string;
          path: string;
          position: number;
          thumb_path: string;
          width?: number | null;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          memory_id?: string;
          path?: string;
          position?: number;
          thumb_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'memory_photos_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memory_photos_memory_id_fkey';
            columns: ['memory_id'];
            isOneToOne: false;
            referencedRelation: 'memories';
            referencedColumns: ['id'];
          },
        ];
      };
      moods: {
        Row: {
          couple_id: string;
          created_at: string;
          emoji: string;
          id: string;
          note: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          emoji: string;
          id?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moods_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_prefs: {
        Row: {
          answers: boolean;
          comments: boolean;
          games: boolean;
          memories: boolean;
          moods: boolean;
          nudges: boolean;
          reminder_enabled: boolean;
          reminder_time: string;
          stories: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answers?: boolean;
          comments?: boolean;
          games?: boolean;
          memories?: boolean;
          moods?: boolean;
          nudges?: boolean;
          reminder_enabled?: boolean;
          reminder_time?: string;
          stories?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: boolean;
          comments?: boolean;
          games?: boolean;
          memories?: boolean;
          moods?: boolean;
          nudges?: boolean;
          reminder_enabled?: boolean;
          reminder_time?: string;
          stories?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      nudges: {
        Row: {
          couple_id: string;
          created_at: string;
          from_user: string;
          id: string;
          kind: string;
          to_user: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          from_user: string;
          id?: string;
          kind?: string;
          to_user: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          from_user?: string;
          id?: string;
          kind?: string;
          to_user?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'nudges_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          birthday: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string;
          nickname: string | null;
          story_archive: boolean;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          birthday?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id: string;
          nickname?: string | null;
          story_archive?: boolean;
        };
        Update: {
          avatar_path?: string | null;
          birthday?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          nickname?: string | null;
          story_archive?: boolean;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          platform?: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      question_categories: {
        Row: {
          created_at: string;
          description: string;
          emoji: string;
          intensity: string;
          kind: string;
          name: string;
          position: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          emoji: string;
          intensity: string;
          kind?: string;
          name: string;
          position?: number;
          slug: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          emoji?: string;
          intensity?: string;
          kind?: string;
          name?: string;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          id: string;
          intensity: string;
          is_active: boolean;
          options: Json | null;
          slug: string;
          text: string;
          type: string;
          question_json: Json | null;
          question_visible: boolean | null;
        };
        ComputedFields: 'question_json' | 'question_visible';
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          intensity: string;
          is_active?: boolean;
          options?: Json | null;
          slug: string;
          text: string;
          type: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          intensity?: string;
          is_active?: boolean;
          options?: Json | null;
          slug?: string;
          text?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_category_fkey';
            columns: ['category'];
            isOneToOne: false;
            referencedRelation: 'question_categories';
            referencedColumns: ['slug'];
          },
        ];
      };
      stories: {
        Row: {
          bg: string | null;
          couple_id: string;
          created_at: string;
          deleted_at: string | null;
          expires_at: string;
          font: string | null;
          id: string;
          kind: string;
          media_path: string | null;
          stickers: NonNullable<Json>;
          strokes: Json | null;
          text: string | null;
          thumb_path: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bg?: string | null;
          couple_id: string;
          created_at?: string;
          deleted_at?: string | null;
          expires_at?: string;
          font?: string | null;
          id?: string;
          kind: string;
          media_path?: string | null;
          stickers?: NonNullable<Json>;
          strokes?: Json | null;
          text?: string | null;
          thumb_path?: string | null;
          user_id: string;
        };
        Update: {
          bg?: string | null;
          couple_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          expires_at?: string;
          font?: string | null;
          id?: string;
          kind?: string;
          media_path?: string | null;
          stickers?: NonNullable<Json>;
          strokes?: Json | null;
          text?: string | null;
          thumb_path?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stories_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
        ];
      };
      story_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          story_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          emoji: string;
          story_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          story_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_reactions_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
      };
      story_replies: {
        Row: {
          body: string;
          couple_id: string;
          created_at: string;
          id: string;
          story_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          couple_id: string;
          created_at?: string;
          id?: string;
          story_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          couple_id?: string;
          created_at?: string;
          id?: string;
          story_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_replies_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_replies_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
      };
      story_views: {
        Row: {
          seen_at: string;
          story_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          seen_at?: string;
          story_id: string;
          user_id: string;
        };
        Update: {
          seen_at?: string;
          story_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_views_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
        ];
      };
      visits: {
        Row: {
          couple_id: string;
          created_at: string;
          created_by: string;
          end_date: string;
          event_id: string | null;
          id: string;
          note: string | null;
          place: string | null;
          start_date: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          couple_id: string;
          created_at?: string;
          created_by: string;
          end_date: string;
          event_id?: string | null;
          id?: string;
          note?: string | null;
          place?: string | null;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          end_date?: string;
          event_id?: string | null;
          id?: string;
          note?: string | null;
          place?: string | null;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'visits_couple_id_fkey';
            columns: ['couple_id'];
            isOneToOne: false;
            referencedRelation: 'couples';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_comment: {
        Args: { p_body: string; p_question_id: string };
        Returns: {
          body: string;
          couple_id: string;
          created_at: string;
          id: string;
          question_id: string;
          reactions: NonNullable<Json>;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'answer_comments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      add_list_item: {
        Args: { p_list_id: string; p_text: string };
        Returns: {
          couple_id: string;
          created_at: string;
          created_by: string;
          done: boolean;
          done_at: string | null;
          done_by: string | null;
          id: string;
          list_id: string;
          position: number;
          text: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'list_items';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      answer_game_item: {
        Args: { p_choice: number; p_question_id: string; p_round_id: string };
        Returns: Json;
      };
      answer_json: {
        Args: {
          p_answer: Omit<
            Database['public']['Tables']['answers']['Row'],
            Database['public']['Tables']['answers']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      avatar_folder_readable: { Args: { p_name: string }; Returns: boolean };
      avatar_folder_writable: { Args: { p_name: string }; Returns: boolean };
      clear_done_list_items: { Args: { p_list_id: string }; Returns: number };
      clear_my_location: { Args: Record<PropertyKey, never>; Returns: undefined };
      couple_complete_days: { Args: { p_couple_id: string }; Returns: string[] };
      couple_member_count: { Args: { p_couple_id: string }; Returns: number };
      couple_spicy_active: { Args: { p_couple_id: string }; Returns: boolean };
      couple_start_day: { Args: { p_couple_id: string }; Returns: string };
      couple_today: { Args: { p_couple_id: string }; Returns: string };
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
      create_memory: {
        Args: {
          p_body?: string;
          p_happened_on: string;
          p_lat?: number;
          p_lng?: number;
          p_photos?: Json;
          p_place_name?: string;
          p_title: string;
        };
        Returns: {
          body: string | null;
          couple_id: string;
          created_at: string;
          created_by: string;
          happened_on: string;
          id: string;
          lat: number | null;
          lng: number | null;
          place_name: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'memories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_story: {
        Args: {
          p_bg?: string;
          p_font?: string;
          p_kind: string;
          p_media_path?: string;
          p_stickers?: Json;
          p_strokes?: Json;
          p_text?: string;
          p_thumb_path?: string;
        };
        Returns: {
          bg: string | null;
          couple_id: string;
          created_at: string;
          deleted_at: string | null;
          expires_at: string;
          font: string | null;
          id: string;
          kind: string;
          media_path: string | null;
          stickers: NonNullable<Json>;
          strokes: Json | null;
          text: string | null;
          thumb_path: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'stories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_answer: { Args: { p_question_id: string }; Returns: undefined };
      delete_comment: { Args: { p_comment_id: string }; Returns: undefined };
      delete_drawing: { Args: { p_id: string }; Returns: undefined };
      delete_event: { Args: { p_id: string }; Returns: undefined };
      delete_game_round: { Args: { p_round_id: string }; Returns: undefined };
      delete_list: { Args: { p_id: string }; Returns: undefined };
      delete_list_item: { Args: { p_id: string }; Returns: undefined };
      delete_memory: { Args: { p_memory_id: string }; Returns: undefined };
      delete_push_tokens: { Args: { p_tokens: string[] }; Returns: number };
      delete_story: { Args: { p_story_id: string }; Returns: undefined };
      delete_visit: { Args: { p_id: string }; Returns: undefined };
      fold_text: { Args: { p_text: string }; Returns: string };
      generate_invite_code: { Args: Record<PropertyKey, never>; Returns: string };
      get_category_questions: {
        Args: { p_category: string };
        Returns: {
          answered_by_me: boolean;
          answered_by_partner: boolean;
          id: string;
          intensity: string;
          options: Json;
          slug: string;
          text: string;
          type: string;
        }[];
      };
      get_daily_question: { Args: { p_day?: string }; Returns: Json };
      get_drawing: { Args: { p_id: string }; Returns: Json };
      get_game_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      get_game_round: { Args: { p_round_id: string }; Returns: Json };
      get_history: {
        Args: { p_before?: string; p_category?: string; p_limit?: number; p_search?: string };
        Returns: Json[];
      };
      get_love_languages: { Args: Record<PropertyKey, never>; Returns: Json };
      get_question_with_answers: { Args: { p_question_id: string }; Returns: Json };
      get_relationship_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      get_streak: { Args: Record<PropertyKey, never>; Returns: Json };
      give_up_drawing: { Args: { p_id: string }; Returns: Json };
      guess_drawing: { Args: { p_guess: string; p_id: string }; Returns: Json };
      has_answered: { Args: { p_couple_id: string; p_question_id: string }; Returns: boolean };
      is_couple_member: { Args: { p_couple_id: string }; Returns: boolean };
      is_current_member: { Args: { p_couple_id: string; p_user_id: string }; Returns: boolean };
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
      love_language_done: { Args: Record<PropertyKey, never>; Returns: boolean };
      mark_story_seen: { Args: { p_story_id: string }; Returns: undefined };
      memories_cleanup_batch: { Args: { p_limit?: number }; Returns: Json };
      memory_path_readable: { Args: { p_name: string }; Returns: boolean };
      memory_path_writable: { Args: { p_name: string }; Returns: boolean };
      my_couple_id: { Args: Record<PropertyKey, never>; Returns: string };
      pick_daily_question: { Args: { p_couple_id: string }; Returns: string };
      question_card: {
        Args: { p_couple_id: string; p_day: string; p_question_id: string };
        Returns: Json;
      };
      question_json: {
        Args: {
          p_question: Omit<
            Database['public']['Tables']['questions']['Row'],
            Database['public']['Tables']['questions']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      question_visible: {
        Args: {
          p_question: Omit<
            Database['public']['Tables']['questions']['Row'],
            Database['public']['Tables']['questions']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      react_to_comment: {
        Args: { p_comment_id: string; p_emoji?: string };
        Returns: {
          body: string;
          couple_id: string;
          created_at: string;
          id: string;
          question_id: string;
          reactions: NonNullable<Json>;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'answer_comments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      react_to_story: { Args: { p_emoji: string; p_story_id: string }; Returns: undefined };
      register_push_token: { Args: { p_token: string }; Returns: undefined };
      reorder_list_items: { Args: { p_ids: string[]; p_list_id: string }; Returns: undefined };
      reply_to_story: {
        Args: { p_body: string; p_story_id: string };
        Returns: {
          body: string;
          couple_id: string;
          created_at: string;
          id: string;
          story_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'story_replies';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      require_couple: { Args: Record<PropertyKey, never>; Returns: string };
      reroll_drawing_word: { Args: { p_id: string }; Returns: Json };
      save_event: {
        Args: {
          p_date: string;
          p_emoji?: string;
          p_id?: string;
          p_kind?: string;
          p_note?: string;
          p_recurring_yearly?: boolean;
          p_title: string;
        };
        Returns: {
          couple_id: string;
          created_at: string;
          created_by: string;
          date: string;
          emoji: string | null;
          id: string;
          kind: string;
          note: string | null;
          recurring_yearly: boolean;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'events';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_list: {
        Args: { p_emoji?: string; p_id?: string; p_kind?: string; p_title: string };
        Returns: {
          couple_id: string;
          created_at: string;
          created_by: string;
          emoji: string | null;
          id: string;
          kind: string;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'lists';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_visit: {
        Args: {
          p_end_date: string;
          p_event_id?: string;
          p_id?: string;
          p_note?: string;
          p_place?: string;
          p_start_date: string;
        };
        Returns: {
          couple_id: string;
          created_at: string;
          created_by: string;
          end_date: string;
          event_id: string | null;
          id: string;
          note: string | null;
          place: string | null;
          start_date: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'visits';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      send_nudge: {
        Args: { p_kind?: string };
        Returns: {
          couple_id: string;
          created_at: string;
          from_user: string;
          id: string;
          kind: string;
          to_user: string;
        };
        SetofOptions: {
          from: '*';
          to: 'nudges';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      send_test_notification: { Args: Record<PropertyKey, never>; Returns: boolean };
      set_list_item_done: {
        Args: { p_done: boolean; p_id: string };
        Returns: {
          couple_id: string;
          created_at: string;
          created_by: string;
          done: boolean;
          done_at: string | null;
          done_by: string | null;
          id: string;
          list_id: string;
          position: number;
          text: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'list_items';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_mood: {
        Args: { p_emoji: string; p_note?: string };
        Returns: {
          couple_id: string;
          created_at: string;
          emoji: string;
          id: string;
          note: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'moods';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_my_location: {
        Args: { p_city?: string; p_lat: number; p_lng: number };
        Returns: {
          city: string | null;
          couple_id: string;
          lat: number;
          lng: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'locations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_spicy_opt_in: { Args: { p_enabled: boolean }; Returns: boolean };
      set_story_archive: { Args: { p_enabled: boolean }; Returns: undefined };
      start_drawing: { Args: Record<PropertyKey, never>; Returns: Json };
      start_game_round: { Args: { p_game: string; p_spicy?: boolean }; Returns: Json };
      stories_cleanup_batch: { Args: { p_limit?: number }; Returns: Json };
      stories_cleanup_commit: { Args: { p_story_ids: string[] }; Returns: number };
      story_path_readable: { Args: { p_name: string }; Returns: boolean };
      story_path_writable: { Args: { p_name: string }; Returns: boolean };
      story_visible: { Args: { p_story_id: string }; Returns: boolean };
      submit_answer: {
        Args: { p_choice?: number; p_question_id: string; p_text?: string };
        Returns: Json;
      };
      submit_drawing: { Args: { p_id: string; p_strokes: Json }; Returns: Json };
      submit_love_language_test: {
        Args: { p_answers: string[]; p_quiz_version?: number };
        Returns: Json;
      };
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
      update_list_item: {
        Args: { p_id: string; p_text: string };
        Returns: {
          couple_id: string;
          created_at: string;
          created_by: string;
          done: boolean;
          done_at: string | null;
          done_by: string | null;
          id: string;
          list_id: string;
          position: number;
          text: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'list_items';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_memory: {
        Args: {
          p_body?: string;
          p_happened_on: string;
          p_lat?: number;
          p_lng?: number;
          p_memory_id: string;
          p_photos?: Json;
          p_place_name?: string;
          p_title: string;
        };
        Returns: {
          body: string | null;
          couple_id: string;
          created_at: string;
          created_by: string;
          happened_on: string;
          id: string;
          lat: number | null;
          lng: number | null;
          place_name: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'memories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
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
