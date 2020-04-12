"use strict";
import Queue from "promise-queue";
import Walkable from "./walkable/index";
import Config from "./config";

class RouteFinder {
  constructor() {
    this.config = new Config();
    this.moveQueue = new Queue(1, Infinity);

    this.walkable;
    this.messageDialog;
    this.countdown;

    this.mouseX;
    this.mouseY;

    Hooks.on("canvasReady", () => {
      this.walkable = new Walkable();
      canvas.stage.on("mousemove", (event) => this.mousemoveListener(event));
      canvas.stage.on("rightup", (event) => this.rightupListener(event));
      if (
        game.modules.get("pathfinding") &&
        game.modules.get("pathfinding").active
      ) {
        this.displayMessage(
          game.i18n.localize("route-finder.errors.oldNameFound")
        );
      }
    });

    Hooks.on("controlToken", (token, control) => {
      if (!control) {
        this.walkable.updateToken();
      } else {
        this.walkable.updateToken(token);
      }
    });

    Hooks.on("getSceneControlButtons", (buttons) => {
      let tokenButton = buttons.find((button) => button.name === "token");
      if (tokenButton) {
        tokenButton.tools.push({
          name: "route-finder",
          title: "Route Finder",
          icon: "fas fa-route",
          visible: true,
          onClick: () => {
            if (canvas.tokens.controlledTokens.length === 1) {
              if (game.paused) {
                this.displayMessage(
                  game.i18n.localize("route-finder.errors.gamePaused")
                );
              }
            } else if (canvas.tokens.controlledTokens.length > 1) {
              this.displayMessage(
                game.i18n.localize("route-finder.errors.tooManyTokens")
              );
            } else {
              this.displayMessage(
                game.i18n.localize("route-finder.errors.tooFewTokens")
              );
            }
          },
        });
      }
    });
  }

  moveTokenToWaypoint(token, waypoint) {
    return this.moveQueue.add(() => {
      return new Promise((resolve) => {
        if (token) {
          const x = waypoint[0] - token.width / 2;
          const y = waypoint[1] - token.width / 2;
          let complete = false;
          setTimeout(() => {
            if (!complete) {
              resolve();
            }
          }, 3000);
          if (token) {
            token.setPosition(x, y).then(() => {
              token.update({ x, y }).then(() => {
                setTimeout(() => {
                  complete = true;
                  resolve();
                }, 20);
              });
            });
          } else {
            complete = true;
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  }

  displayMessage(message) {
    if (!this.messageDialog || !this.messageDialog.rendered) {
      this.messageDialog = new Dialog(
        {
          title: "Route Finding",
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

  mousemoveListener(event) {
    if (
      !game.paused &&
      game.activeTool === "route-finder" &&
      this.moveQueue.getPendingLength() === 0 &&
      this.moveQueue.getQueueLength() === 0
    ) {
      if (this.countdown) {
        clearTimeout(this.countdown);
      }
      this.countdown = setTimeout(() => {
        this.mouseX = event.data.destination.x;
        this.mouseY = event.data.destination.y;
        this.walkable.displayPath(
          event.data.destination.x,
          event.data.destination.y,
          game.settings.get("route-finder", "snapToGrid")
        );
      }, 100);
    }
  }

  rightupListener(event) {
    if (
      this.mouseX &&
      this.mouseY &&
      !game.paused &&
      game.activeTool === "route-finder" &&
      this.moveQueue.getPendingLength() === 0 &&
      this.moveQueue.getQueueLength() === 0
    ) {
      const token = canvas.tokens.controlledTokens[0];
      const movePromises = [];
      const waypoints = this.walkable.getPathWaypoints(
        this.mouseX,
        this.mouseY,
        game.settings.get("route-finder", "snapToGrid")
      );
      waypoints.forEach((waypoint) => {
        movePromises.push(this.moveTokenToWaypoint(token, waypoint));
      });
      Promise.all(movePromises).then(() => {});
    }
  }
}

Hooks.on("init", () => {
  const routeFinder = new RouteFinder();
});
