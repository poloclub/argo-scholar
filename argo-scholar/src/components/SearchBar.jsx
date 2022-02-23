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
  MenuDivider,
  Toaster,
  IToastProps
} from "@blueprintjs/core";
import { tree } from "d3";
import { toaster } from '../notifications/client';

import AddNodes from "./panels/AddNodesPanel";

const corpusIDregex = /^[0-9]+$/; 
const apiCorpusPrefix = "https://api.semanticscholar.org/v1/paper/CorpusID:";
const apiKeywordPrefix = "https://api.semanticscholar.org/graph/v1/paper/search?query=";

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false; 
    this.state = {
        searchResults: [],
        query: '', 
        display: false,
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleEnter = this.handleEnter.bind(this);
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

  handleClick(event) {
    this.setState({display: true});
    // event.preventDefault();
  } 

  handleEnter(event) {
    if (event.which === 13) {
      this.handleSubmit(event);
    }
   }

  handleSubmit(event) {
    this.setState({display: false})
    if (this.state.query == "") {
      return
    }
    // appState.project.currentQuery = this.state.query;
    
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
          this.setState({searchResults: searches})
          this.setState({display: true})
          // appState.project.isAddPapersDialogOpen = true;
        })
        .catch((error) => {
          this.addToast("Error occurred when fetching search results. This may be due to API issues or the CorpusID not being associated with a valid paper.");
          // alert("Issue occurred when fetching search results. This may be due to API issues or the CorpusID not being associated with a valid paper.");
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
          if (response.data.length < 1) {
            this.addToast(`No results found for "${this.state.query}".`)
            return
          }
          var searches = [];
          for (var i = 0; i < response.data.length; i++) {
            searches.push(response.data[i]);
          }
          this.setState({searchResults: searches})
          // appState.project.isAddPapersDialogOpen = true;
          this.setState({display: true})
        })
        .catch((error) => {
          this.addToast("Error occurred when fetching search results. This may be due to API issues.");
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

  addToast(message) {
    toaster.show({ 
      message: message,
      intent: Intent.DANGER,
      iconName: "warning-sign",
    });
  }

  render() {
    return (
      <div>
        <InputGroup 
          className={"search-bar-width"}
          leftIconName={"search"} 
          rightElement={
            <Popover
              content={<AddNodes papers={this.state.searchResults} query={this.state.query}/>} 
              target={<button onClick={this.handleSubmit} class="pt-button pt-minimal pt-intent-primary pt-icon-arrow-right"></button>}
              position={Position.BOTTOM}
              isOpen={this.state.display && this.state.searchResults.length > 0}
              onClose={() => {this.setState({display: false})}}
              autoFocus={false}
              enforceFocus={false}
            /> 
          }
          onChange={this.handleChange}
          placeholder={"Search"}
          onKeyPress={(e) => this.handleEnter(e)}
          onClick={this.handleClick}
        />
        {/* <Popover
          content={
            <Menu>
              <MenuItem
                text="Add Papers"
                iconName="pt-icon-new-object"
                onClick={() => { appState.project.isAddPapersDialogOpen = true; }}
              />
              {/* <MenuItem
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