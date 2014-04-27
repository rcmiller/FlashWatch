var flashcards = [
    { front: "riesling", back: "sweet white, off-dry apricots peaches" },
    { front: "sancerre", back: "dry white, light herbal grassy" },
    { front: "pinot grigio", back: "dry white, light citrus lemon" },
    { front: "pinot blanc", back: "dry white, light grapefruit floral" },
    { front: "cotes du rhone", back: "fruity red, strawberry cherry, round" },
    { front: "cabernet sauvignon", back: "fruity red, black cherry raspberry, high tannin" },
    { front: "shiraz", back: "fruity red, blueberry blackberry, spicy" },
    { front: "chianti", back: "savory red, clay cured meats, high tannin" },
    { front: "pinot noir", back: "fruity red, strawberry cherry, round" },
    { front: "merlot", back: "fruity red, black cherry raspberry, round" }
];


function pickAnyCard(cards) {
    var i = Math.floor(Math.random() * cards.length);
    return cards[i];    
}

function sendCard(card) {
    Pebble.sendAppMessage({
        "front": card.front,
         "back": card.back,
         "result": 0,
    });
}

Pebble.addEventListener("ready",
                        function(e) {
                            console.log("ready: " + e.ready);
                            sendCard(pickAnyCard(flashcards));
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                            console.log("appmessage: type=" + e.type 
                                        + ", front=" + e.payload.front
                                        + ", back=" + e.payload.back
                                        + ", result=" + e.payload.result
                                        );
                            sendCard(pickAnyCard(flashcards));
                        });

 