import os
import threading
from flask import Flask, send_file, render_template_string
import bluetooth

PASTA_IMAGENS = "uploads_camera"
os.makedirs(PASTA_IMAGENS, exist_ok=True)
CAMINHO_IMAGEM = os.path.join(PASTA_IMAGENS, "live.jpg")

app = Flask(__name__)

@app.route("/")
def index():
    return render_template_string("""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>Live ESP32-CAM</title>
    </head>
    <body>
        <h2>Live da ESP32-CAM via Bluetooth</h2>
        <img id="liveFeed" src="/live.jpg" style="width:640px; border:1px solid #000;">
        <script>
            setInterval(() => {
                const img = document.getElementById('liveFeed');
                img.src = '/live.jpg?_=' + new Date().getTime();
            }, 200); // atualiza a cada 200ms
        </script>
    </body>
    </html>
    """)

@app.route("/live.jpg")
def live_image():
    if os.path.exists(CAMINHO_IMAGEM):
        return send_file(CAMINHO_IMAGEM, mimetype='image/jpeg')
    return "Nenhuma imagem disponível", 404

# --- Receber imagem via Bluetooth ---
def receber_bluetooth():
    server_sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    server_sock.bind(("", bluetooth.PORT_ANY))
    server_sock.listen(1)
    port = server_sock.getsockname()[1]
    print(f"[Bluetooth] Escutando na porta {port}")

    bluetooth.advertise_service(server_sock, "ESP32CamServer",
                                service_classes=[bluetooth.SERIAL_PORT_CLASS],
                                profiles=[bluetooth.SERIAL_PORT_PROFILE])
    print("[Bluetooth] Serviço anunciado. Aguardando conexão...")

    client_sock, client_info = server_sock.accept()
    print(f"[Bluetooth] Conectado a {client_info}")

    buffer = b""
    recebendo = False
    tamanho_esperado = 0

    while True:
        try:
            data = client_sock.recv(1024)
            if not data:
                continue
            buffer += data

            # Início da imagem
            if b"----START IMAGE----" in buffer:
                recebendo = True
                buffer = buffer.split(b"----START IMAGE----",1)[1]
                continue

            # Fim da imagem
            if b"----END IMAGE----" in buffer and recebendo:
                img_data = buffer.split(b"----END IMAGE----",1)[0]
                with open(CAMINHO_IMAGEM, "wb") as f:
                    f.write(img_data)
                print("[Bluetooth] Imagem recebida e salva!")
                buffer = b""
                recebendo = False

        except Exception as e:
            print(f"[Bluetooth] Erro: {e}")
            break

    client_sock.close()
    server_sock.close()
    print("[Bluetooth] Conexão encerrada")

# --- Thread Bluetooth ---
bt_thread = threading.Thread(target=receber_bluetooth, daemon=True)
bt_thread.start()

# --- Executa Flask ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
