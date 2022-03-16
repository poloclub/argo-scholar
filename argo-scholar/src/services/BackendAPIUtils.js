import { toJS } from "mobx";
import appState from "../stores/index";
import { toaster } from "../notifications/client";
import { Intent } from "@blueprintjs/core";

/**
 * Change this to query more papers.
 * pageSize > 10 will return incorrect ranks.
 *  */
const pageLimit = 10;
const pageSize = 10;

/**
 * Adding sorted citations from Semantic Scholar's backend API through multiple steps.
 * Step 1: fetch multiple times in the for-loop and store the node id arrays in the promises array since maximum pageSize is 10 in order for the API to return ordered results.
 * Step 2: use Promise.all() to concatenate all node ids in one array.
 * Step 3: pick the first 5 non-duplicate ids and fetch node info with Semantic Scholar's public API.
 * Backup Step: if backend API fails, call addRandomCitations() to add 5 unsorted nodes with Semantic Scholar's public API.
 * @param {*} sortMethod
 */
export function addSortedCitations(sortMethod, graph) {
  // Fetch request body and params
  let curcount = 0;
  let offset = 0;

  const rightClickedNodeId =
    graph.frame.rightClickedNode.data.ref.id.toString();
  var requestURL =
    "https://argo-cors-anywhere.herokuapp.com/https://www.semanticscholar.org/api/1/search/paper/" +
    rightClickedNodeId +
    "/citations";

  let promises = [];
  // 30 ids in total, 10 each iteration
  for (let page = 1; page <= pageLimit; page++) {
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
    //Fetching node info from backend API
    promises.push(
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
            throw "Connection to backend API failed.";
          }
        })
        // Mapping ids onto an array
        .then((citations) => {
          var PaperIds = citations.results.map(function (citation) {
            return citation.id;
          });
          return PaperIds;
        })
    );
  }

  Promise.all(promises)
    .then((result) => {
      // Concatenate the ids into one long array
      let PaperIds = result.flat();
      console.log(PaperIds);
      console.log("Node array length: " + PaperIds.length);
      // Creating nodes
      let edgesArr = toJS(appState.graph.rawGraph.edges);
      let addedNodes = [];
      let fetches = [];

      let duplicateNodes = 0;
      let nonCorpusNodes = 0;
      for (let i = 0; i < PaperIds.length; i++) {
        // Null check
        if (!PaperIds[i]) {
          nonCorpusNodes += 1;
          continue;
        }

        // Checking duplicate nodes
        if (
          edgesArr.some(
            (edge) =>
              edge.source_id == PaperIds[i] &&
              edge.target_id == rightClickedNodeId
          )
        ) {
          console.log("Already containing nodes!");
          duplicateNodes += 1;
          continue;
        }

        curcount += 1;

        // Fetching node info from public API
        let citationAPI =
          "https://api.semanticscholar.org/v1/paper/" + PaperIds[i];
        fetches.push(
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection to public API failed.";
              }
            })
            .then((response) => {
              graph.addNodetoGraph(response, rightClickedNodeId, 0);
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
              graph.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                offset,
                0
              );
              let paperNode = appState.graph.process.graph.getNode(
                response.paperId
              );
              addedNodes.push(paperNode);
              paperNode.renderData.textHolder.children[0].element.override = true;
              offset += 1;
            })
            .catch(function (err) {
              console.warn(
                "Cannot fetch node info through Semantic Scholar's public API. " +
                  requestURL,
                err
              );
            })
        );

        // Exit condition
        if (curcount >= 5) {
          break;
        }
      }
      console.log("Graph contains " + duplicateNodes + " duplicate nodes.");
      console.log("Graph contains " + nonCorpusNodes + " non-corpus nodes.");

      // Check for remaining nodes
      if (
        PaperIds.length < pageLimit * pageSize &&
        PaperIds.length == duplicateNodes
      ) {
        console.log("All citations added");
        toaster.show({
          message: "All the citations for this node have been added.",
          intent: Intent.WARNING,
        });
      }

      // Check for upper limit
      if (duplicateNodes >= pageLimit * pageSize) {
        console.log("Limit reached");
        toaster.show({
          message:
            "Maximum number of citations allowed (" +
            pageLimit * pageSize +
            ") reached.",
          intent: Intent.WARNING,
        });
      }

      Promise.all(fetches).then(() => {
        var nodeLabels = []
        var nodeIds = []
        addedNodes.forEach((node) => {
          appState.graph.selectedNodes.push(node);
          appState.graph.frame.selection.push(node);
          nodeLabels.push(node.data.label);
          nodeIds.push(node.id);
        });
        appState.logger.addLog({eventName: `AddCitation${sortMethod}`, elementName: rightClickedNodeId, valueName: nodeLabels, newValue: nodeIds});
      });
    })
    // Error message, using backup method instead
    .catch((error) => {
      console.error(
        "Error occurred when requesting sorted citations through Semantic Scholar's backend API. Adding random citations. Reason:",
        error
      );
      toaster.show({
        message:
          "Error getting sorted results. Adding unsorted results from Semantic Scholar instead.",
        intent: Intent.WARNING,
      });
      addRandomCitations(graph);
    });

  appState.graph.frame.updateNodesShowingLabels();
}

//Backup: add random citaions to right clicked node
function addRandomCitations(graph) {
  // Fetch request body and params
  const rightClickedNodeId =
    graph.frame.rightClickedNode.data.ref.id.toString();
  let curcount = 0;
  let offset = 0;
  let apiurl = "https://api.semanticscholar.org/v1/paper/" + rightClickedNodeId;

  // Fetching node ids from public API
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
      let addedNodes = [];
      let fetches = [];

      let duplicateNodes = 0;
      for (let i = 0; i < citations.length; i++) {
        if (duplicateNodes >= pageLimit * pageSize) {
          break;
        }
        if (
          edgesArr.some(
            (edge) =>
              edge.source_id == citations[i].paperId &&
              edge.target_id == rightClickedNodeId
          )
        ) {
          console.log("Already containing nodes!");
          duplicateNodes += 1;
          continue;
        }
        curcount += 1;
        let citationAPI =
          "https://api.semanticscholar.org/v1/paper/" + citations[i].paperId;

        // Fetching node info from public API
        fetches.push(
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection to public API failed.";
              }
            })
            .then((response) => {
              graph.addNodetoGraph(response, rightClickedNodeId, 0);
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
              graph.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                offset,
                0
              );
              let paperNode = appState.graph.process.graph.getNode(
                response.paperId
              );
              addedNodes.push(paperNode);
              paperNode.renderData.textHolder.children[0].element.override = true;
              offset += 1;
              // appState.graph.process.graph.getNode(
              //   response.paperId
              // ).renderData.textHolder.children[0].element.override = true;
              // offset += 1;
              // appState.graph.selectedNodes = [];
              // appState.graph.frame.selection = [];
            })
            .catch(function (err) {
              console.warn(
                "Cannot fetch node info through Semantic Scholar's public API. " +
                  requestURL,
                err
              );
            })
        );
        if (curcount >= 5) {
          break;
        }
      }
      console.log("Graph contains " + duplicateNodes + " duplicate nodes.");

      // Check for remaining nodes
      if (
        citations.length < pageLimit * pageSize &&
        citations.length == duplicateNodes
      ) {
        console.log("All citations added");
        toaster.show({
          message: "All the citations for this node have been added.",
          intent: Intent.WARNING,
        });
      }

      // Check for upper limit
      if (duplicateNodes >= pageLimit * pageSize) {
        console.log("Limit reached");
        toaster.show({
          message:
            "Maximum number of citations allowed (" +
            pageLimit * pageSize +
            ") reached.",
          intent: Intent.WARNING,
        });
      }

      Promise.all(fetches).then(() => {
        var nodeLabels = [];
        var nodeIds = [];
        addedNodes.forEach((node) => {
          appState.graph.selectedNodes.push(node);
          appState.graph.frame.selection.push(node);
          nodeLabels.push(node.data.label);
          nodeIds.push(node.id);
        });
        appState.logger.addLog({eventName: `AddCitationRandom`, elementName: rightClickedNodeId, valueName: nodeIds, newValue: nodeLabels});
      });
    })
    .catch((error) => {
      console.error("Cannot add random nodes. Reason:", error);
      toaster.show({
        message: "Cannot load results. Please check network connection.",
        intent: Intent.DANGER,
        iconName: "warning-sign",
      });
    });
  appState.graph.frame.updateNodesShowingLabels();
}

/**
 * Adding sorted referenences from Semantic Scholar's backend API through multiple steps.
 * Step 1: fetch the first pageLimit * pageSize results and store the node id arrays in the array.
 * Step 3: pick the first 5 non-duplicate ids and fetch node info with Semantic Scholar's public API.
 * Backup Step: if backend API fails, call addRandomReferences() to add 5 unsorted nodes with Semantic Scholar's public API.
 * @param {*} sortMethod
 */
export function addSortedReferences(sortMethod, graph) {
  // Fetch request body and params
  let curcount = 0;
  let offset = 0;

  const rightClickedNodeId =
    graph.frame.rightClickedNode.data.ref.id.toString();
  var requestURL =
    "https://argo-cors-anywhere.herokuapp.com/https://www.semanticscholar.org/api/1/paper/" +
    rightClickedNodeId +
    "/citations?sort=" +
    sortMethod +
    "&offset=" +
    offset +
    "&citationType=citedPapers&citationsPageSize=" +
    pageLimit * pageSize;

  // Fetching node info from backend API
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
      console.log(PaperIds);
      console.log("Node array length: " + PaperIds.length);

      let edgesArr = toJS(appState.graph.rawGraph.edges);
      let addedNodes = [];
      let fetches = [];

      let duplicateNodes = 0;
      let nonCorpusNodes = 0;
      for (let i = 0; i < PaperIds.length; i++) {
        // Null check
        if (!PaperIds[i]) {
          nonCorpusNodes += 1;
          continue;
        }

        // Checking duplicate nodes
        if (
          edgesArr.some(
            (edge) =>
              edge.source_id == rightClickedNodeId &&
              edge.target_id == PaperIds[i]
          )
        ) {
          console.log("Already containing nodes!");
          duplicateNodes += 1;
          continue;
        }
        curcount += 1;

        // Fetching node info from public API
        let citationAPI =
          "https://api.semanticscholar.org/v1/paper/" + PaperIds[i];
        fetches.push(
          fetch(citationAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection to public API failed.";
              }
            })
            .then((response) => {
              graph.addNodetoGraph(response, rightClickedNodeId, 1);
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
              graph.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                offset,
                1
              );
              let paperNode = appState.graph.process.graph.getNode(
                response.paperId
              );
              addedNodes.push(paperNode);
              paperNode.renderData.textHolder.children[0].element.override = true;
              offset += 1;
            })
            .catch(function (err) {
              console.warn(
                "Error adding paper nodes through Semantic Scholar API. " +
                  requestURL,
                err
              );
            })
        );

        // Exit condition
        if (curcount >= 5) {
          break;
        }
      }
      console.log("Graph contains " + duplicateNodes + " duplicate nodes.");
      console.log("Graph contains " + nonCorpusNodes + " non-corpus nodes.");
      // Check for remaining nodes
      if (
        PaperIds.length < pageLimit * pageSize &&
        PaperIds.length == duplicateNodes + nonCorpusNodes
      ) {
        console.log("All references added");
        toaster.show({
          message: "All the references for this node have been added.",
          intent: Intent.WARNING,
        });
      }

      // Check for upper limit
      if (duplicateNodes >= pageLimit * pageSize) {
        console.log("Limit reached");
        toaster.show({
          message:
            "Maximum number of references allowed (" +
            pageLimit * pageSize +
            ") reached.",
          intent: Intent.WARNING,
        });
      }

      Promise.all(fetches).then((response) => {
        var nodeLabels = []
        var nodeIds = []
        addedNodes.forEach((node) => {
          appState.graph.selectedNodes.push(node);
          appState.graph.frame.selection.push(node);
          nodeLabels.push(node.data.label);
          nodeIds.push(node.id);
        });
        appState.logger.addLog({eventName: `AddReference${sortMethod}`, elementName: rightClickedNodeId, valueName: nodeIds, newValue: nodeLabels});
      });
    })
    // Error message, using backup method instead
    .catch((error) => {
      console.error(
        "Error occurred when requesting sorted references through web API. Adding random references. Reason:",
        error
      );
      toaster.show({
        message:
          "Error getting sorted results. Adding unsorted results from Semantic Scholar instead.",
        intent: Intent.WARNING,
      });
      addRandomReferences(graph);
    });
  appState.graph.frame.updateNodesShowingLabels();
}

//Backup: add random references to the right clicked node
function addRandomReferences(graph) {
  // Fetch request body and params
  const rightClickedNodeId =
    graph.frame.rightClickedNode.data.ref.id.toString();
  let curcount = 0;
  let offset = 0;
  let apiurl = "https://api.semanticscholar.org/v1/paper/" + rightClickedNodeId;

  // Fetching node ids from public API
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
      let addedNodes = [];
      let fetches = [];

      let duplicateNodes = 0;
      for (let i = 0; i < references.length; i++) {
        if (
          edgesArr.some(
            (edge) =>
              edge.source_id == rightClickedNodeId &&
              edge.target_id == references[i].paperId
          )
        ) {
          console.log("Already containing nodes!");
          duplicateNodes += 1;
          continue;
        }
        curcount += 1;
        let referenceAPI =
          "https://api.semanticscholar.org/v1/paper/" + references[i].paperId;

        // Fetching node info from public API
        fetches.push(
          fetch(referenceAPI)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "Connection to public API failed.";
              }
            })
            .then((response) => {
              graph.addNodetoGraph(response, rightClickedNodeId, 1);
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
              graph.frame.addFrontEndNodeInARow(
                rightClickedNodeId,
                response.paperId,
                offset,
                1
              );
              let paperNode = appState.graph.process.graph.getNode(
                response.paperId
              );
              addedNodes.push(paperNode);
              paperNode.renderData.textHolder.children[0].element.override = true;
              offset += 1;
            })
        );
        if (curcount >= 5) {
          break;
        }
      }
      console.log("Graph contains " + duplicateNodes + " duplicate nodes.");

      // Check for remaining nodes
      if (
        references.length < pageLimit * pageSize &&
        references.length == duplicateNodes
      ) {
        console.log("All references added");
        toaster.show({
          message: "All the references for this node have been added.",
          intent: Intent.WARNING,
        });
      }

      // Check for upper limit
      if (duplicateNodes >= pageLimit * pageSize) {
        console.log("Limit reached");
        toaster.show({
          message:
            "Maximum number of references allowed (" +
            pageLimit * pageSize +
            ") reached.",
          intent: Intent.WARNING,
        });
      }
      Promise.all(fetches).then((response) => {
        var nodeLabels = [];
        var nodeIds = [];
        addedNodes.forEach((node) => {
          appState.graph.selectedNodes.push(node);
          appState.graph.frame.selection.push(node);
          nodeLabels.push(node.data.label);
          nodeIds.push(node.id);
        });
        appState.logger.addLog({eventName: `AddReferenceRandom`, elementName: rightClickedNodeId, valueName: nodeIds, newValue: nodeLabels});
      });
    })
    .catch((error) => {
      console.error("Cannot add random nodes. Reason:", error);
      toaster.show({
        message: "Cannot load results. Please check network connection.",
        intent: Intent.DANGER,
        iconName: "warning-sign",
      });
    });

  appState.graph.frame.updateNodesShowingLabels();
}
