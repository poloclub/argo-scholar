import React from "react";
import classnames from "classnames";
import uniq from "lodash/uniq";
import { Classes, MenuDivider } from "@blueprintjs/core";
import appState from "../../stores";
import { observer } from "mobx-react/index";

@observer
class NodeDetail extends React.Component {
  render() {
    // If input is number,
    // currently format number between 0-1 (eg. pagerank)
    // to show no more than 3 significant digits.
    const formatLongFloat = (nodeAttributeValue) => {
      const num = Number(nodeAttributeValue);
      if (Number.isNaN(num) || num > 1 || num < 0) {
        // Do not format just return original
        return nodeAttributeValue;
      }
      // Format to no more than 3 significant digit.
      return Number.parseFloat(num).toPrecision(3);
    };

    return (
      <div
        className={classnames(
          // 'overlay-card',
          "right-overlay-card",
          "transparent-frame"
        )}
      >
        <div
          className={classnames(
            Classes.CARD,
            "node-details-table",
            "pt-elevation-2"
          )}
        >
          {/* Old table style (deprecated) */}
          {/* <table
            className={classnames(Classes.TABLE, Classes.TABLE_STRIPED)}
            style={{
              width: "100%",
              padding: "0",
            }}
          >
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {appState.graph.allPropertiesKeyList.map((it, i) => (
                <tr key={`${it}-${i}`}>
                  <td style={{ padding: "5px 10px" }}>{it}</td>
                  <td style={{ padding: "5px 10px", whiteSpace: "normal" }}>
                    {it == "url" ? (
                      <a href={this.props.node[it]} target={"_blank"}>
                        Link to Paper
                      </a>
                    ) : (
                      formatLongFloat(this.props.node[it])
                    )}
                  </td>
                </tr>
              ))}
              {appState.graph.allPropertiesKeyList.map((element, index) =>
                console.log(this.props.node[element], index)
              )}
            </tbody>
          </table> */}

          <div>
            {/* Title */}
            <h5 style={{ lineHeight: "1.2em" }}>
              {
                <a href={this.props.node["url"]} target={"_blank"}>
                  {this.props.node["paperName"]}
                </a>
              }
            </h5>

            {/* Authors */}
            <MenuDivider />
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <div>
                <b>{this.props.node["authors"]}</b>
              </div>
            </div>

            {/* Publication Details */}
            <MenuDivider />
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <div>
                <b>Venue: </b>
                {this.props.node["venue"]}
                <br />
                <b>Year: </b>
                {this.props.node["year"]}
                <br />
                <b>Citation Count: </b>
                {this.props.node["citationCount"]}
              </div>
            </div>

            {/* Stats */}
            <MenuDivider />
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <div>
                <b>Degree: </b>
                {this.props.node["degree"]}
                <br />
                <b>Page Rank: </b>
                {this.props.node["pagerank"]}
                <br />
                <b>Node ID: </b>
                {this.props.node["node_id"]}
              </div>
            </div>

            {/* Abstract */}
            <MenuDivider />
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <div>
                <b>Abstract: </b><br/>
                {this.props.node["paperAbstract"]}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default NodeDetail;
