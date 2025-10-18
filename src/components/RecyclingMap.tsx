import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MapPin, Navigation, Clock, Phone, ExternalLink } from "lucide-react";

interface RecyclingLocation {
  id: number;
  name: string;
  address: string;
  distance: string;
  hours: string;
  phone: string;
  acceptedMaterials: string[];
  type: "center" | "dropoff" | "curbside";
}

const mockLocations: RecyclingLocation[] = [
  {
    id: 1,
    name: "Green Valley Recycling Center",
    address: "123 Eco Lane, Green Valley, CA 94043",
    distance: "0.8 mi",
    hours: "Mon-Sat: 8AM-6PM",
    phone: "(555) 123-4567",
    acceptedMaterials: ["Plastic", "Glass", "Metal", "Cardboard", "Electronics"],
    type: "center",
  },
  {
    id: 2,
    name: "Community Drop-off Point",
    address: "456 Main Street, Green Valley, CA 94043",
    distance: "1.2 mi",
    hours: "24/7",
    phone: "N/A",
    acceptedMaterials: ["Plastic", "Glass", "Metal", "Cardboard"],
    type: "dropoff",
  },
  {
    id: 3,
    name: "EcoHub Recycling Facility",
    address: "789 Sustainability Blvd, Green Valley, CA 94044",
    distance: "2.5 mi",
    hours: "Mon-Fri: 9AM-5PM",
    phone: "(555) 987-6543",
    acceptedMaterials: ["Plastic", "Glass", "Metal", "Cardboard", "Electronics", "Batteries", "Textiles"],
    type: "center",
  },
  {
    id: 4,
    name: "Park & Recycle Station",
    address: "321 Oak Park Dr, Green Valley, CA 94043",
    distance: "3.1 mi",
    hours: "Daily: 6AM-10PM",
    phone: "N/A",
    acceptedMaterials: ["Plastic", "Glass", "Cardboard"],
    type: "dropoff",
  },
];

export function RecyclingMap() {
  const [selectedLocation, setSelectedLocation] = useState<RecyclingLocation | null>(null);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "center":
        return "bg-green-600";
      case "dropoff":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "center":
        return "Recycling Center";
      case "dropoff":
        return "Drop-off Point";
      default:
        return "Curbside";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Nearby Recycling Locations
          </CardTitle>
          <CardDescription>
            Find recycling centers and drop-off points near you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center mb-4 relative overflow-hidden">
            {/* Mock map placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100"></div>
            <div className="relative z-10 text-center">
              <MapPin className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-gray-600">Map View</p>
              <p className="text-sm text-gray-500">Showing {mockLocations.length} locations nearby</p>
            </div>
            {/* Mock location pins */}
            <div className="absolute top-1/4 left-1/3 w-8 h-8 bg-green-600 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
            <div className="absolute top-1/2 right-1/3 w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg"></div>
            <div className="absolute bottom-1/4 left-1/2 w-8 h-8 bg-green-600 rounded-full border-4 border-white shadow-lg"></div>
          </div>

          <Button className="w-full mb-4 bg-green-600 hover:bg-green-700">
            <Navigation className="mr-2 h-4 w-4" />
            Use My Location
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {mockLocations.map((location) => (
          <Card
            key={location.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedLocation?.id === location.id ? "ring-2 ring-green-600" : ""
            }`}
            onClick={() => setSelectedLocation(location)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="mb-1">{location.name}</h3>
                  <Badge className={`${getTypeColor(location.type)} mb-2`}>
                    {getTypeLabel(location.type)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-green-600">{location.distance}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{location.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{location.hours}</span>
                </div>
                {location.phone !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{location.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Accepted Materials:</p>
                <div className="flex flex-wrap gap-1">
                  {location.acceptedMaterials.map((material) => (
                    <Badge key={material} variant="outline" className="text-xs">
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedLocation?.id === location.id && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                    <Navigation className="mr-2 h-3 w-3" />
                    Get Directions
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    More Info
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
