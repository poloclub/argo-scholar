import React from "react";
import {
  Button,
  Classes,
  Card,
  Icon,
  Dialog,
  Intent,
  Spinner
} from "@blueprintjs/core";
import { observer, propTypes } from "mobx-react";
import classnames from "classnames";
import appState from "../../stores/index";
import { timeThursdays } from "d3";
import { toJS } from "mobx";
// import { data } from "jquery";

const pageCount = 10;
const apiCorpusPrefix = "https://api.semanticscholar.org/v1/paper/CorpusID:";
const apiKeywordPrefix = "https://api.semanticscholar.org/graph/v1/paper/search?query=";
const corpusIDregex = /^[0-9]+$/; 

@observer
class AddNodesRow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        paper: this.props.paper,
    }
  }

  isNodeHidden(nodeid) {
    // console.log(nodeid)
    for (let n of appState.graph.rawGraph.nodes) {
      // console.log(n)
      if (n.id == nodeid) {
        if (n.isHidden) {
          console.log("returning true")
          return true;
        } else {
          return false;
        }
      }
    }
    return false;
  }

  handleClick(paperId) {
    if (paperId in appState.graph.preprocessedRawGraph.nodesPanelData) {
        appState.graph.showNodes(paperId);
    } else {
        let citationAPI = "https://api.semanticscholar.org/v1/paper/" + paperId;
        console.log("Adding selected paper: " + paperId);
        fetch(citationAPI)
        .then((res) => {
            if (res.ok) {
            return res.json();
            } else {
            throw "error";
            }
        })
        .then((response) => {
            appState.graph.addNodetoGraph(response, "null", 0);
            appState.logger.addLog({eventName: `AddPaper`, elementName: response.paperId, valueName: `Label`, newValue: response.title});
            // console.log("add node curcount: ", offset);
            let paperNode = appState.graph.process.graph.getNode(response.paperId);
            paperNode.renderData.textHolder.children[0].element.override = true;
            paperNode.pinnedx = true;
            paperNode.pinnedy = true;
            paperNode.x = appState.controls.camera.position.x;
            paperNode.y = appState.controls.camera.position.y;
            paperNode.pinnedx = true;
            paperNode.pinnedy = true;
            appState.graph.frame.updateNodesShowingLabels();
            appState.graph.selectedNodes = [];
            appState.graph.frame.selection = [];
        });
    }
  }

  render() {
    let nodeHidden = this.isNodeHidden(this.state.paper.paperId);
    let buttonDisabled = this.state.paper.paperId in appState.graph.preprocessedRawGraph.nodesPanelData && !nodeHidden
    // let cards = [];
    // this.state.data.forEach(paper=> {
    //   // console.log("paper: " + {paper});
    //   // cards.push(<p>{paper}</p>);
    //   cards.push(<tr class="search-row">
    //       <td class="search-result">{paper.title}</td>
    //       <td class="search-add">
    //         <button type="button" class="pt-button pt-small" className={this.state.hidden}
    //           // disabled={this.isNodeHidden(paper.paperId)} 
    //           // // disabled={paper.paperId in appState.graph.preprocessedRawGraph.nodesPanelData}
    //           disabled={(paper.paperId in appState.graph.preprocessedRawGraph.nodesPanelData && !appState.graph.isNodeHidden(paper.paperId))} 
    //           onClick={() => this.handleClick(paper.paperId)}>Add
    //         </button>
    //       </td>
    //       </tr>)
    // })
    return (
        <tr class="search-row">
          <td class="search-result">{this.state.paper.title}</td>
          <td class="search-add">
            <button type="button" class="pt-button pt-small"
              // disabled={this.isNodeHidden(paper.paperId)} 
              // // disabled={paper.paperId in appState.graph.preprocessedRawGraph.nodesPanelData}
              disabled={buttonDisabled} 
              onClick={() => this.handleClick(this.state.paper.paperId)}>
              {nodeHidden ? "Unhide" 
                : buttonDisabled
                  ? "Added" : "Add"}
            </button>
          </td>
        </tr>
    );
  }
}

export default AddNodesRow;