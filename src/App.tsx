import { useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { MainApp } from "./components/MainApp";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const handleLogin = (email: string, password: string) => {
    // Dummy authentication - in a real app, this would verify credentials with a backend
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserEmail("");
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <MainApp userEmail={userEmail} onLogout={handleLogout} />;
}
