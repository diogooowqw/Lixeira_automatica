from flask import Flask, Response
import serial
import time
import threading

# --- Configurações Bluetooth ESP32-CAM ---
PORTA = "COM5"        # Ajuste conforme sua porta Bluetooth
BAUD = 115200
CHUNK_SIZE = 2048         # blocos maiores = menos overhead
TIMEOUT = 5            # segundos
DELAY_ENTRE_FRAMES = 0.05  # menor delay entre capturas

# Conecta à porta serial
ser = serial.Serial(PORTA, BAUD, timeout=0.2)

app = Flask(__name__)
ultima_imagem = None
lock = threading.Lock()

# --- Variáveis para FPS ---
fps = 0
ultimo_tempo_fps = time.time()
contador_frames = 0

def receber_frame():
    """
    Solicita uma imagem da ESP32-CAM e retorna os bytes JPEG.
    """
    global ultima_imagem

    try:
        ser.reset_input_buffer()
        ser.write(b"CAPTURE\n")

        tamanho = 0
        inicio = time.time()

        # --- Espera linha SIZE:xxxx ---
        while True:
            linha = ser.readline()
            if linha.startswith(b"SIZE:"):
                tamanho = int(linha.decode(errors='ignore').strip().split(":")[1])
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout ao ler SIZE")
                return None

        # --- Espera o marcador de início ---
        while True:
            linha = ser.readline().strip()
            if linha == b"----START IMAGE----":
                break
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout ao iniciar leitura da imagem")
                return None

        # --- Recebe os bytes da imagem ---
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

        # --- Espera o marcador de fim ---
        while True:
            if ser.readline().strip() == b"----END IMAGE----":
                break

        # --- Atualiza o frame global ---
        with lock:
            ultima_imagem = bytes(img_bytes)

        return ultima_imagem

    except Exception as e:
        print("❌ Erro ao receber frame:", e)
        return None


def thread_captura():
    """
    Thread separada que atualiza continuamente a última imagem recebida.
    """
    global fps, contador_frames, ultimo_tempo_fps

    while True:
        frame = receber_frame()
        if frame is None:
            time.sleep(0.05)  # espera curta em erro
        else:
            # --- Atualiza contador de FPS ---
            contador_frames += 1
            agora = time.time()
            if agora - ultimo_tempo_fps >= 1.0:
                fps = contador_frames
                contador_frames = 0
                ultimo_tempo_fps = agora
                print(f"📷 FPS atual: {fps}")

            time.sleep(DELAY_ENTRE_FRAMES)


def gerar_stream():
    """
    Envia o último frame disponível continuamente (modo MJPEG).
    """
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
    """
    Endpoint de streaming MJPEG.
    """
    return Response(gerar_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    print("🚀 Servidor Flask iniciado em http://localhost:5000/video_feed")

    # Inicia a thread de captura contínua
    t = threading.Thread(target=thread_captura, daemon=True)
    t.start()

    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
