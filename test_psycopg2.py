import psycopg2
try:
    psycopg2.connect('"postgresql://postgres:pass@host:6543/db?pgbouncer=true"')
except Exception as e:
    print(f"Error 1: {e}")

try:
    psycopg2.connect('"postgresql://postgres:pass@host:6543/db"')
except Exception as e:
    print(f"Error 2: {e}")
