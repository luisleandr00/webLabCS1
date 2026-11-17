# WEBLABCS1

Aplicación web en React para clasificar imágenes de perros y gatos y reconocer dígitos dibujados. La interfaz se presenta como CSILab.

## Inicio en Windows

Necesitas Node.js y Python 3.12 de 64 bits. TensorFlow 2.20 usa Python 3.12 para cargar los modelos locales.

1. Crea `.env.local` en la raíz del proyecto y configura la API CS1:

   ```env
   CS1_API_BASE_URL=https://cs1-lab1.mexicocentral.cloudapp.azure.com
   CS1_API_LAB_1=<clave-del-backend>
   ```

   La clave es privada y `.env.local` está excluido de Git.

2. Instala las dependencias de Python 3.12:

   ```powershell
   py -3.12 -m pip install -r requirements.txt
   ```

   Si `py` no detecta Python 3.12, ejecuta `-m pip install -r requirements.txt` con la ruta de ese `python.exe`.

3. Inicia la API local y la interfaz en terminales separadas:

   ```powershell
   npm run api
   npm run dev
   ```

La interfaz reenvía `/api/predict` a la API local en el puerto 3001. El backend reenvía las imágenes como `multipart/form-data` a `/mnist` o `/catsdogs` y adapta la respuesta para la interfaz.

## Modelos

La API CS1 desplegada carga los modelos actuales desde Azure Blob Storage. Sus respuestas de mascotas en porcentajes y de MNIST con `digit` y `confidence` se convierten al formato que ya presenta la interfaz.

Si falta la clave o el servicio no está disponible, se usan los modelos locales de `final_models/`. Para perros y gatos, el modelo local por defecto es `best_EfficientNetB0.keras`; si su clase positiva está invertida, configura `CSILAB_PET_POSITIVE_CLASS=Gato`.
