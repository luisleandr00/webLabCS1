"""Local prediction API for CSILab. MNIST is forwarded to the supplied Azure Function."""

from __future__ import annotations

import base64
import binascii
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "final_models"
os.environ.setdefault("KERAS_HOME", str(ROOT / ".cache" / "keras"))
PET_MODEL_PATH = os.environ.get(
    "CSILAB_PET_MODEL", str(MODEL_DIR / "best_DenseNet121.keras")
)
PET_POSITIVE_CLASS = os.environ.get("CSILAB_PET_POSITIVE_CLASS", "Perro").capitalize()
MAX_REQUEST_BYTES = 14 * 1024 * 1024
MAX_IMAGE_BYTES = 10 * 1024 * 1024
_models = {}
_model_lock = threading.Lock()


def load_local_env():
    """Load local secrets while allowing real environment variables to take precedence."""
    for filename in (".env", ".env.local"):
        env_file = ROOT / filename
        if not env_file.is_file():
            continue
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            name, value = name.strip(), value.strip().strip("\"'")
            if name:
                os.environ.setdefault(name, value)


def image_bytes(image_base64):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    raw = base64.b64decode(image_base64, validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("La imagen supera el límite de 10 MB.")
    return raw


def decode_image(image_base64):
    from io import BytesIO
    from PIL import Image, ImageOps

    with Image.open(BytesIO(image_bytes(image_base64))) as image:
        image.load()
        return ImageOps.exif_transpose(image).copy()


def post_backend_prediction(route, image_base64):
    load_local_env()
    api_key = os.environ.get("CS1_API_LAB_1", "").strip()
    if not api_key or api_key.startswith("<"):
        raise RuntimeError("Falta configurar CS1_API_LAB_1 en .env.local.")

    raw = image_bytes(image_base64)
    boundary = "----CSILabBoundary" + os.urandom(12).hex()
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="image"; filename="input.png"\r\n'
        "Content-Type: application/octet-stream\r\n\r\n"
    ).encode("ascii") + raw + f"\r\n--{boundary}--\r\n".encode("ascii")
    base_url = os.environ.get(
        "CS1_API_BASE_URL", "https://cs1-lab1.mexicocentral.cloudapp.azure.com"
    ).rstrip("/")
    request = Request(
        f"{base_url}/{route}",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "x-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8-sig"))
    except HTTPError as error:
        raise RuntimeError(f"La API CS1 respondió con HTTP {error.code}.") from None
    except (URLError, TimeoutError, json.JSONDecodeError):
        raise RuntimeError("No se pudo conectar con la API CS1.") from None
    if not isinstance(data, dict) or data.get("error"):
        raise RuntimeError("La API CS1 devolvió un error de predicción.")
    return data


def get_pet_model():
    if "pets" not in _models:
        with _model_lock:
            if "pets" not in _models:
                import tensorflow as tf

                path = Path(os.environ.get("CSILAB_PET_MODEL", str(PET_MODEL_PATH)))
                if not path.is_absolute():
                    path = ROOT / path
                if not path.is_file():
                    raise FileNotFoundError(f"No se encontró el modelo: {path}")
                _models["pets"] = tf.keras.models.load_model(path, compile=False)
    return _models["pets"]


def get_mnist_model():
    if "mnist" not in _models:
        with _model_lock:
            if "mnist" not in _models:
                import tensorflow as tf

                model_path = MODEL_DIR / "mnist_cnn.keras"
                if model_path.is_file():
                    _models["mnist"] = tf.keras.models.load_model(model_path, compile=False)
                else:
                    (images, labels), _ = tf.keras.datasets.mnist.load_data()
                    images = images.astype("float32")[..., None] / 255.0
                    model = tf.keras.Sequential(
                        [
                            tf.keras.layers.Input(shape=(28, 28, 1)),
                            tf.keras.layers.Conv2D(32, 3, activation="relu"),
                            tf.keras.layers.MaxPooling2D(),
                            tf.keras.layers.Conv2D(64, 3, activation="relu"),
                            tf.keras.layers.MaxPooling2D(),
                            tf.keras.layers.Flatten(),
                            tf.keras.layers.Dropout(0.25),
                            tf.keras.layers.Dense(128, activation="relu"),
                            tf.keras.layers.Dense(10, activation="softmax"),
                        ]
                    )
                    model.compile(
                        optimizer="adam",
                        loss="sparse_categorical_crossentropy",
                        metrics=["accuracy"],
                    )
                    model.fit(images, labels, epochs=4, batch_size=128, verbose=0)
                    MODEL_DIR.mkdir(parents=True, exist_ok=True)
                    model.save(model_path)
                    _models["mnist"] = model
    return _models["mnist"]


def predict_pets_local(image_base64):
    import numpy as np

    image = decode_image(image_base64)
    model = get_pet_model()
    height, width = int(model.input_shape[1]), int(model.input_shape[2])
    resized = image.convert("RGB").resize((width, height))
    batch = np.asarray(resized, dtype=np.float32)[np.newaxis, ...] / 255.0
    prediction = np.asarray(model.predict(batch, verbose=0)).reshape(-1)
    if prediction.size == 1:
        positive_probability = float(np.clip(prediction[0], 0, 1))
        positive = os.environ.get("CSILAB_PET_POSITIVE_CLASS", PET_POSITIVE_CLASS).capitalize()
        negative = "Gato" if positive == "Perro" else "Perro"
        probabilities = {positive: positive_probability, negative: 1 - positive_probability}
    elif prediction.size == 2:
        probabilities = {"Gato": float(prediction[0]), "Perro": float(prediction[1])}
    else:
        raise ValueError("El modelo de animales debe producir una salida binaria.")
    return {
        "predicciones": [
            {"clase": name, "probabilidad": float(np.clip(prob, 0, 1))}
            for name, prob in probabilities.items()
        ]
    }


def predict_pets_remote(image_base64):
    data = post_backend_prediction("catsdogs", image_base64)
    cat_percent = float(data["cat_percent"])
    dog_percent = float(data["dog_percent"])
    return {
        "predicciones": [
            {"clase": "Gato", "probabilidad": min(1.0, max(0.0, cat_percent / 100))},
            {"clase": "Perro", "probabilidad": min(1.0, max(0.0, dog_percent / 100))},
        ]
    }


def predict_pets(image_base64):
    try:
        return predict_pets_remote(image_base64)
    except (HTTPError, RuntimeError, URLError, ValueError, KeyError) as error:
        print(f"API CS1 de mascotas no disponible ({error}); se usará el modelo local.", flush=True)
        return predict_pets_local(image_base64)


def predict_digit_remote(image_base64):
    data = post_backend_prediction("mnist", image_base64)
    digit = int(data["digit"])
    confidence = float(data["confidence"])
    if confidence > 1:
        confidence /= 100
    return {"digito": digit, "confianza": min(1.0, max(0.0, confidence))}


def predict_digit_local(image_base64):
    import numpy as np
    from io import BytesIO
    from PIL import Image

    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    raw = base64.b64decode(image_base64, validate=True)
    with Image.open(BytesIO(raw)) as source:
        grayscale = np.asarray(source.convert("L"), dtype=np.uint8)
    ys, xs = np.where(grayscale > 24)
    if len(xs) == 0:
        raise ValueError("Dibuja un número antes de predecir.")
    digit_image = Image.fromarray(grayscale).crop(
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    )
    digit_image.thumbnail((20, 20), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (28, 28), 0)
    canvas.paste(digit_image, ((28 - digit_image.width) // 2, (28 - digit_image.height) // 2))
    batch = np.asarray(canvas, dtype=np.float32)[None, ..., None] / 255.0
    probabilities = np.asarray(get_mnist_model().predict(batch, verbose=0))[0]
    digit = int(np.argmax(probabilities))
    return {"digito": digit, "confianza": float(probabilities[digit])}


def predict_digit(image_base64):
    try:
        return predict_digit_remote(image_base64)
    except (HTTPError, RuntimeError, URLError, ValueError) as error:
        print(f"MNIST remoto no disponible ({error}); se usará el modelo local.", flush=True)
        return predict_digit_local(image_base64)


class PredictionHandler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        if status != 204:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_POST(self):
        if self.path != "/api/predict":
            self.send_json(404, {"error": "Ruta no encontrada."})
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
                self.send_json(413, {"error": "La imagen es inválida o demasiado grande."})
                return
            request = json.loads(self.rfile.read(content_length))
            image_base64 = request["imageBase64"]
            if not isinstance(image_base64, str) or not image_base64:
                raise ValueError("La imagen recibida no es válida.")
            model_name = request.get("modelo")
            if model_name == "pets":
                result = predict_pets(image_base64)
            elif model_name == "mnist":
                result = predict_digit(image_base64)
            else:
                self.send_json(400, {"error": "Modelo desconocido."})
                return
            self.send_json(200, result)
        except (KeyError, ValueError, binascii.Error, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})
        except Exception as error:
            print(f"Error de predicción: {error}", flush=True)
            self.send_json(500, {"error": str(error) if isinstance(error, RuntimeError) else "No se pudo completar la predicción."})

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}", flush=True)


if __name__ == "__main__":
    load_local_env()
    host = os.environ.get("CSILAB_API_HOST", "127.0.0.1")
    port = int(os.environ.get("CSILAB_API_PORT", "3001"))
    print(f"API de CSILab disponible en http://{host}:{port}", flush=True)
    ThreadingHTTPServer((host, port), PredictionHandler).serve_forever()
