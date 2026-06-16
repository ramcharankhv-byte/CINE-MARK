from fastapi import FastAPI, BackgroundTasks, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import uuid
import os

# Load env vars from Backend/.env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../Backend/.env"))
load_dotenv(env_path)

from app.groq_stuff import get_groq_response
from app.recommendation import get_recommendations_for_user

app = FastAPI()

# let the frontend talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List, Optional
from app.db_stuff import save_conversation_turn, get_recent_sessions, get_session_history, delete_session, verify_token

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

@app.get("/api/chats/recent")
def get_recent(request: Request):
    auth_header = request.headers.get("Authorization")
    user_id = verify_token(auth_header)
    if not user_id:
        return []
    return get_recent_sessions(user_id)

@app.get("/api/chat/{session_id}")
def get_chat_history_route(session_id: str, request: Request):
    # Only return history if user is authenticated
    user_id = verify_token(request.headers.get("Authorization"))
    if not user_id:
        return []
    
    docs = get_session_history(session_id)
    # Convert ChatMessage rows to the old expected format
    turns = []
    # Upstash format returned: [{"user_query": ..., "metadata": {"ai_reply": ...}}]
    # ChatMessage rows: [{"id":..., "sessionId":..., "role": "user"|"assistant", "content": ..., "movies": ...}]
    # We will pair them up
    
    current_user_query = ""
    for row in docs:
        if row["role"] == "user":
            current_user_query = row["content"]
        elif row["role"] == "assistant":
            turns.append({
                "user_query": current_user_query,
                "metadata": {
                    "ai_reply": row["content"],
                    "movies": row.get("movies") or []
                }
            })
            current_user_query = ""
            
    return turns

@app.delete("/api/chat/{session_id}")
def delete_chat_session_route(session_id: str, request: Request):
    user_id = verify_token(request.headers.get("Authorization"))
    if user_id:
        delete_session(session_id)
    return {"status": "success"}

@app.get("/api/recommendations/{user_id}")
def get_recommendations(user_id: str):
    recs = get_recommendations_for_user(user_id)
    return {"recommendations": recs}

@app.post("/api/chat")
def ask_mesh(req: ChatRequest, request: Request, background_tasks: BackgroundTasks):
    user_id = verify_token(request.headers.get("Authorization"))
    sess_id = req.session_id or str(uuid.uuid4())
    
    # fetch history
    history_docs = get_session_history(sess_id)
    history_dicts = []
    for doc in history_docs:
        history_dicts.append({"role": doc["role"], "content": doc["content"]})

    answer = get_groq_response(req.query, history=history_dicts)
    
    if isinstance(answer, dict):
        # We only save the turn if user is authenticated (checked in save_conversation_turn)
        background_tasks.add_task(save_conversation_turn, sess_id, req.query, answer.get("reply", ""), answer.get("movies", []), user_id)
        answer["session_id"] = sess_id
        return answer
        
    return {"reply": answer, "movies": [], "session_id": sess_id}
