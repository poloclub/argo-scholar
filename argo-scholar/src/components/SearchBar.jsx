import React from "react";
import appState from "../stores/index";
import classnames from "classnames";
import {
  requestCreateEmptyPaperGraph,
  requestCreateNewProject
} from "../ipc/client";
import {
  Button,
  Classes,
  InputGroup,
  Intent,
  Position,
  Tooltip,
  Popover,
  Menu,
  MenuItem,
  MenuDivider
} from "@blueprintjs/core";
import { tree } from "d3";

const corpusIDregex = /^[0-9]+$/; 
const apiCorpusPrefix = "https://api.semanticscholar.org/v1/paper/CorpusID:";
const apiKeywordPrefix = "https://api.semanticscholar.org/graph/v1/paper/search?query=";

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false; 
    this.state = {
        query: '', 
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
    appState.project.currentQuery = this.state.query;
    
    if (corpusIDregex.test(this.state.query)) {
      // CorpusID submitted
      
      let apiurl = apiCorpusPrefix + this.state.query;

      fetch(apiurl)
        .then((res) => {
          if (res.ok) {
            return res.json();
          } else {
            throw "error";
          }
        })
        .then((response) => {
          var searches = [];
          searches.push(response)
          // for (var i = 0; i < response.data.length; i++) {
          //   searches.push(response.data[i]);
          // }
          appState.project.searchResults = searches;
          appState.project.isAddPapersDialogOpen = true;
        })
        .catch((error) => {
          alert("Issue occurred when fetching search results. This may be due to API issues or the CorpusID not being associated with a valid paper.");
        });
    } else {
      // Keyword query

      var keywordQuery = this.state.query; 
      keywordQuery = keywordQuery.trim().replace(/  +/g, ' ').replace(/ /g, '+');

      let apiurl = apiKeywordPrefix + keywordQuery;

      fetch(apiurl)
        .then((res) => {
          if (res.ok) {
            return res.json();
          } else {
            throw "error";
          }
        })
        .then((response) => {
          var searches = [];
          for (var i = 0; i < response.data.length; i++) {
            searches.push(response.data[i]);
          }
          appState.project.searchResults = searches;
          appState.project.isAddPapersDialogOpen = true;
        })
        .catch((error) => {
          alert("Issue occurred when fetching search results.");
        });
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
            Search:
            <input 
              type="text" 
              value={this.state.query} 
              onChange={this.handleChange} 
              placeholder="Search here" 
          />
          </label>
          <button type="submit">
            Submit
          </button>
        </form>



        {/* <Popover
          content={
            <Menu>
              <MenuItem
                text="Add Papers"
                iconName="pt-icon-new-object"
                onClick={() => { appState.project.isAddPapersDialogOpen = true; }}
              />
              <MenuItem
                text="Clear all papers"
                iconName="pt-icon-graph-remove"
                onClick={this.createEmptyGraph}
              />
            </Menu>
          }
          position={Position.BOTTOM}
        >
          <Button
            className={classnames([Classes.BUTTON, Classes.MINIMAL])}
            iconName="pt-icon-manual"
          >
            Papers
            </Button>
        </Popover> */}
      </div>
    );
  }
}

export default SearchBar;