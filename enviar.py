import serial
import time
import threading
from datetime import datetime
from google import genai
from flask import Flask, Response

# ---------------- CONFIGURAÇÕES ---------------- #
BT_PORT = "COM5"        # Porta Bluetooth ou Serial do Arduino/ESP32
BAUD = 115200
CHUNK_SIZE = 1024
TIMEOUT = 5
INTERVALO_CAPTURA = 0.05  # intervalo entre capturas rápidas
PAUSA_DEPOIS = 10         # pausa após enviar resultado para IA

# Serial para comunicação com Arduino via Bluetooth
ser = serial.Serial(BT_PORT, BAUD, timeout=0.2)

# Gemini API
GEMINI_API_KEY = "SUA_CHAVE_AQUI"
client = genai.Client(api_key=GEMINI_API_KEY)

# Flask
app = Flask(__name__)
ultima_imagem = None
lock = threading.Lock()

# ---------------- FUNÇÃO PARA CAPTURAR FRAME ---------------- #
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

        # Espera início da imagem
        while ser.readline().strip() != b"----START IMAGE----":
            if time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout iniciando imagem")
                return None

        # Lê bytes da imagem
        img_bytes = bytearray()
        recebido = 0
        while recebido < tamanho:
            data = ser.read(min(CHUNK_SIZE, tamanho - recebido))
            if data:
                img_bytes.extend(data)
                recebido += len(data)
            elif time.time() - inicio > TIMEOUT:
                print("⚠️ Timeout lendo bytes")
                return None

        # Fim da imagem
        while ser.readline().strip() != b"----END IMAGE----":
            pass

        # Salva imagem na variável
        with lock:
            ultima_imagem = bytes(img_bytes)

        # Salva em arquivo temporário
        with open("temp.jpg", "wb") as f:
            f.write(ultima_imagem)

        hora_captura = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"📸 Foto capturada ({len(ultima_imagem)} bytes) em {hora_captura} — salva como temp.jpg")

    except Exception as e:
        print("❌ Erro:", e)


# ---------------- STREAM MJPEG ---------------- #
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


# ---------------- FUNÇÃO DE ANÁLISE IA ---------------- #
def ia_olhar():
    image_path = "temp.jpg"
    hora_requisicao = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"⏱ Requisição enviada para Gemini em: {hora_requisicao}")

    try:
        my_file = client.files.upload(file=image_path)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[my_file,
                      "Analise a imagem enviada e identifique o material do objeto presente "
                      "**somente no centro da imagem**. "
                      "Ignore bordas, reflexos, fundo ou chão. "
                      "Se não houver nenhum objeto visível no centro, considere como vazio. "
                      "Se houver um objeto, identifique seu material dentre: plástico, papel, vidro, metal. "
                      "Sua resposta deve ser **apenas o número correspondente ao material**: "
                      "(metal=1, vidro=2, papel=3, plástico=4, vazio=5). "
                      "Após o número, informe o nome do objeto com detalhes (ex: lápis, garrafa, moeda). "
                      f"A requisição foi enviada em: {hora_requisicao}. "
                      "Se não houver objeto, apenas retorne 5."]
        )
        print("📥 Resposta Gemini:", response.text)
         
        # Retorna o primeiro número válido
        for c in response.text:
            if c in "12345":
                return c
        return "5"  # vazio se não encontrar

    finally:
        if 'my_file' in locals():
            client.files.delete(name=my_file.name)


# ---------------- THREAD AUTOMÁTICA DE CAPTURA ---------------- #
def thread_auto_captura():
    contador = 0
    while True:
        receber_frame()
        time.sleep(INTERVALO_CAPTURA)
        contador += 1

        if contador == 20:  # A cada 20 capturas
            contador = 0
            numero = ia_olhar()  # chama IA

            # Envia número para Arduino via Bluetooth
            if numero:
                ser.write((numero + "\n").encode())
                print(f"➡️ Número enviado para Arduino: {numero}")

            # Pausa para carrinho jogar o lixo
            print(f"⏱ Aguardando {PAUSA_DEPOIS}s para o carrinho jogar o lixo...")
            time.sleep(PAUSA_DEPOIS)


# ---------------- MAIN ---------------- #
if __name__ == '__main__':
    print("🚀 Servidor Flask em: http://localhost:5000/video_feed")

    # inicia thread da captura automática
    threading.Thread(target=thread_auto_captura, daemon=True).start()

    # inicia servidor Flask
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
