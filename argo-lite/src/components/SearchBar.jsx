import React from "react";
import appState from "../stores/index";
import {
  requestCreatePaperGraph,
  requestCreateNewProject
} from "../ipc/client";

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        query: '', 
        id: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
    
  handleChange(event) {
    this.setState({query: event.target.value});
  }
  
  handleSubmit(event) {
  
    console.log('A CorpusID was submitted: ' + this.state.query);
    const corpusIDregex = /^[0-9]+$/;
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
            // alert(this.state.id);
            appState.graph.runActiveLayout();

            requestCreateNewProject({
              name: appState.project.newProjectName,
              createdDate: new Date().toLocaleString(),
            });
            let paperNode = [response.paperId, response.title, response.abstract, response.citations.slice(0,5)];
            requestCreatePaperGraph( //edgefile.delimiter and nodefile.delimiter are the same
              appState.project.newProjectName, paperNode
            );

            // Importing a graph means no label would be shown by default,
            // thus turn off label CSSRenderer for better performance.
            appState.graph.frame.turnOffLabelCSSRenderer();
          })
          .catch((error) => {
            alert("Not a valid CorpusID. Please try again v1.");
          });
    } else {
        alert("Not a valid CorpusID. Please try again.");
    }
    event.preventDefault();
  }

  render() {
    return (
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
    );
  }
}

export default SearchBar;