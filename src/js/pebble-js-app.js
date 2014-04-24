Pebble.addEventListener("ready",
                        function(e) {
                            console.log("ready: " + e.ready);
                          console.log(e.type);
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                            console.log("appmessage: type=" + e.type 
                                        + ", front=" + e.payload.front
                                        + ", back=" + e.payload.back
                                        );
                            Pebble.sendAppMessage({
                                "front": "sancerre",
                                 "back": "dry white"
                            });
                        });

 