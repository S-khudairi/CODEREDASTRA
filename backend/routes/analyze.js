const express = require('express');
const router = express.Router();
const { VertexAI } = require('@google-cloud/vertexai');

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: 'code-red-astra',
  location: 'us-central1',
});

// Configure the model
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

// System prompt for recycling analysis
const systemPrompt = `
You are an expert on environmental sustainability and recycling analysis. Your task is to analyze the provided image and return a response only in the following valid JSON format:
{
  "object_name": "string",
  "primary_material": "string",
  "is_recyclable": boolean,
  "points": integer,
  "confidence": float,
  "user_instructions": "string"
}

Follow these instructions precisely:

Identification & Confidence:
Identify the main object and estimate your confidence in this identification as a float between 0.0 and 1.0.
Failure Case: If your confidence is below 0.7 or the object is unidentifiable, you must still return the full JSON structure. Set "object_name" to "Unidentifiable", "primary_material" to "Unknown", "is_recyclable" to false, "points" to 0, "confidence" to your low confidence score (e.g., 0.3), and "user_instructions" to "The item could not be identified clearly. Please try a different angle or better lighting."

Material:
Determine the object's primary material (e.g., PET Plastic, Aluminum, Cardboard, Glass, Paper, Polystyrene, Other).
Recyclability:
Set "is_recyclable" to true if the primary material (or a significant part of the item) is commonly recyclable. Set to false otherwise.

Points:
Assign points based on the environmental benefit scale. The final "points" value in the JSON must be the total sum of all recyclable components.
10 Points (High Benefit): Aluminum, Glass.
5 Points (Good Benefit): Paper, Cardboard, PET Plastic (#1), HDPE Plastic (#2).
1 Point (Low Benefit): Other recyclable plastics (#3, #4, #5, #6, #7).
0 Points (Not Recyclable): Polystyrene, plastic films/bags, composite materials, food-soiled items, or anything not listed above.
User Instructions:
Provide simple, concise instructions for the user.
If items need to be separated (e.g., a plastic bottle and a metal cap), explain this.
If the item is not recyclable, clearly state what to do (e.g., "This item is not recyclable and should be placed in the trash.").
Do not mention the point value in the instructions; the "points" field is for that.

Always return only the valid JSON object and nothing else. Do not add markdown (like \`\`\`json) or any explanatory text before or after the JSON.
`;

// POST /api/analyze
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: "Analyze this image:" },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: image,
              },
            },
          ],
        },
      ],
    };

    const response = await generativeModel.generateContent(request);
    
    if (!response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("API returned no content.");
    }
    
    const analysisJson = response.response.candidates[0].content.parts[0].text;
    const analysisData = JSON.parse(analysisJson);
    
    res.json(analysisData);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

module.exports = router;
