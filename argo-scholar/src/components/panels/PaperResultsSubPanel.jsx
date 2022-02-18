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
import { observer, propTypes } from "mobx-react";
import classnames from "classnames";
import appState from "../../stores/index";
import { timeThursdays } from "d3";
import { toJS } from "mobx";

import AddNodesRow from "./AddNodesRow";
// import { data } from "jquery";

@observer
class PaperResultsSubPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        data: this.props.papers,
        query: this.props.query,
    }
  }

  render() {    
    let cards = [];
    this.state.data.forEach(paper => {
      cards.push(<AddNodesRow paper={paper}/>)
    })
    return (
        <div>
          <table class="search-paper-table">
            {cards}
          </table> 
        </div>
    );
  }
}

export default PaperResultsSubPanel;