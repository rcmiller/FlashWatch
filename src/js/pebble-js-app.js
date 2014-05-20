var intervalsInSeconds = [
    1,
    5,
    25, 
    120, // 2 minutes
    600, // 10 minutes    
]
var MAX_BUCKET = intervalsInSeconds.length-1;

function makeCard(front, back) {
    return {
        front: front,
        back: back,
        numRight: 0,
        numWrong: 0,
        bucket: 0,
        nextTime: perturbInterval(intervalsInSeconds[0])
    };
}

var SPREADSHEET_KEY = "1oqSDgRxPEskr2v2G0HlArZjAzwmHCjF4FuaXNUZsWhc";

var flashcards = [
    makeCard("riesling", "sweet white, off-dry apricots peaches"),
    makeCard("sancerre", "dry white, light herbal grassy"),
    makeCard("pinot grigio", "dry white, light citrus lemon"),
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

function answered(card, wasRight) {
    if (wasRight) {
        ++card.numRight;
        card.bucket = Math.min(card.bucket+1, MAX_BUCKET); 
    } else {
        ++card.numWrong;
        card.bucket = Math.max(card.bucket-1, 0);
    }
    var interval = intervalsInSeconds[card.bucket];
    card.nextTime += perturbInterval(interval);
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

function perturbInterval(nSeconds) {
    var randomPerturbationWidth = nSeconds * 0.1;
    var perturb = (-1 + 2*Math.random()) * randomPerturbationWidth;
    var result = nSeconds + perturb;
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

function fetchCards() {
  var response;
  var request = new XMLHttpRequest();
  request.open('GET', "https://spreadsheets.google.com/feeds/list/" +
                SPREADSHEET_KEY + "/od6/public/values?alt=json", true);
  request.onload = function(e) {
      try {
          if(request.status != 200) {
              console.log("error: spreadsheet data fetched returned " + request.status);
              return;
          }
          response = JSON.parse(request.responseText);
          var entries = response.feed.entry;
          flashcards = [];
          for (var i in entries) {
              var entry = entries[i];
              var card = makeCard(entry.gsx$front.$t, entry.gsx$back.$t);
              flashcards.push(card);
          }
          reschedule(flashcards);
          sendCard(nextCard());
      } catch (err) {
          console.log("error: spreadsheet data parse threw an exception")
          console.log(err);
      }
  }
  request.onerror = function(e) {
      console.log("error: spreadsheet data fetched returned " + request.status);
  }
  request.send(null);
    console.log("sent request for cards");
}

Pebble.addEventListener("ready",
                        function(e) {
                            console.log("ready: " + e.ready);
                            fetchCards();
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                            console.log("appmessage: type=" + e.type 
                                        + ", front=" + e.payload.front
                                        + ", back=" + e.payload.back
                                        + ", result=" + e.payload.result
                                        );
                            var card = findCard(e.payload.front, e.payload.back);
                            var wasRight = (e.payload.result == 1);
                            //wasRight = false; // only for testing
                            if (card) {
                                answered(card, wasRight);
                            }
                            sendCard(nextCard());
                        });
