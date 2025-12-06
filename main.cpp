#include "esp_camera.h"
#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

// --- Pinos AI-Thinker ---
#define PWDN_GPIO_NUM  32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM   0
#define SIOD_GPIO_NUM  26
#define SIOC_GPIO_NUM  27
#define Y9_GPIO_NUM    35
#define Y8_GPIO_NUM    34
#define Y7_GPIO_NUM    39
#define Y6_GPIO_NUM    36
#define Y5_GPIO_NUM    21
#define Y4_GPIO_NUM    19
#define Y3_GPIO_NUM    18
#define Y2_GPIO_NUM     5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22
#define LED_GPIO_NUM    4

#define CHUNK_SIZE 1024

bool initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;

    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG; 
    config.frame_size = FRAMESIZE_VGA; // 640x480 (ótimo equilíbrio)
    config.jpeg_quality = 35;          // qualidade boa (~60–80 KB)
    config.fb_count = 2;

    return (esp_camera_init(&config) == ESP_OK);
}

void captureAndSend() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("❌ Erro na captura!");
        return;
    }

    Serial.println("📸 Captura feita!");
    digitalWrite(LED_GPIO_NUM, HIGH);

    // envia o cabeçalho
    SerialBT.printf("SIZE:%d\n", fb->len);
    SerialBT.println("----START IMAGE----");

    // envia em blocos
    for (size_t i = 0; i < fb->len; i += CHUNK_SIZE) {
        size_t chunk = (i + CHUNK_SIZE > fb->len) ? (fb->len - i) : CHUNK_SIZE;
        SerialBT.write(fb->buf + i, chunk);
        delay(2); // pequeno delay evita buffer overflow
    }

    SerialBT.println("\n----END IMAGE----");
    SerialBT.flush();

    esp_camera_fb_return(fb);
    digitalWrite(LED_GPIO_NUM, LOW);
    Serial.println("✅ Envio concluído!");
}

void setup() {
    Serial.begin(115200);
    pinMode(LED_GPIO_NUM, OUTPUT);
    digitalWrite(LED_GPIO_NUM, LOW);

    Serial.println("🔹 Inicializando câmera...");
    if (!initCamera()) {
        Serial.println("❌ Falha ao iniciar câmera!");
        while (true) delay(1000);
    }

    SerialBT.begin("ESP32-CAM-BT");
    Serial.println("📡 Bluetooth pronto: ESP32-CAM-BT");
}

void loop() {
    if (SerialBT.available()) {
        String cmd = SerialBT.readStringUntil('\n');
        cmd.trim();
        if (cmd.equalsIgnoreCase("CAPTURE")) {
            captureAndSend();
        }
    }
}