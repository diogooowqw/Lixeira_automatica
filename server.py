import threading
import time
import serial
from flask import Flask, Response

# --- Configurações da porta ---
PORTA = "COM5"
BAUD = 115200
CHUNK_SIZE = 1024
RECONNECT_DELAY = 2  # segundos para tentar reconectar se travar

# Variável global para guardar a última imagem recebida
ultima_imagem = None

# Flask
app = Flask(__name__)

def receber_imagens():
    global ultima_imagem
    while True:
        try:
            ser = serial.Serial(PORTA, BAUD, timeout=0.1)  # timeout curto
            print(f"🔌 Porta serial conectada em {PORTA}")
            
            while True:
                try:
                    # Envia comando CAPTURE
                    ser.write(b"CAPTURE\n")

                    # Lê tamanho da imagem
                    tamanho_line = ser.readline().decode(errors='ignore').strip()
                    if not tamanho_line.startswith("SIZE:"):
                        continue
                    tamanho_esperado = int(tamanho_line.replace("SIZE:", ""))

                    # Aguarda START IMAGE
                    while True:
                        line = ser.readline().decode(errors='ignore').strip()
                        if line == "----START IMAGE----":
                            break

                    # Recebe os bytes da imagem
                    buffer = b""
                    recebido = 0
                    inicio = time.time()
                    while recebido < tamanho_esperado:
                        ler = min(CHUNK_SIZE, tamanho_esperado - recebido)
                        chunk = ser.read(ler)
                        if chunk:
                            buffer += chunk
                            recebido += len(chunk)
                        else:
                            if time.time() - inicio > 2:  # timeout menor
                                print("⏱ Timeout ao receber imagem")
                                break

                    # Aguarda END IMAGE
                    while True:
                        end_line = ser.readline().decode(errors='ignore').strip()
                        if end_line == "----END IMAGE----":
                            break

                    # Atualiza a última imagem
                    ultima_imagem = buffer

                    # Pequena pausa para FPS estável
                    time.sleep(0.03)

                except Exception as e:
                    print("⚠️ Erro durante captura:", e)
                    time.sleep(0.5)
                    continue

        except Exception as e:
            print(f"❌ Não foi possível abrir a porta ({PORTA}), tentando novamente em {RECONNECT_DELAY}s:", e)
            time.sleep(RECONNECT_DELAY)
            continue

# Função para gerar MJPEG para o Flask
def gerar_frames():
    global ultima_imagem
    while True:
        if ultima_imagem:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + ultima_imagem + b'\r\n')
        time.sleep(0.03)  # 30ms ~ 33 FPS

# Rota do vídeo
@app.route('/video_feed')
def video_feed():
    return Response(gerar_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Rota principal
@app.route('/')
def index():
    return '''
    <html>
        <head><title>Live ESP32-CAM</title></head>
        <body>
            <h2>Live via Bluetooth</h2>
            <img src="/video_feed" style="width:640px; border:1px solid #000;">
        </body>
    </html>
    '''

if __name__ == "__main__":
    # Thread para receber imagens sem travar o Flask
    bt_thread = threading.Thread(target=receber_imagens, daemon=True)
    bt_thread.start()

    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
