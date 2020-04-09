"use strict";
import Queue from "promise-queue";
import PathfindingGrid from "./grid";
import PF from "pathfinding";

class Pathfinding {
  constructor() {
    this.moveQueue = new Queue(1, Infinity);
    this.gridResolution = game.settings.get("pathfinding", "gridResolution");
    this.sceneGrid;
    this.messageDialog;
    this.lastDrawnPath;
    this.lastPath;
    this.countdown;

    Hooks.on("canvasReady", () => {
      this.sceneGrid = new PathfindingGrid(this.gridResolution);
      if (game.settings.get("pathfinding", "drawGrid")) {
        this.sceneGrid.drawGrid();
      }
    });

    Hooks.on("createWall", () => {
      this.updateGrid();
      if (game.settings.get("pathfinding", "drawGrid")) {
        this.sceneGrid.drawGrid();
      }
    });

    Hooks.on("updateWall", () => {
      this.updateGrid();
      if (game.settings.get("pathfinding", "drawGrid")) {
        this.sceneGrid.drawGrid();
      }
    });

    Hooks.on("deleteWall", () => {
      this.updateGrid();
      if (game.settings.get("pathfinding", "drawGrid")) {
        this.sceneGrid.drawGrid();
      }
    });

    Hooks.on("controlToken", (token, control) => {
      if (!control) {
        canvas.stage.removeListener("mousemove", this.mousemoveListener);
        canvas.stage.removeListener("rightup", this.rightupListener);
        if (this.lastDrawnPath) {
          deleteDrawingById(this.lastDrawnPath._id);
        }
      }
    });

    Hooks.on("getSceneControlButtons", (buttons) => {
      let tokenButton = buttons.find((button) => button.name === "token");
      if (tokenButton) {
        tokenButton.tools.push({
          name: "pathfinding",
          title: "Pathfinding",
          icon: "fas fa-route",
          visible: true,
          onClick: () => {
            if (canvas.tokens.controlledTokens.length === 1) {
              canvas.stage.on("mousemove", (event) =>
                this.mousemoveListener(event)
              );
              canvas.stage.on("rightup", (event) =>
                this.rightupListener(event)
              );
            } else if (canvas.tokens.controlledTokens.length > 1) {
              this.displayMessage(
                game.i18n.localize("pathfinding.errors.tooManyTokens")
              );
            } else {
              this.displayMessage(
                game.i18n.localize("pathfinding.errors.tooFewTokens")
              );
            }
          },
        });
      }
    });
  }

  updateGrid() {
    this.sceneGrid.update();
  }

  moveTokenToWaypoint(token, waypoint) {
    return this.moveQueue.add(() => {
      return token.setPosition(waypoint[0], waypoint[1]).then(() => {
        return token.update({
          x: waypoint[0],
          y: waypoint[1],
        });
      });
    });
  }

  displayMessage(message) {
    if (!this.messageDialog || !this.messageDialog.rendered) {
      this.messageDialog = new Dialog(
        {
          title: "Pathfinding",
          content: `<p>${message}</p>`,
          buttons: {
            dismiss: {
              icon: '<i class="fas fa-times"></i>',
              label: "Close",
              callback: () => {
                this.messageDialog = null;
              },
            },
          },
          close: () => {
            this.messageDialog = null;
          },
        },
        { width: 300 }
      ).render(true);
    }
  }

  deleteDrawingById(id) {
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

  mousemoveListener(event) {
    if (!game.paused) {
      if (this.countdown) {
        clearTimeout(this.countdown);
      }
      this.countdown = setTimeout(() => {
        const token = canvas.tokens.controlledTokens[0];
        if (token) {
          const path = this.sceneGrid.findPath(
            token.center.x,
            token.center.y,
            event.data.destination.x,
            event.data.destination.y,
            token
          );
          if (this.lastDrawnPath) {
            this.deleteDrawingById(this.lastDrawnPath._id).then(() => {
              this.sceneGrid.drawPath(path, token).then((drawnPath) => {
                this.lastDrawnPath = drawnPath;
                this.lastPath = path;
              });
            });
          } else {
            this.sceneGrid.drawPath(path, token).then((drawnPath) => {
              this.lastDrawnPath = drawnPath;
              this.lastPath = path;
            });
          }
        }
      }, 100);
    }
  }

  rightupListener(event) {
    if (
      this.lastDrawnPath &&
      this.lastPath &&
      this.lastPath.length > 0 &&
      !game.paused
    ) {
      const token = canvas.tokens.controlledTokens[0];
      const movePromises = [];
      canvas.stage.removeListener("mousemove", this.mousemoveListener);
      canvas.stage.removeListener("rightup", this.rightupListener);
      PF.Util.compressPath(this.lastPath).forEach((waypoint, index) => {
        if (index > 0) {
          movePromises.push(this.moveTokenToWaypoint(token, waypoint));
        }
      });
      Promise.all(movePromises).then(() => {
        token.update({
          x: this.lastPath[this.lastPath.length - 1][0],
          y: this.lastPath[this.lastPath.length - 1][1],
        });
        this.deleteDrawingById(this.lastDrawnPath._id);
      });
    }
  }
}

Hooks.on("init", () => {
  game.settings.register("pathfinding", "gridResolution", {
    name: game.i18n.localize("pathfinding.gridResolution.name"),
    hint: game.i18n.localize("pathfinding.gridResolution.hint"),
    scope: "world",
    config: true,
    default: 4,
    type: Number,
  });
  game.settings.register("pathfinding", "drawGrid", {
    name: game.i18n.localize("pathfinding.drawGrid.name"),
    hint: game.i18n.localize("pathfinding.drawGrid.hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });
  const pathfinding = new Pathfinding();
});
