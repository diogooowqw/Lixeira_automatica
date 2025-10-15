from flask import Flask, Response, jsonify
import serial
import time
import threading
from google import genai

# ---------------- Configurações ESP32-CAM ---------------- #
PORTA = "COM5"             # Ajuste para sua porta serial
BAUD = 115200
CHUNK_SIZE = 2048          # Tamanho do bloco de leitura
TIMEOUT = 5                # Timeout em segundos
DELAY_ENTRE_FRAMES = 0.05  # Delay entre capturas

# ---------------- Gemini API ---------------- #
GEMINI_API_KEY = "AIzaSyBBTfQ9OEBJUFQM7qJ7sjOawF4JkPl_npA"
client = genai.Client(api_key=GEMINI_API_KEY)

# ---------------- Serial ---------------- #
ser = serial.Serial(PORTA, BAUD, timeout=0.2)

# ---------------- Flask App ---------------- #
app = Flask(__name__)
ultima_imagem = None
lock = threading.Lock()

# ---------------- FPS ---------------- #
fps = 0
ultimo_tempo_fps = time.time()
contador_frames = 0

# ---------------- Funções ---------------- #
def receber_frame():
    """Solicita uma imagem da ESP32-CAM e retorna os bytes JPEG."""
    global ultima_imagem

    try:
        ser.reset_input_buffer()
        ser.write(b"CAPTURE\n")
        tamanho = 0
        inicio = time.time()

        # Espera a linha SIZE
        while True:
            linha = ser.readline()
            if linha.startswith(b"SIZE:"):
                tamanho = int(linha.decode(errors='ignore').strip().split(":")[1])
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout ao ler SIZE")
                return None

        # Espera marcador de início
        while True:
            linha = ser.readline().strip()
            if linha == b"----START IMAGE----":
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout ao iniciar leitura da imagem")
                return None

        # Recebe bytes da imagem
        img_bytes = bytearray()
        recebido = 0
        inicio = time.time()
        while recebido < tamanho:
            restante = tamanho - recebido
            data = ser.read(min(CHUNK_SIZE, restante))
            if data:
                img_bytes.extend(data)
                recebido += len(data)
            elif time.time() - inicio > TIMEOUT:
                print(f"⚠️ Timeout após {recebido}/{tamanho} bytes")
                return None

        # Espera marcador de fim
        while True:
            if ser.readline().strip() == b"----END IMAGE----":
                break

        # Atualiza frame global
        with lock:
            ultima_imagem = bytes(img_bytes)

        return ultima_imagem

    except Exception as e:
        print("❌ Erro ao receber frame:", e)
        return None

def thread_captura():
    """Thread que captura continuamente frames da ESP32-CAM."""
    global fps, contador_frames, ultimo_tempo_fps

    while True:
        frame = receber_frame()
        if frame is None:
            time.sleep(0.05)
        else:
            contador_frames += 1
            agora = time.time()
            if agora - ultimo_tempo_fps >= 1.0:
                fps = contador_frames
                contador_frames = 0
                ultimo_tempo_fps = agora
                print(f"📷 FPS atual: {fps}")
            time.sleep(DELAY_ENTRE_FRAMES)

def gerar_stream():
    """Gera frames MJPEG contínuos para streaming."""
    global ultima_imagem
    while True:
        with lock:
            frame = ultima_imagem
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            time.sleep(0.01)

# ---------------- Endpoints Flask ---------------- #
@app.route('/video_feed')
def video_feed():
    """Streaming MJPEG da câmera."""
    return Response(gerar_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/analisar_material')
def analisar_material():
    global ultima_imagem
    if ultima_imagem is None:
        return jsonify({"objeto": "Nenhum"})
    temp_path = "temp.jpg"
    with open(temp_path, "wb") as f:
        f.write(ultima_imagem)
    try:
        my_file = client.files.upload(file=temp_path)
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[
                my_file,
                "Você deve identificar o material do objeto presente na imagem, dentre plástico, papel, vidro, metal e, caso nenhum se aplique, responda nenhuma das opções. Sua resposta deve ser apenas a palavra do material (plastico, papel, metal, vidro e nenhuma das opções).Mande o nome do objeto em minusculo e sem acento."
            ],
        )
        resultado = response.text.strip()
    except Exception as e:
        print("❌ Erro na análise Gemini:", e)
        resultado = "Nenhum"
    finally:
        if 'my_file' in locals():
            client.files.delete(name=my_file.name)
    print(f"Resposta Gemini: {resultado}")  # <-- Adicione esta linha
    return jsonify({"objeto": resultado})

# ---------------- Main ---------------- #
if __name__ == '__main__':
    print("🚀 Servidor Flask iniciado em http://localhost:5000/video_feed")
    t = threading.Thread(target=thread_captura, daemon=True)
    t.start()
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
