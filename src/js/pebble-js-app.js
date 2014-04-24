Pebble.addEventListener("ready",
                        function(e) {
                          console.log("connect!" + e.ready);
                          console.log(e.type);
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                          console.log("message!");
                          console.log(e.type);
                        });

 