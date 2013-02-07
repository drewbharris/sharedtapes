var request = require('superagent'),
    app = require('./lib/app');

app.start(12370, function(){
    console.log('listening on 12370');
});
