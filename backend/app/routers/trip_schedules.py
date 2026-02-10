 
@router.get("/", response_model=List[schemas.TripScheduleResponse])
async def get_trip_schedules(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    schedules = db.query(models.TripSchedule).filter(
        models.TripSchedule.agency_id == current_user.agency_id
    ).offset(skip).limit(limit).all()
   
    result = []
    for schedule in schedules:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == schedule.vehicle_id).first() if schedule.vehicle_id else None
        driver = db.query(models.Driver).filter(models.Driver.id == schedule.driver_id).first() if schedule.driver_id else None
        company = db.query(models.Company).filter(models.Company.id == schedule.company_id).first() if schedule.company_id else None
       
        # Get the driver's name from the user relationship
        driver_name = driver.user.name if (driver and hasattr(driver, 'user') and driver.user) else None
       
        result.append(schemas.TripScheduleResponse(
            id=schedule.id,
            agency_id=schedule.agency_id,  # Added agency_id
            user_id=schedule.user_id,  # Added user_id
            company_id=schedule.company_id,
            company_name=company.company_name if company else schedule.company_name,
            company_branch=company.company_branch if company else schedule.company_branch,
            start_date=schedule.start_date,
            end_date=schedule.end_date,
            starting_point=schedule.starting_point,
            end_point=schedule.end_point,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            way=schedule.way,
            trip_type=schedule.trip_type,
            vehicle_id=schedule.vehicle_id,
            driver_id=schedule.driver_id,
            passenger_count=schedule.passenger_count,
            notes=schedule.notes,
            distance_km=schedule.distance_km,
            duration_min=schedule.duration_min,
            starting_lat=schedule.starting_lat,
            starting_lng=schedule.starting_lng,
            end_lat=schedule.end_lat,
            end_lng=schedule.end_lng,
           
            is_active=schedule.is_active,  # Added is_active
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
            vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
            driver_name=driver_name
        ))
   
    return result
 
@router.get("/driver/{driver_id}", response_model=List[schemas.TripScheduleResponse])
async def get_trips_by_driver_id(
    driver_id: str,
    start_date: Optional[date] = Query(None, description="Filter trips starting on or after this date"),
    end_date: Optional[date] = Query(None, description="Filter trips starting on or before this date"),
    status: Optional[str] = Query(None, description="Filter by trip status"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all trips assigned to a specific driver.
    """
    # Verify the driver exists and belongs to the same agency
    driver = db.query(models.User).filter(
        models.User.id == driver_id,
        models.User.role == models.UserRole.DRIVER,
        models.User.agency_id == current_user.agency_id
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found or not authorized"
        )
    
    # Build the base query
    query = db.query(models.TripSchedule).filter(
        models.TripSchedule.driver_id == driver_id,
        models.TripSchedule.agency_id == current_user.agency_id
    )
    
    # Apply filters
    if start_date:
        query = query.filter(models.TripSchedule.start_date >= start_date)
    if end_date:
        query = query.filter(models.TripSchedule.start_date <= end_date)
    if status:
        query = query.filter(models.TripSchedule.status == status)
    
    # Order by start date and time
    trips = query.order_by(
        models.TripSchedule.start_date,
        models.TripSchedule.start_time
    ).all()
    
    # Format the response with related data
    result = []
    for trip in trips:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first() if trip.vehicle_id else None
        driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first() if trip.driver_id else None
        company = db.query(models.Company).filter(models.Company.id == trip.company_id).first() if trip.company_id else None
        
        result.append(schemas.TripScheduleResponse(
            id=trip.id,
            agency_id=trip.agency_id,
            user_id=trip.user_id,
            company_id=trip.company_id,
            company_name=company.company_name if company else trip.company_name,
            company_branch=company.company_branch if company else trip.company_branch,
            start_date=trip.start_date,
            end_date=trip.end_date,
            starting_point=trip.starting_point,
            end_point=trip.end_point,
            start_time=trip.start_time,
            end_time=trip.end_time,
            way=trip.way,
            trip_type=trip.trip_type,
            vehicle_id=trip.vehicle_id,
            driver_id=trip.driver_id,
            passenger_count=trip.passenger_count,
            distance_km=trip.distance_km,
            duration_min=trip.duration_min,
            starting_lat=trip.starting_lat,
            starting_lng=trip.starting_lng,
            end_lat=trip.end_lat,
            end_lng=trip.end_lng,
            notes=trip.notes,
            is_active=trip.is_active,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
            vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
            driver_name=driver.user.name if (driver and hasattr(driver, 'user') and driver.user) else None
        ))
    
    return result


@router.put("/driver/{trip_id}", response_model=schemas.TripScheduleResponse)
async def update_trip_by_driver(
    trip_id: str,
    trip_update: schemas.TripScheduleUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a trip by the driver (limited fields).
    Drivers can only update specific fields of their assigned trips.
    """
    # Get the trip
    db_trip = db.query(models.TripSchedule).filter(
        models.TripSchedule.id == trip_id,
        models.TripSchedule.driver_id == current_user.id,
        models.TripSchedule.agency_id == current_user.agency_id
    ).first()
    
    if not db_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or not authorized"
        )
    
    # Only allow updating specific fields
    update_data = trip_update.dict(exclude_unset=True)
    allowed_fields = [
        'status', 'start_odometer', 'end_odometer', 'fuel_consumed',
        'starting_point', 'end_point', 'way', 'notes'
    ]
    
    # Filter out disallowed fields
    update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    # Update the trip
    for field, value in update_data.items():
        setattr(db_trip, field, value)
    
    db_trip.updated_at = datetime.now(timezone.utc)
    
    try:
        db.commit()
        db.refresh(db_trip)
        
        # Get related data for response
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == db_trip.vehicle_id).first() if db_trip.vehicle_id else None
        driver = db.query(models.Driver).filter(models.Driver.id == db_trip.driver_id).first() if db_trip.driver_id else None
        company = db.query(models.Company).filter(models.Company.id == db_trip.company_id).first() if db_trip.company_id else None
        
        return schemas.TripScheduleResponse(
            id=db_trip.id,
            agency_id=db_trip.agency_id,
            user_id=db_trip.user_id,
            company_id=db_trip.company_id,
            company_name=company.company_name if company else db_trip.company_name,
            company_branch=company.company_branch if company else db_trip.company_branch,
            start_date=db_trip.start_date,
            end_date=db_trip.end_date,
            starting_point=db_trip.starting_point,
            end_point=db_trip.end_point,
            start_time=db_trip.start_time,
            end_time=db_trip.end_time,
            way=db_trip.way,
            trip_type=db_trip.trip_type,
            vehicle_id=db_trip.vehicle_id,
            driver_id=db_trip.driver_id,
            passenger_count=db_trip.passenger_count,
            notes=db_trip.notes,
            is_active=db_trip.is_active,
            created_at=db_trip.created_at,
            updated_at=db_trip.updated_at,
            vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
            driver_name=driver.user.name if (driver and hasattr(driver, 'user') and driver.user) else None,
            status=db_trip.status,
            start_odometer=db_trip.start_odometer,
            end_odometer=db_trip.end_odometer,
            fuel_consumed=db_trip.fuel_consumed
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating trip: {str(e)}"
        )
@router.get("/agency/{agency_id}/active-trips", response_model=List[schemas.TripScheduleResponse])
async def get_active_trips_for_agency(
    agency_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all currently active trips for a specific agency.
    A trip is considered active if the current time is between its start and end times.
    """
    current_time = datetime.now(timezone.utc).time()
    current_date = datetime.now(timezone.utc).date()
    
    # First, get all trips for the agency that are scheduled for today
    trips = db.query(models.TripSchedule).filter(
        models.TripSchedule.agency_id == agency_id,
        models.TripSchedule.is_active == True,
        models.TripSchedule.start_date <= current_date,
        models.TripSchedule.end_date >= current_date
    ).all()
    
    # Then filter in Python to check the time window
    active_trips = []
    for trip in trips:
        if (trip.start_time <= current_time <= trip.end_time and 
            trip.start_date <= current_date <= (trip.end_date or current_date)):
            active_trips.append(trip)
    
    # Get related data for the response
    result = []
    for trip in active_trips:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first() if trip.vehicle_id else None
        driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first() if trip.driver_id else None
        company = db.query(models.Company).filter(models.Company.id == trip.company_id).first() if trip.company_id else None
        
        result.append(schemas.TripScheduleResponse(
            id=trip.id,
            agency_id=trip.agency_id,
            user_id=trip.user_id,
            company_id=trip.company_id,
            company_name=company.company_name if company else trip.company_name,
            company_branch=company.company_branch if company else trip.company_branch,
            start_date=trip.start_date,
            end_date=trip.end_date,
            starting_point=trip.starting_point,
            end_point=trip.end_point,
            start_time=trip.start_time,
            end_time=trip.end_time,
            way=trip.way,
            trip_type=trip.trip_type,
            vehicle_id=trip.vehicle_id,
            driver_id=trip.driver_id,
            passenger_count=trip.passenger_count,
            distance_km=trip.distance_km,
            duration_min=trip.duration_min,
            starting_lat=trip.starting_lat,
            starting_lng=trip.starting_lng,
            end_lat=trip.end_lat,
            end_lng=trip.end_lng,
            notes=trip.notes,
            is_active=trip.is_active,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
            vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
            driver_name=driver.user.name if (driver and hasattr(driver, 'user') and driver.user) else None
        ))
    
    return result
