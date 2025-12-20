@echo off
echo Starting Backend Server...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
python run.py

