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
} from "@blueprintjs/core";
import { Frame, graph } from "../graph-frontend";

import pageRank from "ngraph.pagerank";
import appState from ".";

export default class GraphStore {
  initialGlobalConfig = {
    nodes: {
      colorBy: "pagerank",
      color: {
        scale: "Linear Scale",
        from: "#448AFF",
        to: "#E91E63",
      },
      sizeBy: "pagerank",
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
    let rawGraphNodes = toJS(appState.graph.rawGraph.nodes);
    let edgesArr = toJS(appState.graph.rawGraph.edges);
    let backEndgraph = toJS(appState.graph.preprocessedRawGraph.graph);
    let degreeDict = toJS(appState.graph.preprocessedRawGraph.degreeDict);

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
        citationCount: paperJsonResponse.citations.length,
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
      citationReferenceMap: this.preprocessedRawGraph.citationReferenceMap,
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

  //add sorted citaions to right clicked node
  addSortedCitations(sortMethod) {
    let curcount = 0;
    let page = 1;
    let pageSize = 10;
    let node_offset = 0;

    const rightClickedNodeId =
      this.frame.rightClickedNode.data.ref.id.toString();
    var requestURL =
      "https://www.semanticscholar.org/api/1/search/paper/" +
      rightClickedNodeId +
      "/citations";

    var requestBody = JSON.stringify({
      page: page,
      pageSize: pageSize,
      sort: sortMethod,
      authors: [],
      coAuthors: [],
      venues: [],
      yearFilter: null,
      requireViewablePdf: false,
      publicationTypes: [],
      externalContentTypes: [],
      fieldsOfStudy: [],
    });

    fetch(requestURL, {
      method: "post",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: requestBody,
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw "Connection failed.";
        }
      })
      .then((citations) => {
        var PaperIds = citations.results.map(function (citation) {
          return citation.id;
        });
        console.log(PaperIds);
        let edgesArr = toJS(appState.graph.rawGraph.edges);
        for (let i = 0; i < PaperIds.length; i++) {
          if (!PaperIds[i]) {
            continue;
          }
          if (
            edgesArr.some(
              (edge) =>
                edge.source_id == PaperIds[i] &&
                edge.target_id == rightClickedNodeId
            )
          ) {
            console.log("Already containing keys!");
            continue;
          }
          curcount += 1;
          let citationAPI =
            "https://api.semanticscholar.org/v1/paper/" + PaperIds[i];
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection failed.";
              }
            })
            .then((response) => {
              this.addNodetoGraph(response, rightClickedNodeId, 0);
              this.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                node_offset,
                0
              );
              appState.graph.process.graph.getNode(
                response.paperId
              ).renderData.textHolder.children[0].element.override = true;
              node_offset += 1;
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
            })
            .catch(function (err) {
              console.warn(
                "Error adding paper nodes through Semantic Scholar API. " +
                  requestURL,
                err
              );
            });
          if (curcount >= 5) {
            break;
          }
        }
      })
      .then(console.log("Web API results fetched."))
      .catch((error) => {
        console.error(
          "Error when requesting sorted citations through web API. Adding random citations.",
          error
        );
        this.addRandomCitations();
      });
    appState.graph.frame.updateNodesShowingLabels();
  }

  addRandomCitations() {
    const rightClickedNodeId =
      this.frame.rightClickedNode.data.ref.id.toString();
    let curcount = 0;
    let offset = 0;
    let apiurl =
      "https://api.semanticscholar.org/v1/paper/" + rightClickedNodeId;
    fetch(apiurl)
      .then((res) => {
        return res.json();
      })
      .then((response) => {
        return response.citations;
      })
      .then((citations) => {
        console.log(citations);
        let edgesArr = toJS(appState.graph.rawGraph.edges);
        for (let i = 0; i < citations.length; i++) {
          if (
            edgesArr.some(
              (edge) =>
                edge.source_id == citations[i].paperId &&
                edge.target_id == rightClickedNodeId
            )
          ) {
            console.log("contains key");
            continue;
          }
          curcount += 1;
          let citationAPI =
            "https://api.semanticscholar.org/v1/paper/" + citations[i].paperId;
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection failed.";
              }
            })
            .then((response) => {
              this.addNodetoGraph(response, rightClickedNodeId, 0);
              this.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                offset,
                0
              );
              appState.graph.process.graph.getNode(
                response.paperId
              ).renderData.textHolder.children[0].element.override = true;
              offset += 1;
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
            });
          if (curcount >= 5) {
            break;
          }
        }
      })
      .then(console.log("Successfully added random paper nodes."));
    appState.graph.frame.updateNodesShowingLabels();
  }

  //add sorted references to right clicked node
  //add sorted citaions to right clicked node
  addSortedReferences(sortMethod) {
    let curcount = 0;
    let pageSize = 10;
    let node_offset = 0;
    let offset = 0;

    const rightClickedNodeId =
      this.frame.rightClickedNode.data.ref.id.toString();
    var requestURL =
      "https://www.semanticscholar.org/api/1/paper/" +
      rightClickedNodeId +
      "/citations?sort=" +
      sortMethod +
      "&offset=" +
      offset +
      "&citationType=citedPapers&citationsPageSize=" +
      pageSize;

    fetch(requestURL, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw "Connection failed.";
        }
      })
      .then((references) => {
        var PaperIds = references.citations.map(function (reference) {
          return reference.id;
        });

        let edgesArr = toJS(appState.graph.rawGraph.edges);
        console.log(PaperIds);
        for (let i = 0; i < PaperIds.length; i++) {
          if (!PaperIds[i]) {
            continue;
          }
          if (
            edgesArr.some(
              (edge) =>
                edge.source_id == PaperIds[i] &&
                edge.target_id == rightClickedNodeId
            )
          ) {
            console.log("Already containing keys!");
            continue;
          }
          curcount += 1;
          let citationAPI =
            "https://api.semanticscholar.org/v1/paper/" + PaperIds[i];
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection failed.";
              }
            })
            .then((response) => {
              this.addNodetoGraph(response, rightClickedNodeId, 0);
              this.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                node_offset,
                0
              );
              appState.graph.process.graph.getNode(
                response.paperId
              ).renderData.textHolder.children[0].element.override = true;
              node_offset += 1;
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
            })
            .catch(function (err) {
              console.warn(
                "Error adding paper nodes through Semantic Scholar API. " +
                  requestURL,
                err
              );
            });
          if (curcount >= 5) {
            break;
          }
        }
      })
      .then(console.log("Web API results fetched."))
      .catch((error) => {
        console.error(
          "Error when requesting sorted references through web API. Adding random references.",
          error
        );
        this.addRandomReferences();
      });
    appState.graph.frame.updateNodesShowingLabels();
  }

  addRandomReferences() {
    const rightClickedNodeId =
      this.frame.rightClickedNode.data.ref.id.toString();
    let curcount = 0;
    let offset = 0;
    let apiurl =
      "https://api.semanticscholar.org/v1/paper/" + rightClickedNodeId;
    fetch(apiurl)
      .then((res) => {
        return res.json();
      })
      .then((response) => {
        return response.references;
      })
      .then((references) => {
        console.log(references);
        let edgesArr = toJS(appState.graph.rawGraph.edges);
        for (let i = 0; i < references.length; i++) {
          if (
            edgesArr.some(
              (edge) =>
                edge.source_id == rightClickedNodeId &&
                edge.target_id == references[i].paperId
            )
          ) {
            console.log("contains key");
            continue;
          }
          curcount += 1;
          let citationAPI =
            "https://api.semanticscholar.org/v1/paper/" + references[i].paperId;
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection failed.";
              }
            })
            .then((response) => {
              this.addNodetoGraph(response, rightClickedNodeId, 1);
              // console.log("add node curcount: ", offset);
              this.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                offset,
                1
              );
              appState.graph.process.graph.getNode(
                response.paperId
              ).renderData.textHolder.children[0].element.override = true;
              offset += 1;
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
            });
          if (curcount >= 5) {
            break;
          }
        }
      })
      .then(console.log("Successfully added random paper nodes."));
    appState.graph.frame.updateNodesShowingLabels();
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
          this.frame.rightClickedNode &&
            MenuDividerFactory({
              title: "Add Citations or References",
              key: "Add Citations or References",
            }),
          this.frame.rightClickedNode &&
            MenuItemFactory({
              children: [
                MenuItemFactory({
                  onClick: () => {
                    this.addSortedCitations("relevance");
                  },
                  text: "Sort By Relevance",
                  key: "Sort By Relevance",
                }),
                MenuItemFactory({
                  onClick: () => {
                    this.addSortedCitations("is-influential");
                  },
                  text: "Sort By Most Infleunced Papers",
                  key: "Sort By Most Infleunced Papers",
                }),
                MenuItemFactory({
                  onClick: () => {
                    this.addSortedCitations("total-citations");
                  },
                  text: "Sort By Citation Count",
                  key: "Sort By Citation Count",
                }),
                MenuItemFactory({
                  onClick: () => {
                    this.addSortedCitations("pub-date");
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
                    this.addSortedReferences("relevance");
                  },
                  text: "Sort By Relevance",
                  key: "Sort By Relevance",
                }),
                MenuItemFactory({
                  onClick: () => {
                    this.addSortedReferences("is-influential");
                  },
                  text: "Sort By Most Infleunced Papers",
                  key: "Sort By Most Infleunced Papers",
                }),
                MenuItemFactory({
                  onClick: () => {
                    this.addSortedReferences("year");
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
