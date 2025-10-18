import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Recycle, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
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

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Dummy authentication - in real app, this would call an API
    if (isLogin) {
      // Simulate login
      onLogin(email, password);
    } else {
      // Simulate sign up and auto-login
      onLogin(email, password);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-4">
            <Recycle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-green-700 mb-2">EcoScan</h1>
          <p className="text-gray-600">Recycle smarter, earn rewards</p>
        </div>

        {/* Auth Card */}
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={toggleMode}
                  className="text-green-600 hover:text-green-700"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>

            {isLogin && (
              <div className="mt-4 text-center">
                <button className="text-sm text-gray-500 hover:text-gray-700">
                  Forgot password?
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Preview */}
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
