import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Camera, Upload, Loader2, CheckCircle, XCircle, Recycle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../firebase/firestoreConfig";
import { doc, updateDoc, increment } from "firebase/firestore";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface AnalysisResult {
  material: string;
  recyclable: boolean;
  confidence: number;
  instructions?: string;
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

  const updateUserPoints = async (userId: string, recyclable: boolean) => {
    try {
      const pointsToAdd = recyclable ? 10 : 5;
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        points: increment(pointsToAdd),
        itemsRecycled: increment(1),
      });
      console.log(`Added ${pointsToAdd} points for user ${userId}`);
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

              <Alert className={result.recyclable ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <div className="flex items-start gap-3">
                  {result.recyclable ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className={result.recyclable ? "text-green-900" : "text-red-900"}>
                        {result.material}
                      </p>
                      <Badge variant={result.recyclable ? "default" : "destructive"} className="ml-auto">
                        {result.recyclable ? "Recyclable" : "Not Recyclable"}
                      </Badge>
                    </div>
                    <AlertDescription className={result.recyclable ? "text-green-800" : "text-red-800"}>
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
    </div>
  );
}
