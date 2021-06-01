import React from "react";
import appState from "../stores/index";
import {
  requestCreateEmptyPaperGraph,
  requestCreateNewProject
} from "../ipc/client";

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false;  
    this.state = {
        query: '', 
        id: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  
  componentDidMount() {
    this._isMounted = true;
  };

  componentWillUnmount() {
    this._isMounted = false;
  };

  handleChange(event) {
    this._isMounted && this.setState({query: event.target.value});
  }
  
  handleSubmit(event) {
    console.log('A CorpusID was submitted: ' + this.state.query);
    const corpusIDregex = /^[0-9]+$/;
    if (this._isMounted) {
      if (corpusIDregex.test(this.state.query)) {
          let apiurl = "https://api.semanticscholar.org/v1/paper/CorpusID:" + this.state.query;

          fetch(apiurl)
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                throw "error";
              }
            })
            .then((response) => {
              this.state.id = response.paperId;
              if (response.paperId in appState.graph.preprocessedRawGraph.nodesPanelData) {
                alert("Node already in graph");
                return;
              }
              appState.graph.addNodetoGraph(response, "null", 0);
              appState.graph.process.graph.getNode(response.paperId).pinnedx = true;
              appState.graph.process.graph.getNode(response.paperId).pinnedy = true;
              appState.graph.process.graph.getNode(response.paperId).renderData.textHolder.children[0].element.override = true;
              appState.graph.frame.updateNodesShowingLabels();
            })
            .catch((error) => {
              alert("Not a valid CorpusID. Please try again v1.");
            });
      } else {
          alert("Not a valid CorpusID. Please try again.");
      }
    }
    event.preventDefault();
  }

  createEmptyGraph(event) {
    appState.graph.runActiveLayout();
    requestCreateNewProject({
      name: appState.project.newProjectName,
      createdDate: new Date().toLocaleString(),
    });
    requestCreateEmptyPaperGraph( 
      appState.project.newProjectName
    );

    // Importing a graph means no label would be shown by default,
    // thus turn off label CSSRenderer for better performance.
    appState.graph.frame.turnOffLabelCSSRenderer();
    event.preventDefault();
    appState.graph.selectedNodes.length = 0;
    appState.graph.currentlyHovered = null; 
  }

  render() {
    return (
      <div>
      <form onSubmit={this.handleSubmit}>
        <label>
          CorpusID:
          <input 
            type="text" 
            value={this.state.query} 
            onChange={this.handleChange} 
            placeholder="Input CorpusID here" 
        />
        </label>
        <input type="submit" value="Submit" />
      </form>

      <button onClick={this.createEmptyGraph}>Empty Graph</button>
      </div>
    );
  }
}

export default SearchBar;