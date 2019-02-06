var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var path = require("path");
var axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, "./.env") });

const APP_NAME = "First Automation SmartApp";

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// http://expressjs.com/en/starter/static-files.html
// app.use(express.static('public'));
app.get("/", (req, res) => {
  console.log(`GET ${req.url}`);
  res.sendFile(__dirname + '/views/index.html');
});

// Main entry point for lifecycle events
app.post("/", async (req, res) => {
  console.log(`\n\nPOST ${req.url} ${JSON.stringify(req.body)}`);
  if (!req.body) return res.sendStatus(400);

  const body = req.body;
  switch (body.lifecycle) {
    case "PING":
      res.status(200).send({ pingData: { challenge: body.pingData.challenge } });
      break;
    case "EVENT":
      res.status(200).send({ eventData: handleEvent(body.eventData) });
      break;
    case "CONFIGURATION":
      res.status(200).send({ configurationData: handleConfig(body.configurationData) });
      break;
    case "INSTALL":
      res.status(200).send({ installData: await handleInstall(body.installData) });
      break;
    case "UPDATE":
      res.status(200).send({ updateData: await handleUpdate(body.updateData) });
      break;
    case "UNINSTALL":
      res.status(200).send({ uninstallData: await handleUninstall(body.uninstallData) });
      break;
    default:
      res.sendStatus(400);
      break;
  }
});

app.listen(process.env.PORT, () => {
  console.log(`${APP_NAME} running on port ${process.env.PORT}`);
});

/**
 * @param {eventData} event
 */
function handleEvent(event) {
  console.log("Handling event", event);
}

/**
 * Upon installation of the automation, the INSTALL lifecycle event is triggered
 * and will include information about what the user selected during CONFIGURATION.
 * @param {installData} install
 */
async function handleInstall(install) {
  console.log("Handling install", install);
}

/**
 * The CONFIG lifecycle event is how this SmartApp tells the SmartThings
 * app what devices (or other arbitrary information) we'd like to configure.
 * SmartThings then triggers the INSTALL lifecycle event with the supplied
 * configuration data.
 * @param {configData} event
 */
function handleConfig(event) {
  if (!event.config) {
    throw new Error("No config section set in request.");
  }

  console.log(`Handling config: ${JSON.stringify(event)}`);
  const configurationData = {};
  const phase = event.phase;

  switch (phase) {
    case "INITIALIZE":
      configurationData.initialize = {
        name: APP_NAME,
        description: "First Automation SmartApp",
        id: "app",
        firstPageId: "1"
      };
      break;
    case "PAGE":
      configurationData.page = {
        pageId: "1",
        name: APP_NAME,
        complete: true,
        sections: [
          {
            name: "Select devices to monitor",
            settings: [
              {
                id: "info",
                name: "SmartApp info",
                description: "This is a simple informational text element",
                type: "PARAGRAPH"
              }
            ]
          }
        ]
      };
      break;
    default:
      throw new Error(`Unsupported config phase: ${phase}`);
  }

  return configurationData;
}

/**
 * The UPDATE lifecycle event is triggered whenever a user changes
 * an existing automation's configuration.
 *
 * In such cases, it is advisable to remove subscriptions and rebuild
 * them with the updated data.
 *
 * You can either inspect the "old configuration" vs "new configuration",
 * or you can choose to "delete all subscriptions" and simply start over.
 * @param {updateData} updateData
 */
async function handleUpdate(updateData) {
  console.log("Handling update", updateData);
  //return await clearSubscriptions(updateData) && await subscribeToDeviceEvents(updateData);
}

/**
 * The UNINSTALL lifecycle event occurs when a user deletes the
 * installed automation from SmartThings.
 *
 * NOTE: there is no authToken supplied in this event object, as
 * the installedApp (and subscriptions) are deleted entirely. You
 * can use this event to clean up any server-side persisted data.
 * @param {uninstallData} uninstallData
 */
async function handleUninstall(uninstallData) {
  console.log("Handling uninstall", uninstallData);
  console.log("Nothing to clean up on UNINSTALL lifecycle event");
}

/**
 * Subscribes to desired device events, first clearing prior subscriptions.
 * @param {Lifecycle event} event
 */
async function subscribeToDeviceEvents(event) {
  // TODO
}

/**
 * Indiscriminately clears all subscriptions for the specified installedApp
 * 
 * NOTE: clearSubscriptions() must be awaited to ensure there isn't a
 * race condition, resulting in new subscriptions being incidently cleared.
 * @param {Lifecycle event} event
 */
async function clearSubscriptions(event) {
  try {
    // Clear all subscriptions
    let response = await axios.delete(
      `https://api.smartthings.com/installedapps/${event.installedApp.installedAppId}/subscriptions`,
      buildAuthHeader(event)
    );

    let count = response && response.data && response.data.count;
    console.log(count > 0 ? `Cleared out ${count} subscriptions.` : "No subscriptions to clear");
    return {
      count: count
    };
  } catch (error) {
    console.log("Failed to clear subscriptions");
  }
}

/**
 * Helper function to build Authorization headers with the included
 * installedApp.authToken field
 * @param {lifecycle object} data
 */
function buildAuthHeader(data) {
  return {
    headers: {
      Authorization: `Bearer ${data.authToken}`
    }
  };
}
