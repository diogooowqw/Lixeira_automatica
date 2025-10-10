from flask import Flask, Response
import serial
import time

app = Flask(__name__)

PORTA = "COM5"
BAUD = 115200
CHUNK_SIZE = 1024

def gerar_frames():
    ser = serial.Serial(PORTA, BAUD, timeout=5)
    ultimo_tempo = time.time()
    
    while True:
        try:
            # envia comando para captura
            ser.write(b"CAPTURE\n")

            # lê tamanho da imagem
            tamanho = int(ser.readline().decode().strip().replace("SIZE:", ""))

            # espera START IMAGE
            while ser.readline().decode().strip() != "----START IMAGE----":
                pass

            # lê a imagem
            img_bytes = b""
            recebido = 0
            while recebido < tamanho:
                ler = min(CHUNK_SIZE, tamanho - recebido)
                chunk = ser.read(ler)
                img_bytes += chunk
                recebido += len(chunk)

            # espera END IMAGE
            while ser.readline().decode().strip() != "----END IMAGE----":
                pass

            # envia como MJPEG
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + img_bytes + b'\r\n')

            # mede FPS
            agora = time.time()
            fps = 1 / (agora - ultimo_tempo)
            print(f"FPS atual: {fps:.2f}")
            ultimo_tempo = agora

        except Exception as e:
            print("Erro na captura:", e)
            continue

@app.route('/video_feed')
def video_feed():
    return Response(gerar_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
