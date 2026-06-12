import os
import pandas as pd
from sqlalchemy import create_engine
from sklearn.metrics.pairwise import cosine_similarity

# grab the db url, SQLAlchemy is picky and wants postgresql:// instead of postgres://
db_url = os.getenv("DATABASE_URL", "")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
    
engine = create_engine(db_url) if db_url else None

def get_recommendations_for_user(user_id: str, top_k: int = 10):
    if not engine:
        return []
        
    try:
        # Fetch user-movie interactions
        query = """
        SELECT
            w."userId",
            m."id" AS movie_id,
            m."imdbID",
            m."title",
            m."poster",
            m."genre",
            m."year"
        FROM "Watchlist" w
        JOIN "_MovieToWatchlist" mw ON w."id" = mw."B"
        JOIN "Movie" m ON m."id" = mw."A"
        """
        
        df = pd.read_sql(query, engine)
        
        if df.empty:
            return get_trending_movies(top_k)
            
        # Get the movies this specific user has in their watchlist
        user_movies = df[df['userId'] == user_id]['movie_id'].tolist()
        
        # If user has no movies, return trending
        if not user_movies:
            return get_trending_movies(top_k)
            
        # build the matrix so we can see who watched what
        df['interaction'] = 1
        user_item_matrix = df.pivot_table(index='userId', columns='movie_id', values='interaction', fill_value=0)
        
        # crunch the similarity numbers (item-item)
        item_item_matrix = cosine_similarity(user_item_matrix.T)
        item_item_df = pd.DataFrame(item_item_matrix, index=user_item_matrix.columns, columns=user_item_matrix.columns)
        
        # Calculate scores for all unwatched movies based on the user's watched movies
        scores = {}
        for movie in user_movies:
            # Get similarity scores for this movie
            if movie in item_item_df.index:
                similar_movies = item_item_df[movie]
                for candidate_movie, score in similar_movies.items():
                    if candidate_movie not in user_movies and score > 0: # skip stuff they already watched
                        scores[candidate_movie] = scores.get(candidate_movie, 0) + score
                        
        if not scores:
            # If no collaborative filtering matches, fall back to trending movies
            return get_trending_movies(top_k, exclude_movies=user_movies)
            
        # Sort candidate movies by score
        sorted_candidates = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        recommended_movie_ids = [candidate[0] for candidate in sorted_candidates]
        
        # Fetch the movie details for the recommended IDs
        movie_details = df[['movie_id', 'imdbID', 'title', 'poster', 'genre', 'year']].drop_duplicates(subset=['movie_id'])
        
        recommendations = []
        for movie_id in recommended_movie_ids:
            movie_row = movie_details[movie_details['movie_id'] == movie_id].iloc[0]
            recommendations.append({
                "id": movie_row['movie_id'],
                "imdbID": movie_row['imdbID'],
                "title": movie_row['title'],
                "poster": movie_row['poster'],
                "genre": movie_row['genre'],
                "year": movie_row['year']
            })
            
        return recommendations
        
    except Exception as e:
        print(f"yikes, rec engine crashed: {e}")
        return []

def get_trending_movies(top_k: int = 10, exclude_movies=None):
    if not engine:
        return []
    if exclude_movies is None:
        exclude_movies = []
        
    try:
        # Trending is just the most watchlisted movies across all users
        query = """
        SELECT
            m."id" AS movie_id,
            m."imdbID",
            m."title",
            m."poster",
            m."genre",
            m."year",
            COUNT(mw."B") as watch_count
        FROM "Movie" m
        JOIN "_MovieToWatchlist" mw ON m."id" = mw."A"
        GROUP BY m."id", m."imdbID", m."title", m."poster", m."genre", m."year"
        ORDER BY watch_count DESC
        """
        
        df = pd.read_sql(query, engine)
        
        if df.empty:
            return []
            
        recommendations = []
        for _, row in df.iterrows():
            if row['movie_id'] not in exclude_movies:
                recommendations.append({
                    "id": row['movie_id'],
                    "imdbID": row['imdbID'],
                    "title": row['title'],
                    "poster": row['poster'],
                    "genre": row['genre'],
                    "year": row['year']
                })
            if len(recommendations) >= top_k:
                break
                
        return recommendations
        
    except Exception as e:
        print(f"Error fetching trending movies: {e}")
        return []
