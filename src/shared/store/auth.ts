import { create } from 'zustand';
import { supabase } from '@/shared/api';
import type { AuthState, LoginCredentials, RegisterCredentials, User } from '@/shared/types';

interface AuthStore extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>;
  signUp: (credentials: RegisterCredentials) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Loading user profile for:', session.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            user_roles(id, code, name)
          `)
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error loading user profile:', profileError);
        }

        console.log('Loaded user profile:', profile);

        const user: User = {
          ...session.user,
          role: profile?.user_roles?.code,
          role_id: profile?.role_id,
          full_name: profile?.full_name,
        };

        console.log('Setting user in auth store:', user);
        set({ user, session, loading: false });
      } else {
        set({ user: null, session: null, loading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_, session) => {
        if (session?.user) {
          console.log('Auth state changed, loading user profile for:', session.user.id);
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select(`
              *,
              user_roles(id, code, name)
            `)
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error loading user profile on auth change:', profileError);
          }

          console.log('Loaded user profile on auth change:', profile);

          const user: User = {
            ...session.user,
            role: profile?.user_roles?.code,
            role_id: profile?.role_id,
            full_name: profile?.full_name,
          };

          console.log('Setting user in auth store on auth change:', user);
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

      // Explicitly create user profile if user was created successfully
      if (data.user && !error) {
        console.log('Creating user profile for:', data.user.id);
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: credentials.email,
            full_name: credentials.fullName,
            role: credentials.role || 'PROCUREMENT_OFFICER',
            is_active: true,
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't return error here as user is already created in auth.users
          // The profile creation might have been handled by trigger
          console.log('Profile creation error might be due to trigger already handling it');
        } else {
          console.log('User profile created successfully');
        }
      }
      
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

  setUser: (user: User | null) => {
    console.log('Manually setting user in auth store:', user);
    set({ user });
  },
}));