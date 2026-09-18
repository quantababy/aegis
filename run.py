"""One-click runner for AEGIS Backend & Frontend."""
import os
import sys
import webbrowser
import uvicorn

def main():
    # Ensure current working directory is on python path
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
        
    print("==================================================================")
    print("   AEGIS — Autonomous AI Red-Teaming & Attack Intelligence Shield  ")
    print("   Cybersecurity · AI Safety · ML · Blockchain · DSA · Web Dev    ")
    print("==================================================================")
    print("Starting FastAPI Server at http://127.0.0.1:8000 ...")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("Dashboard: http://127.0.0.1:8000")
    print("------------------------------------------------------------------")
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
