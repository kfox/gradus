$(document).ready(function() {
  MIDI.loadPlugin({
    instrument: 'acoustic_grand_piano',
    soundfontUrl: 'soundfont/',
    callback: function() {
      MIDI.loaded = true;

      // We need to clean up the animation marks on the score
      // when the midi stops playing (or is stopped)
      var orig = MIDI.Player.stop;
      MIDI.Player.stop = function() {
        MIDI.Player.clearAnimation();
        Gradus.animator && Gradus.animator.cleanUp();
        Gradus.animator = undefined;
        orig.call(this);
      };

      MIDI.Player.addListener(function(data) {
        if (data.now >= data.end)
          MIDI.Player.stop();
      });
    }
  });
});
