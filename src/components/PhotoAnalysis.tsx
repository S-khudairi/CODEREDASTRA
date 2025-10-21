import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Camera, Upload, Loader2, CheckCircle, XCircle, Recycle, History, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../firebase/firestoreConfig";
import { doc, updateDoc, increment } from "firebase/firestore";
import toast from "react-hot-toast";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface AnalysisResult {
  material: string;
  recyclable: boolean;
  confidence: number;
  instructions?: string;
}

interface ScanHistoryItem {
  id: string;
  material: string;
  recyclable: boolean;
  timestamp: Date;
  imageUrl: string;
}

interface PhotoAnalysisProps {
  currentUserId: string;
}

export function PhotoAnalysis({ currentUserId }: PhotoAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Mock scan history data for demo
  const [scanHistory] = useState<ScanHistoryItem[]>([
    {
      id: '1',
      material: 'Plastic Water Bottle',
      recyclable: true,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200&h=200&fit=crop'
    },
    {
      id: '2',
      material: 'Aluminum Soda Can',
      recyclable: true,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop'
    },
    {
      id: '3',
      material: 'Pizza Box (Greasy)',
      recyclable: false,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop'
    },
    {
      id: '4',
      material: 'Glass Jar',
      recyclable: true,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=200&h=200&fit=crop'
    },
    {
      id: '5',
      material: 'Cardboard Box',
      recyclable: true,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      imageUrl: 'https://images.unsplash.com/photo-1573883430060-e46dcafd8c3d?w=200&h=200&fit=crop'
    },
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(scanHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = scanHistory.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const updateUserPoints = async (userId: string, recyclable: boolean) => {
    try {
      const pointsToAdd = recyclable ? 10 : 5;
      const userRef = doc(db, "users", userId);
      
      // Only increment itemsRecycled if the item is actually recyclable
      const updateData: any = {
        points: increment(pointsToAdd),
      };
      
      if (recyclable) {
        updateData.itemsRecycled = increment(1);
      }
      
      await updateDoc(userRef, updateData);
      console.log(`Added ${pointsToAdd} points for user ${userId}${recyclable ? ' and incremented items recycled' : ''}`);
    } catch (error) {
      console.error("Error updating user points:", error);
    }
  };

  const analyzeWithGemini = async (file: File) => {
    setIsAnalyzing(true);
    setPreviewImage(URL.createObjectURL(file));

    try {
      // Convert image to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        You are EcoScan, an AI recycling expert.

        Analyze the uploaded image and identify the **main object**.

        Then, determine:
        1. What the object is.
        2. Whether it is recyclable (true or false).
        3. Explain briefly *why* it is or isn't recyclable.
        4. If recyclable, give clear recycling instructions (how to prepare or dispose of it properly).
        5. If not recyclable, suggest an eco-friendly alternative or disposal method.

        Respond ONLY in the following strict JSON format:
        {
          "object": "string - name of the main object",
          "recyclable": true or false,
          "reason": "string - short explanation",
          "instructions": "string - how to recycle or dispose of it properly"
        }
        `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image.split(",")[1], // remove data URI prefix
          },
        },
      ]);

      const text = await result.response.text();
      console.log("Gemini raw response:", text);

      // Try to parse JSON safely
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;

      if (!parsed) throw new Error("Invalid Gemini response format");

      setResult({
        material: parsed.object,
        recyclable: parsed.recyclable,
        confidence: 100, 
        instructions: parsed.instructions || parsed.reason,
      });
      if (currentUserId) {
        await updateUserPoints(currentUserId, parsed.recyclable);
      }

      if (parsed.recyclable) {
        toast.success(`♻️ Scanned item is recyclable! You earned 10 points!`);
      } else {
        toast(`🧠 Scanned item is not recyclable — but you learned something! You earned 5 points.`, {
          icon: "✨",
          style: {
            background: "#2d2d2d",
            color: "#fff",
          },
        });
      }
    } catch (err) {
      console.error("Gemini Analysis Error:", err);
      alert("Image analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mock analysis function
  const analyzeImage = analyzeWithGemini;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeImage(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Camera access denied or not available');
    }
  };

  // Set video stream when camera opens
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        analyzeImage(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const resetAnalysis = () => {
    setResult(null);
    setPreviewImage(null);
    setIsAnalyzing(false);
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Recycle className="h-5 w-5 text-green-600" />
            Material Analysis
          </CardTitle>
          <CardDescription>
            Take or upload a photo to identify if the material is recyclable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && !isAnalyzing && (
            <div className="space-y-4">
              {!showCamera && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={startCamera}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                  <label className="flex-1">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Camera Popup Box */}
              {showCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Take a Photo</h3>
                      <Button
                        onClick={stopCamera}
                        variant="ghost"
                        size="sm"
                      >
                        ✕
                      </Button>
                    </div>
                    
                    {/* Live Camera Feed */}
                    <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            videoRef.current.play().catch(console.error);
                          }
                        }}
                      />
                    </div>

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Capture Button */}
                    <Button
                      onClick={capturePhoto}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capture Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
              <p className="text-gray-600">Analyzing material...</p>
            </div>
          )}

          {result && previewImage && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={previewImage}
                  alt="Analyzed item"
                  className="w-full h-64 object-cover"
                />
              </div>

              <Alert
                className={`${
                  result.recyclable
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                } p-4 block`}
              >
                <div className="flex items-start gap-3">
                  {result.recyclable ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <p className={result.recyclable ? "text-green-900" : "text-red-900"}>
                        {result.material}
                      </p>
                      <Badge variant={result.recyclable ? "default" : "destructive"} className="ml-auto">
                        {result.recyclable ? "Recyclable" : "Not Recyclable"}
                      </Badge>
                    </div>
                    <AlertDescription className={`${result.recyclable ? "text-green-800" : "text-red-800"} w-full break-words`}>
                      {result.instructions}
                    </AlertDescription>
                    <p className="text-xs text-gray-600 mt-2">
                      Confidence: {result.confidence}%
                    </p>
                  </div>
                </div>
              </Alert>

              <Button onClick={resetAnalysis} variant="outline" className="w-full">
                Analyze Another Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-100 to-emerald-100 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-green-600 rounded-full p-2">
              <Recycle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-green-900 mb-1">Earn points with every scan!</p>
              <p className="text-green-700 text-sm">
                Get 10 points for recyclable items and 5 points for learning about non-recyclables.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan History Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-green-600" />
            Scan History
          </CardTitle>
          <CardDescription>
            Your recent material scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No scans yet. Start analyzing items!</p>
              </div>
            ) : (
              <>
                {currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={item.imageUrl}
                        alt={item.material}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {item.material}
                        </p>
                        <Badge
                          variant={item.recyclable ? "default" : "destructive"}
                          className="flex-shrink-0 text-xs h-5"
                        >
                          {item.recyclable ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {item.recyclable ? "Recyclable" : "Not Recyclable"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
