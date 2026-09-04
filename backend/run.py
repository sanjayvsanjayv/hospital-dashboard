"""Flask development server entry point."""
import os
from app.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    print(f"Starting Hospital Dashboard API on http://localhost:{port}")
    print("PROTOTYPE — Synthetic data only. Not for clinical use.")
    app.run(host="0.0.0.0", port=port, debug=debug)
