import React from "react";
import appState from "../stores/index";
import classnames from "classnames";
import {
  requestCreateEmptyPaperGraph,
  requestCreateNewProject
} from "../ipc/client";
import {
  Button,
  Classes,
  Card,
  Icon,
  Dialog,
  Intent,
} from "@blueprintjs/core";
import { observer } from "mobx-react";

@observer
class NewNetworkDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
    };
  }

  createEmptyGraph(event) {
    appState.graph.runActiveLayout();
    requestCreateNewProject({
      name: appState.project.newProjectName,
      createdDate: new Date().toLocaleString(),
    });
    requestCreateEmptyPaperGraph(
      appState.project.newProjectName
    );

    // Importing a graph means no label would be shown by default,
    // thus turn off label CSSRenderer for better performance.
    appState.graph.frame.turnOffLabelCSSRenderer();
    event.preventDefault();
    appState.graph.selectedNodes.length = 0;
    appState.graph.currentlyHovered = null;
  }

  render() {
    return (
      <Dialog
        className={classnames({
          [Classes.DARK]: appState.preferences.darkMode
        })}
        iconName="map-create"
        isOpen={appState.project.isNewNetworkDialogOpen}
        onClose={() => {
          appState.project.isNewNetworkDialogOpen = false;
        }}
        title={'Create New Graph'}
      >
        <div className={classnames(Classes.DIALOG_BODY)}>
          <div className="pt-callout pt-icon-issue">
            <p>Creating a new graph will remove all your current papers. This process cannot be undone. Are you sure?</p>
          </div>
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
              // className={classnames({
              //   [Classes.DISABLED]: !this.state.name
              // })}
              intent={Intent.PRIMARY}
              onClick={() => appState.project.isNewNetworkDialogOpen = false}
              text="Cancel"
            />

            <Button
              // className={classnames({
              //   [Classes.DISABLED]: !this.state.name
              // })}
              intent={Intent.NONE}
              onClick={(event) => {
                this.createEmptyGraph(event);
                appState.project.isNewNetworkDialogOpen = false;
              }}
              text="Create"
            />
          </div>
        </div>
      </Dialog>
    );
  }
}

export default NewNetworkDialog;