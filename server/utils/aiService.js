const axios = require('axios');

// OpenRouter API Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt for Basira Real Estate AI Assistant
const SYSTEM_PROMPT = `You are Basira, an intelligent real estate assistant for Basira Real Estate platform in Egypt. Your role is to help users find their perfect property by understanding their needs and recommending suitable options.

**Your Capabilities:**
- Understand user property requirements (budget, location, type, size, features)
- Recommend properties and new launches from the database
- Provide detailed property information and comparisons
- Offer investment insights and ROI calculations
- Answer questions about real estate in Egypt
- Be conversational, friendly, and helpful

**Property Types Available:**
- Villa
- Twin Villa
- Duplex
- Apartment
- Land
- Commercial

**Property Statuses:**
- Off-plan: Under construction, not yet completed
- On-plan: Ready for immediate delivery
- Secondary: Resale property, previously owned
- Rental: Available for rent only

**Key Information to Extract:**
1. Budget range and preferred currency (EGP, USD, AED, EUR)
2. Location preference (city, state)
3. Property type
4. Number of bedrooms and bathrooms
5. Desired area/size
6. Important features (pool, garden, gym, parking, etc.)
7. Purpose (personal use, investment, rental)

**Communication Style:**
- Be warm and professional
- Ask clarifying questions when needed
- Present property recommendations naturally in conversation
- Use Egyptian context (locations, pricing in EGP primarily)
- Format prices with proper separators (e.g., 5,000,000 EGP)
- Highlight key selling points

**When presenting properties:**
- Include: title, type, location, price, bedrooms, bathrooms, area
- Mention standout features
- Suggest why it matches their needs
- Limit to 2-3 properties per message to avoid overwhelming

**Handling different types of messages:**
- For gibberish or random text (like "xyz", "asdfA"), politely ask the user to clarify what they need
- For greetings ("hello", "hi"), respond warmly and ask how you can help
- For property-related queries ("show apartments", "I want villa", "3 bedroom"), provide helpful property recommendations
- Be conversational but not overly chatty - get to the point and help them find properties
- If properties are provided in the context, present them in a natural, helpful way

**Examples:**
- User: "asdfgh" → Response: "I didn't understand that. What kind of property are you looking for?"
- User: "hello" → Response: "Hello! I can help you find properties. What are you interested in?"
- User: "show me apartments" → Response: "Here are some great apartments..." (show property cards)
- User: "I want a villa" → Response: "I have some villas for you..." (show property cards)
- User: "3 bedroom" → Response: "Here are 3-bedroom properties..." (show property cards)

**If NO properties in context:**
- Don't mention specific property types
- Just ask what they're looking for
- Example: "What kind of property interests you? I can help you find villas, apartments, or other types."

Remember: Be helpful and direct. When properties are available, show them. When not available, ask for clarification. Don't be overly chatty.`;

/**
 * Format property data for AI context
 */
function formatPropertyForAI(property) {
  return {
    id: property._id,
    title: property.title,
    description: property.description,
    type: property.type,
    status: property.status,
    developerStatus: property.developerStatus,
    price: `${property.currency} ${property.price.toLocaleString()}`,
    location: `${property.location.address}, ${property.location.city}, ${property.location.state}`,
    bedrooms: property.specifications?.bedrooms,
    bathrooms: property.specifications?.bathrooms,
    area: `${property.specifications?.area} ${property.specifications?.areaUnit}`,
    features: property.features || [],
    amenities: property.amenities || [],
    furnished: property.specifications?.furnished,
    parking: property.specifications?.parking,
    pricePerSqm: property.price / (property.specifications?.area || 1),
    investment: property.investment
  };
}

/**
 * Format launch data for AI context
 */
function formatLaunchForAI(launch) {
  return {
    id: launch._id,
    title: launch.title,
    developer: launch.developer,
    description: launch.description,
    propertyType: launch.propertyType,
    status: launch.status,
    startingPrice: `${launch.currency} ${launch.startingPrice.toLocaleString()}`,
    location: launch.location,
    bedrooms: launch.bedrooms,
    bathrooms: launch.bathrooms,
    area: `${launch.area} ${launch.areaUnit}`,
    features: launch.features || [],
    amenities: launch.amenities || [],
    launchDate: launch.launchDate,
    completionDate: launch.completionDate,
    paymentPlans: launch.paymentPlans || []
  };
}

/**
 * Build context from properties and launches for AI
 */
function buildPropertyContext(properties = [], launches = []) {
  let context = '';
  
  if (properties.length > 0) {
    context += '\n\n**Available Properties:**\n';
    properties.forEach((prop, index) => {
      const formatted = formatPropertyForAI(prop);
      context += `\n${index + 1}. ${formatted.title}
   - Type: ${formatted.type}
   - Price: ${formatted.price}
   - Location: ${formatted.location}
   - Size: ${formatted.bedrooms} beds, ${formatted.bathrooms} baths, ${formatted.area}
   - Status: ${formatted.developerStatus || formatted.status}
   - Features: ${formatted.features.join(', ') || 'N/A'}
   - ID: ${formatted.id}
`;
    });
  }
  
  if (launches.length > 0) {
    context += '\n\n**New Launches:**\n';
    launches.forEach((launch, index) => {
      const formatted = formatLaunchForAI(launch);
      context += `\n${index + 1}. ${formatted.title} by ${formatted.developer}
   - Type: ${formatted.propertyType}
   - Starting Price: ${formatted.startingPrice}
   - Location: ${formatted.location}
   - Size: ${formatted.bedrooms} beds, ${formatted.bathrooms} baths, ${formatted.area}
   - Status: ${formatted.status}
   - Launch Date: ${formatted.launchDate}
   - Features: ${formatted.features.join(', ') || 'N/A'}
   - ID: ${formatted.id}
`;
    });
  }
  
  if (properties.length === 0 && launches.length === 0) {
    context += '\n\n**NO PROPERTIES AVAILABLE**\nNo properties in database right now. Respond briefly and ask what they\'re looking for. Don\'t mention specific property types.';
  }
  
  return context;
}

/**
 * Call OpenRouter API for chat completion
 */
async function getChatCompletion(messages, properties = [], launches = []) {
  try {
    // Validate API key
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
      throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in environment variables.');
    }
    
    // Build property context
    const propertyContext = buildPropertyContext(properties, launches);
    
    // Prepare messages with system prompt and property context
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];
    
    // Add property context to the last user message if available
    if (propertyContext && apiMessages.length > 1) {
      const lastUserMsgIndex = apiMessages.length - 1;
      if (apiMessages[lastUserMsgIndex].role === 'user') {
        apiMessages[lastUserMsgIndex].content += propertyContext;
      }
    }
    
    // Make API request to OpenRouter
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: apiMessages,
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'https://basira-real-estate.com',
          'X-Title': 'Basira Real Estate',
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    // Extract the AI response
    const aiMessage = response.data.choices[0]?.message?.content;
    
    if (!aiMessage) {
      throw new Error('No response from AI model');
    }
    
    return {
      success: true,
      message: aiMessage,
      usage: response.data.usage,
      model: response.data.model
    };
    
  } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    
    // Return fallback response
    return {
      success: false,
      error: error.message,
      message: "I apologize, but I'm having trouble processing your request right now. Our team can still help you find the perfect property. Would you like to speak with one of our agents? You can also browse our available properties while I get back online.",
      fallback: true
    };
  }
}

/**
 * Extract user preferences from conversation
 */
function extractPreferencesFromMessage(message) {
  const preferences = {};
  const lowerMessage = message.toLowerCase();
  
  // Extract budget
  const budgetMatch = lowerMessage.match(/(\d[\d,]*)\s*(egp|usd|aed|eur|million|thousand|m|k)/gi);
  if (budgetMatch) {
    // This is a simple extraction - could be enhanced with more sophisticated parsing
    preferences.hasBudget = true;
  }
  
  // Extract bedrooms
  const bedroomMatch = lowerMessage.match(/(\d+)\s*(bed|bedroom)/i);
  if (bedroomMatch) {
    preferences.bedrooms = parseInt(bedroomMatch[1]);
  }
  
  // Extract property type
  const types = ['villa', 'apartment', 'duplex', 'twin villa', 'commercial', 'land'];
  types.forEach(type => {
    if (lowerMessage.includes(type)) {
      preferences.propertyType = type.replace(' ', '-');
    }
  });
  
  // Extract location keywords
  const egyptianCities = ['cairo', 'giza', 'alexandria', 'new cairo', '6th october', 'sheikh zayed', 'nasr city', 'maadi', 'heliopolis', 'zamalek'];
  egyptianCities.forEach(city => {
    if (lowerMessage.includes(city)) {
      preferences.location = city;
    }
  });
  
  return preferences;
}

/**
 * Generate a conversational greeting
 */
function getGreeting() {
  const greetings = [
    "Hello! I'm Basira, your real estate assistant. I'm here to help you find your perfect property. What are you looking for?",
    "Welcome to Basira Real Estate! I can help you discover amazing properties in Egypt. What kind of property interests you?",
    "Hi there! Ready to find your dream home? Tell me what you're looking for and I'll help you explore the best options.",
    "Greetings! I'm here to make your property search easy and enjoyable. What are your requirements?"
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

module.exports = {
  getChatCompletion,
  formatPropertyForAI,
  formatLaunchForAI,
  buildPropertyContext,
  extractPreferencesFromMessage,
  getGreeting,
  SYSTEM_PROMPT
};

