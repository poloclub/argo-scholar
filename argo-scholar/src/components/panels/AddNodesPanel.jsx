import React from "react";
import classnames from "classnames";
import uniq from "lodash/uniq";
import { Classes } from "@blueprintjs/core";
import appState from "../../stores";
import { observer } from "mobx-react/index";

import PaperResultsSubPanel from "./PaperResultsSubPanel";

@observer
class AddNodes extends React.Component {
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
        <div style={{pointerEvents: "all"}}>
          <PaperResultsSubPanel papers={appState.project.searchResults} query={appState.project.currentQuery}/>
        </div>
        
      </div>
    );
  }
}

export default AddNodes;