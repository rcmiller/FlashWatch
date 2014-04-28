function makeCard(front, back) {
    return {
        front: front,
        back: back,
        numRight: 0,
        numWrong: 0,
        nextTime: futureTime(0, 5)
    };
}

var intervalsInSeconds = [
    1,
    5,
    25, 
    120, // 2 minutes
    600, // 10 minutes    
]
var flashcards = [
    makeCard("riesling", "sweet white, off-dry apricots peaches"),
    makeCard("sancerre", "dry white, light herbal grassy"),
    makeCard("pinot grigio", "dry white, light citrus lemon"),
    makeCard("pinot blanc", "dry white, light grapefruit floral"),
    makeCard("cotes du rhone", "fruity red, strawberry cherry, round"),
    makeCard("cabernet sauvignon", "fruity red, black cherry raspberry, high tannin"),
    makeCard("shiraz", "fruity red, blueberry blackberry, spicy"),
    makeCard("chianti", "savory red, clay cured meats, high tannin"),
    makeCard("pinot noir", "fruity red, strawberry cherry, round"),
    makeCard("merlot", "fruity red, black cherry raspberry, round"),
];
reschedule(flashcards);

function findCard(front, back) {
    for (var i in flashcards) {
        var card = flashcards[i];
        if (card.front == front && card.back == back) return card;
    }
    return null;
}

function nextCard() {
    return flashcards[0];
}

function promote(card) {
    ++card.numRight;
    var interval = intervalsInSeconds[Math.min(card.numRight, intervalsInSeconds.length-1)];
    card.nextTime = futureTime(interval, interval*0.1);
    reschedule(flashcards);
}

function reschedule(flashcards) {
    flashcards.sort(function(a,b) {
        return a.nextTime - b.nextTime;
    });
    for (var i in flashcards) {
        var card = flashcards[i];
        console.log(card.front + " / " + card.back + " / " + card.nextTime);
    }    
}

function futureTime(nSecondsFromNow, randomPerturbationWidth) {
    var now = new Date().getTime();
    var perturb = (-1 + 2*Math.random()) * randomPerturbationWidth;
    var result = now + nSecondsFromNow + perturb;
    console.log(result);
    return result;
}

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
                            sendCard(nextCard());
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                            console.log("appmessage: type=" + e.type 
                                        + ", front=" + e.payload.front
                                        + ", back=" + e.payload.back
                                        + ", result=" + e.payload.result
                                        );
                            var card = findCard(e.payload.front, e.payload.back);
                            if (card) {
                                promote(card);
                            }
                            sendCard(nextCard());
                        });
