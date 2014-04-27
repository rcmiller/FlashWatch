#include <pebble.h>

// forward declarations
void connection_send_result();
    
    
//// UI elements 
Window *window = NULL;
TextLayer *front_layer = NULL;
TextLayer *back_layer = NULL;


//// Flashcard data representation

typedef struct {
  const char * front;
  const char * back;
} FlashCard;

FlashCard theCard = { "starting", "initial" };



//// Some hard-coded cards

FlashCard cards[] = {
  { "riesling", "sweet white, off-dry apricots peaches" },
  { "sancerre", "dry white, light herbal grassy" },
  { "pinot grigio", "dry white, light citrus lemon" },
  { "pinot blanc", "dry white, light grapefruit floral" },
  { "cotes du rhone", "fruity red, strawberry cherry, round" },
  { "cabernet sauvignon", "fruity red, black cherry raspberry, high tannin" },
  { "shiraz", "fruity red, blueberry blackberry, spicy" },
  { "chianti", "savory red, clay cured meats, high tannin" },
  { "pinot noir", "fruity red, strawberry cherry, round" },
  { "merlot", "fruity red, black cherry raspberry, round" }
};
int num_cards = sizeof(cards) / sizeof(cards[0]);


FlashCard* pick_any_card() {
    // pick a card to show
    return &cards[rand() % num_cards];
}


//// Displaying text on screen

char* fonts[] = {
  FONT_KEY_BITHAM_42_BOLD,
  FONT_KEY_BITHAM_30_BLACK,
  FONT_KEY_GOTHIC_28_BOLD,
  FONT_KEY_GOTHIC_24_BOLD,
  FONT_KEY_GOTHIC_18_BOLD
};
int num_fonts = sizeof(fonts) / sizeof(fonts[0]);

// Make a text layer half the height of the screen,
// and set its font as big as possible that still 
// keeps the text visible 
TextLayer* make_text(const char* text, bool is_front) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
  	//APP_LOG(APP_LOG_LEVEL_ERROR, "bounds of window: x=%d, y=%d, w=%d, h=%d", 
    //        bounds.origin.x, bounds.origin.y, bounds.size.w, bounds.size.h);
    int16_t screen_height = bounds.size.h;
    int16_t half_screen_height = screen_height/2;
  
	  TextLayer* layer = text_layer_create(GRect(0, is_front ? 0 : half_screen_height, 144, screen_height));
  	text_layer_set_text(layer, text);
  	text_layer_set_text_alignment(layer, GTextAlignmentLeft);

    // step down font size until the text fits in half a screen height
    for (int i = 0; i < num_fonts; ++i) {
      text_layer_set_font(layer, fonts_get_system_font(fonts[i]));
      GSize size = text_layer_get_content_size(layer);
      //APP_LOG(APP_LOG_LEVEL_ERROR, "%s occupies h=%d w=%d", fonts[i], size.h, size.w);
      if (size.h <= half_screen_height) break;        
    } // if we finished the loop without finding a small enough font, just live with it
  
    text_layer_set_background_color(layer, is_front ? GColorWhite : GColorBlack);  
    text_layer_set_text_color(layer, is_front ? GColorBlack : GColorWhite);  
    return layer;
}


//// Displaying a flashcard

void flashcard_create(FlashCard *card) {

  	// create text layers for the front and back of the flashcard
    front_layer = make_text(card->front, true);  
    back_layer = make_text(card->back, false);
  
    // put the front and back into the window
  	layer_add_child(window_get_root_layer(window), text_layer_get_layer(front_layer));
  	layer_add_child(window_get_root_layer(window), text_layer_get_layer(back_layer));
  
    // randomly hide either the front or the back at first
    bool hide_front_at_first = (rand() % 2 > 0);
    layer_set_hidden(text_layer_get_layer(hide_front_at_first ? front_layer : back_layer), true);
  
    // wake up the user
    //vibes_short_pulse();
    light_enable_interaction();
}

void flashcard_destroy() {    
    if (front_layer) text_layer_destroy(front_layer);
	if (back_layer) text_layer_destroy(back_layer);
    front_layer = back_layer = NULL;
}


//// Handling button input

// invoked when the user presses the Select button (middle button)
// gives the answer to the flashcard
void select_click_handler(ClickRecognizerRef recognizer, void *context) {
    // if flashcard is already showing, make a new one
    if (!layer_get_hidden(text_layer_get_layer(front_layer)) 
        && !layer_get_hidden(text_layer_get_layer(back_layer))) {

        // send result and request a new flashcard
        flashcard_destroy();
        connection_send_result();
    } else {
      // make both layers visible
      layer_set_hidden(text_layer_get_layer(front_layer), false);
      layer_set_hidden(text_layer_get_layer(back_layer), false);
    }
}

void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
    
}


//// Communication with phone

// keys for message tuple
enum {
  FLASH_KEY_FRONT = 0x0,  // type: string
  FLASH_KEY_BACK = 0x1,   // type: string
  FLASH_KEY_RESULT = 0x2, // type: uint8
};

// values for RESULT
enum {
    WAITING = 0,
    DONE = 1,
};

struct AppSync appsync;
uint8_t* sync_buffer = NULL;
int sync_buffer_size = 500; // bytes

char *translate_error(AppMessageResult result) {
  switch (result) {
    case APP_MSG_OK: return "APP_MSG_OK";
    case APP_MSG_SEND_TIMEOUT: return "APP_MSG_SEND_TIMEOUT";
    case APP_MSG_SEND_REJECTED: return "APP_MSG_SEND_REJECTED";
    case APP_MSG_NOT_CONNECTED: return "APP_MSG_NOT_CONNECTED";
    case APP_MSG_APP_NOT_RUNNING: return "APP_MSG_APP_NOT_RUNNING";
    case APP_MSG_INVALID_ARGS: return "APP_MSG_INVALID_ARGS";
    case APP_MSG_BUSY: return "APP_MSG_BUSY";
    case APP_MSG_BUFFER_OVERFLOW: return "APP_MSG_BUFFER_OVERFLOW";
    case APP_MSG_ALREADY_RELEASED: return "APP_MSG_ALREADY_RELEASED";
    case APP_MSG_CALLBACK_ALREADY_REGISTERED: return "APP_MSG_CALLBACK_ALREADY_REGISTERED";
    case APP_MSG_CALLBACK_NOT_REGISTERED: return "APP_MSG_CALLBACK_NOT_REGISTERED";
    case APP_MSG_OUT_OF_MEMORY: return "APP_MSG_OUT_OF_MEMORY";
    case APP_MSG_CLOSED: return "APP_MSG_CLOSED";
    case APP_MSG_INTERNAL_ERROR: return "APP_MSG_INTERNAL_ERROR";
    default: return "UNKNOWN ERROR";
  }
}

void show_flashcard_sent_by_phone() {
    const Tuple* front_tuple = app_sync_get(&appsync, FLASH_KEY_FRONT);
    const Tuple* back_tuple = app_sync_get(&appsync, FLASH_KEY_BACK);
    if (!front_tuple || !back_tuple) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "front tuple or back tuple is null");
        return;
    }
    theCard.front = front_tuple->value->cstring;
    theCard.back = back_tuple->value->cstring;
    
    flashcard_destroy();
    flashcard_create(&theCard);
}

void connection_tuple_changed(const uint32_t key, const Tuple *new_tuple, const Tuple *old_tuple, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "tuple changed: key=%u, value=%s", (unsigned) key, new_tuple->value->cstring);
    if (key == FLASH_KEY_RESULT) {
        show_flashcard_sent_by_phone();
    }
}

void connection_error(DictionaryResult dict_error, AppMessageResult app_message_error, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "dict_error=%d, app_message_error=%s", dict_error, translate_error(app_message_error));
}

void connection_sent() {
    APP_LOG(APP_LOG_LEVEL_ERROR, "send succeeded");    
}

void connection_send_failed(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "send failed");    
}

void connection_create() {
    AppMessageResult result;
    
    // make the buffer big enough to hold question/answer/result
    int buffer_size = dict_calc_buffer_size(3, 100, 100, 1);
    APP_LOG(APP_LOG_LEVEL_ERROR, "buffer size=%d", buffer_size);  

    // open the AppMessage library
    result = app_message_open(buffer_size, buffer_size);
    APP_LOG(APP_LOG_LEVEL_ERROR, "app_message_open returned %s", translate_error(result));
    
    // open the AppSync library
    Tuplet tuples[] = {
        TupletCString(FLASH_KEY_FRONT, ""),
        TupletCString(FLASH_KEY_BACK, ""),
        TupletInteger(FLASH_KEY_RESULT, 0),
    };        
    sync_buffer = malloc(buffer_size);
    app_sync_init(&appsync, sync_buffer, buffer_size, tuples, sizeof(tuples)/sizeof(Tuplet), connection_tuple_changed, connection_error, NULL);
    
    // register callbacks
    app_message_register_outbox_sent(connection_sent);
    app_message_register_outbox_failed(connection_send_failed);
}

void connection_destroy() {
    app_sync_deinit(&appsync);
    free(sync_buffer);
}

void connection_send_result() {
    AppMessageResult result;
    Tuplet tuples[] = {
        TupletInteger(FLASH_KEY_RESULT, (uint8_t) DONE),
    };        
    result = app_sync_set(&appsync, tuples, sizeof(tuples)/sizeof(Tuplet));
    APP_LOG(APP_LOG_LEVEL_ERROR, "app_sync_set returned %s", translate_error(result));      
}

//// App setup and teardown

void handle_init(void) {
    connection_create();
  
    // seed the random number generator with current time
    srand(time(NULL));
  
    // make a window and the first flashcard
	window = window_create();
    flashcard_create(&theCard);
    
    // Listen for select button
    window_set_click_config_provider(window, click_config_provider);
  
  	// Push the window
  	window_stack_push(window, true);
}

void handle_deinit(void) {
    flashcard_destroy();
    window_destroy(window);
    connection_destroy();
}

int main(void) {
	  handle_init();
	  app_event_loop();
	  handle_deinit();
}
