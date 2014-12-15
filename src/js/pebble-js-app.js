///////// Spaced repetition intervals

var intervalsInSeconds = [
    1,
    5,
    25, 
    120, // 2 minutes
]
var MAX_BUCKET = intervalsInSeconds.length-1;

    
///////// Configuration

// localStorage[SPREADSHEET_KEY] is the key for the Google spreadsheet containing the flashcards.
var SPREADSHEET_KEY = "SPREADSHEET_KEY";
if (localStorage[SPREADSHEET_KEY] === undefined) {
    // https://docs.google.com/spreadsheets/d/1N8aS2k7XNKiE3cMEQDvbVNl0VEv5KgRB_ZjavyQAthk/edit?usp=sharing
    localStorage[SPREADSHEET_KEY] =          "1N8aS2k7XNKiE3cMEQDvbVNl0VEv5KgRB_ZjavyQAthk";        
}

// The default flashcard set is a set of wine varietals.
// To create your own flashcard set:
// 1. Open the default flashcard spreadsheet by visiting
//        https://docs.google.com/spreadsheets/d/1N8aS2k7XNKiE3cMEQDvbVNl0VEv5KgRB_ZjavyQAthk/edit?usp=sharing
// 2. Make a copy of the spreadsheet using File / Make a Copy
// 3. IMPORTANT ==> Publish the spreadsheet using File / Publish
// 4. Edit the spreadsheet to change it to your own cards
// 5. Use the FlashWatch Settings page on your phone to set your new spreadsheet's key.


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
        nextTime: futureRandomTime(intervalsInSeconds[0])
    };
    reloadCardFromLocalStorage(card);
    return card;
}


///////// Time intervals

// The current time in the timeline of the flashcards.
// This isn't wallclock time.  It's just an artificial sequence that starts
// from 0, and allows us to do spaced repetition between cards.
// Every time we show the next card, we advance currentTime to the card's timestamp.
// Every time we schedule a card to be shown in the future, we do it relative to currentTime.
var currentTime = 15039;
if (localStorage["currentTime"] !== undefined) {
    currentTime = parseInt(localStorage["currentTime"]);
}
console.log("currentTime = " + currentTime)

function setCurrentTime(newTime) {
    currentTime = newTime;
    localStorage["currentTime"] = currentTime;
}

// return a future time, which is meanSecondsInFuture ahead of now, plus or minus up to 10% random amount 
function futureRandomTime(meanSecondsInFuture) {
    var randomPerturbationWidth = meanSecondsInFuture * 0.1;
    var perturb = (-1 + 2*Math.random()) * randomPerturbationWidth;
    return currentTime + meanSecondsInFuture + perturb;
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
    card.bucket = Math.max(0, Math.min(intervalsInSeconds.length-1, storedCard.bucket));
    card.nextTime = storedCard.nextTime;
    if (! (card.nextTime > currentTime)) {
        rescheduleCard(card);
    }
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
    
}

function rescheduleCard(card) {
    var afterInterval = futureRandomTime(intervalsInSeconds[card.bucket]);    
    card.nextTime = currentTime + afterInterval;
    sortCards(flashcards);
}

////////// Google spreadsheet connection


// Fetch the flashcard set from a Google spreadsheet identified by spreadsheetKey.
function fetchCards() {
  var spreadsheetKey = localStorage[SPREADSHEET_KEY];
  if (!spreadsheetKey) {
      console.log("no spreadsheet configured");
      return;
  }
    
  var response;
  var request = new XMLHttpRequest();
  request.open('GET', "https://spreadsheets.google.com/feeds/list/" +
                spreadsheetKey + "/default/public/values?alt=json", true);
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

          for (var i in flashcards) {
              var card = flashcards[i];
              console.log(JSON.stringify(card));//card.front + " / " + card.back + " / " + card.nextTime + " / " + card.bucket);
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
                            fetchCards();
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
    
    setCurrentTime(card.nextTime);
    console.log("currentTime = " + currentTime)    

    rescheduleCard(card);

    saveCardToLocalStorage(card);
    console.log("updated card: " + JSON.stringify(card));
}


////////// Configuration

var CONFIGURATION_URL = 'https://rawgit.com/rcmiller/FlashWatch/master/src/js/configure.html';


// Called when the user requests the configuration page on the phone
Pebble.addEventListener("showConfiguration",
                        function(e) {
                            console.log("show configuration " + localStorage[SPREADSHEET_KEY]);
                            Pebble.openURL(CONFIGURATION_URL + "?" + localStorage[SPREADSHEET_KEY]);
                        });


// Called when the user closes the configuration page on the phone
Pebble.addEventListener("webviewclosed",
                        function(e) {                            
                            console.log("configuration window returned " + e.response);
                            if (e.response) {
                                localStorage[SPREADSHEET_KEY] = e.response;
                                fetchCards();
                            }
                        });


