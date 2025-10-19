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

interface GeoapifyPlace {
  type: string;
  properties: {
    name?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    lat: number;
    lon: number;
    place_id: string;
    categories?: string[];
    datasource?: {
      sourcename: string;
      attribution: string;
      license: string;
    };
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
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

  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  console.log('Geoapify API Key loaded:', !!apiKey, apiKey ? 'Present' : 'Missing');

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
    console.log('Fetching locations for:', lat, lon);
    console.log('API Key:', apiKey);

    try {
      // Search for recycling locations with various naming patterns
      const searchTerms = [
        'recycling center',
        'recycling',
        'recycling depository',
        'neighborhood recycling',
        'municipal recycling',
        'waste recycling',
        'recycling facility',
        'recycling drop off',
        'recycling collection',
      ];

      let allResults: GeoapifyPlace[] = [];

      for (const term of searchTerms) {
        try {
          // Use the same format as the working example
          const encodedText = encodeURIComponent(term);
          // Try with smaller radius and different parameters for better proximity
          const url = `https://api.geoapify.com/v1/geocode/search?text=${encodedText}&filter=circle:${lon},${lat},5000&limit=10&apiKey=${apiKey}`;
          console.log('Fetching URL:', url);

          const response = await fetch(url);
          console.log('Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('Response data for', term, ':', data);
            if (data.features) {
              // Convert geocoding results to our format
              const formattedResults = data.features.map((feature: any) => ({
                type: "Feature",
                properties: {
                  name: feature.properties.name || term,
                  address_line1: feature.properties.address_line1 || feature.properties.formatted,
                  city: feature.properties.city,
                  state: feature.properties.state,
                  lat: feature.properties.lat,
                  lon: feature.properties.lon,
                  place_id: feature.properties.place_id || `geocode_${Math.random()}`,
                },
                geometry: feature.geometry
              }));
              allResults = allResults.concat(formattedResults);
            }
          } else {
            console.error('API Error for', term, ':', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
          }
        } catch (err) {
          console.warn(`Search failed for "${term}":`, err);
        }
      }

      // Try Places API with circle filter for better proximity results
      try {
        const placesUrl = `https://api.geoapify.com/v2/places?categories=commercial.waste_management.recycling,commercial.waste_management.waste_collection,commercial.waste_management&filter=circle:${lon},${lat},8000&limit=20&apiKey=${apiKey}`;
        console.log('Trying Places API:', placesUrl);

        const placesResponse = await fetch(placesUrl);
        if (placesResponse.ok) {
          const placesData = await placesResponse.json();
          console.log('Places API results:', placesData);
          if (placesData.features && placesData.features.length > 0) {
            // Convert places results to our format
            const placesResults = placesData.features.map((feature: any) => ({
              type: "Feature",
              properties: {
                name: feature.properties.name || "Recycling Center",
                address_line1: feature.properties.address_line1 || feature.properties.formatted,
                city: feature.properties.city,
                state: feature.properties.state,
                lat: feature.properties.lat,
                lon: feature.properties.lon,
                place_id: feature.properties.place_id || `places_${Math.random()}`,
              },
              geometry: feature.geometry
            }));
            allResults = allResults.concat(placesResults);
          }
        }
      } catch (err) {
        console.warn('Places API failed:', err);
      }

      console.log('All results:', allResults);

      // Remove duplicates based on coordinates (within 100 meters)
      const uniqueResults = allResults.filter((place, index, self) => {
        return index === self.findIndex(p => {
          const distance = calculateDistance(
            place.properties.lat, place.properties.lon,
            p.properties.lat, p.properties.lon
          );
          return distance < 0.1; // Less than 100 meters apart
        });
      });

      console.log('Unique results:', uniqueResults);

      // Filter for recycling facilities - prioritize "recycle" or "recycling" in the title
      const filteredResults = uniqueResults.filter((place) => {
        const name = (place.properties.name || '').toLowerCase();
        const address = (place.properties.address_line1 || '').toLowerCase();

        // PRIORITY: Must have "recycle" or "recycling" anywhere in the name/title
        const hasRecycleInName = name.includes('recycle') || name.includes('recycling');
        
        // Also accept if it has these recycling-related terms in the name
        const recyclingTermsInName = ['depository', 'waste management', 'waste', 'waste center', 
                                       'drop off', 'drop-off', 'transfer station', 'disposal'];
        const hasRecyclingTermInName = recyclingTermsInName.some(term => name.includes(term));

        // Exclude obvious false positives (but only if they don't have "recycle" in name)
        const excludePatterns = [
          'toyota', 'honda', 'ford', 'depot', 'chevrolet', 'bmw', 'mercedes', // car dealerships
          'police station', 'fire station', 'train station', 'bus station', // government buildings
          'shopping', 'mall', 'plaza', // commercial centers
          'medical', 'hospital', 'clinic', // healthcare
          'school', 'university', 'college', 'academy', // education
          'restaurant', 'cafe', 'bar', 'pub', // food service
          'hotel', 'motel', 'inn', // lodging
          'gym', 'fitness', 'sports', // fitness
        ];

        const shouldExclude = !hasRecycleInName && excludePatterns.some(pattern =>
          name.includes(pattern) || address.includes(pattern)
        );

        // Accept if:
        // 1. Has "recycle/recycling" in the name (highest priority)
        // 2. OR has other recycling-related terms in name AND not excluded
        return (hasRecycleInName || (hasRecyclingTermInName && !shouldExclude));
      });

      console.log('Filtered results:', filteredResults);

      const mappedLocations: RecyclingLocation[] = filteredResults.map((place) => {
        const distance = calculateDistance(lat, lon, place.properties.lat, place.properties.lon);
        const address = [
          place.properties.address_line1,
          place.properties.address_line2,
          place.properties.city,
          place.properties.state,
          place.properties.postcode
        ].filter(Boolean).join(', ');

        return {
          id: place.properties.place_id,
          name: place.properties.name || "Recycling Center",
          address: address || place.properties.address_line1 || "Address not available",
          distance: `${distance.toFixed(1)} mi`,
          hours: "Hours not available",
          phone: "N/A",
          acceptedMaterials: ["Plastic", "Glass", "Metal", "Cardboard"],
          type: "center",
          lat: place.properties.lat,
          lon: place.properties.lon,
          distanceValue: distance,
        };
      });

      // Sort by distance (closest first)
      console.log('Before sorting:', mappedLocations.map(loc => ({ name: loc.name, distance: loc.distanceValue })));
      mappedLocations.sort((a, b) => a.distanceValue - b.distanceValue);
      console.log('After sorting:', mappedLocations.map(loc => ({ name: loc.name, distance: loc.distanceValue })));

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
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`}
                  attribution='Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors'
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
