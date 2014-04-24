Pebble.addEventListener("ready",
                        function(e) {
                            console.log("ready: " + e.ready); 
                            Pebble.sendAppMessage({
                                "front": "riesling",
                                "back": "off-dry white",
                                "result": 0,
                            });
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                            console.log("appmessage: type=" + e.type 
                                        + ", front=" + e.payload.front
                                        + ", back=" + e.payload.back
                                        + ", result=" + e.payload.result
                                        );
                            Pebble.sendAppMessage({
                                "front": "sancerre",
                                "back": "dry white",
                                "result": 0,
                            });
                        });

 