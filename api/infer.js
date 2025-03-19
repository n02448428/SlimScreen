const fetch = require('node-fetch');
const AbortController = require('abort-controller');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Hugging Face model API URL
  const apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  const token = process.env.HUGGINGFACE_TOKEN;
  
  // Check if API token is configured
  if (!token) {
    return res.status(500).json({ error: "API token not configured" });
  }

  // Validate input
  if (!req.body || !req.body.inputs) {
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }

  const userInput = req.body.inputs.trim();
  
  // Detect if this is a definition request
  const isDefinitionRequest = userInput.toLowerCase().includes("what does") || 
                             userInput.toLowerCase().includes("define") ||
                             userInput.toLowerCase().includes("meaning of") ||
                             userInput.toLowerCase().includes("what is") ||
                             userInput.toLowerCase().includes("who is") ||
                             userInput.toLowerCase().includes("what are") ||
                             userInput.toLowerCase().includes("explain");
  
  // Try to extract a term if this is a definition request
  if (isDefinitionRequest) {
    // Extract terms in quotes if available
    const termMatch = userInput.match(/(?:what does|define|meaning of|what is|who is|what are|explain)[^"]*"([^"]+)"/i);
    
    if (termMatch && termMatch[1]) {
      const term = termMatch[1].trim();
      
      try {
        // FIRST: Try Dictionary API
        const dictResult = await tryDictionaryApi(term);
        if (dictResult) {
          return res.status(200).json({ generated_text: dictResult });
        }
        
        // SECOND: Try Wikipedia API
        const wikiResult = await tryWikipediaApi(term);
        if (wikiResult) {
          return res.status(200).json({ generated_text: wikiResult });
        }
        
        // If both failed, we'll fall through to the LLM
      } catch (apiError) {
        console.error('API error:', apiError);
        // Continue to fallback
      }
    } else {
      // Try to extract terms without quotes - more complex queries
      const potentialTerms = userInput.replace(/what does|define|meaning of|what is|who is|what are|explain/gi, '')
                             .replace(/mean\??$/i, '')
                             .trim();
      
      if (potentialTerms.length > 0 && potentialTerms.split(' ').length <= 5) {
        try {
          // For terms without quotes, try Wikipedia first as it might be a compound concept
          const wikiResult = await tryWikipediaApi(potentialTerms);
          if (wikiResult) {
            return res.status(200).json({ generated_text: wikiResult });
          }
          
          // Then try dictionary if it's a single word
          if (potentialTerms.split(' ').length === 1) {
            const dictResult = await tryDictionaryApi(potentialTerms);
            if (dictResult) {
              return res.status(200).json({ generated_text: dictResult });
            }
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          // Continue to fallback
        }
      }
    }
  }

  // LLM Fallback for all cases where direct API lookups failed or for conversational queries
  try {
    const llmResult = await callLanguageModel(userInput, isDefinitionRequest);
    return res.status(200).json({ generated_text: llmResult });
  } catch (llmError) {
    console.error('LLM error:', llmError);
    return res.status(200).json({ 
      generated_text: "I'm sorry, I'm having trouble finding an answer right now. Could you try again in a moment?" 
    });
  }
};

// Try to get a definition from the Dictionary API
async function tryDictionaryApi(term) {
  const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  const dictResponse = await fetch(dictUrl);
  
  if (dictResponse.ok) {
    const dictData = await dictResponse.json();
    
    if (Array.isArray(dictData) && dictData.length > 0) {
      const entry = dictData[0];
      
      if (entry.meanings && entry.meanings.length > 0) {
        const meanings = [];
        
        // Collect definitions from different parts of speech
        for (let i = 0; i < Math.min(2, entry.meanings.length); i++) {
          const meaning = entry.meanings[i];
          
          if (meaning.definitions && meaning.definitions.length > 0) {
            const definition = meaning.definitions[0].definition;
            const partOfSpeech = meaning.partOfSpeech ? `(${meaning.partOfSpeech})` : '';
            let formattedDef = `${partOfSpeech ? partOfSpeech + ': ' : ''}${definition}`;
            
            if (meaning.definitions[0].example) {
              formattedDef += ` Example: "${meaning.definitions[0].example}"`;
            }
            
            meanings.push(formattedDef);
          }
        }
        
        if (meanings.length > 0) {
          let result = `${term}: ${meanings[0]}`;
          
          if (meanings.length > 1) {
            result += ` Also ${meanings[1]}`;
          }
          
          // Add synonyms if available
          const firstMeaning = entry.meanings[0];
          if (firstMeaning.synonyms && firstMeaning.synonyms.length > 0) {
            result += ` Synonyms: ${firstMeaning.synonyms.slice(0, 3).join(', ')}.`;
          }
          
          return result;
        }
      }
    }
  }
  
  return null;
}

// Try to get information from Wikipedia
async function tryWikipediaApi(term) {
  // First search for the term
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
        
        // Limit to first 2 sentences for brevity
        const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length > 2) {
          extract = sentences.slice(0, 2).join(' ');
        }
        
        return extract;
      }
    }
  }
  
  return null;
}

// Call the language model for a response
async function callLanguageModel(userInput, isDefinitionRequest) {
  const formattedPrompt = isDefinitionRequest
    ? `You are Lexi, a helpful research assistant. Provide a clear, concise definition (1-2 sentences) for: "${userInput}"`
    : `You are Lexi, a helpful assistant providing concise information. Reply in a friendly way (1-2 sentences): "${userInput}"`;

  const payload = {
    inputs: formattedPrompt,
    parameters: {
      max_length: 150,
      temperature: 0.7,
      top_k: 50,
      top_p: 0.95,
      do_sample: true
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.status === 503) {
      return "I'm having trouble accessing my knowledge right now. Could you try again in a moment?";
    }

    if (!response.ok) {
      if (isDefinitionRequest) {
        const termMatch = userInput.match(/(?:what does|define|meaning of|what is|who is|explain)[^"]*"([^"]+)"/i);
        const term = termMatch ? termMatch[1].trim() : "that term";
        
        return `I'm sorry, but I don't have information about "${term}" right now.`;
      }
      
      return "I'm not sure how to respond to that. Could you try asking in a different way?";
    }

    const text = await response.text();
    const data = JSON.parse(text);
    
    if (data.generated_text) {
      return cleanResponse(data.generated_text);
    } else if (Array.isArray(data) && data[0]?.generated_text) {
      return cleanResponse(data[0].generated_text);
    }
    
    return "I'm not sure how to respond to that. Could you try asking in a different way?";
  } catch (error) {
    if (error.name === 'AbortError') {
      return "I'm sorry, my response took too long. Could you try a simpler question?";
    }
    throw error;
  }
}

// Clean up LLM responses
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
    /Sure, I can help with that/gi,
    /I'd be happy to explain this/gi,
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
    return "I'm sorry I can't properly explain this right now.";
  }
  
  return cleaned;
}