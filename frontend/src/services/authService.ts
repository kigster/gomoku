/**
 * Authentication Service for Gomoku Game
 *
 * Handles all authentication operations including:
 * - Email/password login and registration
 * - OAuth integration (Google, GitHub)
 * - JWT token management
 * - Session persistence
 * - User data synchronization
 */

import axios from "axios";

// ==================== CONFIGURATION ====================

/**
 * Base URL for Rails API backend
 * Points to the Rails server running on port 3001
 */
const API_BASE_URL = "http://localhost:3001/api/v1";

// Configure axios defaults for all API requests
axios.defaults.headers.common["Content-Type"] = "application/json";

// ==================== TYPE DEFINITIONS ====================

/**
 * User data structure returned from the backend
 * Contains profile information and game statistics
 */
export interface User {
  id: number; // Unique user identifier
  email: string; // User's email address
  username: string; // Unique username for display
  name: string; // User's full/display name
  provider?: string; // OAuth provider (google, github, or null for email)
  avatar_url?: string; // Profile picture URL from OAuth or uploaded

  // Game statistics
  games_played: number; // Total games completed
  games_won: number; // Games won by this user
  games_lost: number; // Games lost by this user
  games_drawn: number; // Games ending in draw
  rating: number; // ELO-style rating for matchmaking

  created_at: string; // Account creation timestamp
}

/**
 * Standard API response format for authentication operations
 * Provides consistent error handling and success indication
 */
export interface AuthResponse {
  success: boolean; // Whether the operation succeeded
  token?: string; // JWT token for authenticated requests
  user?: User; // User data if authentication successful
  error?: string; // Single error message
  errors?: string[]; // Array of validation errors (registration)
  message?: string; // Additional info message
}

/**
 * Login form data structure
 * Simple email/password authentication
 */
export interface LoginCredentials {
  email: string; // User's email address
  password: string; // User's password
}

/**
 * Registration form data structure
 * Includes all required fields for new account creation
 */
export interface RegisterCredentials {
  email: string; // User's email address
  password: string; // User's chosen password
  password_confirmation: string; // Password confirmation for validation
  username: string; // Chosen username (must be unique)
  name: string; // User's display name
}

/**
 * OAuth authentication data from external providers
 * Normalized format for Google, GitHub, and other OAuth providers
 */
export interface OAuthData {
  id?: string; // Provider-specific user ID (GitHub)
  sub?: string; // Subject identifier (Google)
  email: string; // User's email from OAuth provider
  name: string; // User's name from OAuth provider
  picture?: string; // Profile picture URL (Google)
  avatar_url?: string; // Profile picture URL (GitHub)
}

// ==================== AUTHENTICATION SERVICE CLASS ====================

/**
 * AuthService - Singleton class managing user authentication and session state
 *
 * Features:
 * - JWT token management with automatic header setting
 * - Local storage persistence for session recovery
 * - OAuth integration with Google and GitHub
 * - Automatic session restoration on page reload
 * - Centralized error handling for auth operations
 */
class AuthService {
  // ==================== PRIVATE STATE ====================

  /**
   * Current JWT authentication token
   * Used for authenticated API requests to Rails backend
   */
  private token: string | null = null;

  /**
   * Current authenticated user data
   * Cached locally to avoid repeated API calls
   */
  private user: User | null = null;

  // ==================== INITIALIZATION ====================

  /**
   * Constructor - Restore session from localStorage if available
   * Called once when service is imported, ensures session persistence
   */
  constructor() {
    // Attempt to restore authentication state from browser storage
    this.token = localStorage.getItem("gomoku_token");
    const savedUser = localStorage.getItem("gomoku_user");
    this.user = savedUser ? JSON.parse(savedUser) : null;

    // If we have a stored token, configure axios for authenticated requests
    if (this.token) {
      this.setAuthHeader(this.token);
    }
  }

  // ==================== PRIVATE UTILITY METHODS ====================

  /**
   * Configure axios to include JWT token in all future requests
   * Sets the Authorization header for automatic authentication
   *
   * @param token - JWT token to include in requests
   */
  private setAuthHeader(token: string) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Remove authentication header from axios defaults
   * Called during logout to prevent authenticated requests
   */
  private removeAuthHeader() {
    delete axios.defaults.headers.common["Authorization"];
  }

  /**
   * Save authentication session to memory and localStorage
   * Ensures session persists across browser refreshes
   *
   * @param token - JWT token from successful authentication
   * @param user - User data from successful authentication
   */
  private saveSession(token: string, user: User) {
    // Update in-memory state
    this.token = token;
    this.user = user;

    // Persist to localStorage for session recovery
    localStorage.setItem("gomoku_token", token);
    localStorage.setItem("gomoku_user", JSON.stringify(user));

    // Configure axios for authenticated requests
    this.setAuthHeader(token);
  }

  /**
   * Clear all authentication state from memory and localStorage
   * Called during logout or when tokens become invalid
   */
  private clearSession() {
    // Clear in-memory state
    this.token = null;
    this.user = null;

    // Clear persisted state
    localStorage.removeItem("gomoku_token");
    localStorage.removeItem("gomoku_user");

    // Remove authentication headers
    this.removeAuthHeader();
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Get currently authenticated user data
   * Returns cached user object or null if not authenticated
   *
   * @returns Current user data or null
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is currently authenticated
   * Verifies both token and user data are present
   *
   * @returns true if user is authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  /**
   * Authenticate user with email and password
   * Calls Rails backend for credential verification
   *
   * @param credentials - Email and password for authentication
   * @returns Promise resolving to authentication response
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Send login request to Rails API
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        credentials
      );

      // If login successful, save session data
      if (response.data.success && response.data.token) {
        this.saveSession(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      console.error("Login error:", error);
      // Return standardized error response
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  }

  /**
   * Register new user account
   * Creates new user in Rails backend and automatically logs them in
   *
   * @param credentials - Registration form data including email, password, username, name
   * @returns Promise resolving to authentication response
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Send registration request to Rails API
      // Rails expects nested user object
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        user: credentials,
      });

      // If registration successful, save session data
      if (response.data.success && response.data.token) {
        this.saveSession(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      console.error("Registration error:", error);
      // Return standardized error response with validation errors
      return {
        success: false,
        error: error.response?.data?.error || "Registration failed",
        errors: error.response?.data?.errors, // Array of validation errors
      };
    }
  }

  /**
   * Authenticate user with OAuth provider data
   * Handles both Google and GitHub OAuth flows
   *
   * @param provider - OAuth provider name ("google" or "github")
   * @param authData - Normalized user data from OAuth provider
   * @returns Promise resolving to authentication response
   */
  async oauthLogin(
    provider: "google" | "github",
    authData: OAuthData
  ): Promise<AuthResponse> {
    try {
      // Send OAuth data to Rails API for user creation/login
      const response = await axios.post(`${API_BASE_URL}/auth/oauth`, {
        provider, // Which OAuth provider
        auth_data: authData, // User data from OAuth provider
      });

      // If OAuth login successful, save session data
      if (response.data.success && response.data.token) {
        this.saveSession(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      console.error("OAuth login error:", error);
      // Return standardized error response
      return {
        success: false,
        error: error.response?.data?.error || "OAuth login failed",
      };
    }
  }

  /**
   * Log out current user
   * Notifies backend and clears all local session data
   * Always clears local state even if backend call fails
   */
  async logout(): Promise<void> {
    try {
      // Notify backend to invalidate token (if we have one)
      if (this.token) {
        await axios.delete(`${API_BASE_URL}/auth/logout`);
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local cleanup even if backend call fails
    } finally {
      // Always clear local session data
      this.clearSession();
    }
  }

  /**
   * Refresh user data from backend
   * Updates local user data with latest from server (stats, rating, etc.)
   * Used after games to sync updated statistics
   *
   * @returns Promise resolving to updated user data or null if failed
   */
  async refreshUserData(): Promise<User | null> {
    try {
      // Can't refresh without authentication token
      if (!this.token) return null;

      // Fetch current user data from backend
      const response = await axios.get(`${API_BASE_URL}/auth/me`);

      if (response.data.success) {
        // Update cached user data
        this.user = response.data.user;
        localStorage.setItem("gomoku_user", JSON.stringify(this.user));
        return this.user;
      }

      return null;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      // If refresh fails, likely token is invalid - clear session
      this.clearSession();
      return null;
    }
  }

  // ==================== OAUTH HELPER METHODS ====================

  /**
   * Google OAuth authentication helper
   *
   * NOTE: This is a simplified implementation for development
   * In production, implement actual Google OAuth 2.0 flow:
   * 1. Redirect to Google OAuth consent screen
   * 2. Handle OAuth callback with authorization code
   * 3. Exchange code for access token
   * 4. Fetch user profile from Google API
   *
   * @returns Promise resolving to authentication response
   */
  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      // TODO: Replace with actual Google OAuth implementation
      // This is a placeholder for development/testing
      console.log("Google OAuth login would redirect to Google...");

      // Simulate OAuth data (replace with actual Google OAuth implementation)
      // In production, this data would come from Google's API after OAuth consent
      const mockGoogleData: OAuthData = {
        sub: "google_user_123", // Google user ID
        email: "user@gmail.com", // User's email
        name: "Google User", // User's name
        picture: "https://lh3.googleusercontent.com/a/default-user", // Profile picture
      };

      // Use the OAuth login method with simulated Google data
      return this.oauthLogin("google", mockGoogleData);
    } catch (error) {
      return {
        success: false,
        error: "Google OAuth failed",
      };
    }
  }

  /**
   * GitHub OAuth authentication helper
   *
   * NOTE: This is a simplified implementation for development
   * In production, implement actual GitHub OAuth flow:
   * 1. Redirect to GitHub OAuth authorization
   * 2. Handle OAuth callback with authorization code
   * 3. Exchange code for access token
   * 4. Fetch user profile from GitHub API
   *
   * @returns Promise resolving to authentication response
   */
  async loginWithGitHub(): Promise<AuthResponse> {
    try {
      // TODO: Replace with actual GitHub OAuth implementation
      // This is a placeholder for development/testing
      console.log("GitHub OAuth login would redirect to GitHub...");

      // Simulate OAuth data (replace with actual GitHub OAuth implementation)
      // In production, this data would come from GitHub's API after OAuth consent
      const mockGitHubData: OAuthData = {
        id: "github_user_456", // GitHub user ID
        email: "user@users.noreply.github.com", // User's email (may be private)
        name: "GitHub User", // User's name
        avatar_url: "https://avatars.githubusercontent.com/u/123456?v=4", // Profile picture
      };

      // Use the OAuth login method with simulated GitHub data
      return this.oauthLogin("github", mockGitHubData);
    } catch (error) {
      return {
        success: false,
        error: "GitHub OAuth failed",
      };
    }
  }
}

// ==================== SERVICE EXPORT ====================

/**
 * Singleton instance of AuthService
 * Use this instance throughout the application for consistent state management
 *
 * Example usage:
 *   import authService from './services/authService';
 *   const user = authService.getCurrentUser();
 *   const response = await authService.login(credentials);
 */
export const authService = new AuthService();

/**
 * Default export for convenience
 * Allows both named and default imports
 */
export default authService;
