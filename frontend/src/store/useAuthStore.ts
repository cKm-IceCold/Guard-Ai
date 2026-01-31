import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

interface AuthState {
    user: any;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (access: string, refresh: string) => void;
    logout: () => void;
    initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Default to true to prevent screen flicker

    login: (access: string, refresh: string) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        try {
            const decoded = jwtDecode(access);
            set({ user: decoded, isAuthenticated: true });
        } catch (e) {
            console.error("Login decode error:", e);
        }
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
    },

    initAuth: async () => {
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (token) {
            try {
                const decoded: any = jwtDecode(token);

                // CASE 1: Valid Token
                if (decoded.exp * 1000 > Date.now()) {
                    set({ user: decoded, isAuthenticated: true });
                }
                // CASE 2: Expired Token, Try Refresh
                else if (refreshToken) {
                    try {
                        // Assuming backend on pythonanywhere
                        const response = await axios.post('https://nexusverify.pythonanywhere.com/api/token/refresh/', {
                            refresh: refreshToken
                        });
                        const { access } = response.data;
                        localStorage.setItem('access_token', access);
                        const newDecoded = jwtDecode(access);
                        set({ user: newDecoded, isAuthenticated: true });
                    } catch (refreshErr) {
                        // Refresh failed, force logout
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        set({ user: null, isAuthenticated: false });
                    }
                } else {
                    set({ user: null, isAuthenticated: false });
                }
            } catch (e) {
                console.error("Auth init error:", e);
                set({ user: null, isAuthenticated: false });
            }
        }
        set({ isLoading: false });
    }
}));
