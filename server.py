import serial
import time
import threading
from google import genai
from flask import Flask, Response

# ---------------- Configurações ---------------- #
BT_PORT = "COM5"        # Porta Bluetooth do seu PC para ESP32-CAM
BAUD = 115200
CHUNK_SIZE = 1024
TIMEOUT = 5

ser = serial.Serial(BT_PORT, BAUD, timeout=0.2)

# ---------------- Flask ---------------- #
app = Flask(__name__)
ultima_imagem = None
lock = threading.Lock()

# ---------------- Função para capturar imagem da ESP32-CAM ---------------- #
def receber_frame():
    global ultima_imagem
    try:
        ser.reset_input_buffer()
        ser.write(b"CAPTURE\n")  # envia comando CAPTURE

        # Lê tamanho da imagem
        inicio = time.time()
        tamanho = 0
        while True:
            linha = ser.readline()
            if linha.startswith(b"SIZE:"):
                tamanho = int(linha.decode(errors='ignore').strip().split(":")[1])
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout ao ler SIZE")
                return None

        # Espera pelo início da imagem
        while True:
            linha = ser.readline().strip()
            if linha == b"----START IMAGE----":
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout ao iniciar leitura da imagem")
                return None

        # Lê os bytes da imagem
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

        # Lê a linha de fim de imagem
        while True:
            if ser.readline().strip() == b"----END IMAGE----":
                break

        with lock:
            ultima_imagem = bytes(img_bytes)
        print(f"📸 Captura recebida ({len(ultima_imagem)} bytes)")
        return ultima_imagem

    except Exception as e:
        print("❌ Erro ao receber frame:", e)
        return None

# ---------------- Função para gerar stream MJPEG ---------------- #
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

# ---------------- Thread de controle do carrinho ---------------- #
def thread_controle():
    while True:
        cmd = input("\nDigite 1, 2, 3, 4 para lixeiras, 'c' para capturar, 'x' para sair: ").strip().lower()
        if cmd in ["1","2","3","4"]:
            ser.write((cmd + "\n").encode())
            print(f"➡️ Comando enviado: {cmd}")
        elif cmd == "c":
            receber_frame()
        elif cmd == "x":
            print("⛔ Encerrando controle...")
            break
        else:
            print("❌ Comando inválido")

# ---------------- Main ---------------- #
if __name__ == '__main__':
    print("🚀 Servidor Flask iniciado: http://localhost:5000/video_feed")

    # Thread para controle via terminal
    threading.Thread(target=thread_controle, daemon=True).start()

    # Inicia servidor Flask
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
