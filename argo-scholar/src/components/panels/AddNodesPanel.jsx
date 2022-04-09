import React from "react";
import classnames from "classnames";
import uniq from "lodash/uniq";
import { Classes } from "@blueprintjs/core";
import appState from "../../stores";
import { observer } from "mobx-react/index";

import PaperResultsSubPanel from "./PaperResultsSubPanel";

@observer
class AddNodes extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false; 
    this.state = {
        papers: this.props.papers,
        query: this.props.query,
    };
  }
  render() {
    // If input is number,
    // currently format number between 0-1 (eg. pagerank)
    // to show no more than 3 significant digits.
    return (
      <div
        style={{
          width: "30vw",
        }}
      >
        <div style={{pointerEvents: "all"}} className={"paper-popover"}>
          <PaperResultsSubPanel papers={this.props.papers} query={this.state.query}/>
        </div>
        
      </div>
    );
  }
}

export default AddNodes;