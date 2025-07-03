// React and UI imports
import React, { useState } from "react";
import { 
  X,         // Close button icon
  Mail,      // Email field icon
  Lock,      // Password field icon
  User,      // Name field icon
  Github,    // GitHub OAuth button icon
  Chrome,    // Google OAuth button icon (using Chrome as proxy)
  Eye,       // Show password icon
  EyeOff     // Hide password icon
} from "lucide-react";

// Authentication service and types
import authService, {
  LoginCredentials,      // Type for login form data
  RegisterCredentials,   // Type for registration form data
} from "../services/authService.ts";

// ==================== COMPONENT INTERFACES ====================

/**
 * Props for the AuthModal component
 */
interface AuthModalProps {
  isOpen: boolean;                    // Controls modal visibility
  onClose: () => void;                // Callback when modal should close
  onSuccess: (user: any) => void;     // Callback when authentication succeeds
}

/**
 * Authentication mode - determines which form to show
 * - "login": Show login form for existing users
 * - "register": Show registration form for new users
 */
type AuthMode = "login" | "register";

// ==================== MAIN COMPONENT ====================

/**
 * Authentication Modal Component
 * Provides a unified interface for login, registration, and OAuth authentication
 * Features glass morphism design with smooth animations and error handling
 */
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,      // Whether modal is currently visible
  onClose,     // Function to call when closing modal
  onSuccess,   // Function to call when authentication succeeds
}) => {
  
  // ==================== STATE MANAGEMENT ====================
  
  /**
   * Current authentication mode (login vs register)
   * Controls which form is displayed and which validation rules apply
   */
  const [mode, setMode] = useState<AuthMode>("login");
  
  /**
   * Loading state for async operations
   * Prevents multiple simultaneous requests and shows loading indicators
   */
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Error message to display to user
   * Shows validation errors, network errors, or authentication failures
   */
  const [error, setError] = useState<string>("");
  
  /**
   * Password visibility toggle
   * Allows users to see what they're typing in password fields
   */
  const [showPassword, setShowPassword] = useState(false);

  // ==================== FORM STATE ====================
  
  /**
   * Login form data
   * Stores email and password for existing user authentication
   */
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    email: "",    // User's email address
    password: "",  // User's password
  });

  /**
   * Registration form data  
   * Stores all required fields for creating a new user account
   */
  const [registerForm, setRegisterForm] = useState<RegisterCredentials>({
    email: "",                // User's email address
    password: "",             // User's chosen password
    password_confirmation: "", // Password confirmation for validation
    username: "",             // Unique username for the user
    name: "",                 // User's display name
  });

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Reset all form data and UI state to initial values
   * Called when modal closes or switches between login/register modes
   */
  const resetForms = () => {
    setLoginForm({ email: "", password: "" });            // Clear login form
    setRegisterForm({                                     // Clear registration form
      email: "",
      password: "",
      password_confirmation: "",
      username: "",
      name: "",
    });
    setError("");                                         // Clear any error messages
    setShowPassword(false);                               // Hide password by default
  };

  /**
   * Handle modal close with cleanup
   * Resets all state and notifies parent component
   */
  const handleClose = () => {
    resetForms();    // Clean up form data and state
    onClose();       // Notify parent to hide modal
  };

  // ==================== AUTHENTICATION HANDLERS ====================

  /**
   * Handle email/password login form submission
   * Validates form, calls auth service, and handles response
   * 
   * @param e - Form submission event
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();   // Prevent default form submission
    setIsLoading(true);   // Show loading state
    setError("");         // Clear previous errors

    try {
      // Attempt login with email and password
      const response = await authService.login(loginForm);

      if (response.success && response.user) {
        // Login successful - notify parent and close modal
        onSuccess(response.user);
        handleClose();
      } else {
        // Login failed - show error message
        setError(response.error || "Login failed");
      }
    } catch (error) {
      // Network or unexpected error
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  /**
   * Handle new user registration form submission
   * Validates passwords match, calls auth service, and handles response
   * 
   * @param e - Form submission event
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();   // Prevent default form submission

    // ===== CLIENT-SIDE VALIDATION =====
    if (registerForm.password !== registerForm.password_confirmation) {
      setError("Passwords do not match");
      return; // Stop registration if passwords don't match
    }

    setIsLoading(true);   // Show loading state
    setError("");         // Clear previous errors

    try {
      // Attempt registration with form data
      const response = await authService.register(registerForm);

      if (response.success && response.user) {
        // Registration successful - notify parent and close modal
        onSuccess(response.user);
        handleClose();
      } else {
        // Registration failed - show error message(s)
        // Handle both single error and array of validation errors
        setError(
          response.error || response.errors?.join(", ") || "Registration failed"
        );
      }
    } catch (error) {
      // Network or unexpected error
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  /**
   * Handle Google OAuth login
   * Redirects to Google OAuth flow or handles popup-based authentication
   */
  const handleGoogleLogin = async () => {
    setIsLoading(true);   // Show loading state
    setError("");         // Clear previous errors

    try {
      // Initiate Google OAuth flow
      const response = await authService.loginWithGoogle();

      if (response.success && response.user) {
        // OAuth successful - notify parent and close modal
        onSuccess(response.user);
        handleClose();
      } else {
        // OAuth failed - show error message
        setError(response.error || "Google login failed");
      }
    } catch (error) {
      // Network, popup blocked, or OAuth error
      setError("Google login failed");
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  /**
   * Handle GitHub OAuth login  
   * Redirects to GitHub OAuth flow or handles popup-based authentication
   */
  const handleGitHubLogin = async () => {
    setIsLoading(true);   // Show loading state
    setError("");         // Clear previous errors

    try {
      // Initiate GitHub OAuth flow
      const response = await authService.loginWithGitHub();

      if (response.success && response.user) {
        // OAuth successful - notify parent and close modal
        onSuccess(response.user);
        handleClose();
      } else {
        // OAuth failed - show error message
        setError(response.error || "GitHub login failed");
      }
    } catch (error) {
      // Network, popup blocked, or OAuth error
      setError("GitHub login failed");
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-8 w-full max-w-md mx-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            <Chrome className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-700">
              Continue with Google
            </span>
          </button>

          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
          >
            <Github className="w-5 h-5" />
            <span className="font-medium">Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              or continue with email
            </span>
          </div>
        </div>

        {/* Login Form */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={registerForm.username}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      username: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Create password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={registerForm.password_confirmation}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password_confirmation: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* Mode Toggle */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="ml-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
