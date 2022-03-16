var def = require("./imports").default;
var THREE = def.THREE;
var Edge = def.Edge;
var Node = def.Node;
var OrbitControls = def.OrbitControls;
var d3 = def.d3;
var ee = def.ee;
var $ = require("jquery");
const { default: appState } = require("../../stores");

const arraysEqual = (a1, a2) => {
  return a1.length === a2.length && a1.every((o, idx) => objectsEqual(o, a2[idx]));
};

const objectsEqual = (o1, o2) => {
  return o1.id === o2.id;
};

const findNode = (o1, a1) => {
  if (!a1) return null;
  for (let i = 0; i < a1.length; i++) {
    if (o1.id == a1[i].id) {
      return a1[i];
    }
  }
  return null;
};

module.exports = function (self) {
  


  /**
   * Mouse move event that selections nodes in selection box
   */
  self.onMouseMove = function (selection, mouseX, mouseY, button, ctrl) {  
    // self.onHover(selection);
    // check if left button is not down
    self.mouseX = mouseX;
    self.mouseY = mouseY;
    if (self.leftMouseDown && self.mouseDown) {
      // left-clicked empty space (i.e., not clicking a node)
      if (!self.dragging && self.selection.indexOf(selection) == -1 && !ctrl) {
        self.clearSelection();
      }


      if (!self.dragging) {
        // add nodes enclosed by selection box into node selection
        self.checkSelection(mouseX, mouseY);
      }
    }

    


    if (self.selection.length > 0) {
      // reactivate (in D3's terminology: reheat) the force layout
      if (self.dragging) {
        self.force.alpha(1);
      }
      // update position of nodes in selection
      self.updateSelection(mouseX, mouseY);
    }

    if (!self.mouseDown) {
      self.onHover(selection);
      self.mouseStart = new THREE.Vector3(mouseX, mouseY, 0);
    } else {
      // if mouse is in minimap, do nothing else
      if (self.isMouseCoordinatesOnMinimap && self.mapShowing) {
        self.minimap.panToMousePosition(
          self.minimap.mouseX,
          self.minimap.mouseY
        );
        return;
      }



      // update selection box size/position
      if (self.leftMouseDown && !self.dragging) {
        if (self.showBox) {
          self.selectBox.visible = true;
          self.showBox = false;
        }
        self.selectBox.position.x = mouseX;
        self.selectBox.position.y = mouseY;
        var diffx = self.mouseStart.x - mouseX;
        var diffy = self.mouseStart.y - mouseY;
        self.selectBox.scale.set(diffx, diffy, 1);
      } else {
        self.selectBox.visible = false;
      }
    }
  };

  /**
   * Mouse hover over node event that highlights the node and neighbors at mouse position
   */
  self.onHover = function (node) {
    if (self.lastHover && self.selection.indexOf(self.lastHover) == -1) {
      self.highlightNode(self.lastHover, false);
      self.lastHover.renderData.textHolder.children[0].element.hideme = true;
      self.highlightEdges(node, false);
    }
    self.lastHover = node;
    if (node) {
      self.highlightNode(node, true);
      node.renderData.textHolder.children[0].element.hideme = false;
      self.highlightEdges(node, true);

      //set currently hovered node
      appState.graph.currentlyHovered = node;

    } else if (self.selection.length == 0) {
      //set currently hovered node
      appState.graph.currentlyHovered = null;

      self.graph.forEachNode(n => {
        self.colorNodeOpacity(n, 1);
        self.colorNodeEdge(n, 0.5, 0.5);
        self.highlightNode(n, false, def.ADJACENT_HIGHLIGHT);
      });
    }
    if (self.prevHighlights != undefined) {
      for (var i = 0; i < self.prevHighlights.length; i++) {
        self.colorNodeOpacity(self.prevHighlights[i], 1);
        self.highlightNode(self.prevHighlights[i], true, def.SEARCH_HIGHLIGHT);
      }
    }
  };
  




  // vars to get time at mouse press and time at mouse release
  var startTime = 0; 
  var endTime = 0;
  /**
   * Mouse down event to start a selection box or start dragging a node
   */
  self.onMouseDown = function (selection, mouseX, mouseY, button, ctrl) {
    // if mouse is in minimap, do nothing else
    if (self.isMouseCoordinatesOnMinimap && self.mapShowing) {
      self.mouseDown = true;
      self.minimap.panToMousePosition(self.minimap.mouseX, self.minimap.mouseY);
      return;
    }

    

    self.leftMouseDown = true;
    if (self.leftMouseDown) {

      self.onHover(selection);

      self.mouseDown = true;
      self.mouseStart = new THREE.Vector3(mouseX, mouseY, 0);
      if (button == 0 && !self.dragging) {
        self.showBox = true;
      }
      if (self.selection.indexOf(selection) == -1 && !ctrl) {
        for (var i = 0; i < self.selection.length; i++) {
          self.selection[i].renderData.isSelected = false;
          if (!def.NODE_NO_HIGHLIGHT) {
            self.selection[
              i
            ].renderData.draw_object.children[0].visible = false;
          } else {
            self.selection[i].renderData.draw_object.material.color.set(
              new THREE.Color(self.selection[i].renderData.color)
            );
          }
          self.selection[
            i
          ].renderData.textHolder.children[0].element.hideme = true;
        }
        self.selection = [];
      }


      if(selection) {
        //when any node is clicked, un-smartpause if smartpaused
        //appState.graph.smartPause.lastUnpaused = Date.now(); //old code using lastUnpaused
        // console.log(selection)
        appState.graph.smartPause.interactingWithGraph = true;
        // appState.logger.addLog({eventName: `SelectNode`, elementName: selection.id, valueName: `Label`, newValue: selection.data.label});

        
        // if (!inArray(selection, appState.graph.currentNodes)) {
        //   console.log("other node")
        //   appState.graph.currentNodes = selection
        //   appState.graph.currentNodeX = selection.x
        //   appState.graph.currentNodeY = selection.y
        // }

        appState.graph.currentNodes = {id: selection.id, x: selection.x, y: selection.y}
        appState.graph.currentNodeX = selection.x
        appState.graph.currentNodeY = selection.y
      }


      //captures click times to measure time distance between clicks
      oldStartTime = startTime;
      startTime = Date.now();

      //keeps track of time difference
      clickDifference = startTime - oldStartTime;

      //sets whether or not last click was 
      //double click or not
      if (clickDifference < 225) {
        self.doubleClicked = true;
      } else {
        self.doubleClicked = false;
      }

      

      //selects single node when dragged
      if (selection) {
        self.dragging = selection;
        if (self.selection.indexOf(selection) == -1) {
          self.selection.push(selection);
          selection.renderData.isSelected = false;
        }
      }

      if (selection) {
        self.dragging = selection;
        //only pins node if double-clicked
        if (self.doubleClicked) {
          //passing in 'selection' node to pass information for node to pin
          self.updateSelection(self.dragging.x, self.dragging.y, selection);
        } else if (ctrl) {
          self.selection.splice(self.selection.indexOf(selection), 1);
          selection.renderData.isSelected = false;
          if (!def.NODE_NO_HIGHLIGHT) {
            selection.renderData.draw_object.children[0].visible = false;
          } else {
            selection.renderData.draw_object.material.color.set(
              new THREE.Color(self.selection[i].renderData.color)
            );
          }
          selection.renderData.textHolder.children[0].element.hideme = true;
          self.dragging = null;
        }
      } else {
        if (self.newNodeIds) {
          self.highlightNodeIds([], true);
          self.newNodeIds = undefined;
        }
      }
    }
  };

  /**
   * Mouse up event that closes selection flags and emits selection to Argo
   */
  self.onMouseUp = function (selection, mouseX, mouseY, button) {
    endTime = Date.now();
    self.mouseDown = false;

    //when not clicking, nodes aren't being interacted with
    appState.graph.smartPause.interactingWithGraph = false;

    // Left or right mouse button
    if (true) {
      self.showBox = false;
      self.dragging = null;
      self.selectBox.visible = false;
      
      if (self.selection) {
        if (self.selection.length == 1) {
          var selected = self.selection[0]
          // console.log("size 1")
          // console.log(selected)
          // console.log(appState.graph.currentNodes)

          // console.log("========")

          // console.log(selected.x)
          // console.log(appState.graph.currentNodeX)

          // console.log(selected.x !== appState.graph.currentNodeX)

          // console.log("=======")
          // console.log(selected.y)
          // console.log(appState.graph.currentNodeY)

          // console.log(selected.y - appState.graph.currentNodeY)

          if (selected.id === appState.graph.currentNodes.id && (Math.abs(selected.x - appState.graph.currentNodeX) > 5 || 
              Math.abs(selected. y - appState.graph.currentNodeY) > 5)) {
            console.log("moved node");
            var oldValues = {};
            oldValues['x'] = appState.graph.currentNodeX;
            oldValues['y'] = appState.graph.currentNodeY;

            var newValues = {};
            newValues['x'] = selected.x;
            newValues['y'] = selected.y;

            appState.logger.addLog({eventName: `MovedNode`, elementName: selection.id, valueName: `XYCoord`,
              oldValue: oldValues, newValue: newValues});
            appState.graph.currentNodeX = selected.x;
            appState.graph.currentNodeY = selected.y;
          }
        } else if (self.selection.length > 1 && appState.graph.currentNodes) {
          // console.log("===========")
          // console.log(self.selection)
          // console.log("currentNodes")
          var oldNode = appState.graph.currentNodes
          // console.log(selectedNode)
          // console.log("In?")
          var newNode = findNode(oldNode, self.selection)
          // console.log(associatedNode)
          if (newNode) {
            var xDiff = newNode.x - oldNode.x;
            var yDiff = newNode.y - oldNode.y;
            if (Math.abs(xDiff) > 5 || Math.abs(yDiff) > 5) {
              // console.log("selected")
              // console.log(appState.graph.selectedNodes.slice())
              // console.log("selection:")
              // console.log(self.selection)
              // console.log(arraysEqual(appState.graph.selectedNodes.slice(), self.selection))
              var elements = []
              var oldValues = {};
              oldValuesX = [];
              oldValuesY = [];

              var newValues = {};
              newValuesX = [];
              newValuesY = [];
              self.selection.forEach(node => {
                elements.push(node.id);
                oldValuesX.push(node.x - xDiff);
                oldValuesY.push(node.y - yDiff);
                newValuesX.push(node.x)
                newValuesY.push(node.y);
              });

              oldValues['x'] = oldValuesX;
              oldValues['y'] = oldValuesY;

              newValues['x'] = newValuesX;
              newValues['y'] = newValuesY;

              appState.logger.addLog({eventName: `MovedNodes`, elementName: elements, valueName: `XYCoord`,
              oldValue: oldValues, newValue: newValues});
              console.log("moved selected nodes")
            }
          }
          
        }
        // appState.graph.currentNodes = self.selection;
        // console.log("currentNodes:")
        // console.log(appState.graph.currentNodes.slice())

        // console.log("selection: ")
        // console.log(self.selection)
        // console.log("selected")
        // console.log(appState.graph.selectedNodes[0])
        // console.log(self.selection[0] === appState.graph.selectedNodes[0])
        // if (self.selection == appState.graph.selectedNodes[0] && self.selection.x !== appState.graph.currentNodeX && self.selection.y !== appState.graph.currentNodeY) {
        //   console.log("moved node");
        //   appState.graph.currentNodeX = self.selection.x;
        //   appState.graph.currentNodeY = self.selection.y;
        // }
      }

      self.ee.emit("select-nodes", self.selection);
    }

  };



  /**
   * Right click event to save right clicked node
   */
  self.onRightClick = function (selection) {
    if (selection) {
      self.rightClickedNode = selection;
    } else {
      self.rightClickedNode = null;
    }
  };

  /**
   * Right click event that emits context menu event to Argo
   */
  self.onRightClickCoords = function (event) {
    // Don't show menu if dragging camera
    if (endTime - startTime < 200) {
      self.ee.emit("right-click", {
        pageX: event.pageX,
        pageY: event.pageY
      });
    }
  };
};