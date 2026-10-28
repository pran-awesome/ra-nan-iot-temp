#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <math.h>

// =====================================
// Smart Sop Puen — ESP32 sensor node
// Vercel + Supabase ingest (replaces Base44)
//
// Hardware: DHT11 on GPIO 27, soil probe on GPIO 34,
//           HW-038 water sensor on GPIO 32, LDR on GPIO 35.
// Libraries: DHT sensor library (Adafruit), ESP32 HTTPClient.
//
// Register the device in the dashboard first, then paste the
// upload key from the Devices page into DEVICE_KEY.
// =====================================

// =====================================
// 1. Wi-Fi
// =====================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// =====================================
// 2. Vercel ingest
// =====================================
// Production URL, for example https://your-app.vercel.app/api/ingest
const char* INGEST_URL = "https://YOUR-VERCEL-DOMAIN/api/ingest";

const char* DEVICE_ID = "farm_001";

// Shown once when the device is registered. Rotate it from the Devices page
// if this board is lost or the old Base44 key needs to be retired.
const char* DEVICE_KEY = "sopsmart_REPLACE_ME";

// =====================================
// 3. Sensor pins
// =====================================
#define DHT_PIN 27
#define DHT_TYPE DHT11

const int SOIL_PIN = 34;
const int WATER_PIN = 32;
const int LDR_PIN = 35;

DHT dht(DHT_PIN, DHT_TYPE);

// =====================================
// 4. Timing
// =====================================
const unsigned long SENSOR_INTERVAL = 10000UL;
const unsigned long UPLOAD_INTERVAL = 300000UL;
const unsigned long UPLOAD_RETRY_INTERVAL = 30000UL;

unsigned long lastSensorRead = 0;
unsigned long lastUpload = 0;
unsigned long lastUploadAttempt = 0;

bool firstSensorRead = true;
bool uploadConfirmed = false;

// =====================================
// 5. Soil calibration
// =====================================
// Raw ADC in dry air, and raw ADC in a glass of water.
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

// =====================================
// 6. Latest sample
// =====================================
int soilRaw = 0;
float soilPercent = 0.0;

int waterRaw = 0;
int lightRaw = 0;

float airTemp = NAN;
float airHumidity = NAN;

// =====================================
// 7. Soil moisture percent
// =====================================
float calculateSoilPercent(int raw) {
  if (SOIL_DRY_RAW == SOIL_WET_RAW) {
    return 0.0;
  }

  float percent =
      (float)(SOIL_DRY_RAW - raw) * 100.0f /
      (float)(SOIL_DRY_RAW - SOIL_WET_RAW);

  return constrain(percent, 0.0f, 100.0f);
}

// =====================================
// 8. Read sensors
// =====================================
void readSensors() {
  soilRaw = analogRead(SOIL_PIN);
  soilPercent = calculateSoilPercent(soilRaw);

  waterRaw = analogRead(WATER_PIN);
  lightRaw = analogRead(LDR_PIN);

  airTemp = dht.readTemperature();
  airHumidity = dht.readHumidity();

  Serial.print("Soil Moisture Raw: ");
  Serial.println(soilRaw);

  Serial.print("Soil Moisture: ");
  Serial.print(soilPercent, 1);
  Serial.println("%");

  Serial.print("Water Raw: ");
  Serial.println(waterRaw);

  Serial.print("Light Raw: ");
  Serial.println(lightRaw);

  Serial.print("Air Temperature: ");
  if (isnan(airTemp)) {
    Serial.println("Sensor Error");
  } else {
    Serial.print(airTemp, 1);
    Serial.println(" C");
  }

  Serial.print("Air Humidity: ");
  if (isnan(airHumidity)) {
    Serial.println("Sensor Error");
  } else {
    Serial.print(airHumidity, 1);
    Serial.println("%");
  }

  Serial.println();
}

// =====================================
// 9. POST the latest sample
// A DHT failure is left out of the JSON. The server stores that
// field as missing instead of a fake zero. Null is also accepted.
// Returns the HTTP status, or a negative value when the network fails.
// =====================================
int sendToWeb() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Skipped upload: no Wi-Fi");
    return -1;
  }

  char payload[512];
  int written = snprintf(
      payload,
      sizeof(payload),
      "{\"device_id\":\"%s\",\"soil_moisture_raw\":%d,\"soil_moisture_percent\":%.1f,\"water_raw\":%d,\"light_raw\":%d",
      DEVICE_ID,
      soilRaw,
      soilPercent,
      waterRaw,
      lightRaw);

  if (written < 0 || written >= (int)sizeof(payload)) {
    Serial.println("Payload did not fit");
    return -2;
  }

  if (!isnan(airTemp) && written > 0 && written < (int)sizeof(payload)) {
    written += snprintf(
        payload + written,
        sizeof(payload) - written,
        ",\"air_temperature\":%.1f",
        airTemp);
  }

  if (!isnan(airHumidity) && written > 0 && written < (int)sizeof(payload)) {
    written += snprintf(
        payload + written,
        sizeof(payload) - written,
        ",\"air_humidity\":%.1f",
        airHumidity);
  }

  if (written < 0 || written >= (int)sizeof(payload) - 2) {
    Serial.println("Payload did not fit");
    return -2;
  }

  payload[written++] = '}';
  payload[written] = '\0';

  Serial.println(payload);

  WiFiClientSecure client;
  // Vercel certificates are public-CA. Pin a root CA before a long deployment.
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(15000);

  if (!http.begin(client, INGEST_URL)) {
    Serial.println("HTTP begin failed");
    return -3;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_KEY);

  int httpCode = http.POST((uint8_t*)payload, strlen(payload));
  Serial.printf("Upload HTTP %d\n", httpCode);
  if (httpCode > 0) {
    Serial.println(http.getString());
  }

  http.end();
  return httpCode;
}

// =====================================
// 10. Setup
// =====================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  dht.begin();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  lastSensorRead = millis();
  lastUpload = millis();
}

// =====================================
// 11. Loop
// Read every 10 seconds. Upload the latest values as soon as Wi-Fi
// is up, then every 5 minutes. A failed attempt retries after 30 seconds.
// =====================================
void loop() {
  unsigned long now = millis();

  if (firstSensorRead || now - lastSensorRead >= SENSOR_INTERVAL) {
    firstSensorRead = false;
    lastSensorRead = now;
    readSensors();
  }

  bool due = !uploadConfirmed || (now - lastUpload >= UPLOAD_INTERVAL);
  bool retryGap = now - lastUploadAttempt >= UPLOAD_RETRY_INTERVAL;

  if (due && retryGap && WiFi.status() == WL_CONNECTED) {
    lastUploadAttempt = now;
    int code = sendToWeb();
    if (code > 0) {
      lastUpload = now;
      uploadConfirmed = true;
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  delay(10);
}
