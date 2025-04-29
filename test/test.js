
  // chooseLanguage is called when a user clicks one of the available language buttons. It chooses
  // the language the user has clicked from the player's text tracks, and also ensure's the player's
  // CC plugin state matches the selected language.
  function chooseLanguage(video, lang) {
    // First, walk over the text tracks and ensure the selected language is "showing" and all others
    // are "disabled".
    let selectedIndex = -1;
    for (let i = 0; i < video.textTracks.length; i++) {
      const textTrack = video.textTracks[i];
      if (textTrack.language === lang) {
        textTrack.mode = 'showing';
        selectedIndex = i;
      } else {
        textTrack.mode = 'disabled';
      }
    }

    // Here is some inside baseball... unfortunately, the player's CC plugin doesn't listen properly
    // for changes to the text tracks. So we have to do a bit of digging here to add and remove
    // classes on the rows in the language list to make sure the chosen language is selected. We
    // also have to toggle the 'enabled' class on the CC plugin button itself to make sure it shows
    // whether or not captions are active.
    const allChecks = document.querySelectorAll('i.boxcast-cc-checked');
    for (const check of allChecks) check.classList.remove('boxcast-icon-check');
    const checkedChecks = document.querySelectorAll(`i.boxcast-cc-checked[data-cc-${selectedIndex === -1 ? 'disable-captions' : `enable-caption-id-${selectedIndex}`}-checked]`);
    for (const check of checkedChecks) check.classList.add('boxcast-icon-check');
    const ccButtons = document.querySelectorAll('button.cc-button[data-cc-button]');
    for (const button of ccButtons) button.classList[selectedIndex === -1 ? 'remove' : 'add']('enabled');
  }

  // languageButtons returns the list of button elements from the DOM that have a
  // data-captions-language data item. Although we do check the DOM on every call, we only add the
  // button once and return the memoized map.
  const _languageButtons = {};
  function languageButtons(video) {
    const buttons = document.querySelectorAll('button[data-captions-language]');
    for (const button of buttons) {
      const lang = button.dataset.captionsLanguage;
      if (lang && !_languageButtons[lang]) {
        // The first time we add this button to the memoized map, add a click handler that calls
        // `chooseLanguage` with the video element and the chosen language code.
        button.addEventListener('click', () => chooseLanguage(video, lang))
        _languageButtons[lang] = button;
      }
    }
    return _languageButtons;
  }

  // textTracksByLanguage returns all the text tracks from the video element in a map keyed by
  // language code. This is purposefully loaded every time and not memoized because the list of text
  // tracks can (and will) change as the video loads.
  function textTracksByLanguage(video) {
    const ret = {};
    for (const textTrack of video.textTracks) {
      ret[textTrack.language] = textTrack;
    }
    return ret
  }

  // checkLanguageAvailability checks for the availability of the desired languges (based on the
  // presence of buttons with data-captions-language data items) vs. the video element's available
  // and selected text tracks. It shows/hides/selects/unselects based on the state of the player.
  function checkLanguageAvailability(video) {
    // Constants for the CSS classes mentioned in the stylesheet.
    const hideButtonClass = 'caption-button-hidden';
    const selectButtonClass = 'caption-button-selected';

    // Get all the available language buttons from the DOM (memoized) in a map keyed by language
    // code.
    const buttons = languageButtons(video);

    // Get all the text tracks from the video element in a map keyed by language code.
    const textTracks = textTracksByLanguage(video);

    // Now check all the buttons
    for (const lang in buttons) {
      const button = buttons[lang];

      // Just helper functions to make the code clearer...
      const hideButton = () => button.classList.add(hideButtonClass);
      const showButton = () => button.classList.remove(hideButtonClass);
      const selectButton = () => button.classList.add(selectButtonClass);
      const unselectButton = () => button.classList.remove(selectButtonClass);

      const textTrack = textTracks[lang];
      if (textTrack) {
        // There is a text track for this button; show it, and select/unselect based on the text
        // track mode (showing or disabled).
        showButton();
        if (textTrack.mode === 'showing') {
          selectButton();
        } else {
          unselectButton();
        }
      } else {
        // There is NOT a text track for this button (sad), so unselect and hide it.
        unselectButton();
        hideButton();
      }
    }
  }

  // videoElementLoaded is called with the HTMLVideoElement that has loaded inside the BoxCast embed
  // div. It adds listeners to detect when text tracks are added/removed/changed.
  function videoElementLoaded(video) {
    // The callback, just calls `checkLanguageAvailability` to do the heavy lifting.
    const callback = () => { checkLanguageAvailability(video) };

    // Listen to text tracks being added, removed, and changed.
    video.textTracks.addEventListener('addtrack', callback);
    video.textTracks.addEventListener('removetrack', callback);
    video.textTracks.addEventListener('change', callback);

    // Call it once right away in case all the text tracks are already loaded.
    callback();
  }

  // watchForVideoElement checks for the loading of a video element inside the BoxCast embed by
  // using a MutationObserver. Once the video element appears on the page, we disconnect the obserer
  // and call `videoElementLoaded`.
  function watchForVideoElement(boxcastEmbedId) {
    // The callback function; check for the presence of a video element under the boxcast embed
    // element. If present, disconnect the observer and pass to videoElementLoaded.
    const mutationObserverCallback = (_, mutationObserver) => {
      const video = document.querySelector('#' + boxcastEmbedId + ' video');
      if (video) {
        mutationObserver.disconnect();
        videoElementLoaded(video)
      }
    };

    // The mutation observer
    const mutationObserver = new MutationObserver(mutationObserverCallback);

    // Set up observation
    mutationObserver.observe(
      document.getElementById(boxcastEmbedId),
      { subtree: true, childList: true },
    );

    // Call the callback once right away, just in case the video has already loaded somehow.
    mutationObserverCallback(undefined, mutationObserver);
  }

  // findBoxCastWidgetId looks for the BoxCast embed on the page by checking all divs and looking
  // for an ID that starts with `boxcast-widget-` (as this is how the BoxCast embed generator
  // creates embed codes). If you have customized your embed somehow, you can adjust this code, or
  // eliminate it altogether and just put the ID below in place of the call to
  // `findBoxCastWidgetId`.
  function findBoxCastWidgetId() {
    const divs = document.getElementsByTagName('div');
    for (const div of divs) {
      if (div.id.startsWith('boxcast-widget-')) {
        return div.id
      }
    }
  }

  // When starting, find the BoxCast embed widget ID, then start watching for a video element.
  const widgetID = findBoxCastWidgetId();
  if (!widgetID) {
    console.error('Failed to find BoxCast embed!');
  } else {
    watchForVideoElement(widgetID);
  }
