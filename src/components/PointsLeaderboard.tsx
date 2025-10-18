import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy, TrendingUp, Award, Medal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  itemsRecycled: number;
  initials: string;
}

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

const weeklyProgressData = [
  { day: "Mon", points: 45 },
  { day: "Tue", points: 80 },
  { day: "Wed", points: 65 },
  { day: "Thu", points: 95 },
  { day: "Fri", points: 110 },
  { day: "Sat", points: 125 },
  { day: "Sun", points: 90 },
];

export function PointsLeaderboard() {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-500">#{rank}</span>;
  };

  const userStats = leaderboardData.find((u) => u.name === "You");

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
            <LineChart data={weeklyProgressData}>
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
              Total this week: <span className="text-green-600">610 points</span>
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
                  user.name === "You"
                    ? "bg-green-50 border-2 border-green-600"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="w-8 flex items-center justify-center">
                  {getRankBadge(user.rank)}
                </div>
                <Avatar className={user.name === "You" ? "border-2 border-green-600" : ""}>
                  <AvatarFallback className={user.name === "You" ? "bg-green-600 text-white" : ""}>
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className={user.name === "You" ? "text-green-900" : ""}>
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.itemsRecycled} items recycled</p>
                </div>
                <div className="text-right">
                  <p className={user.name === "You" ? "text-green-700" : "text-gray-700"}>
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
    </div>
  );
}
