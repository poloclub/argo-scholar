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
import ReactPaginate from 'react-paginate';
import { timeThursdays } from "d3";
// import { data } from "jquery";

const pageCount = 10;
const apiKeywordPrefix = "https://api.semanticscholar.org/graph/v1/paper/search?query=";

@observer
class PaperResultsCards extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        data: this.props.papers,
        query: this.props.query,
        page: null
    }
  }

  handleClick(paperId) {
    let citationAPI = "https://api.semanticscholar.org/v1/paper/" + paperId;
    console.log("call this " + citationAPI);
    fetch(citationAPI)
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw "error";
        }
      })
      .then((response) => {
        appState.graph.addNodetoGraph(response, "null", 0);
        // console.log("add node curcount: ", offset);
        appState.graph.process.graph.getNode(response.paperId).renderData.textHolder.children[0].element.override = true;
        appState.graph.frame.updateNodesShowingLabels();
        appState.graph.selectedNodes = [];
        appState.graph.frame.selection = [];
      });
  }

  handlePageChange = (event) => {
    this.state.page = event.selected;
    console.log("query: " + this.state.query)
    
    if (this.state.query) {
      // console.log("12-2")
      var keywordQuery = this.state.query; 
      // keywordQuery = keywordQuery.trim().replace(/  +/g, ' ').replace(/ /g, '+');
      let apiurl = apiKeywordPrefix + keywordQuery + "&offset=" + 10 * event.selected;
      console.log(apiurl)
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
            console.log(response);
            this.setState({data: searches});
            // console.log("addpapersdialog: " + this.state.searchResults);
          })
    }
    
    // console.log(apiurl);
  };
  
  componentDidUpdate(prevProps) {
    if (prevProps.query !== this.props.query) {
      this.setState( {data: this.props.papers, query: this.props.query, page: 0} )
    }
  }

  render() {    
    console.log("in paperresultscard component");
    let cards = [];
    this.state.data.forEach(paper=> {
      // console.log("paper: " + {paper});
      // cards.push(<p>{paper}</p>);
      cards.push(<tr id={paper.paperId}>
          <td class="search-result">{paper.title}</td>
          <td class="search-add"><button disabled={(paper.paperId in appState.graph.preprocessedRawGraph.nodesPanelData)} onClick={() => this.handleClick(paper.paperId)}>Add</button></td>
          </tr>)
    })
    return (
        <div>
          <table>
            <tbody>
              {cards}
            </tbody>
          </table>
          <div style={{display: this.props.query ? 'block' : 'none' }}>  
            <ReactPaginate
              pageCount={pageCount}
              marginPagesDisplayed={pageCount}
              containerClassName={"paginate-containerClassName"}
              pageClassName={"paginate-pageClassName"}
              previousLabel={null}
              nextLabel={null}
              activeClassName={"paginate-activeClassName"}
              initialPage={0}
              onPageChange={this.handlePageChange}
              forcePage={this.state.page}
              prevRel={null}
            />
          </div>
          
        </div>
    );
  }
}

export default PaperResultsCards;