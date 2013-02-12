sharedtapes
========

Collaborative real-time playlist creation and sharing application based on node.js, Backbone.js and web standards.

This will be the public repo of this project - if you want to use the application, you'll have to supply your own Soundcloud and Bandcamp API keys.

See it in action at http://mixtapes.drewbharris.com

install
--------

git clone

npm install

npm start


todo
--------

Use AMD and/or require.js and/or browserify to properly modularize the front-end code.  Currently, the different 
Backbone bits - models, views and collections - are loaded in the correct sequence, while the app.js currently
just contains the event handling between views, bootstrapping, and the router definition.

There's still more cleanup to be done - this was written first to be functional.

technology
--------

node.js backend (based on Express 3.x)

LevelDB (key-value store, scalable to amazon's DynamoDB)

socket.io (backwards-compatible WebSocket implementation for real-time collaboration)

Backbone.js frontend

Soundmanager2 HTML5+Flash backwards compatible audio solution

Standards-compliant CSS and JS and such (bear with me, this is my first attempt at frontend)
