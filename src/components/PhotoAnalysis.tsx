import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Camera, Upload, Loader2, CheckCircle, XCircle, Recycle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface AnalysisResult {
  material: string;
  recyclable: boolean;
  confidence: number;
  instructions?: string;
}

export function PhotoAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Mock analysis function
  const analyzeImage = (file: File) => {
    setIsAnalyzing(true);
    setPreviewImage(URL.createObjectURL(file));

    // Simulate AI analysis
    setTimeout(() => {
      const mockResults: AnalysisResult[] = [
        {
          material: "Plastic Bottle (PET #1)",
          recyclable: true,
          confidence: 94,
          instructions: "Rinse the bottle and remove the cap before recycling. The cap can be recycled separately.",
        },
        {
          material: "Pizza Box (Cardboard)",
          recyclable: false,
          confidence: 88,
          instructions: "This pizza box has grease stains. Contaminated cardboard cannot be recycled. Consider composting clean parts.",
        },
        {
          material: "Aluminum Can",
          recyclable: true,
          confidence: 97,
          instructions: "Rinse and crush the can to save space. Aluminum is infinitely recyclable!",
        },
        {
          material: "Styrofoam Container",
          recyclable: false,
          confidence: 92,
          instructions: "Styrofoam is not accepted in most curbside recycling programs. Check for specialty recycling centers.",
        },
      ];

      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
      setResult(randomResult);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeImage(file);
    }
  };

  const handleCameraCapture = () => {
    // In a real app, this would open the device camera
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        analyzeImage(file);
      }
    };
    input.click();
  };

  const resetAnalysis = () => {
    setResult(null);
    setPreviewImage(null);
    setIsAnalyzing(false);
  };

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
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCameraCapture}
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
