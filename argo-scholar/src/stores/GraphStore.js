import { observable, computed, action, runInAction, toJS } from "mobx";
import createGraph from "ngraph.graph";
import { scales } from "../constants/index";
import uniq from "lodash/uniq";
import { averageClusteringCoefficient, connectedComponents, graphDensity, averageDegree, exactGraphDiameter } from "../services/AlgorithmUtils";
import { ContextMenu, MenuFactory, MenuItemFactory } from "@blueprintjs/core";
import { Frame, graph } from "../graph-frontend";

import pageRank from 'ngraph.pagerank';

// const index = require('../index.js');
// console.log("index require: ", index);

export default class GraphStore {

  initialGlobalConfig = {
    nodes: {
      colorBy: "pagerank",
      color: {
        scale: "Linear Scale",
        from: "#448AFF",
        to: "#E91E63"
      },
      sizeBy: "pagerank",
      size: {
        min: 2,
        max: 10,
        scale: "Linear Scale"
      },
      labelBy: "node_id",
      shape: "circle",
      labelSize: 1,
      labelLength: 10
    },
    edges: {
      color: "#7f7f7f"
    }
  }

  @observable nodes = this.initialGlobalConfig.nodes;
  @observable edges = this.initialGlobalConfig.edges

  @observable enableDegree = true;
  @observable enableDensity = true;
  @observable enableDiameter = false;
  @observable enableCoefficient = true;
  @observable enableComponent = true;

  //access to process.js "self"
  @observable process = undefined;

  // Updated by frame event
  @observable selectedNodes = [];

  // Currently hovered node
  @observable currentlyHovered = undefined;


  /**
   * Stores data relevant to smart pause feature
   */
  @observable smartPause = {
    defaultActive: { //data for when graph layout is resumed and smart pause is not in effect 
      isActive: true, //true when layout is resumed and smart pause is not in effect
      startTime: Date.now(), //keeps track of most recent time graph was unpaused
      duration: 10000, //duration of resumed layout
    },
    //lastUnpaused: undefined, //old code using lastUnpaused
    smartPaused: false, //true when resumed, but graph layout is paused due to inactivity
    interactingWithGraph: false, //true when node is clicked or dragged. TODO: refactor to more understandable name
  }


  // Directed or not
  @observable directedOrNot = false;

  // Cache the single node that's been selected last time
  // and will not update unless exactly one node is selected again
  // useful for NeighborDialog
  _lastSelectedSingleNode = null;
  @computed
  get lastSelectedSingleNode() {
    if (this.selectedNodes.length === 1) {
      this._lastSelectedSingleNode = this.selectedNodes[0];
    }
    return this._lastSelectedSingleNode;
  }
  // Updated by frame event. Not being listened, only used to save label visibility.
  nodesShowingLabels = [];
  // Used by autorun during snapshot loading.
  @observable initialNodesShowingLabels = [];

  @observable
  overrideConfig = {
    color: "#000",
    size: 5,
    label: "",
    shape: "circle"
  };

  // preprocessed rawGraph
  @observable
  preprocessedRawGraph = {
    nodes: [],
    edges: [],
    graph: null,
    degreeDict: {},
    citationReferenceMap: {},
    nodesPanelData: {},
    computedGraph: null
  };

  @observable
  rawGraph = {
    nodes: [],
    edges: []
  };

  //saved states from loaded graph snapshot
  @observable savedStates = null;

  @observable
  metadata = {
    fullNodes: 0,
    fullEdges: 0,
    nodeProperties: [],
    nodeComputed: ["pagerank", "degree"],
    edgeProperties: [],
    snapshotName: "loading..." // Optional: for display in Argo-lite only
  };

  // used for listing all the properties, either original or computed
  @computed
  get allPropertiesKeyList() {
    return uniq([
      ...this.metadata.nodeProperties,
      ...this.metadata.nodeComputed
    ]).filter(k => k !== 'id'); // since node_id is already present
  }

  @observable.ref frame = null;
  @observable.ref positions = null;
  @observable pinnedNodes = null;

  @observable overrides = new Map();
  @observable searchOrder = "degree";

  hasGraphLoaded = false;

  @computed
  get hasGraph() {
    if (this.rawGraph.nodes.length > 0) {
      this.hasGraphLoaded = true;
    }
    return this.hasGraphLoaded;
  }

  @computed
  get minMax() {
    const ret = {};
    for (const p of [
      ...this.metadata.nodeProperties,
      ...this.metadata.nodeComputed
    ]) {
      let min = Number.MAX_VALUE;
      let max = Number.MIN_VALUE;

      for (const n of this.rawGraph.nodes) {
        min = Math.max(Math.min(min, n[p]), 0.0000001);
        max = Math.max(max, n[p]);
      }

      ret[p] = [min, max];
    }
    return ret;
  }

  @computed
  get nodeSizeScale() {
    return scales[this.nodes.size.scale]()
      .domain(this.minMax[this.nodes.sizeBy])
      .range([this.nodes.size.min, this.nodes.size.max]);
  }

  @computed
  get nodeColorScale() {
    return scales[this.nodes.color.scale]()
      .domain(this.minMax[this.nodes.colorBy])
      .range([this.nodes.color.from, this.nodes.color.to]);
  }

  // Return raw graph nodes that is neighbor with the selected node,
  // excluding the node itself.
  getNeighborNodesFromRawGraph(selectedNodeId) {
    const setOfNeighborIds = new Set();
    this.rawGraph.edges.forEach(e => {
      const source = e.source_id.toString();
      const target = e.target_id.toString();
      if (source === selectedNodeId && target !== selectedNodeId) {
        setOfNeighborIds.add(target);
      }
      if (target === selectedNodeId && source !== selectedNodeId) {
        setOfNeighborIds.add(source);
      }
    });
    return this.rawGraph.nodes.filter(node => setOfNeighborIds.has(node.id.toString()));
  }

  // Triggers autorun in stores/index.js to sent computedGraph to graph-frontend.
  @computed
  get computedGraph() {
    const graph = createGraph();
    this.rawGraph.nodes.forEach(n => {
      // If isHidden flag is defined and true, ignore the node in graph-frontend.
      if (n.isHidden) {
        return;
      }
      const override = this.overrides.get(n.id.toString());
      graph.addNode(n.id.toString(), {
        label: (override && override.get("label")) || n[this.nodes.labelBy],
        size:
          (override && override.get("size")) ||
          this.nodeSizeScale(n[this.nodes.sizeBy]),
        color:
          (override && override.get("color")) ||
          this.nodeColorScale(n[this.nodes.colorBy]),
        shape: (override && override.get("shape")) || n[this.nodes.shape],
        ref: n
      });
    });

    this.rawGraph.edges.forEach(e => {
      // If isHidden flag is defined and true on an associated node,
      // leave out its related edges.
      if (graph.hasNode(e.source_id.toString()) && graph.hasNode(e.target_id.toString())) {
        graph.addLink(e.source_id.toString(), e.target_id.toString());
      }
    });

    return graph;
  }

  @computed
  get numHiddenNodes() {
    return this.rawGraph.nodes.filter(n => n.isHidden).length;
  }

  /**
   * citationOrReference: 0 if citation, 1 if reference 
   */
  addNodetoGraph(node, parentID, citationOrReference) {
    let rawGraphNodes = toJS(appState.graph.preprocessedRawGraph.nodes);
    let edgesArr = toJS(appState.graph.preprocessedRawGraph.edges);
    let backEndgraph = toJS(appState.graph.preprocessedRawGraph.graph);
    const degreeDict = toJS(appState.graph.preprocessedRawGraph.degreeDict);


    backEndgraph.addNode(node[0]);
    // graph.addNode(node[0], {id : node[0], degree: 1});

    backEndgraph.addLink(parentID, node[0]);
    // graph.addLink(tempParent.id, node[0]);

    let addedNode = {id: node[0], degree: 1, pagerank: 0, paperName: node[1], paperAbstract: node[2]};
    // let addedNode = {id: node[0], degree: 0, pagerank: 0, paperName: node[1], paperAbstract: node[2]};

    rawGraphNodes.push(addedNode);

    if (citationOrReference == 0) {
      edgesArr.push({source_id: node[0], target_id: parentID});
    } else {
      edgesArr.push({source_id: parentID, target_id: node[0]});
    }
    
    degreeDict[node[0]] = 1;

    degreeDict[parentID] += 1;

    const rank = pageRank(backEndgraph);
    // console.log("pagerank: ", rank);

    const nodesCitationReferenceData = toJS(appState.graph.preprocessedRawGraph.citationReferenceMap);
    nodesCitationReferenceData[node[0]] = {top5Citations: node[3], top5References: node[4]};

    // nodesData[node[0]] = {node: addedNode, top5Citations: node[3]};

    let nodesArr = rawGraphNodes.map(n => ({ ...n, node_id: n.id, pagerank: rank[n.id], degree: degreeDict[n.id], paperName: n.paperName, paperAbstract: n.paperAbstract}));

    const nodesData = nodesArr.reduce((map, currentNode) => {
      map[currentNode.node_id] = currentNode;
      return map;
    }, {}); 
  
    appState.graph.preprocessedRawGraph = {nodes: rawGraphNodes, edges: edgesArr, graph: backEndgraph, degreeDict: degreeDict, citationReferenceMap: nodesCitationReferenceData,
       nodesPanelData: nodesData, computedGraph: this.computedGraph};

    // let frontEndGraph = require('../index.js');

    // var getFrontEndGraph = require('../index.js');

    // console.log("frontendgraph:", frontEndGraph);

    this.frame.updateFrontEndNodeGraphDataWithBackendRawgraph();
    // this.frame.addFrontEndNodeInARow(parentID, node[0], 1);


    // frontEndGraph.forEachNode(function(node){
    //   console.log(node.id, node.data);
    // });



    // self.graph.forEachNode(function(node){
    //   let tempNode = self.graph.getNode(node);
    //   console.log("got a node: ", tempNode);
    // });

    // console.log("nodesData: ", nodesData);
    // console.log("nodesArr: ", nodesArr);
    appState.graph.rawGraph = { nodes: nodesArr, edges: edgesArr };
    appState.graph.metadata.fullNodes = nodesArr.length;
    appState.graph.metadata.fullEdges = edgesArr.length;
    appState.graph.metadata.nodeProperties = Object.keys(nodesArr[0]); 
    // console.log("raw graph nodes: ", this.rawGraph.nodes);
    // graphFrame.inGraph = appState.graph.computedGraph;
    // appState.graph.setUpFrame();
  }

  showNodes(nodeids) {
    runInAction('show hidden nodes by ids', () => {
      this.rawGraph.nodes = this.rawGraph.nodes.map(n => {
        if (nodeids.includes(n.id)) {
          return { ...n, isHidden: false };
        }
        return n;
      });
    });
  }

  hideNodes(nodeids) {
    runInAction('hide nodes by ids', () => {
      this.frame.removeNodesByIds(nodeids);
      this.rawGraph.nodes = this.rawGraph.nodes.map(n => {
        if (nodeids.includes(n.id)) {
          return { ...n, isHidden: true };
        }
        return n;
      });
    });
  }

  removeNodes(nodeids) {
    runInAction('remove nodes by ids', () => {
      this.frame.removeNodesByIds(nodeids);
      this.rawGraph.nodes = this.rawGraph.nodes.filter(
        n => !nodeids.includes(n.id)
      );
      this.rawGraph.edges = this.rawGraph.edges.filter(
        e => !nodeids.includes(e.source_id) && !nodeids.includes(e.target_id)
      );
    });
  }

  getSnapshot() {
    const snapshot = {
      rawGraph: this.rawGraph,
      overrides: this.overrides,
      nodesShowingLabels: this.nodesShowingLabels,
      positions: this.frame.getPositions(),
      pinnedNodes: Array.from(this.frame.getPinnedNodes()),
      metadata: this.metadata,
      global: {
        nodes: this.nodes,
        edges: this.edges,
      },
    };
    return snapshot;
  }

  /**
   * [Argo-lite] Saves graph snapshot as String
   * 
   * Note that Argo-lite snapshot contains all graph data
   * and metadata except nodes/edges deleted by users.
   * This is different from Argo-electron snapshot.
   */
  saveImmediateStates(optionalConfig) {
    const snapshot = this.getSnapshot();
    // TODO: add corresponding options on frontend
    // The optional options allows users to leave out
    // certain app state when saving snapshot
    if (optionalConfig) {
      if (optionalConfig.noPosition) {
        snapshot.positions = undefined;
      }
      if (optionalConfig.noGlobal) {
        snapshot.global = undefined;
      }
      if (optionalConfig.noOverride) {
        snapshot.overrides = undefined;
      }
    }
    return JSON.stringify(snapshot);
  }

  @action
  loadImmediateStates(savedStatesStr) {
    const savedStates = JSON.parse(savedStatesStr);
    this.savedStates = savedStates;
    if (!savedStates) {
      return;
    }
    const savedOverrides = new Map(
      Object.entries(savedStates.overrides).map(([k, v]) => [
        k,
        new Map(Object.entries(v))
      ])
    );
    this.overrides.clear();
    this.overrides.merge(savedOverrides);

    if (savedStates.metadata) {
      this.metadata = savedStates.metadata;
    }
    if (savedStates.global) {
      this.nodes = savedStates.global.nodes;
      this.edges = savedStates.global.edges ? savedStates.global.edges : this.edges;
    }
    // The following lines trigger autoruns.
    this.rawGraph = savedStates.rawGraph;
    if (savedStates.positions) {
      this.positions = savedStates.positions;
    }
    if (savedStates.nodesShowingLabels) {
      this.initialNodesShowingLabels = savedStates.nodesShowingLabels;
      this.nodesShowingLabels = savedStates.nodesShowingLabels;
    }

    //stores data pinned nodes in appState
    if (savedStates.pinnedNodes) {
      this.pinnedNodes = new Set(savedStates.pinnedNodes);
    }

    const nodesData = savedStates.rawGraph.nodes.reduce((map, currentNode) => {
      map[currentNode.node_id] = currentNode;
      return map;
    }, {}); 
  
    appState.graph.preprocessedRawGraph.nodesPanelData = nodesData;

    this.runActiveLayout();
  }


  //resumes graph layout for a set duration before smart-pausing
  runActiveLayout() {
    if(this.frame) {
      this.frame.paused = false;
    } 
    this.smartPause.defaultActive.isActive = true;
    this.smartPause.defaultActive.startTime = Date.now();
    this.smartPause.smartPaused = false;
  }

  //selects which nodes should be pinned based on saved state of loaded snapshot
  pinNodes() {
    if (this.pinnedNodes) {
      let nodesToPin = [];
      let that = this; //"this" will not work inside of forEach, so it needs to be stored
      this.process.graph.forEachNode(function (n) {
        if (that.pinnedNodes.has(n.id)) {
          nodesToPin.push(n);
        }
      });
      this.frame.setPinnedNodes(nodesToPin);
    }
  }

  setUpFrame() {
    const graphFrame = new Frame(this.computedGraph);
    graphFrame.init();
    graphFrame.display();
    this.frame = graphFrame;
    graphFrame.ee.on("select-nodes", nodes => {
      this.selectedNodes = nodes;
    });
    graphFrame.ee.on("show-node-label", nodes => {
      this.nodesShowingLabels = nodes;
    });
    graphFrame.ee.on("right-click", data => {
      const menu = MenuFactory({
        children: [
          MenuItemFactory({
            onClick: () => {
              this.frame.toggleSelectedLabels();
            },
            text: 'Toggle Labels',
            key: 'Toggle Labels'
          }),
          MenuItemFactory({
            onClick: () => {
              this.frame.unpinSelectedNodes();
            },
            text: 'Unpin Selected',
            key: 'Unpin Selected'
          }),
          MenuItemFactory({
            onClick: () => {
              this.frame.pinSelectedNodes();
            },
            text: 'Pin Selected',
            key: 'Pin Selected'
          }),
          this.frame.rightClickedNode && MenuItemFactory({
            onClick: () => {
              if (this.frame.rightClickedNode) {
                const rightClickedNodeId = this.frame.rightClickedNode.data.ref.id.toString();
                const neighbors = this.getNeighborNodesFromRawGraph(rightClickedNodeId);
                neighbors.sort((n1, n2) => {
                  if (n1["pagerank"] && n2["pagerank"]) {
                    return n2["pagerank"] - n1["pagerank"];
                  }
                  return 0;
                });
                const ids = [];
                for (let i = 0; i < 5 && i < neighbors.length; i++) {
                  ids.push(neighbors[i].id);
                }
                this.showNodes(ids);
              }
            },
            text: 'Show 5 Neighbors with Highest PageRank',
            key: 'Show 5 Neighbors with Highest PageRank'
          }),
          this.frame.rightClickedNode && MenuItemFactory({
            onClick: () => {
              if (this.frame.rightClickedNode) {
                const rightClickedNodeId = this.frame.rightClickedNode.data.ref.id.toString();

                let rightClickedNodeCitations = toJS(appState.graph.preprocessedRawGraph.citationReferenceMap[rightClickedNodeId]).top5Citations;

                // const rightClickedNodeCitations = parentNode.top5Citations;

                // console.log("right click id: ", rightClickedNodeId);
                // console.log("citations: ", rightClickedNodeCitations);

                // console.log("right clicked node: ", parentNode);
                let curcount = 0;
                rightClickedNodeCitations.forEach(citation => {
                  let apiurl = "https://api.semanticscholar.org/v1/paper/" + citation.paperId;
                  fetch(apiurl)
                    .then((res) => {
                      if (res.ok) {
                        return res.json();
                      } else {
                        throw "error";
                      }
                    })
                    .then((response) => {
                      // console.log("a new paper name: ", response.title);
                      let paperNode = [response.paperId, response.title, response.abstract, response.citations.slice(0,5), response.references.slice(0,5)];
                      this.addNodetoGraph(paperNode, rightClickedNodeId, 0);

                      // this.frame.addFrontEndNodeInARow(response.paperId);
                      this.frame.addFrontEndNodeInARow(rightClickedNodeId, response.paperId, curcount);
                      curcount += 1;
                      // graphFrame.updateNodes();
                      // graphFrame.updateGraph(appState.graph.computedGraph);
                      // graphFrame.inGraph = appState.graph.computedGraph;
                      // this.rawGraph.nodes = this.rawGraph.nodes.map(n => {
                      //   return n;
                      // }); 
                    });
                    // .catch((error) => {
                    //   alert("Something broke :(");
                    // });
                  });
                  // appState.graph.frame.updateGraph(this.computedGraph);
                  // console.log(appState.graph.rawGraph.nodes);
                  // appState.graph.setUpFrame();
              }
            },
            text: 'Add 5 Paper Citations',
            key: 'Add 5 Paper Citations'
          }),
          this.frame.rightClickedNode && MenuItemFactory({
            onClick: () => {
              if (this.frame.rightClickedNode) {
                const rightClickedNodeId = this.frame.rightClickedNode.data.ref.id.toString();

                let rightClickedNodeReferences = toJS(appState.graph.preprocessedRawGraph.citationReferenceMap[rightClickedNodeId]).top5References;
                let curcount = 0;
                
                rightClickedNodeReferences.forEach(citation => {
                  let apiurl = "https://api.semanticscholar.org/v1/paper/" + citation.paperId;
                  fetch(apiurl)
                    .then((res) => {
                      if (res.ok) {
                        return res.json();
                      } else {
                        throw "error";
                      }
                    })
                    .then((response) => {
                      let paperNode = [response.paperId, response.title, response.abstract, response.citations.slice(0,5), response.references.slice(0,5)];
                      this.addNodetoGraph(paperNode, rightClickedNodeId, 1);
                      this.frame.addFrontEndNodeInARow(rightClickedNodeId, response.paperId, curcount);
                      curcount += 1;
                    });
                    // .catch((error) => {
                    //   alert("Something broke :(");
                    // });
                  });
              }
            },
            text: 'Add 5 Paper References',
            key: 'Add 5 Paper References'
          }),
        ]
      });
      ContextMenu.show(menu, { left: data.pageX, top: data.pageY }, () => {
        // onMenuClose
        console.log("ContextMenu closed");
      });
    });
  }

  /*
   * Graph algorithms used in StatisticsDialog.
   */

  get averageClustering() {
    const snapshot = {
      rawGraph: this.rawGraph,
    };
    return averageClusteringCoefficient(snapshot);
  }


  get components() {
    const snapshot = {
      rawGraph: this.rawGraph,
    };
    return connectedComponents(snapshot);
  }

  @computed
  get density() {
    const snapshot = {
      rawGraph: this.rawGraph,
    };
    return graphDensity(snapshot);
  }

  @computed
  get degree() {
    const snapshot = {
      rawGraph: this.rawGraph,
    };
    return averageDegree(snapshot);
  }

  @computed
  get diameter() {
    const snapshot = {
      rawGraph: this.rawGraph,
    };
    return exactGraphDiameter(snapshot);
  }
}