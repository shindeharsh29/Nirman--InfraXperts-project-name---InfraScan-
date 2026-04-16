from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
import shutil
import os
from datetime import datetime
from typing import List, Optional
from jose import JWTError, jwt

import models, schemas, database, ai_model, auth
import httpx  # for proxying to mavlink bridge

# Create schema if not exists
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="InfraScan API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Dependency to get current user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user

@app.get("/")
def read_root():
    return {"status": "ok", "message": "InfraScan API with Auth is running"}

# --- Auth Endpoints ---

@app.post("/api/auth/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = auth.get_password_hash(user.password)
    
    # Check if first user, make admin
    is_first = db.query(models.User).count() == 0
    
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=is_first
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Note: OAuth2PasswordRequestForm uses 'username', we map it to 'email' logic
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- Complaint Endpoints ---

@app.post("/api/complaints", response_model=schemas.Complaint)
async def create_complaint(
    description: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_name: Optional[str] = Form(None),
    location_importance_score: float = Form(5.0),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Save uploaded image
    file_extension = file.filename.split(".")[-1]
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Compute similarity hash
    img_hash = ai_model.compute_image_hash(file_path)
    
    # 3. Check for duplicates in last N verifications
    recent_verifications = db.query(models.ImageVerification).order_by(models.ImageVerification.id.desc()).limit(100).all()
    past_hashes = [v.image_hash for v in recent_verifications if v.image_hash]
    
    is_duplicate = ai_model.is_duplicate_hash(img_hash, past_hashes)
    
    # 4. Run AI model
    ai_result = ai_model.run_damage_detection(file_path)
    
    # 5. Calculate Priority
    duplicate_count = 1 if not is_duplicate else 5 
    score, priority_level = ai_model.calculate_priority_score(
        ai_result["ai_confidence"], 
        location_importance_score, 
        duplicate_count
    )
    
    # 6. Save to DB
    new_complaint = models.Complaint(
        description=description,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        location_importance_score=location_importance_score,
        image_path=f"/uploads/{filename}",
        status="Pending" if not is_duplicate else "Rejected (Duplicate)",
        priority_level=priority_level,
        priority_score=score,
        reporter_id=current_user.id
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    # 7. Add verification record
    verification = models.ImageVerification(
        complaint_id=new_complaint.id,
        image_hash=img_hash,
        ai_confidence=ai_result["ai_confidence"],
        damage_type=ai_result["damage_type"],
        bounding_boxes=ai_result["bounding_boxes"],
        verification_source="User"
    )
    db.add(verification)
    db.commit()
    
    db.refresh(new_complaint)
    return new_complaint

@app.get("/api/complaints", response_model=List[schemas.Complaint])
def get_complaints(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_admin_user)):
    complaints = db.query(models.Complaint).order_by(models.Complaint.priority_score.desc()).offset(skip).limit(limit).all()
    return complaints

@app.get("/api/users/my-complaints", response_model=List[schemas.Complaint])
def get_my_complaints(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    complaints = db.query(models.Complaint).filter(models.Complaint.reporter_id == current_user.id).order_by(models.Complaint.created_at.desc()).offset(skip).limit(limit).all()
    return complaints

@app.put("/api/complaints/{complaint_id}/status", response_model=schemas.Complaint)
def update_complaint_status(complaint_id: int, status: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_admin_user)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint.status = status
    db.commit()
    db.refresh(complaint)
    return complaint

@app.post("/api/complaints/{complaint_id}/verify")
async def drone_verify_complaint(
    complaint_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    file_extension = file.filename.split(".")[-1]
    filename = f"drone_{complaint_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    ai_result = ai_model.run_damage_detection(file_path)
    img_hash = ai_model.compute_image_hash(file_path)
    
    verification = models.ImageVerification(
        complaint_id=complaint.id,
        image_hash=img_hash,
        ai_confidence=ai_result["ai_confidence"],
        damage_type=ai_result["damage_type"],
        bounding_boxes=ai_result["bounding_boxes"],
        verification_source="Drone"
    )
    db.add(verification)
    
    complaint.status = "Verified"
    score, priority_level = ai_model.calculate_priority_score(
        max(ai_result["ai_confidence"], complaint.priority_score / 100), 
        complaint.location_importance_score, 
        10
    )
    complaint.priority_score = score
    complaint.priority_level = priority_level
    
    db.commit()
    return {"message": "Drone verification complete", "new_score": score, "ai_result": ai_result}


# ─── Drone / MAVLink Bridge Proxy Endpoints ────────────────────────────────
BRIDGE_URL = "http://localhost:8001"

@app.get("/api/drone/telemetry")
async def get_drone_telemetry():
    """Proxy live drone telemetry from the MAVLink bridge."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{BRIDGE_URL}/telemetry")
            return r.json()
    except Exception:
        # Bridge not running — return a safe disconnected state
        return {
            "lat": None, "lng": None, "alt": 0.0, "speed": 0.0,
            "heading": 0.0, "armed": False, "mode": "DISCONNECTED",
            "battery": 0, "connected": False, "stale": True
        }

@app.post("/api/drone/dispatch/{complaint_id}")
async def dispatch_drone_to_complaint(
    complaint_id: int,
    alt: float = 30.0,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Read complaint GPS, mark as Drone Dispatched, send MAVLink waypoint."""
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if not complaint.latitude or not complaint.longitude:
        raise HTTPException(status_code=400, detail="Complaint has no GPS coordinates")

    # Update status
    complaint.status = "Drone Dispatched"
    db.commit()

    # Send waypoint to bridge
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(f"{BRIDGE_URL}/waypoint", json={
                "lat": complaint.latitude,
                "lng": complaint.longitude,
                "alt": alt
            })
            bridge_result = r.json()
    except Exception:
        bridge_result = {"success": False, "error": "Bridge not running"}

    return {
        "complaint_id": complaint_id,
        "status": "Drone Dispatched",
        "waypoint": {"lat": complaint.latitude, "lng": complaint.longitude, "alt": alt},
        "bridge": bridge_result
    }

@app.post("/api/drone/return-home")
async def drone_return_home(current_user: models.User = Depends(get_current_admin_user)):
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.post(f"{BRIDGE_URL}/return-home")
            return r.json()
    except Exception:
        return {"success": False, "error": "Bridge not running"}

@app.post("/api/drone/land")
async def drone_land(current_user: models.User = Depends(get_current_admin_user)):
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.post(f"{BRIDGE_URL}/land")
            return r.json()
    except Exception:
        return {"success": False, "error": "Bridge not running"}
