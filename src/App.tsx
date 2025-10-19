import { useState, useEffect } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { MainApp } from "./components/MainApp";

// Import Firebase function and observer
import { onAuthStateChanged } from "firebase/auth";
import { signInUser, signUpUser, logoutUser } from "./firebase/auth";
import { auth } from "./firebase/firebaseConfig";
import { Trophy } from "lucide-react";


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Firebase auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setIsAuthenticated(true);
      }
      else{
        setUserEmail("");
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string, name?: string) => {
    try{
      if (name) {
        // Sign-up logic
        await signUpUser(email, password, name);
      } else {
        // Sign-in Logic
        await signInUser(email, password);
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

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <MainApp userEmail={userEmail} onLogout={handleLogout} />;
}
