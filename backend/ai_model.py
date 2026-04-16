import os
from PIL import Image
import imagehash
import json
from inference_sdk import InferenceHTTPClient

try:
    CLIENT = InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key="A6Iqvc4QbWI4l5vnHW6F"
    )
except Exception as e:
    print(f"Error initializing InferenceHTTPClient: {e}")
    CLIENT = None

def compute_image_hash(image_path: str) -> str:
    """Computes perceptual hash of an image for duplicate detection"""
    try:
        img = Image.open(image_path)
        hash_val = imagehash.phash(img)
        return str(hash_val)
    except Exception as e:
        print(f"Error computing image hash: {e}")
        return ""

def is_duplicate_hash(new_hash: str, db_hashes: list[str], threshold: int = 5) -> bool:
    """Checks if new_hash is very similar to any db_hashes"""
    if not new_hash:
        return False
    new_h = imagehash.hex_to_hash(new_hash)
    for h in db_hashes:
        try:
            db_h = imagehash.hex_to_hash(h)
            if new_h - db_h < threshold:
                return True
        except:
            continue
    return False

def run_damage_detection(image_path: str):
    """Runs Roboflow HTTP model and returns dict with confidence, type, and boxes"""
    if CLIENT is None:
        return {
            "ai_confidence": 0.0,
            "damage_type": "Unknown",
            "bounding_boxes": "[]"
        }
        
    try:
        results = CLIENT.infer(
            image_path,
            model_id="infrastructure-dtiwq-gsfwr/1"
        )
    except Exception as e:
        print(f"Error during inference: {e}")
        return {
            "ai_confidence": 0.0,
            "damage_type": "Error",
            "bounding_boxes": "[]"
        }

    predictions = results.get("predictions", [])
    if not len(predictions):
        return {
            "ai_confidence": 0.0,
            "damage_type": "None",
            "bounding_boxes": "[]"
        }
    
    # We will aggregate to find highest confidence and average
    highest_conf = 0.0
    damage_label = "damage"
    box_list = []
    
    for pred in predictions:
        conf = float(pred.get("confidence", 0.0))
        cls = int(pred.get("class_id", 0))
        cls_name = pred.get("class", "Unknown")
        
        x = pred.get("x", 0)
        y = pred.get("y", 0)
        w = pred.get("width", 0)
        h = pred.get("height", 0)
        
        x1 = x - w/2
        y1 = y - h/2
        x2 = x + w/2
        y2 = y + h/2
        
        box_data = [x1, y1, x2, y2]
        box_list.append({"box": box_data, "confidence": conf, "class": cls})
        
        if conf > highest_conf:
            highest_conf = conf
            damage_label = cls_name
            
    return {
        "ai_confidence": highest_conf,
        "damage_type": damage_label,
        "bounding_boxes": json.dumps(box_list)
    }

def calculate_priority_score(ai_confidence: float, location_importance: float, duplicate_count: int) -> tuple[float, str]:
    """
    Computes priority based on metrics.
    ai_confidence: 0.0 to 1.0
    location_importance: 1.0 to 10.0
    duplicate_count: num of times reported
    """
    # Base score out of 100
    score = (ai_confidence * 40) + ((location_importance / 10) * 40) + (min(duplicate_count, 10) * 2)
    
    level = "Low"
    if score >= 80:
        level = "Critical"
    elif score >= 55:
        level = "High"
    elif score >= 35:
        level = "Medium"
        
    return score, level
