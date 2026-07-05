#include <ModbusMaster.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ElegantOTA.h>

const char* SSID = "gearlink"; 
const char* PASS = "99119911";
const char* URL  = "http://192.168.137.1:8443/iot/data";

#define PROX1_PIN 4
#define PROX2_PIN 5

const unsigned long INTERVAL = 500;
unsigned long lastRun = 0;

HardwareSerial RS485Serial(2);
ModbusMaster node;
AsyncWebServer ota(80);

void wifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
}

bool readEncoder(float &mm) {
  node.begin(0x01, RS485Serial);
  if (node.readHoldingRegisters(0x0000, 2) != node.ku8MBSuccess) return false;
  uint32_t raw = ((uint32_t)node.getResponseBuffer(0) << 16) | node.getResponseBuffer(1);
  mm = raw * 0.0854;
  return true;
}

bool readTilt(float &x, float &y, float &z) {
  node.begin(0x50, RS485Serial);
  if (node.readHoldingRegisters(0x3D, 3) != node.ku8MBSuccess) return false;
  x = (int16_t)node.getResponseBuffer(0) / 32768.0f * 180.0f;
  y = (int16_t)node.getResponseBuffer(1) / 32768.0f * 180.0f;
  z = (int16_t)node.getResponseBuffer(2) / 32768.0f * 180.0f;
  return true;
}

bool readProx1() { return digitalRead(PROX1_PIN) == LOW; }
bool readProx2() { return digitalRead(PROX2_PIN) == LOW; }

void zeroEncoder() {
  node.begin(0x01, RS485Serial);
  node.writeSingleRegister(0x0008, 0x0001);
}

void post(const char* body) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.begin(URL);
  http.addHeader("Content-Type", "application/json");
  http.POST(body);
  http.end();
}

void setup() {
  Serial.begin(115200);
  RS485Serial.begin(9600, SERIAL_8N1, 18, 17);
  pinMode(PROX1_PIN, INPUT_PULLUP);
  pinMode(PROX2_PIN, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);
  wifi();
  ElegantOTA.setAuth("admin", "changeme");
  ElegantOTA.begin(&ota);
  ota.begin();
  Serial.println("Send 'z' to zero encoder");
}

void loop() {
  wifi();
  ElegantOTA.loop();

  if (Serial.available() && Serial.read() == 'z') zeroEncoder();

  if (millis() - lastRun >= INTERVAL) {
    lastRun = millis();

    float mm = 0, x = 0, y = 0, z = 0;
    bool encOk  = readEncoder(mm);
    delay(20);                        // <-- add this gap
    bool tiltOk = readTilt(x, y, z);
    bool prox1  = readProx1();
    bool prox2  = readProx2();

    Serial.printf("enc[%s] %.1fmm | tilt[%s] X:%.1f Y:%.1f Z:%.1f | p1:%s p2:%s\n",
                  encOk ? "ok" : "--", mm, tiltOk ? "ok" : "--", x, y, z,
                  prox1 ? "DET" : "clr", prox2 ? "DET" : "clr");

    char body[220];
    snprintf(body, sizeof(body),
      "{\"enc\":{\"ok\":%s,\"mm\":%.1f},"
      "\"tilt\":{\"ok\":%s,\"x\":%.1f,\"y\":%.1f,\"z\":%.1f},"
      "\"prox1\":%s,\"prox2\":%s}",
      encOk ? "true" : "false", mm,
      tiltOk ? "true" : "false", x, y, z,
      prox1 ? "true" : "false",
      prox2 ? "true" : "false");
    post(body);
  }
}