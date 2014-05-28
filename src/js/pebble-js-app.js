///////// Spaced repetition intervals

var intervalsInSeconds = [
    1,
    5,
    25, 
    120, // 2 minutes
    600, // 10 minutes
    3600, // 1 hour    
]
var MAX_BUCKET = intervalsInSeconds.length-1;

    
///////// Flashcard datatype

// Make a flashcard, where front and back are strings.
// A card is uniquely identified by its front/back pair.
function makeCard(front, back) {
    //console.log("making card front=" + front + ", back=" + back);
    var card = {
        front: front,
        back: back,
        numRight: 0,
        numWrong: 0,
        bucket: 0,
        nextTime: perturbInterval(intervalsInSeconds[0])
    };
    reloadCardFromLocalStorage(card);
    return card;
}

// return nSeconds +/- 10%
function perturbInterval(nSeconds) {
    var randomPerturbationWidth = nSeconds * 0.1;
    var perturb = (-1 + 2*Math.random()) * randomPerturbationWidth;
    var result = nSeconds + perturb;
    return result;
}

    
///////// Storing and retrieving cards from localStorage on the phone

// Given a flashcard, find its front/back pair in localStorage and set all its  
// properties from the saved card.
// If the card was never saved to local storage, this method does nothing. 
function reloadCardFromLocalStorage(card) {
    var key = localStorageCardKey(card);
    var json = localStorage[key];
    if (!json) {
        console.log("can't find " + key + " in localStorage");
        return;
    }
    var storedCard = JSON.parse(json);
    card.numRight = storedCard.numRight;
    card.numWrong = storedCard.numWrong;
    card.bucket = storedCard.bucket;
    card.nextTime = storedCard.nextTime;
    //console.log("reloaded card " + json);
}

function saveCardToLocalStorage(card) {
    var key = localStorageCardKey(card);
    var json = JSON.stringify(card);
    localStorage[key] = json;
    //console.log("stored card " + json);
}

function localStorageCardKey(card) {
    return card.front + "|" + card.back;
}


////////// The set of flashcards

// the set of flashcards that the app will choose from.
// If the phone has access to the network, then these hardcoded cards 
// will be thrown away and replaced by the content of the spreadsheet.
var flashcards = [
    makeCard("riesling", "sweet white, off-dry apricots peaches"),
    makeCard("sancerre", "dry white, light herbal grassy"),
    makeCard("pinot grigio", "dry white, light citrus lemon"),
];

// ensure that the flashcard set is sorted by time
sortCards(flashcards);

// find a card object in the flashcards set, given its front/back pair
function findCard(front, back) {
    for (var i in flashcards) {
        var card = flashcards[i];
        if (card.front == front && card.back == back) return card;
    }
    return null;
}

// sort the flashcards in increasing order of next presentation time
function sortCards(flashcards) {
    flashcards.sort(function(a,b) {
        return a.nextTime - b.nextTime;
    });
    /*
    for (var i in flashcards) {
        var card = flashcards[i];
        console.log(card.front + " / " + card.back + " / " + card.nextTime);
    }
    */
}

function rescheduleCard(card, afterInterval) {
    var lowestCard = flashcards[0];
    if (lowestCard == card) {
        lowestCard = flashcards[1];
    }
    card.nextTime = lowestCard.nextTime + afterInterval;
    sortCards(flashcards);
}

////////// Google spreadsheet connection

// Key of a publicly-readable spreadsheet.
// (You'll find the key in the URL of the spreadsheet.) 
var SPREADSHEET_KEY = "1oqSDgRxPEskr2v2G0HlArZjAzwmHCjF4FuaXNUZsWhc";

// Fetch the flashcard set from a Google spreadsheet identified by spreadsheetKey.
function fetchCards(spreadsheetKey) {
  var response;
  var request = new XMLHttpRequest();
  request.open('GET', "https://spreadsheets.google.com/feeds/list/" +
                spreadsheetKey + "/od6/public/values?alt=json", true);
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
          sortCards(flashcards);
          sendNextCards();
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



////////// Communication to the watch app

// Called when the watch app is ready
Pebble.addEventListener("ready",
                        function(e) {
                            console.log("ready: " + e.ready);
                            fetchCards(SPREADSHEET_KEY);
                        });

// Called when the watch app sends a message to the phone
Pebble.addEventListener("appmessage",
                        function(e) {
                            console.log("appmessage: type=" + e.type 
                                        + ", front=" + e.payload.front
                                        + ", back=" + e.payload.back
                                        + ", result=" + e.payload.result
                                        );
                            var card = findCard(e.payload.front, e.payload.back);
                            var wasRight = (e.payload.result == 1);
                            if (card) {
                                answered(card, wasRight);
                            }
                            sendNextCards();
                        });

// Send next two cards to the watch for display
function sendNextCards() {
    Pebble.sendAppMessage({
        "front": flashcards[0].front,
         "back": flashcards[0].back,
        "nextFront": flashcards[1].front,
         "nextBack": flashcards[1].back,
    });
}

// Called after user sees a card and responds to it
function answered(card, wasRight) {
    if (wasRight) {
        ++card.numRight;
        card.bucket = Math.min(card.bucket+1, MAX_BUCKET); 
    } else {
        ++card.numWrong;
        card.bucket = Math.max(card.bucket-1, 0);
    }
    
    var interval = perturbInterval(intervalsInSeconds[card.bucket]);
    rescheduleCard(card, interval);

    saveCardToLocalStorage(card);    
}
