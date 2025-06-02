
# 📄 Dataset Catalogue: Sensor Technologies Reference

**Domain**: Robotics / Embedded Systems / IoT  
**License**: Custom/Attribution Required (⚠️ please specify if using public data)  
**File**: `data/sensors.csv`  
**Last Updated**: 2025-05-28

## 📊 Description

A reference dataset containing essential metadata for common sensor types used in robotics, automation, and embedded systems. Includes information about sensor type, application domain, manufacturer, accuracy, data format, and power usage.

This dataset is used for powering search functionality and AI chatbot responses within the Advanced Automation Insights web application.

---

## 📁 Schema

| Field Name     | Description                                             | Example                   |
|----------------|---------------------------------------------------------|---------------------------|
| `sensor_type`  | Name or classification of the sensor                   | `LIDAR`, `IMU`, `Radar`   |
| `application`  | Typical use-case or domain for this sensor             | `Autonomous Vehicles`     |
| `manufacturer` | Notable vendor or producer of this sensor              | `Velodyne`, `Bosch`       |
| `accuracy`     | Resolution or precision metric (context-dependent)     | `2cm`, `±2g`, `0.1°C`     |
| `data_format`  | Output data structure or signal format                 | `PointCloud`, `Raw`, `Analog` |
| `power_usage`  | Nominal power requirement (usually in watts)           | `0.2W`, `6W`              |

---

## 📦 Sample Entries

```
sensor_type,application,manufacturer,accuracy,data_format,power_usage
LIDAR,Autonomous Vehicles,Velodyne,2cm,PointCloud,8W
IMU,Drones,STMicroelectronics,0.01 deg/sec,Quaternion,0.5W
Accelerometer,Fitness Trackers,Bosch,±2g,Raw,0.2W
Thermopile,Medical Diagnostics,Melexis,0.1°C,Analog,0.1W
Radar,Traffic Monitoring,NXP,5cm,RF Signal,6W
```

---

## 🔍 Usage

This dataset is:
- Used for fuzzy keyword search via `/search_sensors?q=...`
- Accessed by the AI assistant to answer questions related to sensor capabilities, trade-offs, or manufacturer data
- Easily extendable with new fields like `interface_type`, `sampling_rate`, or `operating_temp_range`
