import os
import json
import requests
from groq import Groq
from groq import RateLimitError, AuthenticationError
from duckduckgo_search import DDGS

# mesh rules: grab keys
raw_keys = os.getenv("GROQ_API_KEYS", "")
API_KEYS = [k.strip() for k in raw_keys.split(",") if k.strip()]
OMDB_KEY = os.getenv("API_KEY", "")

mesh_key_idx = 0

def fetch_mesh_omdb(somesh_title):
    try:
        url = f"http://www.omdbapi.com/?apikey={OMDB_KEY}&t={somesh_title}"
        resp = requests.get(url)
        data = resp.json()
        if data.get("Response") == "True":
            return {
                "title": data.get("Title"),
                "year": data.get("Year"),
                "genre": data.get("Genre"),
                "pitch": data.get("Plot"),
                "poster": data.get("Poster"),
                "imdbID": data.get("imdbID")
            }
    except Exception:
        pass
    return None

def search_duckduckgo(query):
    try:
        from datetime import datetime
        current_year = datetime.now().year
        # Optimize the search string so DuckDuckGo returns actual lists of new movies
        search_term = f"best new movies {current_year} {current_year-1} {query}"
        print(f"Executing web search: {search_term}")
        
        results = DDGS().text(search_term, max_results=4)
        if not results:
            return ""
        snippets = [f"- {r.get('title')}: {r.get('body')}" for r in results]
        return "\n".join(snippets)
    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        return ""

def get_groq_response(user_query, history=None):
    global mesh_key_idx
    
    if not API_KEYS:
        return "Bro, no API keys found."
        
    attempts = 0
    max_attempts = len(API_KEYS)
    
    while attempts < max_attempts:
        current_key = API_KEYS[mesh_key_idx]
        try:
            client = Groq(api_key=current_key)
            
            from datetime import datetime
            current_year = datetime.now().year
            
            system_content = f"You are CINE-MARK movie bot. The current year is {current_year}. IMPORTANT INSTRUCTION: Prioritize recommending the newest, most recently released movies (e.g. {current_year-1}, {current_year}, {current_year+1}) based on the Web Search Context. HOWEVER, if the web search context does not contain good new movies for their highly specific request (e.g. niche genres or languages), you are ALLOWED to recommend older movies from your internal knowledge. BE HONEST about the release year; do not pretend an old movie is new. Return JSON with exactly two keys: 'reply' (your conversational response) and 'titles' (array of exactly 5 EXACT movie title strings). STRICT RULE FOR TITLES: DO NOT include the year, release date, or any parenthesis in the 'titles' array. Provide ONLY the pure, exact movie title so it can be searched in OMDB. Strictly JSON. Maintain conversation context."
            
            web_context = search_duckduckgo(user_query)
            if web_context:
                system_content += f"\n\nHere is real-time web search data that is highly relevant to the user's query:\n{web_context}\nUse this context to extract and recommend the absolute newest and most up-to-date movies available."
            
            messages = [
                {
                    "role": "system",
                    "content": system_content
                }
            ]
            
            if history:
                messages.extend(history)
                
            messages.append({
                "role": "user",
                "content": user_query,
            })
            
            chat_completion = client.chat.completions.create(
                messages=messages,
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"},
            )
            
            ai_data = json.loads(chat_completion.choices[0].message.content)
            somesh_movies = []
            
            for t in ai_data.get("titles", []):
                omdb_data = fetch_mesh_omdb(t)
                if omdb_data and omdb_data.get("poster") and omdb_data.get("poster") != "N/A":
                    somesh_movies.append(omdb_data)
                
                # Stop once we have 3 beautiful, verified movie cards
                if len(somesh_movies) >= 3:
                    break
            
            return {
                "reply": ai_data.get("reply", "Check these out!"),
                "movies": somesh_movies
            }
            
        except (RateLimitError, AuthenticationError) as e:
            print(f"Key {mesh_key_idx} failed bro. Swapping... Error: {e}")
            mesh_key_idx = (mesh_key_idx + 1) % len(API_KEYS)
            attempts += 1
        except Exception as e:
            return f"Something went wrong on our end: {e}"
            
    return "All API keys hit their limit or expired! Try again later."
