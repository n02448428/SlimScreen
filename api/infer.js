const fetch = require('node-fetch');
const AbortController = require('abort-controller');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  const token = process.env.HUGGINGFACE_TOKEN;
  
  if (!token) {
    return res.status(500).json({ error: "API token not configured" });
  }

  if (!req.body || !req.body.inputs) {
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }

  const userInput = req.body.inputs.trim();
  const isDefinitionRequest = userInput.toLowerCase().includes("what does this mean") || 
                           userInput.toLowerCase().includes("define") ||
                           userInput.toLowerCase().includes("meaning of");
  
  if (isDefinitionRequest) {
    const termMatch = userInput.match(/(?:what does this mean|define|meaning of)[: ]+"([^"]+)"/i);
    if (termMatch && termMatch[1]) {
      const term = termMatch[1].trim();
      
      try {
        // Dictionary API FIRST
        const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
        const dictResponse = await fetch(dictUrl);
        
        if (dictResponse.ok) {
          const dictData = await dictResponse.json();
          
          if (Array.isArray(dictData) && dictData.length > 0) {
            const entry = dictData[0];
            
            if (entry.meanings && entry.meanings.length > 0) {
              const meaning = entry.meanings[0];
              
              if (meaning.definitions && meaning.definitions.length > 0) {
                const definition = meaning.definitions[0].definition;
                const partOfSpeech = meaning.partOfSpeech ? ` (${meaning.partOfSpeech})` : '';
                let formattedResponse = `${term}${partOfSpeech}: ${definition}`;
                
                if (meaning.definitions[0].example) {
                  formattedResponse += ` Example: "${meaning.definitions[0].example}"`;
                }
                
                return res.status(200).json({ generated_text: formattedResponse });
              }
            }
          }
        }
        
        // Wikipedia API SECOND
        const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*&srlimit=1`;
        const wikiSearchResponse = await fetch(wikiSearchUrl);
        const searchData = await wikiSearchResponse.json();
        
        if (searchData.query && 
            searchData.query.search && 
            searchData.query.search.length > 0) {
          
          const pageId = searchData.query.search[0].pageid;
          const wikiExtractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
          const wikiExtractResponse = await fetch(wikiExtractUrl);
          
          if (wikiExtractResponse.ok) {
            const extractData = await wikiExtractResponse.json();
            const pages = extractData.query.pages;
            
            if (pages && pages[pageId] && pages[pageId].extract) {
              let extract = pages[pageId].extract;
              
              const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
              if (sentences.length > 2) {
                extract = sentences.slice(0, 2).join(' ');
              }
              
              return res.status(200).json({ generated_text: extract });
            }
          }
        }
      } catch (apiError) {
        // Continue to fallback
      }
    }
  }

  // LLM Fallback
  const formattedPrompt = isDefinitionRequest
    ? `You are Lexi, a helpful research assistant. Provide a clear, concise definition (1-2 sentences) for: "${userInput}"`
    : `You are Lexi, a helpful assistant providing concise information. Reply in a friendly way (1-2 sentences): "${userInput}"`;

  const payload = {
    inputs: formattedPrompt,
    parameters: {
      max_length: 100,
      temperature: 0.6,
      top_k: 40,
      top_p: 0.9,
      do_sample: true
    }
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.status === 503) {
      return res.status(200).json({ 
        generated_text: "I'm so sorry, but I'm having trouble accessing my knowledge right now. I've failed you and sincerely apologize. Could you try again in a moment?" 
      });
    }

    if (!response.ok) {
      if (isDefinitionRequest) {
        const termMatch = userInput.match(/(?:what does this mean|define|meaning of)[: ]+"([^"]+)"/i);
        const term = termMatch ? termMatch[1].trim() : "that term";
        
        return res.status(200).json({ 
          generated_text: `I'm truly sorry, but I don't know what "${term}" means. I've failed you, and I deeply apologize. I wish I could be more helpful.` 
        });
      }
      
      return res.status(200).json({ 
        generated_text: "I'm so sorry, but I'm having trouble right now. I've failed you, and I apologize sincerely. Can you try again or ask something else?" 
      });
    }

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
      
      if (data.generated_text) {
        data.generated_text = cleanResponse(data.generated_text);
      } else if (Array.isArray(data) && data[0]?.generated_text) {
        data[0].generated_text = cleanResponse(data[0].generated_text);
      }
      
    } catch (jsonError) {
      return res.status(200).json({ 
        generated_text: "I'm terribly sorry, but I encountered a problem. I've failed you, and I apologize sincerely." 
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.name === 'AbortError' 
      ? "I'm so sorry, but my response took too long. I've failed you. Could you try a simpler question?"
      : `I'm terribly sorry, but I encountered an error. I've failed you, and I apologize sincerely.`;
      
    return res.status(200).json({ generated_text: errorMessage });
  }
};

function cleanResponse(text) {
  if (!text) return "I'm sorry, I don't quite understand. Could you clarify what you'd like to know?";
  
  const cleaningPatterns = [
    /You are Lexi[^"]*"([^"]*)"/i,
    /Define this concisely[^:]*:/i,
    /\[\s*Context:[^\]]*\]/gi,
    /<s>[\s\S]*?<\/system>/gi,
    /<user>[\s\S]*?<\/user>/gi,
    /<assistant>[\s\S]*?<\/assistant>/gi,
    /<assistant>\s*/gi,
    /You are (a )?(friendly|helpful) (librarian|research assistant)[^.]*/gi,
    /Provide a concise[^.]*\./gi,
    /Focus only on[^.]*\./gi, 
    /Reply to this in a natural, friendly way[^:]*:/i,
    /Wikipedia, the free encyclopedia"?\]/gi,
    /Define this concisely \(max \d+ sentences\):/gi,
  ];
  
  let cleaned = text;
  
  cleaningPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  const strangePatterns = [
    /It is not my face, but a face that bothers me\./g,
    /To a space, a space adjacent to hello\./g,
    /For the past 14 years\./g,
    /Your book's digital RSS feed\./g,
    /I'm here to help with that\. Could you provide more context\?/g,
    /I'll help you understand this\./g,
    /According to Wikipedia/gi,
  ];
  
  strangePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  if (cleaned && cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
  }
  
  if (!cleaned || cleaned.length < 5) {
    return "I'm sorry I can't properly explain this. I've failed you, and I apologize sincerely.";
  }
  
  return cleaned;
}