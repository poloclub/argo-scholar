import { observable, computed, action, runInAction, toJS } from "mobx";
import createGraph from "ngraph.graph";
import { scales } from "../constants/index";
import uniq from "lodash/uniq";
import {
  averageClusteringCoefficient,
  connectedComponents,
  graphDensity,
  averageDegree,
  exactGraphDiameter,
} from "../services/AlgorithmUtils";
import {
  ContextMenu,
  MenuFactory,
  MenuItemFactory,
  MenuDividerFactory,
  Intent,
} from "@blueprintjs/core";
import { Frame, graph } from "../graph-frontend";
import pageRank from "ngraph.pagerank";
import appState from ".";
import * as BackendAPIUtils from "../services/BackendAPIUtils";

export default class GraphStore {
  initialGlobalConfig = {
    nodes: {
      colorBy: "citationCount",
      color: {
        scale: "Linear Scale",
        from: "#448AFF",
        to: "#E91E63",
      },
      sizeBy: "citationCount",
      size: {
        min: 2,
        max: 10,
        scale: "Linear Scale",
      },
      labelBy: "paperName",
      shape: "circle",
      labelSize: 0.5,
      labelLength: 30,
    },
    edges: {
      color: "#7f7f7f",
    },
  };

  @observable nodes = this.initialGlobalConfig.nodes;
  @observable edges = this.initialGlobalConfig.edges;

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

  @observable startedHovering = false;
  @observable hoveredTime = undefined;
  @observable autoDisplayExploration = false;
  @observable currentMouseX = 0;
  @observable currentMouseY = 0;

  @observable numberAddedPerSearch = 0;
  /**
   * Stores data relevant to smart pause feature
   */
  @observable smartPause = {
    defaultActive: {
      //data for when graph layout is resumed and smart pause is not in effect
      isActive: true, //true when layout is resumed and smart pause is not in effect
      startTime: Date.now(), //keeps track of most recent time graph was unpaused
      duration: 10000, //duration of resumed layout
    },
    //lastUnpaused: undefined, //old code using lastUnpaused
    smartPaused: false, //true when resumed, but graph layout is paused due to inactivity
    interactingWithGraph: false, //true when node is clicked or dragged. TODO: refactor to more understandable name
  };

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
    shape: "circle",
  };

  // preprocessed rawGraph
  @observable
  preprocessedRawGraph = {
    graph: null,
    degreeDict: {},
    nodesPanelData: {},
  };

  @observable
  rawGraph = {
    nodes: [],
    edges: [],
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
    snapshotName: "loading...", // Optional: for display in Argo-scholar only
  };

  // used for listing all the properties, either original or computed
  @computed
  get allPropertiesKeyList() {
    return uniq([
      ...this.metadata.nodeProperties,
      ...this.metadata.nodeComputed,
    ]).filter((k) => k !== "id"); // since node_id is already present
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
      ...this.metadata.nodeComputed,
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
    this.rawGraph.edges.forEach((e) => {
      const source = e.source_id.toString();
      const target = e.target_id.toString();
      if (source === selectedNodeId && target !== selectedNodeId) {
        setOfNeighborIds.add(target);
      }
      if (target === selectedNodeId && source !== selectedNodeId) {
        setOfNeighborIds.add(source);
      }
    });
    return this.rawGraph.nodes.filter((node) =>
      setOfNeighborIds.has(node.id.toString())
    );
  }

  // Triggers autorun in stores/index.js to sent computedGraph to graph-frontend.
  @computed
  get computedGraph() {
    const graph = createGraph();
    this.rawGraph.nodes.forEach((n) => {
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
        ref: n,
      });
    });

    this.rawGraph.edges.forEach((e) => {
      // If isHidden flag is defined and true on an associated node,
      // leave out its related edges.
      if (
        graph.hasNode(e.source_id.toString()) &&
        graph.hasNode(e.target_id.toString())
      ) {
        graph.addLink(e.source_id.toString(), e.target_id.toString());
      }
    });

    return graph;
  }

  @computed
  get numHiddenNodes() {
    return this.rawGraph.nodes.filter((n) => n.isHidden).length;
  }

  /**
   * citationOrReference: 0 if citation, 1 if reference
   */
  addNodetoGraph(paperJsonResponse, parentID, citationOrReference) {
    let rawGraphNodes = appState.graph.rawGraph.nodes;
    let edgesArr = appState.graph.rawGraph.edges;
    let backEndgraph = appState.graph.preprocessedRawGraph.graph;
    let degreeDict = appState.graph.preprocessedRawGraph.degreeDict;

    if (!(paperJsonResponse.paperId in degreeDict)) {
      backEndgraph.addNode(paperJsonResponse.paperId);
      let addedNode = {
        id: paperJsonResponse.paperId,
        degree: 0,
        pagerank: 0,
        paperName: paperJsonResponse.title,
        paperAbstract:
          paperJsonResponse.abstract == null
            ? "n/a"
            : paperJsonResponse.abstract,
        authors: paperJsonResponse.authors.map((n) => n.name).join(", "),
        citationCount: paperJsonResponse.citationCount,
        venue: paperJsonResponse.venue == "" ? "n/a" : paperJsonResponse.venue,
        year: paperJsonResponse.year,
        url: paperJsonResponse.url,
      };
      degreeDict[paperJsonResponse.paperId] = 0;
      rawGraphNodes.push(addedNode);
    }

    if (parentID != "null") {
      if (citationOrReference == 0) {
        backEndgraph.addLink(paperJsonResponse.paperId, parentID);
        edgesArr.push({
          source_id: paperJsonResponse.paperId,
          target_id: parentID,
        });
      } else {
        backEndgraph.addLink(parentID, paperJsonResponse.paperId);
        edgesArr.push({
          source_id: parentID,
          target_id: paperJsonResponse.paperId,
        });
      }
      degreeDict[paperJsonResponse.paperId] += 1;
      degreeDict[parentID] += 1;
    }

    paperJsonResponse.citations.forEach((citation) => {
      if (
        citation.paperId in degreeDict &&
        !backEndgraph.getLink(citation.paperId, paperJsonResponse.paperId)
      ) {
        this.addEdgetoGraph(citation.paperId, paperJsonResponse.paperId);
      }
    });

    paperJsonResponse.references.forEach((reference) => {
      if (
        reference.paperId in degreeDict &&
        !backEndgraph.getLink(paperJsonResponse.paperId, reference.paperId)
      ) {
        this.addEdgetoGraph(paperJsonResponse.paperId, reference.paperId);
      }
    });

    backEndgraph = appState.graph.preprocessedRawGraph.graph;

    const rank = pageRank(backEndgraph);

    let nodesArr = rawGraphNodes.map((n) => ({
      ...n,
      node_id: n.id,
      pagerank: rank[n.id],
      degree: degreeDict[n.id],
      paperName: n.paperName,
      paperAbstract: n.paperAbstract,
      authors: n.authors,
      citationCount: n.citationCount,
      venue: n.venue,
      year: n.year,
      url: n.url,
    }));

    const nodesData = nodesArr.reduce((map, currentNode) => {
      map[currentNode.node_id] = currentNode;
      return map;
    }, {});

    appState.graph.preprocessedRawGraph = {
      graph: backEndgraph,
      degreeDict: degreeDict,
      nodesPanelData: nodesData,
    };

    this.frame.updateFrontEndNodeGraphDataWithBackendRawgraph();

    appState.graph.rawGraph = { nodes: nodesArr, edges: edgesArr };
    appState.graph.metadata.fullNodes = nodesArr.length;
    appState.graph.metadata.fullEdges = edgesArr.length;
    appState.graph.metadata.nodeProperties = Object.keys(nodesArr[0]);
  }

  addEdgetoGraph(citingID, citedID) {
    appState.graph.preprocessedRawGraph.graph.addLink(citingID, citedID);
    appState.graph.rawGraph.edges.push({
      source_id: citingID,
      target_id: citedID,
    });
    appState.graph.preprocessedRawGraph.degreeDict[citingID] += 1;
    appState.graph.preprocessedRawGraph.degreeDict[citedID] += 1;
  }

  showNodes(nodeids) {
    runInAction("show hidden nodes by ids", () => {
      this.rawGraph.nodes = this.rawGraph.nodes.map((n) => {
        if (nodeids.includes(n.id)) {
          return { ...n, isHidden: false };
        }
        return n;
      });
    });
  }

  hideNodes(nodeids) {
    runInAction("hide nodes by ids", () => {
      this.frame.removeNodesByIds(nodeids);
      this.rawGraph.nodes = this.rawGraph.nodes.map((n) => {
        if (nodeids.includes(n.id)) {
          return { ...n, isHidden: true };
        }
        return n;
      });
    });
  }

  removeNodes(nodeids) {
    runInAction("remove nodes by ids", () => {
      this.frame.removeNodesByIds(nodeids);
      this.rawGraph.nodes = this.rawGraph.nodes.filter(
        (n) => !nodeids.includes(n.id)
      );
      this.rawGraph.edges = this.rawGraph.edges.filter(
        (e) => !nodeids.includes(e.source_id) && !nodeids.includes(e.target_id)
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
   * [Argo-scholar] Saves graph snapshot as String
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
        new Map(Object.entries(v)),
      ])
    );
    this.overrides.clear();
    this.overrides.merge(savedOverrides);

    if (savedStates.metadata) {
      this.metadata = savedStates.metadata;
    }
    if (savedStates.global) {
      this.nodes = savedStates.global.nodes;
      this.edges = savedStates.global.edges
        ? savedStates.global.edges
        : this.edges;
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

    let nodesData = savedStates.rawGraph.nodes.reduce((map, currentNode) => {
      map[currentNode.node_id] = currentNode;
      return map;
    }, {});

    this.preprocessedRawGraph.nodesPanelData = nodesData;

    let graph = createGraph();
    let degreeDict = {};

    this.rawGraph.nodes.forEach((node) => {
      graph.addNode(node.id);
      degreeDict[node.id] = node.degree;
    });

    this.rawGraph.edges.forEach((edge) => {
      graph.addLink(edge.source_id, edge.target_id);
    });

    this.preprocessedRawGraph.graph = graph;
    this.preprocessedRawGraph.degreeDict = degreeDict;

    this.runActiveLayout();
  }

  //resumes graph layout for a set duration before smart-pausing
  runActiveLayout() {
    if (this.frame) {
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
    if (this.frame) {
      this.frame.getGraph().clear();
    }
    const graphFrame = new Frame(this.computedGraph);
    graphFrame.init();
    graphFrame.display();
    this.frame = graphFrame;
    graphFrame.ee.on("select-nodes", (nodes) => {
      this.selectedNodes = nodes;
    });
    graphFrame.ee.on("show-node-label", (nodes) => {
      this.nodesShowingLabels = nodes;
    });
    graphFrame.ee.on("right-click", (data) => {
      this.process.onHover();
      this.frame.rightClickedNode = this.currentlyHovered;
      const menu = MenuFactory({
        children: [
          MenuItemFactory({
            onClick: () => {
              this.frame.toggleSelectedLabels();
            },
            text: "Toggle Labels",
            key: "Toggle Labels",
          }),
          MenuItemFactory({
            onClick: () => {
              this.frame.unpinSelectedNodes();
            },
            text: "Unpin Selected",
            key: "Unpin Selected",
          }),
          MenuItemFactory({
            onClick: () => {
              this.frame.pinSelectedNodes();
            },
            text: "Pin Selected",
            key: "Pin Selected",
          }),
          this.frame.rightClickedNode &&
            MenuItemFactory({
              onClick: () => {
                if (this.frame.rightClickedNode) {
                  const rightClickedNodeId =
                    this.frame.rightClickedNode.data.ref.id.toString();
                  const neighbors =
                    this.getNeighborNodesFromRawGraph(rightClickedNodeId);
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
              text: "Show 5 Neighbors with Highest PageRank",
              key: "Show 5 Neighbors with Highest PageRank",
            }),

          this.frame.rightClickedNode && MenuDividerFactory({}),
          MenuItemFactory({
            children: [
              MenuItemFactory({
                onClick: () => {
                  BackendAPIUtils.addSortedCitations("relevance", this);
                },
                text: "Sort By Relevance",
                key: "Sort By Relevance",
              }),
              MenuItemFactory({
                onClick: () => {
                  BackendAPIUtils.addSortedCitations("is-influential", this);
                },
                text: "Sort By Most Infleunced Papers",
                key: "Sort By Most Infleunced Papers",
              }),
              MenuItemFactory({
                onClick: () => {
                  BackendAPIUtils.addSortedCitations("total-citations", this);
                },
                text: "Sort By Citation Count",
                key: "Sort By Citation Count",
              }),
              MenuItemFactory({
                onClick: () => {
                  BackendAPIUtils.addSortedCitations("pub-date", this);
                },
                text: "Sort By Recency",
                key: "Sort By Recency",
              }),
            ],
            text: "Add 5 Paper Citations",
            key: "Add 5 Paper Citations",
          }),
          this.frame.rightClickedNode &&
            MenuItemFactory({
              children: [
                MenuItemFactory({
                  onClick: () => {
                    BackendAPIUtils.addSortedReferences("relevance", this);
                  },
                  text: "Sort By Relevance",
                  key: "Sort By Relevance",
                }),
                MenuItemFactory({
                  onClick: () => {
                    BackendAPIUtils.addSortedReferences("is-influential", this);
                  },
                  text: "Sort By Most Infleunced Papers",
                  key: "Sort By Most Infleunced Papers",
                }),
                MenuItemFactory({
                  onClick: () => {
                    BackendAPIUtils.addSortedReferences("year", this);
                  },
                  text: "Sort By Recency",
                  key: "Sort By Recency",
                }),
              ],
              text: "Add 5 Paper References",
              key: "Add 5 Paper References",
            }),
        ],
      });
      ContextMenu.show(menu, { left: data.pageX, top: data.pageY }, () => {
        // onMenuClose
        console.log("ContextMenu closed");
        this.currentlyHovered = null;
        this.startedHovering = false;
        this.hoveredTime = undefined;
        this.autoDisplayExploration = false;
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
