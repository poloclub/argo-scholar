const fetch = require('node-fetch');
const jsdom = require("jsdom"); // jsdom documentation https://www.npmjs.com/package/jsdom

// paper ID for testing: https://www.semanticscholar.org/paper/Keeping-the-Bad-Guys-Out%3A-Protecting-and-Deep-with-Das-Shanbhogue/8ab5d59c6534039e6854cdb60a8519e0e96bde03?sort=pub-date&page=1
//Paper 1: ab5d59c6534039e6854cdb60a8519e0e96bde03 (26 references)
//Paper 2: 00fb1b1125238b65fa9f346745ad3d1cbc19f0df (86 references including ones not in corpus)
//Paper 3: ba0644aa7569f33194090ade9f8f91fa51968b18 (129 references)

const paperId = '42936c2f2f5c8f4152494b94609fb33ec6264b8b';
const pageOf100ReferencesSortedByRelevance =
  'https://www.semanticscholar.org/paper/' +
  paperId +
  '?sort=relevance' +  // sort options for citations: relevance, is-influential, total-citations, pub-date
  '&page=1' + // page number of citations, each page showing 10 citations (as of Aug 4, 2021, cannot show more than 10 citations per page)
  '&citedPapersSort=relevance' + // sort options for references: relevance, is-influential, year
  '&citedPapersLimit=100&citedPapersOffset=0'; // show first 100 references (100 is largest possible, starting at reference 0)


const paperIdAttribute = 'data-paper-id';
const citationsDiv = 'div#citing-papers div[' + paperIdAttribute + ']';
const referencesDiv = 'div#references div[' + paperIdAttribute + ']';


/**
 * 
 * @param {jsdom.JSDOM} dom 
 * @param {string} elementPath 
 * @param {string} attributeName 
 * @returns 
 */
function getAllAttributeValuesInElement(dom, elementPath, attributeName) {
  return Array.from(
    dom.window.document.querySelectorAll(elementPath),
    element => element.getAttribute(attributeName));

}

fetch(pageOf100ReferencesSortedByRelevance)
  .then(response => response.text()) // API call successful
  .then(function (html) {
    // convert html to DOM
    const dom = new jsdom.JSDOM(html);

    console.log("=== Citations (first 10) ===");
    const citationsPaperIds = getAllAttributeValuesInElement(dom, citationsDiv, paperIdAttribute);
    console.log("Citations Size: " + citationsPaperIds.length)
    citationsPaperIds.forEach(paperId => console.log(paperId));


    console.log("=== References (first 100) ===");
    const referencesPaperIds = getAllAttributeValuesInElement(dom, referencesDiv, paperIdAttribute);
    console.log("Refereces Size: " + referencesPaperIds.length)
    referencesPaperIds.forEach(paperId => console.log(paperId));


  }).catch(function (err) {
    console.warn('Error when retrieving' + pageOf100ReferencesSortedByRelevance, err);
  });

