#include <ModbusMaster.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ElegantOTA.h>

const char *SSID = "gearlink";
const char *PASS = "99119911";
const char *URL = "http://192.168.137.1:8443/iot/data";

#define PROX1_PIN 4
#define PROX2_PIN 5

const unsigned long INTERVAL = 500;
unsigned long lastRun = 0;
uint16_t axisMode = 0xFFFF;

HardwareSerial RS485Serial(2);
ModbusMaster node;
AsyncWebServer ota(80);

volatile bool calibrateRequested = false;

bool hwtWrite(uint16_t reg, uint16_t value) {
  node.begin(0x50, RS485Serial);
  return node.writeSingleRegister(reg, value) == node.ku8MBSuccess;
}

void calibrateHWT() {
  hwtWrite(0x0069, 0xB588); delay(50);   // Unlock
  hwtWrite(0x0001, 0x0001); delay(5000); // Accelerometer calibration
  hwtWrite(0x0001, 0x0000); delay(50);   // Normal mode
  hwtWrite(0x0000, 0x0000); delay(100);  // Save
}

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

bool readTilt(float &x, float &y, float &z, float &q0, float &q1, float &q2, float &q3) {
  node.begin(0x50, RS485Serial);
  // Direct angles
  if (node.readHoldingRegisters(0x3D, 3) != node.ku8MBSuccess) return false;
  x = (int16_t)node.getResponseBuffer(0) / 32768.0f * 180.0f;
  y = (int16_t)node.getResponseBuffer(1) / 32768.0f * 180.0f;
  z = (int16_t)node.getResponseBuffer(2) / 32768.0f * 180.0f;
  delay(10);
  // Quaternion
  if (node.readHoldingRegisters(0x51, 4) != node.ku8MBSuccess) return false;
  q0 = (int16_t)node.getResponseBuffer(0) / 32768.0f;
  q1 = (int16_t)node.getResponseBuffer(1) / 32768.0f;
  q2 = (int16_t)node.getResponseBuffer(2) / 32768.0f;
  q3 = (int16_t)node.getResponseBuffer(3) / 32768.0f;
  return true;
}

bool readProx1() { return digitalRead(PROX1_PIN) == LOW; }
bool readProx2() { return digitalRead(PROX2_PIN) == LOW; }

void post(const char *body) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.setConnectTimeout(2000);
  http.begin(URL);
  http.addHeader("Content-Type", "application/json");
  http.POST(body);
  http.end();
}

void optimizePrecision() {
  node.begin(0x50, RS485Serial);
  node.writeSingleRegister(0x0069, 0xB588); delay(50); // Unlock
  node.writeSingleRegister(0x0024, 0x0001); delay(50); // 9-axis or 6-axis
  node.writeSingleRegister(0x001F, 0x0006); delay(50); // 5 Hz
  node.writeSingleRegister(0x0000, 0x0000); delay(200); // Save
  if (node.readHoldingRegisters(0x0024, 1) == node.ku8MBSuccess) axisMode = node.getResponseBuffer(0);
}

void setup() {
  Serial.begin(115200);
  RS485Serial.begin(9600, SERIAL_8N1, 18, 17);
  optimizePrecision();
  pinMode(PROX1_PIN, INPUT_PULLUP);
  pinMode(PROX2_PIN, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);
  wifi();
  ElegantOTA.setAuth("admin", "changeme");
  ElegantOTA.begin(&ota);
  ota.on("/calibrate", HTTP_GET, [](AsyncWebServerRequest *req) {
    calibrateRequested = true;
    req->send(202, "text/plain", "Calibration queued");
  });
  ota.begin();
  Serial.println("Send 'z' to zero encoder");
}

void loop() {

  wifi();
  ElegantOTA.loop();

  if (calibrateRequested) {
    calibrateRequested = false;
    calibrateHWT();
    Serial.println("HWT905 calibration completed");
    return;
  }

  if (millis() - lastRun >= INTERVAL) {
    lastRun = millis();
    float mm = 0, x = 0, y = 0, z = 0;
    float q0 = 1, q1 = 0, q2 = 0, q3 = 0;
    bool encOk = readEncoder(mm);
    delay(20);
    bool tiltOk = readTilt(x, y, z, q0, q1, q2, q3);
    bool prox1 = readProx1();
    bool prox2 = readProx2();
    char body[300];

    snprintf(body, sizeof(body),
      "{\"enc\":{\"ok\":%s,\"mm\":%.1f},\"tilt\":{\"ok\":%s,\"mode\":\"%s\",\"x\":%.3f,\"y\":%.3f,\"z\":%.3f,\"q0\":%.5f,\"q1\":%.5f,\"q2\":%.5f,\"q3\":%.5f},\"prox1\":%s,\"prox2\":%s}",
      encOk ? "true" : "false", mm,
      tiltOk ? "true" : "false",
      axisMode == 0 ? "9-axis" : axisMode == 1 ? "6-axis" : "unknown",
      x, y, z, q0, q1, q2, q3,
      prox1 ? "true" : "false",
      prox2 ? "true" : "false"
    );
    post(body);
  }

}