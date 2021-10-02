import React from "react";
import anime from "animejs";
import { observer } from "mobx-react";
import classnames from "classnames";
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
  MenuDivider
} from "@blueprintjs/core";
import pluralize from "pluralize";
import appState from "../../stores";
import GlobalPanel from "./GlobalPanel";
import SelectionPanel from "./SelectionPanel";
import uniq from "lodash/uniq";
import { averageClusteringCoefficient } from "../../services/AlgorithmUtils";


@observer
class ZoomPanel extends React.Component {
  render() {
    return (
      <div className={classnames(
        "zoom-buttons"
      )}>
          <Button
            style={{marginBottom: "5px"}}
            className={classnames([Classes.BUTTON])} 
            iconName="plus"
            onClick={() => {
              anime({
                targets: appState.controls.zoom,
                percent: appState.controls.zoom.nextZoomInPercent
              });
            }}
            ></Button>
            
            
            <br></br>
            
            
            <Button 
            style={{marginBottom: "5px"}}
            className={classnames([Classes.BUTTON])} 
            iconName="minus"
            onClick={() => {
              anime({
                targets: appState.controls.zoom,
                percent: appState.controls.zoom.nextZoomOutPercent
              });
            }}></Button>


            <br></br>
            
            
            <Button
            style={{marginBottom: "5px"}} 
            className={classnames([Classes.BUTTON])} 
            iconName="home"
            onClick={() => {
              appState.controls.reset();
            }}></Button>
      </div>
    );
  }
}

export default ZoomPanel;