// Configuration
let powerThreshold = -1500; // Power threshold for excess energy (negative = export)
let checkIntervalInMinutes = 5; // Check interval in minutes (default: 5)
let useOffTimes = true;     // Whether to use time restrictions (default: true)
let offTimeHourStart = 20;  // Hour when switch should stop (24h format, default: 20 = 8 PM)
let offTimeHourEnd = 6;     // Hour when switch can start again (24h format, default: 6 = 6 AM)
let errorCount = 0; // Track consecutive errors
let maxErrors = 3; // Maximum number of consecutive errors before forcing switch off

// Variables
let isSwitchOn = false;
let isInitialStartup = true;  // Add flag to track initial startup

// Function to get current timestamp
function getTimestamp() {
    return new Date().toISOString();
}

// Function to check if current time is within allowed hours
function isWithinAllowedHours() {
    if (!useOffTimes) {
        print("[" + getTimestamp() + "] Time restrictions are disabled. Switch is allowed to be turned on/off at any time.");
        return true;  // Always allow if time restrictions are disabled
    }
    let now = new Date();
    let hour = now.getHours();
    let result = hour >= offTimeHourEnd && hour < offTimeHourStart;
    print("[" + getTimestamp() + "] Checking time restrictions: " + (result ? "Switch control enabled" : "Switch control disabled"));
    return result;
}

// Function to handle errors and ensure switch safety
function handleError(errorMessage, context) {
    errorCount++;
    let errorLog = "[" + getTimestamp() + "] ERROR in " + context + ": " + errorMessage;
    print(errorLog);
    
    // If we've had too many consecutive errors, force switch off
    if (errorCount >= maxErrors) {
        print("[" + getTimestamp() + "] Too many consecutive errors, forcing switch off for safety");
        turnOffSwitch();
        errorCount = 0; // Reset error count after forcing switch off
    }
}

// Function to check and configure add-on switch
function configureAddonSwitch() {
    print("[" + getTimestamp() + "] Checking add-on switch configuration...");
    
    // First check if the add-on is enabled
    Shelly.call("Sys.GetConfig", {}, function(result, error_code, error_message) {
        if (error_code !== 0) {
            print("[" + getTimestamp() + "] Error checking system config:", error_message);
            return;
        }
        
        // Check if add-on is enabled
        if (!result.device || result.device.addon_type !== "prooutput") {
            print("[" + getTimestamp() + "] ProOutput add-on is not enabled. Please enable it in the web interface.");
            return;
        }
        
        // Get current peripherals
        Shelly.call("ProOutputAddon.GetPeripherals", {}, function(result, error_code, error_message) {
            if (error_code !== 0) {
                print("[" + getTimestamp() + "] Error getting peripherals:", error_message);
                return;
            }
            
            // Check if switch is already configured
            if (result.digital_out && result.digital_out["switch:100"]) {
                print("[" + getTimestamp() + "] Switch is already configured");
                // Wait a short moment before checking status
                Timer.set(1000, false, function() {
                    checkSwitchStatus();
                });
                return;
            }
            
            // Configure the switch
            print("[" + getTimestamp() + "] Configuring add-on switch...");
            Shelly.call("ProOutputAddon.AddPeripheral", {
                type: "digital_out",
                attrs: { cid: 100 }
            }, function(result, error_code, error_message) {
                if (error_code !== 0) {
                    print("[" + getTimestamp() + "] Error configuring add-on switch:", error_message);
                    return;
                }
                print("[" + getTimestamp() + "] Add-on switch configured successfully. Please reboot the device.");
            });
        });
    });
}

// Function to check switch status
function checkSwitchStatus() {
    print("[" + getTimestamp() + "] Checking switch status...");
    Shelly.call("Switch.GetStatus", { id: 100 }, function(result, error_code, error_message) {
        if (error_code !== 0) {
            print("[" + getTimestamp() + "] Error checking switch status:", error_message);
            print("[" + getTimestamp() + "] Please ensure the switch is properly configured and activated");
            return;
        }
        print("[" + getTimestamp() + "] Switch status:", JSON.stringify(result));
        
        // Only turn off switch if it's on during initial startup
        if (isInitialStartup && result && result.output) {
            print("[" + getTimestamp() + "] Switch is on during startup, turning it off...");
            turnOffSwitch();
        } else {
            // Update isSwitchOn state based on actual switch status
            isSwitchOn = result && result.output;
            print("[" + getTimestamp() + "] Switch state updated:", isSwitchOn ? "ON" : "OFF");
        }
    });
}

// Function to check power status
function checkPower() {
    print("\n[" + getTimestamp() + "] Checking power status...");
    
    // Check if we're within allowed hours
    if (!isWithinAllowedHours()) {
        if (isSwitchOn) {
            print("[" + getTimestamp() + "] Outside allowed hours, turning off switch");
            turnOffSwitch();
        }
        return;
    }
    
    // Get status for the combined meter in triphase mode
    Shelly.call("EM.GetStatus", { id: 0 }, function(result, error_code, error_message) {
        if (error_code !== 0) {
            handleError(error_message, "EM.GetStatus");
            return;
        }

        if (result && result.total_act_power !== undefined) {
            let totalPower = result.total_act_power;
            print("[" + getTimestamp() + "] Power Readings:");
            print("  Phase A:", result.a_act_power, "W");
            print("  Phase B:", result.b_act_power, "W");
            print("  Phase C:", result.c_act_power, "W");
            print("  Total Power:", totalPower, "W (Threshold:", powerThreshold, "W)");
            
            if (totalPower < powerThreshold && !isSwitchOn) {
                print("[" + getTimestamp() + "] Power below threshold and switch is off. Turning on switch...");
                turnOnSwitch();
            } else if (isSwitchOn && totalPower >= 0) {
                print("[" + getTimestamp() + "] Power above 0W and switch is on. Turning off switch...");
                turnOffSwitch();
            } else {
                print("[" + getTimestamp() + "] No action needed. Power:", totalPower, "W, Switch:", isSwitchOn ? "ON" : "OFF");
            }
            errorCount = 0; // Reset error count on successful operation
        } else {
            handleError("No power data available in response", "EM.GetStatus");
            print("[" + getTimestamp() + "] Response:", JSON.stringify(result));
        }
    });
}

// Function to log switch state changes
function logSwitchState(state) {
    let timestamp = getTimestamp();
    let action = state ? "ON" : "OFF";
    print("[" + timestamp + "] Switch turned " + action);
}

// Function to turn on switch
function turnOnSwitch() {
    if (isSwitchOn) {
        print("[" + getTimestamp() + "] Switch is already on, skipping turn-on");
        return;
    }
    
    // Check time restrictions before turning on
    if (!isWithinAllowedHours()) {
        print("[" + getTimestamp() + "] Cannot turn on switch: Outside allowed hours");
        return;
    }
    
    print("[" + getTimestamp() + "] Sending command to turn on switch...");
    Shelly.call("Switch.Set", { id: 100, on: true }, function(result, error_code, error_message) {
        if (error_code !== 0) {
            handleError(error_message, "Switch.Set (ON)");
            return;
        }
        
        isSwitchOn = true;
        logSwitchState(true);
        errorCount = 0; // Reset error count on successful operation
    });
}

// Function to turn off switch
function turnOffSwitch() {
    print("[" + getTimestamp() + "] Sending command to turn off switch...");
    Shelly.call("Switch.Set", { id: 100, on: false }, function(result, error_code, error_message) {
        if (error_code !== 0) {
            handleError(error_message, "Switch.Set (OFF)");
            return;
        }
        
        isSwitchOn = false;
        logSwitchState(false);
        errorCount = 0; // Reset error count on successful operation
        print("[" + getTimestamp() + "] Switch turned off successfully");
    });
}

print("[" + getTimestamp() + "] Script started. Configuration:");
print("  - Power Threshold:", powerThreshold, "W");
print("  - Check Interval:", checkIntervalInMinutes, "minutes");

// Configure add-on switch on startup
configureAddonSwitch();

// Wait a moment before starting power checks
Timer.set(2000, false, function() {
    checkPower();
    // Start a loop that checks power every X minutes
    Timer.set(checkIntervalInMinutes * 60 * 1000, true, function() {
        isInitialStartup = false;  // Clear initial startup flag before first check
        checkPower();
    });
});
