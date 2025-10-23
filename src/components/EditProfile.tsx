import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { User, Mail, IdCard, Key, CheckCircle, X } from "lucide-react";
import { sendPasswordReset } from "../firebase/auth";
import { useState } from "react";

interface EditProfileProps {
  userEmail: string;
  currentUserId: string;
  userInitials: string;
  userName: string;
  onDone?: () => void;
}

export function EditProfile({ userEmail, currentUserId, userInitials, userName, onDone }: EditProfileProps) {
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setIsResetting(true);
    setResetError(null);
    setResetEmailSent(false);

    try {
      await sendPasswordReset(userEmail);
      setResetEmailSent(true);
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      setResetError(error.message || "Failed to send password reset email. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <Button 
              onClick={onDone}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
          <CardDescription>
            View your account details (Read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <Avatar className="h-24 w-24 border-4 border-green-600 mb-4">
              <AvatarFallback className="bg-green-600 text-white text-3xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                Name
              </Label>
              <Input 
                id="name" 
                value={userName || "User"}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">This is your display name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-600" />
                Email
              </Label>
              <Input 
                id="email" 
                value={userEmail}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Your account email address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId" className="flex items-center gap-2">
                <IdCard className="h-4 w-4 text-green-600" />
                User ID
              </Label>
              <Input 
                id="userId" 
                value={currentUserId}
                readOnly
                className="bg-gray-50 font-mono text-xs"
              />
              <p className="text-xs text-gray-500">Your unique account identifier</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Reset Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-green-600" />
            Password Management
          </CardTitle>
          <CardDescription>
            Reset your password via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resetEmailSent && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password reset email sent to <strong>{userEmail}</strong>. Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {resetError && (
            <Alert className="bg-red-50 border-red-200">
              <X className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {resetError}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Button 
              onClick={handleResetPassword}
              disabled={isResetting}
              variant="outline"
              className="w-full"
            >
              <Key className="h-4 w-4 mr-2" />
              {isResetting ? "Sending..." : "Send Password Reset Email"}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              You'll receive an email with instructions to reset your password
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            ℹ️ Profile editing is currently read-only. Contact support if you need to update your information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
