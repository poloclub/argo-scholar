# Argo Scholar

An interactive literature exploration visualization system that runs in your web browsers. No installation needed.

[**Live Demo** - Launch Argo Scholar in your browser](https://poloclub.github.io/argo-scholar/)

<img src="img/argoscholar_README_Logo2.png" width=60% alt="Argo Scholar logo">

## Documentations

- [Quick Start (Visualization, Saving and Sharing Snapshots)](quickstart.md)
- [Tutorial - Visualizing a citation graph of Apolo (Initial Graph, Incremental Exploration, Saving Progress)](tutorial.md)
- [Develop Argo Scholar](development.md)
- [Deploy Argo Scholar (and custom sharing service with access)](deploy.md)

## Feature Highlights

### Interactive Graph Visualization

Visualize your graph with interactive force-directed layout, automatic sizing and coloring by pagerank, and full control over every node for customization!

![Argo Scholar visualization with force directed layout](img/video-layout.gif)

![Argo Scholar visualization graph options](img/video-graph-options.gif)

### Incremental Exploration

Argo Scholar empowers you to incrementally explore paper networks. Start by adding several papers of interest and add their citation or reference nodes to expand your visualization!

![Argo Scholar incremental exploration](img/video-incremental.gif)

### Save and Publish via URLs

You can publish your "graph snapshot" as a URL link. Anyone with the link will be able to access and continue their exploration from this snapshot. You can still save the snapshot locally as a file if you prefer.

If you are working on sensitive or proprietary data, and prefer to set up a private sharing server with access control, please refer to [Deploying Argo Scholar and Sharing backend service](deploy.md)

![Argo Scholar sharing graph as link](img/video-share.gif)

You will be able to load the snapshot from your saved file or from the shared link to work on them again. Note that each snapshot associated with a link is immutable, so if you modify a shared graph, you need to share again to get a new link. The original link will still point to the graph before your modification.

### Embed into Web Pages

Argo Scholar allows you to embed your interactive graph visualization snapshots into iframe-based web widgets! You can embed them into web articles, blog posts and even interactive notebooks such as Jupyter Notebooks. Tell a story with your graph!

<img src="/img/img-embedded.png" width=60% alt="Argo Scholar embedded widget mode">

---

♥ Developed and maintained by [Polo Club of Data Science](https://poloclub.github.io/). [MIT License](LICENSE).
