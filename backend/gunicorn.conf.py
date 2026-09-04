# Gunicorn config for Render deployment
import os

bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
workers = 1          # free tier: keep low
threads = 2
timeout = 120
preload_app = True   # seed data once at startup
