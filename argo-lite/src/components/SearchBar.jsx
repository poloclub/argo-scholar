import React from "react";
import appState from "../stores/index";

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        query: null, 
        id: null
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
    
  handleChange(event) {
    this.setState({query: event.target.value});
  }
  
  handleSubmit(event) {
  
    console.log('A CorpusID was submitted: ' + this.state.query);
    const corpusIDregex = /^[0-9]+$/;
    if (corpusIDregex.test(this.state.query)) {
        let apiurl = "https://api.semanticscholar.org/v1/paper/CorpusID:" + this.state.query;
        var apiresponse;

        fetch(apiurl)
          .then((res) => {
            if (res.ok) {
              return res.json();
            } else {
              throw "error";
            }
          })
          .then((response) => {
            apiresponse = response;
            this.state.id = response.paperId;
            alert(this.state.id)
          })
          .catch((error) => {
            alert("Not a valid CorpusID. Please try again v1.");
          });
    } else {
        alert("Not a valid CorpusID. Please try again.");
    }
    event.preventDefault();
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          CorpusID:
          <input 
            type="text" 
            value={this.state.query} 
            onChange={this.handleChange} 
            placeholder="Input CorpusID here" 
        />
        </label>
        <input type="submit" value="Submit" />
      </form>
    );
  }
}

export default SearchBar;