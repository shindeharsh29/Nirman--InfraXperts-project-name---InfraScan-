import streamlit as st
from inference_sdk import InferenceHTTPClient
from PIL import Image
import tempfile
import os

# Set page config
st.set_page_config(page_title="AI InfraScan", page_icon="🚧")

# Roboflow API setup (prioritize env var -> secrets -> hardcoded fallback)
def get_api_key():
    # 1. Try Environment Variable
    if "ROBOFLOW_API_KEY" in os.environ:
        return os.environ["ROBOFLOW_API_KEY"]
    
    # 2. Try Streamlit Secrets (safely)
    try:
        return st.secrets["ROBOFLOW_API_KEY"]
    except:
        pass
        
    # 3. Hardcoded Fallback
    return "A6Iqvc4QbWI4l5vnHW6F"

API_KEY = get_api_key()

try:
    CLIENT = InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key=API_KEY
    )
except Exception as e:
    CLIENT = None
    st.error(f"Failed to initialize Inference Client: {e}")

st.title("🚧 AI InfraScan")

uploaded_file = st.file_uploader("Upload Infrastructure Image", type=["jpg", "jpeg", "png"])

if uploaded_file:
    image = Image.open(uploaded_file)
    st.image(image, caption="Uploaded Image", use_container_width=True)

    # Save temp file for InferenceHTTPClient
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
        # Reset file pointer to beginning before reading
        uploaded_file.seek(0)
        temp.write(uploaded_file.read())
        temp_path = temp.name

    if st.button("Detect Damage"):
        if not CLIENT:
            st.error("Inference client is not configured properly.")
        else:
            with st.spinner("Analyzing image..."):
                try:
                    result = CLIENT.infer(
                        temp_path,
                        model_id="infrastructure-dtiwq-gsfwr/1"
                    )

                    st.subheader("Detection Results")
                    
                    predictions = result.get("predictions", [])
                    if not predictions:
                        st.success("No critical damage detected! 🎉")
                    else:
                        for pred in predictions:
                            label = pred.get("class", "Unknown")
                            conf = round(pred.get("confidence", 0.0), 2)
                
                            priority = "HIGH 🚨" if label in ["pothole", "pipe-burst", "fallen-trees"] else "LOW ⚠️"
                
                            st.write(f"**{label.title()}** → {priority} *(Confidence: {conf:.2f})*")
                            
                except Exception as e:
                    st.error(f"Error during inference: {e}")
            
            # Clean up temporary file
            try:
                os.remove(temp_path)
            except OSError:
                pass