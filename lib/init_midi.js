$(document).ready(function() {
  MIDI.loadPlugin({
    instrument: 'acoustic_grand_piano',
    soundfontUrl: 'soundfont/',
    callback: function() {
      MIDI.loaded = true;
      MIDI.Player.addListener(function(data) {
        if (data.now >= data.end)
          MIDI.Player.stop();
      });
    }
  });
});
