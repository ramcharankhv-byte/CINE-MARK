from supabase import create_client, Client
import os
import time
import json
import uuid
import datetime

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

def clean_db_url(url: str):
    if not url: return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    parsed = urlparse(url)
    qs = parse_qsl(parsed.query)
    qs = [(k, v) for k, v in qs if k.lower() != 'pgbouncer']
    return urlunparse(parsed._replace(query=urlencode(qs)))

def verify_token(token: str):
    if not token:
        return None
    try:
        if token.startswith("Bearer "):
            token = token[7:]
        auth_user = supabase.auth.get_user(token)
        google_id = auth_user.user.id
        
        # Connect directly to Postgres to bypass RLS
        import psycopg2
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            db_url = clean_db_url(db_url)
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute('SELECT id FROM "User" WHERE "googleId" = %s', (google_id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row:
                return row[0]
        return None
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return None
    db_url = clean_db_url(db_url)
    return psycopg2.connect(db_url)

def save_conversation_turn(session_id: str, user_query: str, ai_reply: str, movies: list, user_id: str = None):
    try:
        conn = get_db_connection()
        if not conn: return
        cur = conn.cursor()
        
        # Check if session exists
        cur.execute('SELECT id FROM "ChatSession" WHERE id = %s', (session_id,))
        session_exists = cur.fetchone()
        
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        if not session_exists:
            if not user_id:
                print("Cannot save session without user_id")
                return
            # Create session
            cur.execute(
                'INSERT INTO "ChatSession" (id, "userId", title, "updatedAt") VALUES (%s, %s, %s, %s)',
                (session_id, user_id, user_query, now)
            )
        else:
            # Update session updated_at
            cur.execute(
                'UPDATE "ChatSession" SET "updatedAt" = %s WHERE id = %s',
                (now, session_id)
            )

        # Insert User Message
        msg_id_user = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO "ChatMessage" (id, "sessionId", role, content, movies, "createdAt") VALUES (%s, %s, %s, %s, %s, %s)',
            (msg_id_user, session_id, 'user', user_query, json.dumps([]), now)
        )

        # Insert AI Message
        msg_id_ai = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO "ChatMessage" (id, "sessionId", role, content, movies, "createdAt") VALUES (%s, %s, %s, %s, %s, %s)',
            (msg_id_ai, session_id, 'assistant', ai_reply, json.dumps(movies), now)
        )
        
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Failed to save conversation: {e}")

def get_session_history(session_id: str):
    try:
        conn = get_db_connection()
        if not conn: return []
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM "ChatMessage" WHERE "sessionId" = %s ORDER BY "createdAt" ASC', (session_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        print(f"Failed to get history: {e}")
        return []

def get_recent_sessions(user_id: str):
    try:
        if not user_id:
            return []
            
        conn = get_db_connection()
        if not conn: return []
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT id, title, "updatedAt" FROM "ChatSession" WHERE "userId" = %s ORDER BY "updatedAt" DESC LIMIT 50', (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        sessions = []
        for row in rows:
            sessions.append({
                "id": row["id"],
                "title": row["title"] or "Chat",
                "timestamp": row["updatedAt"].isoformat() if isinstance(row["updatedAt"], datetime.datetime) else row["updatedAt"],
                "last_updated": row["updatedAt"].isoformat() if isinstance(row["updatedAt"], datetime.datetime) else row["updatedAt"]
            })
        return sessions
    except Exception as e:
        print(f"Failed to get recent sessions: {e}")
        return []

def delete_session(session_id: str):
    try:
        conn = get_db_connection()
        if not conn: return
        cur = conn.cursor()
        cur.execute('DELETE FROM "ChatSession" WHERE id = %s', (session_id,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Failed to delete session: {e}")
