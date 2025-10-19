import { useState, useEffect } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { MainApp } from "./components/MainApp";
import { Toaster } from "react-hot-toast";

import { onAuthStateChanged } from "firebase/auth";
import { signInUser, signUpUser, logoutUser } from "./firebase/auth";
import { auth } from "./firebase/firebaseConfig";
import { createNewUserProfile } from "./firebase/db";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setCurrentUserId(user.uid);
        setIsAuthenticated(true);
      } else {
        setUserEmail("");
        setCurrentUserId(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string, name?: string) => {
    try {
      let user;
      if (name) {
        user = await signUpUser(email, password, name);
        await createNewUserProfile(user.uid, name);
      } else {
        user = await signInUser(email, password);
      }
    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (isLoading) {
    return <div>Loading session...</div>;
  }

  if (!isAuthenticated || !currentUserId) {
    return (
      <>
        <AuthScreen onLogin={handleLogin} />
        <Toaster position="top-center" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
      </>
    );
  }

  return (
    <>
      <MainApp userEmail={userEmail} onLogout={handleLogout} currentUserId={currentUserId} />
      <Toaster position="top-center" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
    </>
  );
}
