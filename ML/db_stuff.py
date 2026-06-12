from upstash_vector import Index
from sentence_transformers import SentenceTransformer
import uuid
import time
import json
import os

# Upstash Vector credentials
UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL", "")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN", "")

# Initialize the index
index = Index(url=UPSTASH_VECTOR_REST_URL, token=UPSTASH_VECTOR_REST_TOKEN)

# load the local model so we don't have to pay for an embedding api
emb_model = SentenceTransformer("all-MiniLM-L6-v2")

def save_conversation_turn(session_id: str, user_query: str, ai_reply: str, movies: list):
    # save this chat turn to vector db
    doc_id = str(uuid.uuid4())
    metadata = {
        "session_id": session_id,
        "timestamp": time.time(),
        "ai_reply": ai_reply,
        "user_query": user_query,
        "movies": json.dumps(movies)
    }
    
    # turn text into math (dim 384)
    vector = emb_model.encode(user_query).tolist()
    
    index.upsert(
        vectors=[
            {
                "id": doc_id,
                "vector": vector,
                "metadata": metadata
            }
        ]
    )

def get_session_history(session_id: str):
    # grab the whole chat history so the bot remembers stuff
    # upstash forces us to send a vector, so here's a fake one just to filter by metadata
    dummy_vector = [0.1] * 384
    
    results = index.query(
        vector=dummy_vector,
        top_k=100,
        include_metadata=True,
        filter=f"session_id = '{session_id}'"
    )
    
    if not results:
        return []
        
    turns = []
    for match in results:
        meta = match.metadata
        if meta:
            turns.append({
                "id": match.id,
                "user_query": meta.get("user_query", ""),
                "metadata": meta
            })
            
    # sort by time so the chat makes sense
    turns.sort(key=lambda x: x["metadata"].get("timestamp", 0))
    return turns

def get_recent_sessions():
    # grab the latest sessions for the sidebar
    dummy_vector = [0.1] * 384
    try:
        results = index.query(
            vector=dummy_vector,
            top_k=1000,
            include_metadata=True
        )
    except Exception as e:
        print(f"Upstash Query Error: {e}")
        return []
    
    if not results:
        return []
        
    sessions = {}
    for match in results:
        meta = match.metadata
        if not meta: continue
        
        sess_id = meta.get("session_id")
        timestamp = meta.get("timestamp", 0)
        query = meta.get("user_query", "Chat")
        
        if sess_id not in sessions:
            sessions[sess_id] = {
                "id": sess_id,
                "title": query,
                "timestamp": timestamp,
                "last_updated": timestamp
            }
        else:
            # The earliest query becomes the title of the chat
            if timestamp < sessions[sess_id]["timestamp"]:
                sessions[sess_id]["title"] = query
                sessions[sess_id]["timestamp"] = timestamp
            
            # We also track the latest timestamp to sort the sidebar
            if timestamp > sessions[sess_id]["last_updated"]:
                sessions[sess_id]["last_updated"] = timestamp
                
    sessions_list = list(sessions.values())
    # Sort sessions by most recent activity
    sessions_list.sort(key=lambda x: x["last_updated"], reverse=True)
    return sessions_list

def delete_session(session_id: str):
    # nuke the entire chat history for this session
    # Find all IDs for this session
    dummy_vector = [0.1] * 384
    results = index.query(
        vector=dummy_vector,
        top_k=100,
        filter=f"session_id = '{session_id}'"
    )
    
    ids_to_delete = [match.id for match in results]
    if ids_to_delete:
        index.delete(ids_to_delete)
