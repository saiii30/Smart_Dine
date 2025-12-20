# Travel Management System (TMS)

A modern SAAS application for travel service providers who serve IT companies. This application allows travel providers to manage their vehicles and drivers efficiently.

## Features

- **User Authentication**: Secure registration and login system
- **Vehicle Management**: Add, edit, delete, and view vehicle details
- **Driver Management**: Add, edit, delete, and view driver details
- **Multi-tenant Support**: Each travel provider has isolated data
- **Modern UI**: Beautiful and responsive interface built with React and Tailwind CSS
- **RESTful API**: FastAPI backend with comprehensive endpoints

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **SQLite**: Database (can be upgraded to PostgreSQL)
- **JWT**: Authentication tokens
- **Pydantic**: Data validation

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client

## Project Structure

```
TMS/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application entry point
│   │   ├── database.py      # Database configuration
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── auth.py          # Authentication utilities
│   │   └── routers/
│   │       ├── auth.py      # Authentication endpoints
│   │       ├── vehicles.py  # Vehicle CRUD endpoints
│   │       └── drivers.py   # Driver CRUD endpoints
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/           # Page components
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - On Windows:
   ```bash
   venv\Scripts\activate
   ```
   - On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API documentation (Swagger UI) will be available at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### Registration

1. Navigate to the registration page
2. Fill in your details:
   - Full Name
   - Email
   - Company Name (optional)
   - Password
3. Click "Register" to create your account

### Adding Vehicles

1. Log in to your account
2. Navigate to the "Vehicles" section
3. Click "Add Vehicle"
4. Fill in the vehicle details:
   - Vehicle Number (unique)
   - Vehicle Type (Sedan, SUV, Van, Bus, Mini Bus)
   - Make and Model
   - Year
   - Seating Capacity
   - Registration Number (unique)
   - Insurance details (optional)
5. Click "Create" to save

### Adding Drivers

1. Navigate to the "Drivers" section
2. Click "Add Driver"
3. Fill in the driver details:
   - Full Name
   - Phone Number
   - License Number (unique)
   - License Expiry Date
   - Emergency Contact (optional)
4. Click "Create" to save

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/me` - Get current user details

### Vehicles
- `GET /api/vehicles/` - List all vehicles (for current user)
- `POST /api/vehicles/` - Create a new vehicle
- `GET /api/vehicles/{id}` - Get vehicle details
- `PUT /api/vehicles/{id}` - Update vehicle
- `DELETE /api/vehicles/{id}` - Delete vehicle

### Drivers
- `GET /api/drivers/` - List all drivers (for current user)
- `POST /api/drivers/` - Create a new driver
- `GET /api/drivers/{id}` - Get driver details
- `PUT /api/drivers/{id}` - Update driver
- `DELETE /api/drivers/{id}` - Delete driver

## Database Schema

### Users
- id, email, hashed_password, full_name, company_name, role, is_active, created_at, updated_at

### Vehicles
- id, owner_id, vehicle_number, vehicle_type, make, model, year, color, seating_capacity, registration_number, insurance_number, insurance_expiry, is_active, notes, created_at, updated_at

### Drivers
- id, owner_id, full_name, email, phone, license_number, license_expiry, address, emergency_contact_name, emergency_contact_phone, is_active, notes, created_at, updated_at

## Security Notes

- Change the `SECRET_KEY` in `backend/app/auth.py` for production
- Use environment variables for sensitive configuration
- Consider upgrading to PostgreSQL for production
- Implement rate limiting for API endpoints
- Add HTTPS in production

## Future Enhancements

- Booking management system
- Route planning
- Real-time tracking
- Reports and analytics
- Mobile app
- Integration with payment gateways
- Email notifications
- Document management

## License

This project is open source and available for use.

