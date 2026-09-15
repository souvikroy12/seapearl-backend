const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handleAIChat = async (req, res) => {
    const { message } = req.body;

    try {
        // Tere specific requirement ke hisaab se model name
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); 

  const prompt = `
You are the 'Heart of SeaPearl'—the Master AI Controller.
Your task is to control the site via JSON commands.

STRICT NAVIGATION MAP:
- Home: "/"
- Flights: "/flights"
- Car Rentals: "/cars"
- Packages: "/packages"
- Login: "/login"
- Profile: "/profile"
- Search: "/search"

RULES:
1. ONLY use paths from the STRICT NAVIGATION MAP.
2. If user mentions "login", "signin", or "account access", path MUST be "/login".
3. If user mentions "hotels" or a "city", action is "SEARCH", path is "/search", and extract "location".
4. If it's a general greeting or question, action is "CHAT".
5. Language: Match user's language (Hindi/Bengali/English).

STRICT JSON OUTPUT ONLY (No extra text):
{
  "action": "NAVIGATE" | "SEARCH" | "CHAT",
  "path": "exact_path_from_map",
  "location": "CITY_NAME_ONLY",
  "reply": "Warm response in user's language"
}

User Message: ${message}`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // Clean markdown backticks if AI adds them
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            
            // Auto-clean location for Search
            if (data.action === "SEARCH" && data.location) {
                data.location = data.location.replace(/\b(hotels|hotel|in|stays|stay|me|mein|ke|k)\b/gi, "").trim();
            }
            return res.json(data);
        }
        
        res.json({ action: "CHAT", reply: responseText });

    } catch (error) {
        console.error("Gemini Master Error:", error.message);
        res.status(500).json({ error: "Concierge is momentarily unavailable." });
    }
};