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
const apiCorpusPrefix = "https://api.semanticscholar.org/v1/paper/CorpusID:";
const apiKeywordPrefix = "https://api.semanticscholar.org/graph/v1/paper/search?query=";
const corpusIDregex = /^[0-9]+$/; 

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
    console.log("Adding selected paper");
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
    let apiurl; 
    if (corpusIDregex.test(this.state.query)) {
      apiurl = apiCorpusPrefix + this.state.query;
    } else {
      var keywordQuery = this.state.query; 
      // keywordQuery = keywordQuery.trim().replace(/  +/g, ' ').replace(/ /g, '+');
      apiurl = apiKeywordPrefix + keywordQuery + "&offset=" + 10 * event.selected;
    }
    // console.log(apiurl)
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
          this.setState({data: searches});
          // console.log("addpapersdialog: " + this.state.searchResults);
        })
    // console.log(apiurl);
  };
  
  componentDidUpdate(prevProps) {
    if (prevProps.papers !== this.props.papers) {
      this.setState( {data: this.props.papers, query: this.props.query, page: 0} )
      // console.log("updated:")
      // console.log(this.props.papers)
    }
  }

  render() {    
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
          <div style={{display: corpusIDregex.test(this.state.query) ? 'none' : 'block' }}>  
            <ReactPaginate
              pageCount={pageCount}
              marginPagesDisplayed={pageCount}
              containerClassName={"paginate-containerClassName"}
              pageClassName={"paginate-pageClassName"}
              previousLabel={null}
              nextLabel={null}
              activeClassName={"paginate-activeClassName"}
              // initialPage={this.state.page}
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