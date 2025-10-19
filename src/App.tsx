import { useState, useEffect } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { MainApp } from "./components/MainApp";

// Import Firebase function and observer
import { onAuthStateChanged } from "firebase/auth";
import { signInUser, signUpUser, logoutUser } from "./firebase/auth";
import { auth } from "./firebase/firebaseConfig";
import { Trophy } from "lucide-react";
import { createNewUserProfile } from "./firebase/db";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setCurrentUserId(user.uid);
        setIsAuthenticated(true);
      }
      else{
        setUserEmail("");
        setCurrentUserId(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string, name?: string) => {
    try{
      let user;
      if (name) {
        // Sign-up logic
        user = await signUpUser(email, password, name);
        await createNewUserProfile(user.uid, name);
      } else {
        // Sign-in Logic
        user = await signInUser(email, password);
      }
      // on AuthStateChanged hanfler takes care of updating state (isAuthenticated and userEmail)
    } catch(error) {
        console.error("Auth Error:", error);
        throw error;
    }
  };

  const handleLogout = async () => {
    try{
      await logoutUser();
    } catch (error) {
        console.error("Logout Error:", error);
        // setIsAuthenticated(false);
        // setUserEmail("");
    }
  };

  if (isLoading) {
    return <div>Loading session...</div>
  }

  if (!isAuthenticated || !currentUserId) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <MainApp userEmail={userEmail} onLogout={handleLogout} currentUserId={currentUserId}/>;
}
