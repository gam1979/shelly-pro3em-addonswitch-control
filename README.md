# Shelly Pro 3EM Addon Switch Control

This script was created to solve a specific challenge that arose from upgrading a solar power system. After expanding the photovoltaic installation from 5kWp to 11.75kWp, the installation required a new inverter which, unlike the previous one, did not include built-in functionality to control water heating using excess solar power. 

To restore and improve this important energy-saving feature, a solution was developed using the programmable Shelly Pro 3EM device with a Pro Output Addon. The setup uses a power contactor (German: Lastschütz) to safely switch the water heater, controlled by this script which monitors power export and automatically utilizes excess solar production.

This script controls the heater through the Shelly Pro 3EM device based on power export measurements, ensuring that excess solar power is efficiently used for water heating instead of being exported to the grid.

## Documentation Links

- Shelly Pro 3EM Documentation: [https://shelly-api-docs.shelly.cloud/gen2/]
- Shelly Pro Output Addon Documentation: [https://shelly-api-docs.shelly.cloud/gen2/Addons/ShellyProOutputAddon]

## Live View

![Shelly Script Live View](shelly-pro3em-scripts-liveview.jpg)

The screenshot above shows the script running in the Shelly web interface. The interface is split into two main sections:
- Top: Script editor showing the code with syntax highlighting
- Bottom: Live console output showing real-time power readings, switch states, and script actions

In this example, you can see the script monitoring three-phase power measurements and making decisions based on the total power export/import values.

## Features

- Monitors three-phase power measurements
- Automatically controls heater based on power export
- Configurable time-based restrictions
- Error handling with automatic safety shutoff
- Configurable check intervals
- Detailed logging

## Requirements

- Shelly Pro 3EM device
- Shelly Pro Output Addon
- Heater connected to the addon switch

## Configuration

The script uses the following configurable parameters:

```javascript
let powerThreshold = -1500;           // Power threshold in Watts (negative = export)
let checkIntervalInMinutes = 5;       // How often to check power readings
let useOffTimes = true;               // Whether to use time restrictions (default: true)
let offTimeHourStart = 20;            // Hour when heater should stop (24h format, default: 20 = 8 PM)
let offTimeHourEnd = 6;               // Hour when heater can start again (24h format, default: 6 = 6 AM)
let maxErrors = 3;                    // Maximum consecutive errors before safety shutoff
```

### Power Threshold
- Set to -1500W by default
- Heater turns ON when power export exceeds 1500W (power < -1500W)
- Heater turns OFF when power import occurs (power >= 0W)

### Time Restrictions
- Time restrictions can be enabled/disabled using `useOffTimes` (default: enabled)
- When enabled:
  - By default, heater only operates between 06:00 and 20:00
  - Time restrictions are configurable using:
    - `offTimeHourStart`: When to stop operation (default: 20 = 8 PM)
    - `offTimeHourEnd`: When to allow operation again (default: 6 = 6 AM)
  - Automatically turns off outside these hours
- When disabled:
  - Heater can operate at any time based on power threshold

### Safety Features
- Automatic shutoff after 3 consecutive errors
- Initial startup safety check
- Time-based restrictions
- Detailed error logging

## Installation

1. Enable the Pro Output Addon in your Shelly Pro 3EM device
2. Upload the script `shelly-pro3em-addonswitch-control.js` to your Shelly device
3. Configure the script parameters if needed
4. Start the script

## Operation

The script will:
1. Check if the addon switch is properly configured
2. Monitor power readings every 5 minutes
3. Turn the heater on when excess power is available
4. Turn the heater off when:
   - Power export drops below threshold
   - Power import occurs
   - Outside allowed hours (20:00-06:00)
   - Too many errors occur

## Logging

The script provides detailed logging of:
- Power readings from all three phases
- Switch state changes
- Errors and warnings
- Configuration on startup

## Troubleshooting

If you encounter issues:
1. Check if the Pro Output Addon is properly enabled
2. Verify the switch configuration (ID: 100)
3. Check the logs for error messages
4. Ensure the device time is correctly set for time-based restrictions

## License

This script is provided as-is under the MIT license. 