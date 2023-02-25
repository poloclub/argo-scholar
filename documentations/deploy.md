# Deploying Argo Scholar

Deploying your own custom version of Argo Scholar is easy (for sharing private/proprietary data or with custom algorithms).

## Front-end

As mentioned in the [Development Guide](development.md), Argo Scholar's frontend uses the [Create React App](https://github.com/facebook/create-react-app) toolchain. It comes with the `gh-pages` tool for deploying to Github Pages, as well as a Travis CI config. You can refer the documentation of either of them (`gh-pages` for manual deployment and Travis CI for automatic deployment). Other tools such as `now.sh` will also work.

There are many useful frontend configuration options in `argo-scholar/src/constants/index.js`. You can change the backend and sample networks linked there.

## Back-end Sharing Service

Argo Scholar uses [Strapi](https://strapi.io/) for the backend service.

To securely set up Strapi, we recommend following their official documentation.

There are many options for setting up Strapi, here is an easy workflow that we recommend:

- Step 1: Install [Strapi](https://strapi.io/) using their quick start guide
- Step 2: Copy `/api` from [this repository](https://github.com/poloclub/argo-graph-share) as a reference of the `snapshot` content type that we have set up.
- Step 3: Follow the [Deployment guide of Strapi](https://strapi.io/documentation/v3.x/getting-started/deployment.html). Among the list of supported hosting providers, Heroku is an easy start (and they have a free tier).

You can use the [Roles and Permissions](https://strapi.io/documentation/v3.x/plugins/users-permissions.html) feature (available in the admin dashboard by default) to set up your own access control. This allows you to set up access control without writing any code.


## CORS Anywhere

Argo is using a modified version of CORS Anywhere to serve as a CORS reverse-proxy. To learn more about the newest version of CORS Anywhere, please refer to the [CORS Anywhere GitHub repository](https://github.com/Rob--W/cors-anywhere).

#### License

Copyright (C) 2013 - 2021 Rob Wu <rob@robwu.nl>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
