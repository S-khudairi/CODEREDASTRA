import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Recycle, Mail, Lock, User, Eye, EyeOff, Camera, MapPin, Trophy, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { sendPasswordReset } from "../firebase/auth";

interface AuthScreenProps {
  onLogin: (email: string, password: string, name?: string) => Promise<void>;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);

  // Auto-clear reset message after 5 seconds
  useEffect(() => {
    if (resetMessage) {
      const timer = setTimeout(() => setResetMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [resetMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isLogin && !name) {
      setError("Please enter your name");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onLogin(email, password, name);
      }
    } catch (err) {
      console.error("Firebase Auth Error", err);
      setError("Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setResetMessage(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address to reset your password.");
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordReset(email);
      setResetMessage("Password reset link sent! Check your inbox.");
      setShowResetForm(false);
    } catch (err) {
      console.error("Password Reset Error:", err);
      setError("Could not send link. Please check the email address is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setResetMessage(null);
    setShowResetForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-4">
            <Recycle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-green-700 mb-2 text-2xl font-semibold">EcoScan</h1>
          <p className="text-gray-600">Recycle smarter, earn rewards</p>
        </div>

        {/* CONDITIONAL CARD RENDERING */}
        {showResetForm ? (
          /* PASSWORD RESET CARD */
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your account email to receive a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetPassword();
                }}
                className="space-y-4"
              >
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email-reset">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email-reset"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Alerts */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {resetMessage && (
                  <Alert variant="default" className="bg-green-100 border-green-400 text-green-700">
                    <AlertDescription>{resetMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Send Reset Link Button */}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowResetForm(false);
                    setError("");
                    setResetMessage(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* MAIN LOGIN/SIGNUP CARD */
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
              <CardDescription>
                {isLogin
                  ? "Sign in to continue recycling"
                  : "Join our community of eco-warriors"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {resetMessage && (
                <Alert variant="default" className="bg-green-100 border-green-400 text-green-700">
                  <AlertDescription>{resetMessage}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name (Signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Carl Guinaldo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? "Signing In..." : "Creating Account..."}
                    </>
                  ) : (
                    isLogin ? "Sign In" : "Create Account"
                  )}
                </Button>
              </form>

              {/* Login/Signup Toggle */}
              <div className="mt-4 text-center">
                {isLogin ? (
                  <p className="text-sm text-gray-500">
                    Don't have an account?{" "}
                    <button
                      onClick={toggleMode}
                      className="text-green-600 hover:text-green-700 font-semibold"
                      type="button"
                    >
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Already have an account?{" "}
                    <button
                      onClick={toggleMode}
                      className="text-green-600 hover:text-green-700 font-semibold"
                      type="button"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>

              {/* Forgot Password Button */}
              {isLogin && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setShowResetForm(true);
                      setError("");
                      setResetMessage(null);
                    }}
                    type="button"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features Preview (Signup only) */}
        {!isLogin && (
          <div className="mt-6 bg-white rounded-lg shadow p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Camera className="h-4 w-4 text-green-600" />
              </div>
              <p>AI-powered material recognition</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <p>Find nearby recycling centers</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="h-4 w-4 text-green-600" />
              </div>
              <p>Compete on the leaderboard</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
