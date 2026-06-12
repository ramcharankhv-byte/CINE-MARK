from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# mesh: gotta load the env file BEFORE groq_stuff imports the keys
load_dotenv("../.env")

from groq_stuff import get_groq_response
from recommendation import get_recommendations_for_user

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
import uuid
from db_stuff import save_conversation_turn, get_recent_sessions, get_session_history, delete_session

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

@app.get("/api/chats/recent")
def get_recent():
    return get_recent_sessions()

@app.get("/api/chat/{session_id}")
def get_chat_history(session_id: str):
    return get_session_history(session_id)

@app.delete("/api/chat/{session_id}")
def delete_chat_session(session_id: str):
    delete_session(session_id)
    return {"status": "success"}

@app.get("/api/recommendations/{user_id}")
def get_recommendations(user_id: str):
    recs = get_recommendations_for_user(user_id)
    return {"recommendations": recs}

@app.post("/api/chat")
def ask_mesh(req: ChatRequest, background_tasks: BackgroundTasks):
    sess_id = req.session_id or str(uuid.uuid4())
    
    # fetch history from chroma
    history_docs = get_session_history(sess_id)
    history_dicts = []
    for doc in history_docs:
        history_dicts.append({"role": "user", "content": doc["user_query"]})
        history_dicts.append({"role": "assistant", "content": doc["metadata"]["ai_reply"]})

    answer = get_groq_response(req.query, history=history_dicts)
    
    if isinstance(answer, dict):
        background_tasks.add_task(save_conversation_turn, sess_id, req.query, answer.get("reply", ""), answer.get("movies", []))
        answer["session_id"] = sess_id
        return answer
        
    return {"reply": answer, "movies": [], "session_id": sess_id}
