import serial
import time
import threading
from flask import Flask, Response

# ---------------- Configurações ---------------- #
BT_PORT = "COM5"        # Porta Bluetooth do seu PC para ESP32-CAM
BAUD = 115200
CHUNK_SIZE = 1024
TIMEOUT = 5
INTERVALO_CAPTURA = 0.05  # tira foto a cada 5s

ser = serial.Serial(BT_PORT, BAUD, timeout=0.2)

# ---------------- Flask ---------------- #
app = Flask(__name__)
ultima_imagem = None
lock = threading.Lock()

# ---------------- Função para capturar imagem ---------------- #
def receber_frame():
    global ultima_imagem
    try:
        ser.reset_input_buffer()
        ser.write(b"CAPTURE\n")

        inicio = time.time()
        tamanho = 0

        # Lê SIZE
        while True:
            linha = ser.readline()
            if linha.startswith(b"SIZE:"):
                tamanho = int(linha.decode(errors='ignore').strip().split(":")[1])
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout lendo SIZE")
                return None

        # Espera início
        while ser.readline().strip() != b"----START IMAGE----":
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout iniciando imagem")
                return None

        # Lê bytes
        img_bytes = bytearray()
        recebido = 0
        inicio = time.time()

        while recebido < tamanho:
            data = ser.read(min(CHUNK_SIZE, tamanho - recebido))
            if data:
                img_bytes.extend(data)
                recebido += len(data)
            elif time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout lendo bytes")
                return None

        # Fim
        while ser.readline().strip() != b"----END IMAGE----":
            pass

        with lock:
            ultima_imagem = bytes(img_bytes)

        print(f"📸 Foto capturada ({len(ultima_imagem)} bytes)")

    except Exception as e:
        print("❌ Erro:", e)


# ---------------- Stream MJPEG ---------------- #
def gerar_stream():
    global ultima_imagem
    while True:
        with lock:
            frame = ultima_imagem
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            time.sleep(0.01)


@app.route('/video_feed')
def video_feed():
    return Response(gerar_stream(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


# ---------------- Captura automática ---------------- #
def thread_auto_captura():
    while True:
        receber_frame()
        time.sleep(INTERVALO_CAPTURA)


# ---------------- Main ---------------- #
if __name__ == '__main__':
    print("🚀 Servidor Flask em: http://localhost:5000/video_feed")

    # inicia thread da câmera
    threading.Thread(target=thread_auto_captura, daemon=True).start()

    # inicia servidor
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
