import { Camera, MapPin, Trophy, LogOut } from "lucide-react";
import { PhotoAnalysis } from "./PhotoAnalysis";
import { RecyclingMap } from "./RecyclingMap";
import { PointsLeaderboard } from "./PointsLeaderboard";
import { UserProfile } from "./UserProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firestoreConfig";

import logoUrl from "../assets/ecoscan_icon_alt3_500px.svg";


interface MainAppProps {
  userEmail: string;
  onLogout: () => void;
  currentUserId: string;
}

// Comment out the old logout button for later use
/*
const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <Button
    variant="outline"
    onClick={onLogout}
    className="gap-2"
  >
    <LogOut className="h-4 w-4" />
    Logout
  </Button>
);
*/

export function MainApp({ userEmail, onLogout, currentUserId }: MainAppProps) {
  const [activeTab, setActiveTab] = useState("scan");
  const [userInitials, setUserInitials] = useState("??");
  const [userName, setUserName] = useState("");
  
  // Fetch user data from Firebase
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const name = userData.name || userEmail || "User";
          setUserName(name);
          
          // Generate initials from name
          const initials = name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
          
          setUserInitials(initials);
        } else {
          // Fallback to email-based initials
          const emailInitials = userEmail
            .split('@')[0]
            .substring(0, 2)
            .toUpperCase();
          setUserInitials(emailInitials);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to email-based initials
        const emailInitials = userEmail
          .split('@')[0]
          .substring(0, 2)
          .toUpperCase();
        setUserInitials(emailInitials);
      }
    };

    fetchUserData();
  }, [currentUserId, userEmail]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      <div className="max-w-4xl mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="EcoScan logo" className="w-auto flex-shrink-0 object-contain" style={{ height: '5rem' }} />
            <div className="flex flex-col justify-center">
              <h1 className="text-green-700 mb-2">EcoScan</h1>
              <p className="text-gray-600">Recycle smarter, gain <span className="font-semibold text-green-600">eco clout</span></p>
            </div>
          </div>
          
          {/* Circular Avatar Profile Button */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`rounded-full transition-all ${
              activeTab === "profile" 
                ? "ring-2 ring-white ring-offset-2" 
                : "hover:ring-2 hover:ring-green-300 hover:ring-offset-2"
            }`}
          >
            <Avatar className="h-12 w-12 cursor-pointer border-2 border-green-600">
              <AvatarFallback className="bg-green-600 text-white font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <PhotoAnalysis currentUserId={currentUserId} />
          </TabsContent>

          <TabsContent value="locations">
            <RecyclingMap />
          </TabsContent>

          <TabsContent value="leaderboard">
            <PointsLeaderboard currentUserId={currentUserId}/>
          </TabsContent>
          
          <TabsContent value="profile">
            <UserProfile 
              userEmail={userEmail}
              currentUserId={currentUserId}
              onLogout={onLogout}
              userInitials={userInitials}
              userName={userName}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
