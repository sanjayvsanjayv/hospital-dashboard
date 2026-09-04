"""WSGI entry point for Gunicorn / Render."""
from app.app import create_app

application = create_app()
app = application          # gunicorn looks for 'app' or 'application'

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 10000)))
