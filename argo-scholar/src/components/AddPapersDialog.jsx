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
import { observer } from "mobx-react";
import classnames from "classnames";
import appState from "../stores/index";

const corpusIDregex = /^[0-9]+$/; 

@observer
class AddPapersDialog extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false;
    this.state = {
      query: "",
      id: 0,
      searchBy: "corpusID",
    };
  }

  componentDidMount() {
    this._isMounted = true;
  };

  componentWillUnmount() {
    this._isMounted = false;
  };

  // handleChange(event) {
  //   this._isMounted && this.setState({query: event.target.value});
  // }

  handleSubmit(event) {
    if (this._isMounted) {
      if (this.state.searchBy == "corpusID") {
        console.log('A CorpusID was submitted: ' + this.state.query);
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
              // appState.graph.process.graph.getNode(response.paperId).pinnedx = true;
              // appState.graph.process.graph.getNode(response.paperId).pinnedy = true;
              appState.graph.process.graph.getNode(response.paperId).renderData.textHolder.children[0].element.override = true;
              appState.graph.frame.updateNodesShowingLabels();
              appState.project.isAddPapersDialogOpen = false;
              appState.graph.selectedNodes = [];
              appState.graph.frame.selection = [];
              this.state.query = '';
            })
            .catch((error) => {
              alert("Issue occurred when fetching search results. This may be due to API issues or the CorpusID not being associated with a valid paper.");
            });
        } else {
          alert("Not a valid CorpusID. Please try again.");
        }
      } else {



        console.log('A key word query was submitted: ' + this.state.query);
        var keywordQuery = this.state.query; 
        keywordQuery = keywordQuery.trim().replace(/  +/g, ' ').replace(/ /g, '+');
        console.log(keywordQuery)

        let apiurl = "https://api.semanticscholar.org/graph/v1/paper/search?query=" + keywordQuery;

        fetch(apiurl)
          .then((res) => {
            if (res.ok) {
              return res.json();
            } else {
              throw "error";
            }
          })
          .then((response) => {
            console.log(response);
          })
          .catch((error) => {
            alert("Issue occurred when fetching search results.");
          });
         
      }
      
    }
    event.preventDefault();
  }

  // handleChange(event) {
  //   this.searchBy = event.target.value;
  //   console.log("changed to: ", this.searchBy);
  // }

  render() {
    return (
      <Dialog
        iconName="projects"
        className={classnames({
          [Classes.DARK]: appState.preferences.darkMode
        })}
        isOpen={appState.project.isAddPapersDialogOpen}
        onClose={() => {
          appState.project.isAddPapersDialogOpen = false;
        }}
        title={`Add Papers`}
      >
        <div className={classnames(Classes.DIALOG_BODY)}>
          <label className="pt-label .modifier">
            <span>
              Add by 
              <select value = {this.searchBy} onChange={event => this.setState({ searchBy: event.target.value })}> 
                  <option value="corpusID">Corpus ID</option>
                  <option value="keywords">Key Words</option>
              </select>:
            </span>
            <input
              class="pt-input pt-fill"
              type="text"
              placeholder="Input Corpus ID here"
              dir="auto"
              value={this.state.query}
              onChange={event => this.setState({ query: event.target.value })}
            />
          </label>
          <div className="pt-callout pt-icon-info-sign">
            <i>Corpus ID</i>, also known as <i>S2CID</i> or <i>S2 corpus ID</i>, is a unique identifier for a paper in the <b>Semantic Scholar</b> database.<br />
            <a href="https://www.semanticscholar.org/"> Look up the <i>Corpus ID</i> of a paper</a>

          </div>
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              className={classnames({
                [Classes.DISABLED]: !this.state.query
              })}
              disabled={!this.state.query}
              intent={Intent.PRIMARY}
              onClick={() => {
                this.handleSubmit(event);
              }}
              text="Submit"
            />
          </div>
        </div>
      </Dialog>
    );
  }
}

export default AddPapersDialog;