import { Camera, MapPin, Trophy, LogOut } from "lucide-react";
import { PhotoAnalysis } from "./PhotoAnalysis";
import { RecyclingMap } from "./RecyclingMap";
import { PointsLeaderboard } from "./PointsLeaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";

interface MainAppProps {
  userEmail: string;
  onLogout: () => void;
  currentUserId: string;
}

export function MainApp({ userEmail, onLogout, currentUserId }: MainAppProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      <div className="max-w-4xl mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-green-700 mb-2">EcoScan</h1>
            <p className="text-gray-600">Recycle smarter, earn rewards</p>
          </div>
          <Button
            variant="outline"
            onClick={onLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="scan" className="w-full">
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
        </Tabs>
      </div>
    </div>
  );
}
