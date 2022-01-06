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
      query: "",
      id: 0,
      searchResults: [],
      search: "",
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
            this.setState({searchResults: searches, search: keywordQuery});
          })
          .catch((error) => {
            alert("Issue occurred when fetching search results. This may be due to API issues or the CorpusID not being associated with a valid paper.");
          });
      } else {
        console.log('A key word query was submitted: ' + this.state.query);
        var keywordQuery = this.state.query; 
        keywordQuery = keywordQuery.trim().replace(/  +/g, ' ').replace(/ /g, '+');
        // this.state.search = keywordQuery;
        // // this.state.query = keywordQuery;
        console.log(keywordQuery)

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
            console.log("keyword search:")
            console.log(response)
            var searches = [];
            for (var i = 0; i < response.data.length; i++) {
              searches.push(response.data[i]);
            }
            console.log(response);
            this.setState({searchResults: searches, search: keywordQuery});
            // console.log("addpapersdialog: " + this.state.searchResults);
          })
          // .catch((error) => {
          //   alert("Issue occurred when fetching search results.");
          // });
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
              value={this.state.query}
              onChange={event => this.setState({ query: event.target.value })}
            />
          </label>
          <div className="pt-callout pt-icon-info-sign">
            <i>Corpus ID</i>, also known as <i>S2CID</i> or <i>S2 corpus ID</i>, is a unique identifier for a paper in the <b>Semantic Scholar</b> database.<br />
            <a href="https://www.semanticscholar.org/"> Look up the <i>Corpus ID</i> of a paper</a>

          </div>
          <div key={this.state.searchResults}> 
            <PaperResultsCards papers={this.state.searchResults} query={this.state.search} />
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
              text={"Search"}
            />
          </div>
        </div>
      </Dialog>
    );
  }
}

export default AddPapersDialog;