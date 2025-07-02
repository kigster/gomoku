// Authentication Service for Gomoku Game
import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api/v1";

// Configure axios defaults
axios.defaults.headers.common["Content-Type"] = "application/json";

// Interfaces
export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  provider?: string;
  avatar_url?: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;
  rating: number;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  errors?: string[];
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  password_confirmation: string;
  username: string;
  name: string;
}

export interface OAuthData {
  id?: string;
  sub?: string;
  email: string;
  name: string;
  picture?: string;
  avatar_url?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = localStorage.getItem("gomoku_token");
    const savedUser = localStorage.getItem("gomoku_user");
    this.user = savedUser ? JSON.parse(savedUser) : null;

    if (this.token) {
      this.setAuthHeader(this.token);
    }
  }

  private setAuthHeader(token: string) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  private removeAuthHeader() {
    delete axios.defaults.headers.common["Authorization"];
  }

  private saveSession(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem("gomoku_token", token);
    localStorage.setItem("gomoku_user", JSON.stringify(user));
    this.setAuthHeader(token);
  }

  private clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("gomoku_token");
    localStorage.removeItem("gomoku_user");
    this.removeAuthHeader();
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Login with email/password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        credentials
      );

      if (response.data.success && response.data.token) {
        this.saveSession(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  }

  // Register new user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        user: credentials,
      });

      if (response.data.success && response.data.token) {
        this.saveSession(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Registration failed",
        errors: error.response?.data?.errors,
      };
    }
  }

  // OAuth login
  async oauthLogin(
    provider: "google" | "github",
    authData: OAuthData
  ): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/oauth`, {
        provider,
        auth_data: authData,
      });

      if (response.data.success && response.data.token) {
        this.saveSession(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      console.error("OAuth login error:", error);
      return {
        success: false,
        error: error.response?.data?.error || "OAuth login failed",
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.delete(`${API_BASE_URL}/auth/logout`);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearSession();
    }
  }

  // Refresh user data
  async refreshUserData(): Promise<User | null> {
    try {
      if (!this.token) return null;

      const response = await axios.get(`${API_BASE_URL}/auth/me`);

      if (response.data.success) {
        this.user = response.data.user;
        localStorage.setItem("gomoku_user", JSON.stringify(this.user));
        return this.user;
      }

      return null;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      this.clearSession();
      return null;
    }
  }

  // Google OAuth helper (simplified - in production use Google OAuth library)
  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      // This is a simplified version - in production, use Google OAuth 2.0 flow
      // For now, we'll simulate the OAuth process
      console.log("Google OAuth login would redirect to Google...");

      // Simulate OAuth data (replace with actual Google OAuth implementation)
      const mockGoogleData: OAuthData = {
        sub: "google_user_123",
        email: "user@gmail.com",
        name: "Google User",
        picture: "https://lh3.googleusercontent.com/a/default-user",
      };

      return this.oauthLogin("google", mockGoogleData);
    } catch (error) {
      return {
        success: false,
        error: "Google OAuth failed",
      };
    }
  }

  // GitHub OAuth helper (simplified - in production use GitHub OAuth library)
  async loginWithGitHub(): Promise<AuthResponse> {
    try {
      // This is a simplified version - in production, use GitHub OAuth flow
      console.log("GitHub OAuth login would redirect to GitHub...");

      // Simulate OAuth data (replace with actual GitHub OAuth implementation)
      const mockGitHubData: OAuthData = {
        id: "github_user_456",
        email: "user@users.noreply.github.com",
        name: "GitHub User",
        avatar_url: "https://avatars.githubusercontent.com/u/123456?v=4",
      };

      return this.oauthLogin("github", mockGitHubData);
    } catch (error) {
      return {
        success: false,
        error: "GitHub OAuth failed",
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
