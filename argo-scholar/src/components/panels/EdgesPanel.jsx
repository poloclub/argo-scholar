import React from "react";
import { observer } from "mobx-react";
import appState from "../../stores";
import { Button, Checkbox, Classes, Slider } from "@blueprintjs/core";
import { SketchPicker } from "react-color";
import { Popover2, Select } from "@blueprintjs/labs";
import classnames from "classnames";
import Collapsable from "../utils/Collapsable";
import SimpleSelect from "../utils/SimpleSelect";
import mouse from "../../graph-frontend/src/select";

@observer
class EdgesPanel extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
          timeOutRef: null,
        //   sizeOptionOpen: false,
          colorOptionOpen:false,
          directionOptionOpen:false,
        //   colorOptionOpen:false,
        //   thicknessOptionOpen: false,
        };
      }

    render() {
        let graph = appState.graph.graph;
        return (
            <div>
                <p>{`Modifying All Edges`}</p>


                {/* Collapsable Option: Color */}
                <Collapsable
                    name="Color"
                    isOpen={this.state.colorOptionOpen}
                    onToggle={() =>
                        this.setState({
                        colorOptionOpen: !this.state.colorOptionOpen
                        })
                    }
                    >
                    <div className={classnames(Classes.CARD, "sub-option")}>
                        <div> 
                            <p style={{display: "inline"}}>Select Edge Color: </p>
                            <span style={{float:"right"}}>
                                <Popover2 
                                placement="bottom"
                                modifiers={{
                                    preventOverflow: {
                                      enabled: false,
                                    },
                                  }}>
                                    <Button
                                    text="  "
                                    style={{
                                        backgroundImage: "inherit",
                                        backgroundColor: appState.graph.edges.color
                                    }}
                                    />
                                    <SketchPicker
                                    color={appState.graph.edges.color}
                                    onChange={(it) => {
                                        appState.graph.process.graph.forEachNode(n => {
                                             
                                             let red = new THREE.Color(appState.graph.edges.color).r;
                                             let blue = new THREE.Color(appState.graph.edges.color).g;
                                             let green = new THREE.Color(appState.graph.edges.color).b;
                                             n.renderData.linecolor.r = red;
                                             n.renderData.linecolor.g = blue;
                                             n.renderData.linecolor.b = green;
                                           });
                                        (appState.graph.edges.color = it.hex);
                                        /**update edge color in real time*/
                                        appState.graph.process.onHover(); 
                                    }}
                                    />
                                </Popover2>
                            </span>
                            </div>
                        
                    </div>
                </Collapsable>
            
                <Collapsable
                    name="Direction"
                    isOpen={this.state.directionOptionOpen}
                    onToggle={() =>
                        this.setState({
                        directionOptionOpen: !this.state.directionOptionOpen
                        })
                    }
                    >
                    <div className={classnames(Classes.CARD, "sub-option")}>
                        <div> 
                            <p style={{display: "inline"}}>Show Edge Direction: </p>
                            <span style={{float:"right"}}>
                            <label class=".pt-large">
                            <input 
                                 type="checkbox"
                                 onChange={it => {
                                     appState.graph.directedOrNot = !appState.graph.directedOrNot;
                                 }
                                 }
                               checked={appState.graph.directedOrNot}/>
                            </label>
                            </span>
                        </div>
                        {appState.graph.directedOrNot && 
                        <div>
                            <br/>
                            <p style={{display: "inline"}}>Arrow Size: </p>
                            <Slider
                                min={0.5}
                                max={4}
                                stepSize={0.01}
                                onChange={value => {
                                    appState.graph.arrowSize = value;
                                }}
                                value={appState.graph.arrowSize}
                            />
                        </div>
                    }
                    </div>

                    

                </Collapsable>

            </div>
        );
    }
}

export default EdgesPanel;