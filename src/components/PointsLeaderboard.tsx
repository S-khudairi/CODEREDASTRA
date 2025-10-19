import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy, TrendingUp, Award, Medal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, useRef } from "react"; // hooks
import { getUserWeeklyPoints } from "../firebase/db";
import { collection, query, orderBy, limit, getDocs, getDoc, doc, where } from "firebase/firestore";    // firestore import
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

const weeklyProgressFallback = [
  { day: "Mon", points: 45 },
  { day: "Tue", points: 80 },
  { day: "Wed", points: 65 },
  { day: "Thu", points: 95 },
  { day: "Fri", points: 110 },
  { day: "Sat", points: 125 },
  { day: "Sun", points: 90 },
];

// helper: format YYYY-MM-DD
const toDateId = (d: Date) => d.toISOString().slice(0, 10);

// generate last N days date strings (oldest -> newest)
const lastNDates = (n: number, endDate = new Date()) => {
  const arr: string[] = [];
  const e = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(e);
    dt.setUTCDate(e.getUTCDate() - i);
    arr.push(toDateId(dt));
  }
  return arr;
};

const dayLabelFromISO = (isoDate: string) => {
  try {
    const d = new Date(isoDate + 'T00:00:00Z');
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  } catch (e) {
    return isoDate;
  }
};

// NOTE: we intentionally do NOT query the `users` collection from the client anymore.
// Leaderboard data should come from server-created snapshots under leaderboards/monthly/snapshots/{YYYY-MM}.
// The client hook below only loads snapshots and exposes a manual refresh.

// Monthly leaderboard hook: try ordering by pointsThisMonth, fallback to overall points
const useMonthlyLeaderboard = (monthField = 'pointsThisMonth') => {
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyRef = useRef<() => Promise<void> | null>(null);

  // helpers to compute month ids
  const currentMonthId = new Date().toISOString().slice(0,7); // YYYY-MM
  const prevMonthId = (() => {
    const d = new Date();
    d.setUTCDate(1); // to avoid roll issues
    d.setUTCMonth(d.getUTCMonth() - 1);
    return d.toISOString().slice(0,7);
  })();

  useEffect(() => {
    let mounted = true;
    const fetchMonthly = async () => {
      setLoading(true);
      try {
        // 1) try snapshot for current month
        const snapRef = doc(db, 'leaderboards', 'monthly', 'snapshots', currentMonthId);
        let docSnap = await getDoc(snapRef);

        // 2) if no snapshot for current month, try previous month
        if (!docSnap.exists()) {
          const prevRef = doc(db, 'leaderboards', 'monthly', 'snapshots', prevMonthId);
          docSnap = await getDoc(prevRef);
        }

        if (docSnap.exists()) {
          const top = docSnap.data()?.top || [];
          // map top array to LeaderboardUser shape
          const mapped: LeaderboardUser[] = (top as any[]).map((t, idx) => ({
            uid: t.uid,
            rank: t.rank || idx + 1,
            name: t.name || 'Anonymous',
            // snapshot script writes pointsGained and pointsEnd; prefer pointsGained for leaderboard value
            points: t.pointsGained ?? t.points ?? 0,
            itemsRecycled: t.itemsRecycled || 0,
            initials: t.initials || (t.name || 'A').split(' ').map((n:string)=>n[0]).join('').toUpperCase().substring(0,2)
          }));
          if (mounted) setData(mapped);
        } else {
          // 3) fallback: compute monthly top-10 client-side by summing users' dailyPoints for the current month
          const allUsersSnap = await getDocs(collection(db, 'users'));
          const candidates: LeaderboardUser[] = [];

          // compute month range strings
          const currentMonthIdLocal = new Date().toISOString().slice(0,7);
          const [y, m] = currentMonthIdLocal.split('-').map(Number);
          const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0,10);
          const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0,10);

          for (const udoc of allUsersSnap.docs) {
            const u = udoc.data();
            // skip obvious zeros to save reads
            if (!u.points && !u.itemsRecycled) continue;

            // fetch dailyPoints within month
            const dpCol = collection(db, 'users', udoc.id, 'dailyPoints');
            const dpQ = query(dpCol, where('date', '>=', start), where('date', '<=', end));
            const dpSnap = await getDocs(dpQ);
            let gained = 0;
            let items = 0;
            if (!dpSnap.empty) {
              const docs = dpSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
              docs.sort((a,b) => a.id.localeCompare(b.id));
              const firstPoints = Number(docs[0].points || 0);
              const lastPoints = Number(docs[docs.length-1].points || 0);
              gained = lastPoints - firstPoints;
              items = docs.reduce((s, it) => s + (Number(it.itemsRecycled||0)), 0);
            } else {
              // no daily docs this month; skip
              continue;
            }

            const name = udoc.data().name || 'Anonymous';
            const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0,2);
            candidates.push({ uid: udoc.id, rank: 0, name, points: gained, itemsRecycled: items, initials });
          }

          // sort and pick top 10
          candidates.sort((a,b) => b.points - a.points);
          const top = candidates.slice(0,10).map((c, i) => ({ ...c, rank: i+1 }));
          if (mounted) setData(top);
        }
      } catch (err) {
        console.error('Failed to fetch monthly leaderboard', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // store reference so UI can trigger a manual refresh
    fetchMonthlyRef.current = fetchMonthly;
    // call once on mount
    fetchMonthlyRef.current();

    return () => { mounted = false; };
  }, [monthField]);

  const refresh = async () => {
    if (fetchMonthlyRef.current) await fetchMonthlyRef.current();
  };

  return { data, loading, refresh };
};

export function PointsLeaderboard({ currentUserId } : PointsLeaderboardProps) {
  
  const { data: monthlyLeaderboard, loading: monthlyLoading, refresh: refreshMonthly } = useMonthlyLeaderboard();

  const [weeklyData, setWeeklyData] = useState(weeklyProgressFallback);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [debugDocs, setDebugDocs] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUserId) return;
      console.debug('PointsLeaderboard: loading weekly points for', currentUserId);
      setWeeklyLoading(true);
      try {
        const days = 7;
        const docs = await getUserWeeklyPoints(currentUserId, days);
        console.debug('PointsLeaderboard: fetched weekly docs', docs);

        // docs is oldest -> newest and may include one extra previous day for delta computation
        // Build a map from date->cumulative points and a sorted list of available dates
        const cumulative = new Map<string, number>();
        for (const d of docs) {
          const dateStr = d.date || (d.id as string) || String(d.date);
          cumulative.set(dateStr, Number(d.points || 0));
        }

        const availableDates = Array.from(cumulative.keys()).sort(); // ascending

        // Helper: find last available date <= target (binary search simple)
        const lastOnOrBefore = (target: string) => {
          // availableDates are in YYYY-MM-DD so lexicographic compare works
          for (let i = availableDates.length - 1; i >= 0; i--) {
            if (availableDates[i] <= target) return availableDates[i];
          }
          return null;
        };

        // Helper: find last available date < target
        const lastBefore = (target: string) => {
          for (let i = availableDates.length - 1; i >= 0; i--) {
            if (availableDates[i] < target) return availableDates[i];
          }
          return null;
        };

        // Prepare the last N dates we want to display (oldest -> newest)
        const dates = lastNDates(days);

        // For each display date, compute daily gain = cumulative[lastOnOrBefore(date)] - cumulative[lastBefore(lastOnOrBefore(date))]
        const chartData = dates.map((dateStr) => {
          const lastForDay = lastOnOrBefore(dateStr);
          if (!lastForDay) {
            return { day: dayLabelFromISO(dateStr), points: 0 };
          }
          const prevForDay = lastBefore(lastForDay);
          const todayCum = cumulative.get(lastForDay) ?? 0;
          if (!prevForDay) {
            // No snapshot before this day — prefer showing 0 gain rather than the full cumulative value
            return { day: dayLabelFromISO(dateStr), points: 0 };
          }
          const prevCum = cumulative.get(prevForDay) ?? 0;
          const gain = todayCum - prevCum;
          return { day: dayLabelFromISO(dateStr), points: gain >= 0 ? gain : 0 };
        });

        if (mounted) setWeeklyData(chartData.length ? chartData : weeklyProgressFallback);
        if (mounted) setDebugDocs(docs);
      } catch (err) {
        console.error('Failed to load weekly points', err);
        if (mounted) setWeeklyData(weeklyProgressFallback);
      } finally {
        if (mounted) setWeeklyLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [currentUserId]);

  // Prefer monthly leaderboard for user stats (as leaderboard shows month top 10), fallback to overall
  const userStats = (monthlyLeaderboard.find((user: LeaderboardUser) => user.uid === currentUserId)) || { 
        rank: 0, 
        points: 0, 
        itemsRecycled: 0, 
        initials: "Me", 
        name: "You" 
    };  
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-500">#{rank}</span>;
  };

  if (monthlyLoading) {
    return <Card className="p-10 text-center text-gray-500">Loading Leaderboard...</Card>;
  }

  const showEmptyState = !(monthlyLeaderboard && monthlyLeaderboard.length > 0);

  const displayLeaderboard = (monthlyLeaderboard && monthlyLeaderboard.length > 0) ? monthlyLeaderboard : [];
  const displayLoading = monthlyLoading;

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
              {weeklyLoading ? (
                'Loading weekly summary...'
              ) : (
                <>Total this week: <span className="text-green-600">{weeklyData.reduce((s, it) => s + (it.points || 0), 0)} points</span></>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/*
      <div className="text-right">
        <Button size="sm" variant="ghost" onClick={() => {
          if (debugDocs) {
            // Print nicely to the browser console for inspection
            console.group('raw dailyPoints');
            console.table(debugDocs.map(d => ({ id: d.id || d.date, date: d.date, points: d.points, itemsRecycled: d.itemsRecycled })));
            console.log(debugDocs);
            console.groupEnd();
          } else {
            console.log('No dailyPoints documents fetched yet');
          }
        }}>
          Log raw dailyPoints
        </Button>
      </div>
      */}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600" />
                  Top 10 Recyclers
                </CardTitle>
                <CardDescription>Community leaderboard for this month</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={async () => { await refreshMonthly(); }}>
                  {monthlyLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>
        <CardContent>
            <div className="space-y-2">
            {displayLeaderboard.map((user: LeaderboardUser) => (
              <div
                key={user.uid}
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

      {/* Achievements card removed for now........ */}
    </div>
  );
}
