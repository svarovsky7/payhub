import { create } from 'zustand';
import { supabase } from '@/shared/api';
import type { AuthState, LoginCredentials, RegisterCredentials, User } from '@/shared/types';

interface AuthStore extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>;
  signUp: (credentials: RegisterCredentials) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const user: User = {
          ...session.user,
          role: profile?.role,
          full_name: profile?.full_name,
        };

        set({ user, session, loading: false });
      } else {
        set({ user: null, session: null, loading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const user: User = {
            ...session.user,
            role: profile?.role,
            full_name: profile?.full_name,
          };

          set({ user, session, loading: false });
        } else {
          set({ user: null, session: null, loading: false });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, session: null, loading: false });
    }
  },

  signIn: async (credentials: LoginCredentials) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch {
      return { error: 'Произошла непредвиденная ошибка' };
    }
  },

  signUp: async (credentials: RegisterCredentials) => {
    try {
      console.log('Starting registration with credentials:', {
        email: credentials.email,
        fullName: credentials.fullName,
        role: credentials.role
      });

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
            role: credentials.role || 'PROCUREMENT_OFFICER',
          },
        },
      });

      console.log('Supabase auth.signUp response:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        return { error: error.message };
      }

      // Profile record will be created automatically by database trigger
      console.log('User registered successfully:', data);
      
      return {};
    } catch (error) {
      console.error('Registration catch error:', error);
      return { error: 'Произошла непредвиденная ошибка' };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
}));