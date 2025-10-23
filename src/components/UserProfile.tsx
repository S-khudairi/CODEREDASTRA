import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  User, 
  Trophy, 
  Award, 
  Calendar, 
  TrendingUp, 
  LogOut,
  Star,
  Target,
  Flame
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firestoreConfig";

interface UserProfileProps {
  userEmail: string;
  currentUserId: string;
  onLogout: () => void;
  userInitials: string;
  userName: string;
  onEditProfile?: () => void;
}

// Mock data - to be replaced with real data later
const mockWeeklyHistory = [
  { week: "Week 1", points: 120 },
  { week: "Week 2", points: 180 },
  { week: "Week 3", points: 240 },
  { week: "Week 4", points: 320 },
  { week: "Week 5", points: 280 },
  { week: "Week 6", points: 390 },
];

const mockRewards = [
  { id: 1, name: "First Scan", icon: "🎯", earned: true, date: "Oct 10, 2025" },
  { id: 2, name: "10 Items", icon: "🌱", earned: true, date: "Oct 15, 2025" },
  { id: 3, name: "Century Club", icon: "💯", earned: true, date: "Oct 18, 2025" },
  { id: 4, name: "Week Warrior", icon: "🔥", earned: true, date: "Oct 20, 2025" },
  { id: 5, name: "Top 10", icon: "🏆", earned: false, date: null },
  { id: 6, name: "Eco Champion", icon: "👑", earned: false, date: null },
];

const mockStats = {
  name: "EcoWarrior",
  initials: "EW",
  totalPoints: 2156,
  itemsRecycled: 178,
  rank: 4,
  weekStreak: 6,
  totalScans: 189,
  recyclingRate: 94,
};

export function UserProfile({ userEmail, currentUserId, onLogout, userInitials, userName, onEditProfile }: UserProfileProps) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [itemsRecycled, setItemsRecycled] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [recyclingRate, setRecyclingRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user stats from Firebase
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUserStats = async () => {
      try {
        // Fetch user document
        const userRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setTotalPoints(userData.points || 0);
          setItemsRecycled(userData.itemsRecycled || 0);
        }

        // Fetch all scans to calculate total scans and recycling rate
        const scansRef = collection(db, "users", currentUserId, "scans");
        const scansSnap = await getDocs(scansRef);
        
        const totalScansCount = scansSnap.size;
        setTotalScans(totalScansCount);

        // Calculate recycling rate
        if (totalScansCount > 0) {
          let recyclableCount = 0;
          scansSnap.forEach((scanDoc) => {
            const scanData = scanDoc.data();
            if (scanData.recyclable === true) {
              recyclableCount++;
            }
          });
          const rate = Math.round((recyclableCount / totalScansCount) * 100);
          setRecyclingRate(rate);
        } else {
          setRecyclingRate(0);
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [currentUserId]);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-green-600 to-emerald-600 text-white border-none">
        <CardContent className="pt-4 pb-8">
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar className="h-24 w-24 border-4 border-white mb-4">
              <AvatarFallback className="bg-white text-green-600 text-3xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mb-1">{userName || mockStats.name}</h2>
            <p className="text-green-100 text-sm">{userEmail}</p>
            <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 mt-3">
              <Star className="h-3 w-3 mr-1" />
              Rank #{mockStats.rank}
            </Badge>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{isLoading ? "..." : totalPoints}</p>
              <p className="text-green-100 text-xs mt-1">Total Points</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{isLoading ? "..." : itemsRecycled}</p>
              <p className="text-green-100 text-xs mt-1">Items Recycled</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{mockStats.weekStreak}</p>
              <p className="text-green-100 text-xs mt-1">Week Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Activity Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-100 rounded-full p-2">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{isLoading ? "..." : totalScans}</p>
                <p className="text-xs text-gray-500">Total Scans</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 rounded-full p-2">
                <Flame className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{isLoading ? "..." : `${recyclingRate}%`}</p>
                <p className="text-xs text-gray-500">Recycling Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Points History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Weekly Points History
          </CardTitle>
          <CardDescription>Your point progression over the past 6 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockWeeklyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ fill: "#16a34a", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800 text-center">
              📈 You've earned <span className="font-bold">{mockWeeklyHistory.reduce((sum, week) => sum + week.points, 0)}</span> points in the last 6 weeks!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rewards & Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600" />
            Rewards & Achievements
          </CardTitle>
          <CardDescription>Your earned badges and upcoming milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border-2 border-amber-200">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-8">
              {mockRewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`flex flex-col items-center transition-all py-2 ${
                    reward.earned ? "" : "opacity-40 grayscale"
                  }`}
                >
                  <div className="text-5xl mb-2 drop-shadow-md">{reward.icon}</div>
                  <p className="text-xs font-semibold text-center text-gray-900">
                    {reward.name}
                  </p>
                  {!reward.earned && (
                    <p className="text-[10px] text-gray-400 mt-1">Locked</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onEditProfile}
          >
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button 
            variant="destructive" 
            className="w-full justify-center"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
