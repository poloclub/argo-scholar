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

@observer
class AddPapersDialog extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false;  
    this.state = {
        query: '', 
        id: 0
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
              appState.project.isAddPapersDialogOpen=false;
              this.state.query='';
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
              Add by Corpus ID:
              <span className="pt-text-muted"> (required)</span>
              <input
                class="pt-input"
                type="text"
                placeholder="Input CorpusID here"
                dir="auto"
                value={this.state.query}
                onChange={event => this.setState({ query: event.target.value })}
              />
            </label>
          </div>

          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                className={classnames({
                  [Classes.DISABLED]: !this.state.query
                })}
                intent={Intent.PRIMARY}
                onClick={() => {
                  this.handleSubmit();
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