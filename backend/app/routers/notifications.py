from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.database import get_db
from app import models, schemas, auth
from datetime import datetime, timedelta
import uuid

router = APIRouter()

def calculate_days_remaining(expiry_date: datetime) -> int:
    """Calculate days remaining until expiry date"""
    if not expiry_date:
        return 0
    today = datetime.now().date()
    expiry = expiry_date.date()
    delta = expiry - today
    return max(0, delta.days)

def determine_severity(days_remaining: int) -> str:
    """Determine severity based on days remaining"""
    if days_remaining <= 15:
        return 'critical'
    elif days_remaining <= 30:
        return 'warning'
    elif days_remaining <= 90:
        return 'info'
    else:
        return None  # Don't notify if more than 90 days

def get_driver_notifications(db: Session, agency_id: Optional[str] = None) -> List[dict]:
    """Get notifications for driver document expiries"""
    notifications = []
    
    # Query drivers with their user information
    query = db.query(models.Driver, models.User).join(
        models.User, models.Driver.id == models.User.id
    ).filter(models.User.is_active == True)
    
    if agency_id:
        query = query.filter(models.User.agency_id == agency_id)
    
    drivers = query.all()
    
    for driver, user in drivers:
        # Check driving license expiry
        if driver.license_expiry_date:
            days_remaining = calculate_days_remaining(driver.license_expiry_date)
            severity = determine_severity(days_remaining)
            
            if severity:
                notifications.append({
                    'id': f"driver_license_{driver.id}",
                    'type': 'driver',
                    'title': 'Driving License Expiry',
                    'description': f'{user.name}\'s driving license is expiring soon',
                    'expiry_date': driver.license_expiry_date,
                    'days_remaining': days_remaining,
                    'severity': severity,
                    'entity_id': driver.id,
                    'entity_name': user.name,
                    'document_type': 'Driving License'
                })
        
        # Note: Add medical fitness certificate expiry if you have this field
        # Currently medical_fitness_certificate is just a file path, not a date
        # You would need to add medical_fitness_expiry_date field to the model
    
    return notifications

def get_vehicle_notifications(db: Session, agency_id: Optional[str] = None) -> List[dict]:
    """Get notifications for vehicle document expiries"""
    notifications = []
    
    # Query vehicles with their user information
    query = db.query(models.Vehicle, models.User).join(
        models.User, models.Vehicle.user_id == models.User.id
    ).filter(models.Vehicle.is_active == True)
    
    if agency_id:
        query = query.filter(models.User.agency_id == agency_id)
    
    vehicles = query.all()
    
    for vehicle, user in vehicles:
        vehicle_name = f"{vehicle.vehicle_registration_number} ({vehicle.vehicle_brand} {vehicle.vehicle_model})"
        
        # Check insurance expiry
        if vehicle.insurance_expiry:
            days_remaining = calculate_days_remaining(vehicle.insurance_expiry)
            severity = determine_severity(days_remaining)
            
            if severity:
                notifications.append({
                    'id': f"vehicle_insurance_{vehicle.id}",
                    'type': 'vehicle',
                    'title': 'Insurance Expiry',
                    'description': f'Vehicle {vehicle.vehicle_registration_number} insurance is expiring',
                    'expiry_date': vehicle.insurance_expiry,
                    'days_remaining': days_remaining,
                    'severity': severity,
                    'entity_id': str(vehicle.id),
                    'entity_name': vehicle.vehicle_registration_number,
                    'document_type': 'Insurance'
                })
        
        # Check registration expiry
        if vehicle.registration_expiry:
            days_remaining = calculate_days_remaining(vehicle.registration_expiry)
            severity = determine_severity(days_remaining)
            
            if severity:
                notifications.append({
                    'id': f"vehicle_registration_{vehicle.id}",
                    'type': 'vehicle',
                    'title': 'Registration Certificate Expiry',
                    'description': f'Vehicle {vehicle.vehicle_registration_number} registration is expiring',
                    'expiry_date': vehicle.registration_expiry,
                    'days_remaining': days_remaining,
                    'severity': severity,
                    'entity_id': str(vehicle.id),
                    'entity_name': vehicle.vehicle_registration_number,
                    'document_type': 'Registration Certificate'
                })
        
        # Check PUC expiry
        if vehicle.puc_expiry:
            days_remaining = calculate_days_remaining(vehicle.puc_expiry)
            severity = determine_severity(days_remaining)
            
            if severity:
                notifications.append({
                    'id': f"vehicle_puc_{vehicle.id}",
                    'type': 'vehicle',
                    'title': 'PUC Certificate Expiry',
                    'description': f'Vehicle {vehicle.vehicle_registration_number} PUC certificate is expiring',
                    'expiry_date': vehicle.puc_expiry,
                    'days_remaining': days_remaining,
                    'severity': severity,
                    'entity_id': str(vehicle.id),
                    'entity_name': vehicle.vehicle_registration_number,
                    'document_type': 'PUC Certificate'
                })
        
        # Check service expiry
        if vehicle.service_expiry:
            days_remaining = calculate_days_remaining(vehicle.service_expiry)
            severity = determine_severity(days_remaining)
            
            if severity:
                notifications.append({
                    'id': f"vehicle_service_{vehicle.id}",
                    'type': 'vehicle',
                    'title': 'Service Due',
                    'description': f'Vehicle {vehicle.vehicle_registration_number} service is due',
                    'expiry_date': vehicle.service_expiry,
                    'days_remaining': days_remaining,
                    'severity': severity,
                    'entity_id': str(vehicle.id),
                    'entity_name': vehicle.vehicle_registration_number,
                    'document_type': 'Service Due'
                })
    
    return notifications

@router.get("/", response_model=List[schemas.NotificationResponse])
def get_notifications(
    type: Optional[str] = Query(None, description="Filter by type: driver or vehicle"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical, warning, info"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all expiry notifications for the current user's agency.
    Returns notifications for drivers and vehicles with documents expiring within 90 days.
    """
    # Get agency_id from current user
    agency_id = current_user.agency_id
    
    # Get all notifications
    all_notifications = []
    
    # Only get notifications if type is not specified or is 'driver'
    if not type or type == 'driver':
        driver_notifications = get_driver_notifications(db, agency_id)
        all_notifications.extend(driver_notifications)
    
    # Only get notifications if type is not specified or is 'vehicle'
    if not type or type == 'vehicle':
        vehicle_notifications = get_vehicle_notifications(db, agency_id)
        all_notifications.extend(vehicle_notifications)
    
    # Filter by severity if specified
    if severity:
        all_notifications = [n for n in all_notifications if n['severity'] == severity]
    
    # Sort by days remaining (ascending - most urgent first)
    all_notifications.sort(key=lambda x: x['days_remaining'])
    
    # Convert to response schema
    response_notifications = []
    for notif in all_notifications:
        response_notifications.append(schemas.NotificationResponse(**notif))
    
    return response_notifications

@router.get("/summary", response_model=schemas.NotificationSummary)
def get_notification_summary(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a summary of all notifications including counts by severity.
    """
    # Get agency_id from current user
    agency_id = current_user.agency_id
    
    # Get all notifications
    driver_notifications = get_driver_notifications(db, agency_id)
    vehicle_notifications = get_vehicle_notifications(db, agency_id)
    all_notifications = driver_notifications + vehicle_notifications
    
    # Sort by days remaining
    all_notifications.sort(key=lambda x: x['days_remaining'])
    
    # Count by severity
    critical_count = len([n for n in all_notifications if n['severity'] == 'critical'])
    warning_count = len([n for n in all_notifications if n['severity'] == 'warning'])
    info_count = len([n for n in all_notifications if n['severity'] == 'info'])
    
    # Convert to response schema
    response_notifications = []
    for notif in all_notifications:
        response_notifications.append(schemas.NotificationResponse(**notif))
    
    return schemas.NotificationSummary(
        total_count=len(all_notifications),
        critical_count=critical_count,
        warning_count=warning_count,
        info_count=info_count,
        notifications=response_notifications
    )

@router.get("/count")
def get_notification_count(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get just the count of notifications for the badge indicator.
    """
    # Get agency_id from current user
    agency_id = current_user.agency_id
    
    # Get all notifications
    driver_notifications = get_driver_notifications(db, agency_id)
    vehicle_notifications = get_vehicle_notifications(db, agency_id)
    all_notifications = driver_notifications + vehicle_notifications
    
    return {
        "count": len(all_notifications),
        "critical_count": len([n for n in all_notifications if n['severity'] == 'critical']),
        "warning_count": len([n for n in all_notifications if n['severity'] == 'warning']),
        "info_count": len([n for n in all_notifications if n['severity'] == 'info'])
    }

@router.delete("/{notification_id}")
def mark_notification_resolved(
    notification_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as resolved.
    Note: This is a placeholder implementation.
    In a real system, you might want to store resolved notifications in a separate table
    or add a 'resolved' field to track which notifications have been acknowledged.
    """
    # For now, we'll just return success
    # In a future implementation, you could:
    # 1. Add a 'resolved_at' field to a notifications table
    # 2. Store the notification_id in a 'resolved_notifications' table
    # 3. Add a flag to the driver/vehicle record indicating the notification was acknowledged
    
    return {"message": "Notification marked as resolved", "notification_id": notification_id}

@router.get("/stats/dashboard")
def get_dashboard_stats(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get notification statistics for dashboard display.
    """
    # Get agency_id from current user
    agency_id = current_user.agency_id
    
    # Get all notifications
    driver_notifications = get_driver_notifications(db, agency_id)
    vehicle_notifications = get_vehicle_notifications(db, agency_id)
    all_notifications = driver_notifications + vehicle_notifications
    
    # Calculate statistics
    total_notifications = len(all_notifications)
    critical_notifications = len([n for n in all_notifications if n['severity'] == 'critical'])
    warning_notifications = len([n for n in all_notifications if n['severity'] == 'warning'])
    
    # Count by type
    driver_count = len(driver_notifications)
    vehicle_count = len(vehicle_notifications)
    
    # Count by document type
    doc_type_counts = {}
    for notif in all_notifications:
        doc_type = notif['document_type']
        doc_type_counts[doc_type] = doc_type_counts.get(doc_type, 0) + 1
    
    return {
        "total_notifications": total_notifications,
        "critical_notifications": critical_notifications,
        "warning_notifications": warning_notifications,
        "by_type": {
            "driver": driver_count,
            "vehicle": vehicle_count
        },
        "by_document_type": doc_type_counts,
        "upcoming_this_week": len([n for n in all_notifications if n['days_remaining'] <= 7]),
        "upcoming_this_month": len([n for n in all_notifications if n['days_remaining'] <= 30])
    }
