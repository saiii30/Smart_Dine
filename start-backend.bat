@echo off
echo Starting Backend Server...
cd backend
python -m venv venv
call venv\Scripts\activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000