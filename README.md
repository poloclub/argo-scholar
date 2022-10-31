# Argo Scholar

[![Build Status](https://app.travis-ci.com/poloclub/argo-scholar.svg?branch=main)](https://app.travis-ci.com/poloclub/argo-scholar)
[![arxiv badge](https://img.shields.io/badge/arXiv-2110.14060-red)](https://arxiv.org/abs/2110.14060)
[![GitHub](https://img.shields.io/github/license/poloclub/argo-scholar?color=blue)](https://github.com/poloclub/argo-scholar/blob/main/LICENSE)

An interactive literature exploration visualization system that runs in your web browsers. No installation needed.



<img src="img/readme-logo.png" width=100% alt="Argo Scholar logo">

[**Live Demo** - Launch Argo Scholar in your browser](https://poloclub.github.io/argo-scholar/)
## Documentations 

- [Quick Start (Visualization, Saving and Sharing Snapshots)](quickstart.md)
- [Tutorial - Visualizing a citation network of Apolo (Initialize Network, Incremental Exploration, Saving Progress)](tutorial.md)
- [Develop Argo Scholar](development.md)
- [Deploy Argo Scholar (and custom sharing service with access)](deploy.md)

## Feature Highlights

### Interactive Literature Network Visualization

Visualize your literature network with interactive force-directed layout, automatic sizing and coloring by pagerank, and full control over every node for customization!

![Argo Scholar visualization with force directed layout](img/video-layout.gif)

![Argo Scholar visualization options](img/video-graph-options.gif)

### Incremental Exploration

Argo Scholar empowers you to incrementally explore paper networks. Start by adding several papers of interest and add their citation or reference nodes to expand your visualization!

![Argo Scholar incremental exploration](img/video-incremental.gif)

### Save and Publish via URLs

You can publish your "graph snapshot" as a URL link. Anyone with the link will be able to access and continue their exploration from this snapshot. You can still save the snapshot locally as a file if you prefer.

If you are working on sensitive or proprietary data, and prefer to set up a private sharing server with access control, please refer to [Deploying Argo Scholar and Sharing backend service](deploy.md)

![Argo Scholar sharing graph as link](img/video-share.gif)

You will be able to load the snapshot from your saved file or from the shared link to work on them again. Note that each snapshot associated with a link is immutable, so if you modify a shared literature network, you need to share again to get a new link. The original link will still point to the network before your modification.

### Embed into Web Pages

Argo Scholar allows you to embed your interactive literature exploration visualization snapshots into iframe-based web widgets! You can embed them into web articles, blog posts and even interactive notebooks such as Jupyter Notebooks. Tell a story with your network!

<img src="/img/img-embedded.png" width=60% alt="Argo Scholar embedded widget mode">

## Credits
♥ Argo Scholar was developed and maintained by [Kevin Li](https://github.com/kevinli573), [Alex Yang](https://github.com/AlexanderHYang), [Anish Upadhayay](https://github.com/aupadhayay3), [Zhiyan Zhou](https://github.com/FZ2000), [Jon Saad-Falcon](https://github.com/jonsaadfalcon), [Duen Horng Chau](https://github.com/polochau) from [Polo Club of Data Science](https://poloclub.github.io/) at Georgia Tech.
## Citation
```bibTeX
@inproceedings{li2022argoscholar, 
  author = {Li, Kevin and Yang, Haoyang and Montoya, Evan and Upadhayay, Anish and Zhou, Zhiyan and Saad-Falcon, Jon and Chau, Duen Horng},
  title = {Visual Exploration of Literature with Argo Scholar},
  year = {2022},
  isbn = {9781450392365},
  publisher = {Association for Computing Machinery},
  url = {https://doi.org/10.1145/3511808.3557177},
  doi = {10.1145/3511808.3557177}
}
```

## License
Argo Scholar is available under the  [MIT License](LICENSE).
Argo Scholar uses the Semantic Scholar Open Research Corpus API, which is licensed under [ODC-BY](https://opendatacommons.org/licenses/by/1.0/).
More can be found here: [*Waleed Ammar et al. 2018. Construction of the Literature Graph in Semantic Scholar. NAACL*](https://www.semanticscholar.org/paper/09e3cf5704bcb16e6657f6ceed70e93373a54618)

## Contact
If you have any questions or would like to learn more about the project, feel free to contact [Kevin Li](mailto:kevin.li@gatech.edu) or [Alex Yang](https://alexanderyang.me).

