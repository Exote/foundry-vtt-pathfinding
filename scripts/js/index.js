"use strict";
import Queue from "promise-queue";
import PathfindingGrid from "./grid";
import PF from "pathfinding";

let moveQueue = new Queue(1, Infinity);
let sceneGrid;
let messageDialog;
let lastDrawnPath;
let lastPath;
let countdown;
const gridResolution = 4;

function moveTokenToWaypoint(token, waypoint) {
  return moveQueue.add(() => {
    return token.setPosition(waypoint[0], waypoint[1]);
  });
}

function displayMessage(message) {
  if (!messageDialog) {
    messageDialog = new Dialog(
      {
        title: name,
        content: `<p>${message}</p>`,
        buttons: {
          dismiss: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close",
            callback: () => {
              messageDialog = null;
            },
          },
        },
        close: () => {
          messageDialog = null;
        },
      },
      { width: 300 }
    ).render(true);
  }
}

function deleteDrawingById(id) {
  return new Promise((resolve) => {
    let found = false;
    canvas.drawings.placeables.forEach((placeable) => {
      if (placeable.id === id) {
        found = true;
        placeable.delete().then(() => {
          resolve();
        });
      }
    });
    if (!found) {
      resolve();
    }
  });
}

function mousemoveListener(event) {
  if (countdown) {
    clearTimeout(countdown);
  }
  countdown = setTimeout(() => {
    const token = canvas.tokens.controlledTokens[0];
    const path = sceneGrid.findPath(
      token.center.x,
      token.center.y,
      event.data.destination.x,
      event.data.destination.y,
      token
    );
    if (lastDrawnPath) {
      deleteDrawingById(lastDrawnPath._id).then(() => {
        sceneGrid.drawPath(path, token).then((drawnPath) => {
          lastDrawnPath = drawnPath;
          lastPath = path;
        });
      });
    } else {
      sceneGrid.drawPath(path, token).then((drawnPath) => {
        lastDrawnPath = drawnPath;
        lastPath = path;
      });
    }
  }, 100);
}

function rightupListener(event) {
  if (lastDrawnPath && lastPath) {
    const token = canvas.tokens.controlledTokens[0];
    const movePromises = [];
    canvas.stage.removeListener("mousemove", mousemoveListener);
    canvas.stage.removeListener("rightup", rightupListener);
    PF.Util.compressPath(lastPath).forEach((waypoint, index) => {
      if (index > 0) {
        movePromises.push(moveTokenToWaypoint(token, waypoint));
      }
    });
    Promise.all(movePromises).then(() => {
      token.update({
        x: lastPath[lastPath.length - 1][0],
        y: lastPath[lastPath.length - 1][1],
      });
      deleteDrawingById(lastDrawnPath._id);
    });
  }
}

Hooks.on("getSceneControlButtons", (buttons) => {
  let tokenButton = buttons.find((b) => b.name === "token");
  if (tokenButton) {
    tokenButton.tools.push({
      name: "combat-ai",
      title: name,
      icon: "fas fa-route",
      visible: true,
      onClick: () => {
        if (canvas.tokens.controlledTokens.length === 1) {
          canvas.stage.on("mousemove", mousemoveListener);
          canvas.stage.on("rightup", rightupListener);
        } else if (canvas.tokens.controlledTokens.length > 1) {
          displayMessage("Please select only one token.");
        } else {
          displayMessage("Please select a token.");
        }
      },
    });
  }
});

Hooks.on("canvasReady", () => {
  sceneGrid = new PathfindingGrid(gridResolution);
  // sceneGrid.drawGrid();
});

Hooks.on("controlToken", (token, control) => {
  if (!control) {
    canvas.stage.removeListener("mousemove", mousemoveListener);
    canvas.stage.removeListener("rightup", rightupListener);
    if (lastDrawnPath) {
      deleteDrawingById(lastDrawnPath._id);
    }
  }
});
