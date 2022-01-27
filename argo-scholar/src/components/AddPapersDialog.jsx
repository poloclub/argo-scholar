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
import PaperResultsCards from "./PaperResultsCards";

const corpusIDregex = /^[0-9]+$/; 
const apiCorpusPrefix = "https://api.semanticscholar.org/v1/paper/CorpusID:";
const apiKeywordPrefix = "https://api.semanticscholar.org/graph/v1/paper/search?query=";

@observer
class AddPapersDialog extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false;
    this.state = {
      id: 0,
    };
  }

  componentDidMount() {
    // this.state.query = appState.project.currentQuery;
    this._isMounted = true;
  };

  componentWillUnmount() {
    this._isMounted = false;
  };

  handleSubmit(event) {
    let query = appState.project.currentQuery;
    if (this._isMounted) {
      if (corpusIDregex.test(query)) {
        // CorpusID submitted
        
        let apiurl = apiCorpusPrefix + query;

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
            // this.setState({searchResults: searches, search: null});
          })
          .catch((error) => {
            alert("Issue occurred when fetching search results. This may be due to API issues or the CorpusID not being associated with a valid paper.");
          });
      } else {
        // Keyword query

        var keywordQuery = appState.project.currentQuery; 
        keywordQuery = keywordQuery.trim().replace(/  +/g, ' ').replace(/ /g, '+');
        // this.state.search = keywordQuery;
        // // this.state.query = keywordQuery;

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
            // this.setState({searchResults: searches, search: keywordQuery});
            // console.log("addpapersdialog: " + this.state.searchResults);
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
            <input
              class="pt-input pt-fill"
              type="text"
              placeholder="Search by paper name or CorpusID"
              dir="auto"
              value={appState.project.currentQuery}
              // value={this.state.query}
              onChange={event => {
                appState.project.currentQuery = event.target.value;
                // this.state.query = event.target.value;
              }}
              // onChange={event => this.setState({ query: event.target.value })}
            />
          </label>
          <div className="pt-callout pt-icon-info-sign">
            <i>Corpus ID</i>, also known as <i>S2CID</i> or <i>S2 corpus ID</i>, is a unique identifier for a paper in the <b>Semantic Scholar</b> database.<br />
            <a target="_blank" href="https://www.semanticscholar.org/"> Look up the <i>Corpus ID</i> of a paper</a>

          </div>
          <div>
            <PaperResultsCards papers={appState.project.searchResults} query={appState.project.currentQuery} />
            {/* <PaperResultsCards papers={this.state.searchResults} query={this.state.search} /> */}
          </div>
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              className={classnames({
                [Classes.DISABLED]: !appState.project.currentQuery
              })}
              disabled={!appState.project.currentQuery}
              intent={Intent.PRIMARY}
              onClick={() => {
                this.handleSubmit(event);
              }}
              text={"Search"}
            />
          </div>
        </div>
      </Dialog>
    );
  }
}

export default AddPapersDialog;