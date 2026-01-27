import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

interface AuthContextType {
    user: any;
    login: (access: string, refresh: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

// AuthContext: Manages the global authentication state of the application.
// Provides user data, login/logout methods, and session status to all child components.
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // isLoading prevents the flickering of the login screen while we verify the token on app mount.
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        /**
         * INITIAL AUTH CHECK:
         * Runs once when the application starts. 
         * Verifies if the user has a valid local session.
         */
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');

            if (token) {
                try {
                    const decoded: any = jwtDecode(token);

                    // CASE 1: Token is valid and has not expired.
                    if (decoded.exp * 1000 > Date.now()) {
                        setUser(decoded);
                        setIsAuthenticated(true);
                    }
                    // CASE 2: Access token expired, but we have a refresh token.
                    else if (refreshToken) {
                        try {
                            // Attempt a silent refresh to keep the user logged in seamlessly.
                            const response = await axios.post('https://nexusverify.pythonanywhere.com/api/token/refresh/', {
                                refresh: refreshToken
                            });
                            const { access } = response.data;
                            localStorage.setItem('access_token', access);

                            const newDecoded = jwtDecode(access);
                            setUser(newDecoded);
                            setIsAuthenticated(true);
                        } catch (refreshErr) {
                            // Refresh failed (e.g., refresh token also expired), force logout.
                            logout();
                        }
                    } else {
                        logout();
                    }
                } catch (e) {
                    console.error("Auth initialization failed:", e);
                    logout();
                }
            }
            // Verification complete, allow the App component to render the appropriate screen.
            setIsLoading(false);
        };
        initAuth();
    }, []);

    /**
     * Updates local storage and state when a user successfully logs in.
     */
    const login = (access: string, refresh: string) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        const decoded = jwtDecode(access);
        setUser(decoded);
        setIsAuthenticated(true);
    };

    /**
     * Wipes session data and reverts the app to an unauthenticated state.
     */
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
