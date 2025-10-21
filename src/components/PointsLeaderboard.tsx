import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy, TrendingUp, Award, Medal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react"; // hooks
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where, Timestamp } from "firebase/firestore";    // firestore import
import { db } from "../firebase/firestoreConfig";     // db

interface LeaderboardUser {
  rank: number;
  name: string;
  uid: string;
  points: number;
  itemsRecycled: number;
  initials: string;
}

interface PointsLeaderboardProps {
  currentUserId: string; // The id of the currently logged-in user
}

interface WeeklyData {
  day: string;
  points: number;
}

const useWeeklyProgress = (userId: string) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([
    { day: "Mon", points: 0 },
    { day: "Tue", points: 0 },
    { day: "Wed", points: 0 },
    { day: "Thu", points: 0 },
    { day: "Fri", points: 0 },
    { day: "Sat", points: 0 },
    { day: "Sun", points: 0 },
  ]);
  const [totalWeekPoints, setTotalWeekPoints] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchWeeklyScans = async () => {
      try {
        // Get the start of the current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday = 0
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysFromMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        console.log("Fetching scans from:", startOfWeek);

        // Query scans from this week
        const scansRef = collection(db, "users", userId, "scans");
        const weekQuery = query(
          scansRef,
          where("createdAt", ">=", Timestamp.fromDate(startOfWeek))
        );

        const querySnapshot = await getDocs(weekQuery);
        console.log("Weekly scans found:", querySnapshot.size);

        // Initialize points array for each day
        const dayPoints = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate();
          const points = data.pointsEarned || 0;

          if (createdAt) {
            const scanDay = createdAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const dayIndex = scanDay === 0 ? 6 : scanDay - 1; // Convert to Mon=0, Sun=6
            dayPoints[dayIndex] += points;
            console.log(`Scan on ${createdAt.toDateString()}: ${points} points (day index: ${dayIndex})`);
          }
        });

        // Update the weekly data
        const updatedWeeklyData: WeeklyData[] = [
          { day: "Mon", points: dayPoints[0] },
          { day: "Tue", points: dayPoints[1] },
          { day: "Wed", points: dayPoints[2] },
          { day: "Thu", points: dayPoints[3] },
          { day: "Fri", points: dayPoints[4] },
          { day: "Sat", points: dayPoints[5] },
          { day: "Sun", points: dayPoints[6] },
        ];

        const total = dayPoints.reduce((sum, p) => sum + p, 0);
        
        setWeeklyData(updatedWeeklyData);
        setTotalWeekPoints(total);
        console.log("Weekly data updated:", updatedWeeklyData, "Total:", total);
      } catch (error) {
        console.error("Error fetching weekly progress:", error);
      }
    };

    fetchWeeklyScans();
    
    // Refresh every 10 seconds to catch new scans
    const interval = setInterval(fetchWeeklyScans, 10000);
    
    return () => clearInterval(interval);
  }, [userId]);

  return { weeklyData, totalWeekPoints };
};

/*
const leaderboardData: LeaderboardUser[] = [
  { rank: 1, name: "Sarah Chen", points: 2847, itemsRecycled: 234, initials: "SC" },
  { rank: 2, name: "Mike Johnson", points: 2654, itemsRecycled: 219, initials: "MJ" },
  { rank: 3, name: "Emma Wilson", points: 2431, itemsRecycled: 201, initials: "EW" },
  { rank: 4, name: "You", points: 2156, itemsRecycled: 178, initials: "YO" },
  { rank: 5, name: "David Lee", points: 2089, itemsRecycled: 172, initials: "DL" },
  { rank: 6, name: "Lisa Anderson", points: 1923, itemsRecycled: 159, initials: "LA" },
  { rank: 7, name: "James Brown", points: 1876, itemsRecycled: 155, initials: "JB" },
  { rank: 8, name: "Maria Garcia", points: 1734, itemsRecycled: 143, initials: "MG" },
  { rank: 9, name: "Alex Kim", points: 1689, itemsRecycled: 139, initials: "AK" },
  { rank: 10, name: "Rachel Taylor", points: 1567, itemsRecycled: 129, initials: "RT" },
];
*/

const useLeaderboardData = () => {
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // 1. Define the query
      const q = query(
        collection(db, "users"),
        orderBy("points", "desc"),
        limit(10)
      );

      try {
        const querySnapshot = await getDocs(q);

        console.log("Fetched leaderboard docs:", querySnapshot.size);
        querySnapshot.forEach((d) => console.log("User:", d.id, d.data()));
        
        let rank = 1;
        const fetchedData: LeaderboardUser[] = querySnapshot.docs.map((doc) => {
          const userData = doc.data();
          const name = userData.name || "Anonymous";
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

          return {
            rank: rank++,
            uid: userData.uid || doc.id,
            name: name,
            points: userData.points || 0,
            itemsRecycled: userData.itemsRecycled || 0,
            initials: initials,
          } as LeaderboardUser;
        });

        // 2. Handle the EMPTY database case gracefully
        setData(fetchedData); // This will be [] if the database is empty
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    
    // Refresh leaderboard every 5 seconds to show point updates
    const interval = setInterval(fetchLeaderboard, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading };
};

export function PointsLeaderboard({ currentUserId } : PointsLeaderboardProps) {
  
  const { data: leaderboardData, loading } = useLeaderboardData();
  const { weeklyData, totalWeekPoints } = useWeeklyProgress(currentUserId);
  const [userStats, setUserStats] = useState<LeaderboardUser>({ 
    rank: 0, 
    points: 0, 
    itemsRecycled: 0, 
    initials: "Me", 
    name: "You",
    uid: currentUserId
  });

  // Fetch current user's stats directly and refresh periodically
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUserStats = async () => {
      try {
        const userRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const name = userData.name || "You";
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
          
          // Find rank in leaderboard
          const userInLeaderboard = leaderboardData.find(u => u.uid === currentUserId);
          const rank = userInLeaderboard?.rank || 0;
          
          setUserStats({
            rank,
            uid: currentUserId,
            name,
            points: userData.points || 0,
            itemsRecycled: userData.itemsRecycled || 0,
            initials,
          });
          
          console.log("User stats updated:", {
            points: userData.points,
            itemsRecycled: userData.itemsRecycled,
            rank
          });
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    fetchUserStats();
    
    // Refresh every 3 seconds to show immediate point updates
    const interval = setInterval(fetchUserStats, 3000);
    
    return () => clearInterval(interval);
  }, [currentUserId, leaderboardData]);  
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-500">#{rank}</span>;
  };

  if (loading) {
    return <Card className="p-10 text-center text-gray-500">Loading Leaderboard...</Card>;
  }

  const showEmptyState = leaderboardData.length === 0;

  return (
    <div className="space-y-4">
      {/* User Stats */}
      <Card className="bg-gradient-to-br from-green-600 to-emerald-600 text-white border-none">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm mb-1">Your Rank</p>
              <div className="flex items-center gap-2">
                <p className="text-4xl">#{userStats?.rank}</p>
                <TrendingUp className="h-6 w-6 text-green-200" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm mb-1">Total Points</p>
              <p className="text-4xl">{userStats?.points.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-green-500">
            <div>
              <p className="text-green-100 text-sm">Items Recycled</p>
              <p className="text-xl">{userStats?.itemsRecycled}</p>
            </div>
            <Badge className="bg-white text-green-700 hover:bg-green-50">
              <Award className="h-3 w-3 mr-1" />
              Eco Warrior
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Weekly Progress
          </CardTitle>
          <CardDescription>Your recycling points this week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
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
                strokeWidth={2}
                dot={{ fill: "#16a34a", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Total this week: <span className="text-green-600">{totalWeekPoints} points</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Top 10 Recyclers
          </CardTitle>
          <CardDescription>Community leaderboard for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboardData.map((user) => (
              <div
                key={user.rank}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  user.uid === currentUserId
                    ? "bg-green-50 border-2 border-green-600"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="w-8 flex items-center justify-center">
                  {getRankBadge(user.rank)}
                </div>
                <Avatar className={user.uid === currentUserId ? "border-2 border-green-600" : ""}>
                  <AvatarFallback className={user.name === "You" ? "bg-green-600 text-white" : ""}>
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className={user.uid === currentUserId ? "text-green-900" : ""}>
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.itemsRecycled} items recycled</p>
                </div>
                <div className="text-right">
                  <p className={user.uid === currentUserId ? "text-green-700" : "text-gray-700"}>
                    {user.points.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 rounded-full p-2">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-amber-900 mb-1">Next Achievement</p>
              <p className="text-amber-800 text-sm mb-2">
                Recycle 15 more items to unlock "Century Club" badge!
              </p>
              <div className="bg-white rounded-full h-2 w-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: "73%" }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Share Section */}
<Card className="bg-white border border-green-100 shadow-sm mt-6">
  <CardContent className="pt-8 pb-8 text-center">
    <p className="text-gray-700 mb-5 font-semibold text-lg">
      Proud of your progress? Share your EcoScan achievements!
    </p>

    <button
  onClick={() => {
    const shareText = `I just recycled ${userStats.itemsRecycled} items and earned ${userStats.points} points on EcoScan! 🌱♻️ Join me in making the planet greener!`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      navigator.share({
        title: "EcoScan Leaderboard",
        text: shareText,
        url: shareUrl,
      });
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText + " " + shareUrl
      )}`;
      window.open(twitterUrl, "_blank");
    }
  }}
  className="flex w-full max-w-md mx-auto items-center justify-center gap-3 bg-green-600 hover:bg-green-700 
             text-white font-bold px-10 py-4 rounded-full shadow-lg 
             transition-transform transform hover:scale-105 active:scale-95 whitespace-nowrap
             m-6"
>
  <Trophy className="h-5 w-5 flex-shrink-0" />
  <span className="text-base sm:text-lg tracking-wide">Share Your Rank</span>
</button>


    {/* Social Buttons */}
    <div className="flex justify-center gap-6 mt-6">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `I'm on the EcoScan leaderboard! 🌿♻️ #EcoScan`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-500 hover:text-sky-600 transition-transform hover:scale-110"
      >
        <i className="fa-brands fa-twitter text-3xl"></i>
      </a>

      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          window.location.origin
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 transition-transform hover:scale-110"
      >
        <i className="fa-brands fa-linkedin text-3xl"></i>
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          window.location.origin
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 transition-transform hover:scale-110"
      >
        <i className="fa-brands fa-facebook text-3xl"></i>
      </a>

      {/* Instagram */}
      <a
        onClick={() => {
          const shareText = `I just recycled ${userStats.itemsRecycled} items and earned ${userStats.points} points on EcoScan! 🌱♻️ #EcoScan #Sustainability`;
          navigator.clipboard.writeText(shareText);
          alert("📋 Copied your message! Now paste it into Instagram and share your impact 🌍");
          window.open("https://www.instagram.com/", "_blank");
        }}
        className="cursor-pointer text-pink-500 hover:text-fuchsia-500 transition-transform hover:scale-110"
      >
        <i className="fa-brands fa-instagram text-3xl"></i>
      </a>
    </div>
  </CardContent>
</Card>

    </div>
    

  );
}
