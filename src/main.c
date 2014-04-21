#include <pebble.h>

Window *window;
TextLayer *front_layer;
TextLayer *back_layer;

typedef struct {
  char * front;
  char * back;
} FlashCard;

static FlashCard cards[] = {
  { "riseling", "sweet white, off-dry apricots peaches" },
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
static int num_cards = sizeof(cards) / sizeof(cards[0]);

static char* fonts[] = {
  FONT_KEY_BITHAM_42_BOLD,
  FONT_KEY_BITHAM_30_BLACK,
  FONT_KEY_GOTHIC_28_BOLD,
  FONT_KEY_GOTHIC_24_BOLD,
  FONT_KEY_GOTHIC_18_BOLD
};
static int num_fonts = sizeof(fonts) / sizeof(fonts[0]);

TextLayer* make_text(char* text, bool is_front) {
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

void flashcard_create() {

    // pick a card to show
    FlashCard *card = &cards[rand() % num_cards];
  
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
	  text_layer_destroy(front_layer);
	  text_layer_destroy(back_layer);
}

// invoked when the user presses the Select button (middle button)
// gives the answer to the flashcard
void select_click_handler(ClickRecognizerRef recognizer, void *context) {
    // if flashcard is already showing, make a new one
    if (!layer_get_hidden(text_layer_get_layer(front_layer)) 
        && !layer_get_hidden(text_layer_get_layer(back_layer))) {
        flashcard_destroy();
        flashcard_create(window);
    } else {
      // make both layers visible
      layer_set_hidden(text_layer_get_layer(front_layer), false);
      layer_set_hidden(text_layer_get_layer(back_layer), false);
    }
}

void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
}

void handle_init(void) {
    // seed the random number generator with current time
    srand(time(NULL));
  
    // make a window and the first flashcard
	  window = window_create();
    flashcard_create();
    
    // Listen for select button
    window_set_click_config_provider(window, click_config_provider);
  
  	// Push the window
  	window_stack_push(window, true);
}

void handle_deinit(void) {
    flashcard_destroy();
	  window_destroy(window);
}

int main(void) {
	  handle_init();
	  app_event_loop();
	  handle_deinit();
}
