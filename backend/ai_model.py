import os
import json
from PIL import Image, ImageStat
import imagehash

# ─── Trained Roboflow Model ───────────────────────────────────────────────
CLIENT = None
try:
    from inference_sdk import InferenceHTTPClient
    CLIENT = InferenceHTTPClient(
        api_url="https://detect.roboflow.com",
        api_key="A6Iqvc4QbWI4l5vnHW6F"
    )
except Exception as e:
    print(f"⚠️  Roboflow client not available: {e}")

# (Keep YOLO imports for completeness or remove if redundant, choosing to focus on Roboflow as requested)
YOLO_MODEL = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolov8n.pt")

def _get_yolo():
    global YOLO_MODEL
    if YOLO_MODEL is None:
        try:
            from ultralytics import YOLO
            YOLO_MODEL = YOLO(MODEL_PATH)
            print("✅ Local YOLOv8 placeholder loaded")
        except Exception as e:
            pass
    return YOLO_MODEL


def compute_image_hash(image_path: str) -> str:
    """Computes perceptual hash of an image for duplicate detection"""
    try:
        img = Image.open(image_path)
        return str(imagehash.phash(img))
    except Exception as e:
        print(f"Error computing image hash: {e}")
        return ""


def is_duplicate_hash(new_hash: str, db_hashes: list, threshold: int = 5) -> bool:
    """Checks if new_hash is very similar to any db_hashes"""
    if not new_hash:
        return False
    try:
        new_h = imagehash.hex_to_hash(new_hash)
    except Exception:
        return False
    for h in db_hashes:
        try:
            if new_h - imagehash.hex_to_hash(h) < threshold:
                return True
        except Exception:
            continue
    return False


def _heuristic_damage_score(image_path: str) -> dict:
    """
    Fallback heuristic when no specialised model fires detections.
    Uses image statistics (contrast, darkness, edge complexity) to
    estimate the likelihood that the image shows infrastructure damage.
    Returns confidence in [0, 1] and a textual damage type.
    """
    try:
        img = Image.open(image_path).convert("L").resize((128, 128))
        stat = ImageStat.Stat(img)
        mean_brightness = stat.mean[0] / 255.0        # 0=black, 1=white
        std_dev = stat.stddev[0] / 128.0              # normalised contrast

        # Darker, high-contrast images are more likely to show cracks/damage
        damage_signal = min(1.0, (1.0 - mean_brightness) * 0.6 + std_dev * 0.4)

        # Classify type by brightness band
        if mean_brightness < 0.3:
            damage_type = "Structural Crack"
        elif mean_brightness < 0.55:
            damage_type = "Pothole / Surface Damage"
        else:
            damage_type = "Minor Surface Wear"

        return {"ai_confidence": round(damage_signal, 3), "damage_type": damage_type}
    except Exception as e:
        print(f"Heuristic error: {e}")
        return {"ai_confidence": 0.15, "damage_type": "Unknown Damage"}


def run_damage_detection(image_path: str) -> dict:
    """
    Primary AI pipeline:
    1. Try Trained Roboflow Model (infrastructure-dtiwq-gsfwr/1)
    2. Fall back to local generic YOLOv11 (if available/desired)
    3. Fall back to image-statistics heuristic
    Returns: { ai_confidence, damage_type, bounding_boxes }
    """
    
    # ── 1. Roboflow Trained Model ─────────────────────────────────────────
    if CLIENT is not None:
        try:
            # Note: infrastructure-dtiwq-gsfwr/1 is the user's trained dataset
            result = CLIENT.infer(image_path, model_id="infrastructure-dtiwq-gsfwr/1")
            predictions = result.get("predictions", [])
            
            if predictions:
                highest_conf = 0.0
                damage_label = "Unclassified Damage"
                box_list = []
                
                for pred in predictions:
                    conf = pred.get("confidence", 0)
                    label = pred.get("class", "Damage")
                    # Roboflow returns [x, y, width, height] for center
                    cx, cy = pred.get("x", 0), pred.get("y", 0)
                    w, h = pred.get("width", 0), pred.get("height", 0)
                    x1, y1 = cx - w/2, cy - h/2
                    x2, y2 = cx + w/2, cy + h/2
                    
                    box_list.append({
                        "box": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": float(conf),
                        "class": str(label)
                    })
                    
                    if conf > highest_conf:
                        highest_conf = conf
                        damage_label = label
                
                return {
                    "ai_confidence": round(highest_conf, 3),
                    "damage_type": damage_label,
                    "bounding_boxes": json.dumps(box_list)
                }
        except Exception as e:
            print(f"Roboflow inference failed (using backup): {e}")

    # ── 2. Local fallback (YOLOv8 Placeholder) ───────────────────────────
    model = _get_yolo()
    if model is not None:
        try:
            results = model(image_path, verbose=False, conf=0.15)
            boxes = results[0].boxes
            if len(boxes):
                names = results[0].names
                box_list = []
                highest_conf = 0.0
                damage_label = "Structural Damage"

                for i, box in enumerate(boxes):
                    conf = float(box.conf[0])
                    cls_name = names[int(box.cls[0])]
                    x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                    box_list.append({
                        "box": [x1, y1, x2, y2],
                        "confidence": conf,
                        "class": cls_name
                    })
                    if conf > highest_conf:
                        highest_conf = conf
                        damage_label = cls_name

                return {
                    "ai_confidence": round(highest_conf, 3),
                    "damage_type": damage_label,
                    "bounding_boxes": json.dumps(box_list)
                }
        except Exception:
            pass

    # ── 3. Heuristic fallback ──────────────────────────────────────────────
    h = _heuristic_damage_score(image_path)
    return {
        "ai_confidence": h["ai_confidence"],
        "damage_type": h["damage_type"],
        "bounding_boxes": "[]"
    }



# ── Priority & Severity Mapping ───────────────────────────────────────────
INFRASTRUCTURE_SEVERITY = {
    # High Priority (Multiplier > 1.5)
    "structural-failure": 2.5,
    "collapsed": 2.2,
    "severe-crack": 1.8,
    "exposed-rebar": 1.7,
    
    # Medium Priority (Multiplier 1.1–1.5)
    "pothole": 1.4,
    "crack": 1.2,
    "rutting": 1.2,
    "damaged-sign": 1.1,
    "graffiti": 1.05,
    
    # Defaults
    "damage": 1.1,
    "Structural Damage": 1.2,
    "Structural Crack": 1.3,
    "Pothole / Surface Damage": 1.15
}

# Labels that should be ignored when they come from general fallback models
NOISE_LABELS = {
    "tv", "clock", "airplane", "dog", "person", "cat", "chair", "couch", 
    "potted plant", "dining table", "cell phone", "remote", "book"
}

def run_damage_detection(image_path: str) -> dict:
    """
    Primary AI pipeline:
    1. Try Trained Roboflow Model (infrastructure-dtiwq-gsfwr/1)
    2. Fall back to local generic YOLOv8 (filtered for relevance)
    3. Fall back to image-statistics heuristic
    Returns: { ai_confidence, damage_type, bounding_boxes }
    """
    
    # ── 1. Roboflow Trained Model (Highest Priority) ─────────────────────
    if CLIENT is not None:
        try:
            result = CLIENT.infer(image_path, model_id="infrastructure-dtiwq-gsfwr/1")
            predictions = result.get("predictions", [])
            
            if predictions:
                highest_conf = 0.0
                damage_label = "Unclassified Damage"
                box_list = []
                
                for pred in predictions:
                    conf = pred.get("confidence", 0)
                    label = pred.get("class", "Damage")
                    cx, cy = pred.get("x", 0), pred.get("y", 0)
                    w, h = pred.get("width", 0), pred.get("height", 0)
                    x1, y1 = cx - w/2, cy - h/2
                    x2, y2 = cx + w/2, cy + h/2
                    
                    box_list.append({
                        "box": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": float(conf),
                        "class": str(label)
                    })
                    
                    if conf > highest_conf:
                        highest_conf = conf
                        damage_label = label
                
                return {
                    "ai_confidence": round(highest_conf, 3),
                    "damage_type": damage_label,
                    "bounding_boxes": json.dumps(box_list)
                }
        except Exception as e:
            print(f"Roboflow inference failed: {e}")

    # ── 2. Local fallback (YOLOv8) with Noise Filtering ─────────────────
    model = _get_yolo()
    if model is not None:
        try:
            results = model(image_path, verbose=False, conf=0.15)
            boxes = results[0].boxes
            if len(boxes):
                names = results[0].names
                box_list = []
                highest_conf = 0.0
                damage_label = None

                for i, box in enumerate(boxes):
                    conf = float(box.conf[0])
                    cls_name = names[int(box.cls[0])]
                    
                    # Ignore non-infrastructure objects from general model
                    if cls_name.lower() in NOISE_LABELS:
                        continue
                        
                    x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                    box_list.append({
                        "box": [x1, y1, x2, y2],
                        "confidence": conf,
                        "class": cls_name
                    })
                    if damage_label is None or conf > highest_conf:
                        highest_conf = conf
                        damage_label = cls_name

                if damage_label:
                    return {
                        "ai_confidence": round(highest_conf, 3),
                        "damage_type": damage_label,
                        "bounding_boxes": json.dumps(box_list)
                    }
        except Exception:
            pass

    # ── 3. Heuristic fallback ──────────────────────────────────────────────
    h = _heuristic_damage_score(image_path)
    return {
        "ai_confidence": h["ai_confidence"],
        "damage_type": h["damage_type"],
        "bounding_boxes": "[]"
    }


def calculate_priority_score(ai_confidence: float, location_importance: float, duplicate_count: int, damage_type: str = "") -> tuple:
    """
    Computes priority based on metrics and damage severity.
    """
    # Base multiplier for severity
    severity_multiplier = INFRASTRUCTURE_SEVERITY.get(damage_type, 1.0)
    
    # Calculate score with severity weighting
    # (ai_conf * multiplier * 40) caps at 40 unless severity is high
    base_ai_score = (ai_confidence * 40) * severity_multiplier
    loc_score = (location_importance / 10.0) * 40
    dup_score = min(duplicate_count, 10) * 2
    
    score = base_ai_score + loc_score + dup_score

    # Final Level determination
    if score >= 80:
        level = "Critical"
    elif score >= 55:
        level = "High"
    elif score >= 35:
        level = "Medium"
    else:
        level = "Low"

    return round(min(score, 100), 2), level
