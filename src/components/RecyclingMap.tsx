import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MapPin, Navigation, Clock, Phone, ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RecyclingLocation {
  id: string;
  name: string;
  address: string;
  distance: string;
  hours: string;
  phone: string;
  acceptedMaterials: string[];
  type: "center" | "dropoff" | "curbside";
  lat: number;
  lon: number;
  distanceValue: number; // For sorting
}

interface LocationIQPlace {
  place_id: string;
  osm_id?: string;
  lat: string;
  lon: string;
  display_name: string;
  // Search API specific fields
  type?: string;
  importance?: number;
  // Other possible fields
  [key: string]: any;
}

export function RecyclingMap() {
  const [locations, setLocations] = useState<RecyclingLocation[]>(() => {
    const saved = sessionStorage.getItem('recyclingLocations');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLocation, setSelectedLocation] = useState<RecyclingLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(() => {
    const saved = sessionStorage.getItem('userLocation');
    return saved ? JSON.parse(saved) : null;
  });

  const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lon: longitude };
        setUserLocation(location);
        sessionStorage.setItem('userLocation', JSON.stringify(location));
        fetchNearbyLocations(latitude, longitude);
      },
      (err) => {
        setLoading(false);
        setError("Unable to retrieve your location. Please check your browser settings.");
        console.error(err);
      }
    );
  };

  const fetchNearbyLocations = async (lat: number, lon: number) => {
    try {
      // Try multiple search approaches
      const queries = [
        'recycling center',
        'recycle center',
        'waste management',
        'transfer station'
      ];

      let allResults: LocationIQPlace[] = [];

      for (const query of queries) {
        try {
          const response = await fetch(
            `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}&limit=10&format=json&bounded=1&viewbox=${lon-0.5},${lat-0.5},${lon+0.5},${lat+0.5}`
          );

          if (response.ok) {
            const data: LocationIQPlace[] = await response.json();
            allResults = allResults.concat(data);
          }
        } catch (err) {
          console.warn(`Search failed for "${query}":`, err);
        }
      }

      // Remove duplicates based on place_id
      const uniqueResults = allResults.filter((place, index, self) =>
        index === self.findIndex(p => p.place_id === place.place_id)
      );

      console.log('LocationIQ Search Results:', uniqueResults); // Debug log

      const mappedLocations: RecyclingLocation[] = uniqueResults.map((place) => {
        const distance = calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon));
        return {
          id: place.place_id,
          name: place.display_name.split(',')[0] || "Recycling Center",
          address: place.display_name,
          distance: `${distance.toFixed(1)} mi`,
          hours: "Hours not available",
          phone: "N/A",
          acceptedMaterials: ["Plastic", "Glass", "Metal", "Cardboard"],
          type: "center",
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon),
          distanceValue: distance,
        };
      });

      // Sort by distance (closest first)
      mappedLocations.sort((a, b) => a.distanceValue - b.distanceValue);

      // Limit to top 20 results
      const limitedResults = mappedLocations.slice(0, 20);

      setLocations(limitedResults);
      sessionStorage.setItem('recyclingLocations', JSON.stringify(limitedResults));
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError("Failed to fetch recycling locations. Please try again.");
      console.error(err);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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
          {userLocation ? (
            <div className="h-64 mb-4 rounded-lg overflow-hidden">
              <MapContainer
                center={[userLocation.lat, userLocation.lon]}
                zoom={10  }
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {locations.map((location) => (
                  <Marker
                    key={location.id}
                    position={[location.lat, location.lon]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <h3 className="font-semibold">{location.name}</h3>
                        <p>{location.address}</p>
                        <p className="text-green-600">{location.distance}</p>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`, '_blank')}
                        >
                          Get Directions
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center mb-4 relative overflow-hidden">
              {/* Mock map placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100"></div>
              <div className="relative z-10 text-center">
                <MapPin className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-gray-600">Map View</p>
                <p className="text-sm text-gray-500">
                  Click 'Use My Location' to find nearby recycling centers
                </p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full mb-4 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding locations...
              </>
            ) : userLocation ? (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Refresh Locations
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Use My Location
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {locations.map((location) => (
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
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`, '_blank');
                    }}
                  >
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

        {!loading && locations.length === 0 && userLocation && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-2">No recycling locations found in your area.</p>
              <p className="text-sm text-gray-500">Try searching in a different location or check local government websites for recycling centers.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
