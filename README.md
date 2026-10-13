# Full-Stack IoT LED Controller (Mobile Client)

A professional React Native (Expo) mobile application designed for real-time control, monitoring, and interactive synchronization of smart addressable LED strips (WS2812B / NeoPixel) powered by an ESP32 microcontroller and Firebase Realtime Database.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
  - [Home Dashboard and Telemetry](#home-dashboard-and-telemetry)
  - [Color and Temperature Management](#color-and-temperature-management)
  - [Lighting Animation Engine](#lighting-animation-engine)
  - [Sensors and Interactive Modes](#sensors-and-interactive-modes)
  - [Floating Status Bar and Quick Controls](#floating-status-bar-and-quick-controls)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Communication Protocol and Data Schema](#communication-protocol-and-data-schema)
- [Installation and Setup](#installation-and-setup)
- [Building with EAS](#building-with-eas)
- [Configuration](#configuration)
- [Author and License](#author-and-license)

---

## Overview

This application serves as the primary mobile control hub for a custom-built, full-stack IoT lighting ecosystem. It provides bidirectional communication between the mobile client and the ESP32 hardware firmware via cloud synchronization. 

The application goes beyond simple on/off switching by implementing complex interactions: physical smartphone sensor processing (accelerometer/gyroscope), pixel-by-pixel canvas drawing, an interactive LED-based multiplayer Ping Pong game, Formula 1 telemetry display, screen backlighting (Ambilight), and accurate real-time electrical power estimation.

---

## System Architecture

The application is structured into decoupled layers for state management, hardware services, reusable UI components, and dedicated feature screens:

- **State Layer (`context/LedContext.js`)**: Provides a centralized React Context with automatic polling (5000ms heartbeat) to keep all application screens synchronized with the hardware state stored in the cloud.
- **Service Layer (`services/api.js`)**: Encapsulates all network operations against the Firebase Realtime Database REST API using HTTP `PATCH` requests to optimize network bandwidth and ensure atomic attribute updates.
- **Hardware Optimization Layer**: Implements client-side throttling (`lodash.throttle`) and debouncing (`lodash.debounce`) on touch sliders to prevent flooding the microcontroller with packet storms.
- **UI & Presentation Layer**: Built on `@react-navigation/bottom-tabs` using a dark-mode theme, Google Outfit typography, and native-driver-accelerated screen transitions (`FadeScreen.js`).

---

## Key Features

### Home Dashboard and Telemetry

- **Hardware Connection Monitor**: Measures and displays round-trip network latency (ping in milliseconds) to the Firebase database and microcontroller.
- **Optimistic Power Control**: Toggles power state instantly with optimistic UI rollbacks in case of network failures.
- **Real-Time Electrical Power Estimator**: Accurately calculates current (mA), electrical current (A), and power consumption (Watts) in real time based on:
  - 58 individually addressable WS2812B LEDs.
  - Per-channel color intensity (up to 20mA per RGB sub-pixel).
  - Configured brightness factor (0-255).
  - Microcontroller base idle draw (~100mA at 5V).
- **Virtual LED Visualizer**: A 12-node dynamic visual preview strip reflecting current color, moving gradients, or active animation states.
- **Active Mode Indicator**: Displays current system operational mode (Solid, Animation, Gradient, Tilt, Canvas, Music, F1, Ambilight).

### Color and Temperature Management

- **Palette Presets**: 15 pre-configured vibrant colors with animated spring-scale touch feedback.
- **Touch-Based Color Spectrum Picker**: Custom HSL-to-RGB color slider supporting real-time touch dragging with throttled data dispatching.
- **Multi-Stop Color Gradients**: Built-in gradient themes (Neon, Miami, Lemon, Ice & Fire, Space, Gold) with speed adjustment.
- **Kelvin Color Temperature Approximations**: Calibrated white lighting presets across standard Kelvin ratings:
  - 2200K (Candlelight)
  - 3000K (Warm White)
  - 4500K (Natural White)
  - 5000K (Daylight)
  - 6500K (Cool White)
  - 8000K (Ice White)
- **Brightness & Speed Controls**: Custom touch-track sliders supporting precise 0-255 adjustments.

### Lighting Animation Engine

The application includes 22 lighting patterns organized into logical categories:

- **Basic Modes**: Solid Color, Blink, Theater Chase.
- **Nature and Atmosphere**: Fire Simulation, Northern Lights (Aurora), Breathing, Sine Wave, Meteor Shower, Comet, Color Waves, Horizon Twilight.
- **Energy and Dynamic**: Rainbow Cycle, Party Lights, Fireworks, Lightspeed, Plasma Energy, Color Palette, Larson Scanner (Knight Rider K.I.T.T. effect), Converge, Tetris Blocks, Dual Scan.
- **Color Customization**: Dynamic parameter binding allowing users to apply custom colors to animations that support color overrides.

### Sensors and Interactive Modes

- **Tilt / Gravity Sensor**: Utilizes the smartphone's hardware accelerometer (`expo-sensors`) to compute real-time device orientation and control virtual fluid physics/light flow on the LED strip.
- **Live Canvas (Pixel Drawing)**: Direct interactive drawing interface allowing users to paint individual pixels across the 58-LED physical strip in real time.
- **DJ Soundboard**: Visual effect trigger pad allowing immediate bursts, flashes, and strobes synced to live user tapping.
- **Shake to Randomize**: Uses physical phone shaking detection to instantly randomize animations and color schemes.
- **Music Reactive Mode**: Synchronizes color schemes and speeds to ambient audio rhythms.
- **F1 Telemetry Interface**: Integration for racing telemetry, displaying shift lights (RPM rev indicators), DRS status, safety flags, and braking alerts.
- **Screen Ambilight**: TV/Monitor backlighting mode for synchronized ambient lighting during media playback.
- **Physical LED Ping Pong Game**: An interactive two-player game played directly on the physical LED strip:
  - Supports Solo and Multiplayer Room architectures (`createRoom`, `joinRoom`, `startMultiGame`).
  - Real-time score tracking (`p1_score`, `p2_score`) and collision timing actions.

### Floating Status Bar and Quick Controls

- **Global Mini Controller (`ActiveStatusBar.js`)**: A persistent floating status bar present across all screens displaying current active mode, colors, and live parameters.
- **Expandable Bottom Sheet**: Expands into a control panel featuring:
  - Sleep timer with configurable auto-shutdown delays (15, 30, 45, 60 minutes).
  - Quick scene presets: Work Mode (Focus blue), Party Mode (Vibrant magenta), Relaxation Mode (Emerald green).
  - Rapid brightness adjustment.
  - Master hardware power toggle.

---

## Technology Stack

- **Framework**: React Native (Expo SDK 54)
- **Core Runtime**: React 19.1.0, React Native 0.81.5
- **Navigation**: `@react-navigation/native`, `@react-navigation/bottom-tabs`
- **Sensors & Hardware**: `expo-sensors` (Accelerometer)
- **Styling & UI**: Vanilla StyleSheet, `expo-linear-gradient`, `@expo/vector-icons` (MaterialIcons, FontAwesome5, Octicons, Feather, Ionicons)
- **Typography**: `@expo-google-fonts/outfit`, `expo-font`
- **Performance & Utilities**: `lodash`, `lodash.debounce`, `lodash.throttle`
- **Backend / Database**: Firebase Realtime Database (REST API via `fetch`)
- **Build System**: EAS Build (`eas.json`)

---

## Project Directory Structure

```
ledControl/
├── App.js                     # Root entry point with Tab Navigator & Font loader
├── app.json                   # Expo application manifest and permissions
├── eas.json                   # EAS Build profile configuration (APK/AAB)
├── package.json               # Dependencies and build scripts
├── constants/
│   └── ledConfig.js           # Preset colors, gradient definitions, and animation metadata
├── context/
│   └── LedContext.js          # Central state management and polling provider
├── services/
│   └── api.js                 # Firebase Realtime Database REST API connector
├── components/
│   ├── ActiveStatusBar.js     # Floating quick-access status bar and modal sheet
│   ├── BrightnessSlider.js    # Debounced touch-based brightness slider
│   ├── ColorPicker.js         # Throttled HSL spectrum slider component
│   ├── FadeScreen.js          # Native-driver tab transition wrapper
│   └── SpeedSlider.js         # Debounced animation velocity slider
└── screens/
    ├── HomeScreen.js          # Main dashboard, telemetry, power calculations
    ├── ColorsScreen.js        # Solid colors, gradients, Kelvin presets, color picker
    ├── AnimationsScreen.js    # 22-mode categorized animation library
    └── InteractionsScreen.js  # Accelerometer tilt, canvas, DJ board, Ping Pong, F1
```

---

## Communication Protocol and Data Schema

The application communicates with the ESP32 firmware via Firebase Realtime Database at the endpoint:
`https://<project-id>-default-rtdb.firebaseio.com/led_status.json`

### Data Schema Overview

| Key | Type | Description |
| :--- | :--- | :--- |
| `power` | boolean | Global LED strip power state (true = on, false = off) |
| `brightness` | number (0-255) | Global LED brightness level |
| `speed` | number (0-255) | Animation velocity / transition speed |
| `mode` | string | Current operating mode (`solid`, `animation`, `gradient`, `canvas`, `custom_gradient`, etc.) |
| `color` | object `{ r, g, b }` | Active RGB color representation (values 0-255) |
| `active_animation` | string | Selected animation identifier (e.g., `rainbow`, `meteor`, `fire`) |
| `gradient_theme` | string | Selected gradient identifier (`gradient1` through `gradient6`) |
| `gradient_animation` | boolean | Toggles motion on static gradient themes |
| `canvas_trigger` | object `{ i, c, t }` | Pixel coordinate index `i`, RGB array `c`, timestamp `t` for live painting |
| `ping_pong_mode` | string | Ping Pong gameplay status (`solo`, `multi`) |
| `multi_status` | string | Room lifecycle state (`waiting`, `ready`, `playing`) |
| `p1_score` / `p2_score` | number | Player scores for interactive gaming |
| `p1_action` / `p2_action` | number | High-resolution timestamp for paddle deflection |
| `start_trigger` | number | Timestamp indicating game round initiation |

---

## Installation and Setup

### Prerequisites

- Node.js (v18.x or later recommended)
- npm or yarn package manager
- Expo Go application on iOS or Android, or a preconfigured development build

### Step-by-Step Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SametERILTER/Full-Stack-IoT-Led-Controller.git
   cd Full-Stack-IoT-Led-Controller
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npx expo start
   ```

4. Scan the generated QR code using the Expo Go mobile app (Android) or the default Camera app (iOS).

---

## Building with EAS

This project includes pre-configured build profiles in `eas.json` for building standalone binaries (APK / AAB / IPA).

### Available Build Profiles

- **development**: Compiles an internal development client with debugging enabled.
- **preview**: Generates a direct installable Android APK (`buildType: "apk"`).
- **production**: Builds production-ready application bundles for store deployment.

### Generating an Android APK

1. Install EAS CLI globally if not already installed:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Trigger an APK build:
   ```bash
   eas build -p android --profile preview
   ```

---

## Configuration

To connect the application to your own ESP32 and Firebase project:

1. Open `services/api.js`.
2. Locate the `FIREBASE_DB_URL` constant:
   ```javascript
   const FIREBASE_DB_URL = 'https://<YOUR_FIREBASE_PROJECT>-default-rtdb.firebaseio.com';
   ```
3. Update the URL with your Firebase Realtime Database URL.
4. Ensure your Firebase Database Rules allow read and write access for authorized clients or during development:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

---

## Author and License

- **Developer**: Samet Erilter
- **GitHub**: [@SametERILTER](https://github.com/SametERILTER)
- **License**: MIT License
